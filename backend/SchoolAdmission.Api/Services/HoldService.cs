using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;
using SchoolAdmission.Api.Configurations;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.DTOs;
using SchoolAdmission.Api.Entities;

namespace SchoolAdmission.Api.Services;

/// <summary>
/// All seat-state transitions. Correctness comes from PostgreSQL, not from process memory:
///   * Creating a hold locks the class row (SELECT ... FOR UPDATE). Every request for the same
///     class is serialised there, across threads AND across backend instances, so the
///     capacity check and the insert can never interleave.
///   * A partial unique index (class_id, student_id) WHERE status IN ('HELD','CONFIRMED')
///     rejects a second live application from the same student.
///   * confirm / cancel lock the single hold row, so racing confirms, cancels and the expiry
///     sweeper see each other's committed result.
/// </summary>
public class HoldService(AppDbContext db, TimeProvider clock, IOptions<AdmissionOptions> options)
{
    public async Task<HoldCreatedDto> CreateAsync(string classId, string? studentHeader, CancellationToken ct)
    {
        var studentId = StudentIdValidator.Require(studentHeader);
        var now = clock.GetUtcNow().UtcDateTime;

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        // 1. Serialise on the class row. Returns no rows when the class does not exist.
        var locked = await db.Database
            .SqlQuery<int>($"SELECT total_seats AS \"Value\" FROM classes WHERE id = {classId} FOR UPDATE")
            .ToListAsync(ct);
        if (locked.Count == 0)
            throw ApiException.NotFound("class_not_found", "Class not found.");
        var totalSeats = locked[0];

        // 2. Release holds of this class whose deadline has passed, so they neither consume a seat
        //    nor trip the unique index for a student who is re-applying.
        await db.Holds
            .Where(h => h.ClassId == classId && h.Status == HoldStatus.Held && h.ExpiresAt <= now)
            .ExecuteUpdateAsync(s => s.SetProperty(h => h.Status, HoldStatus.Expired), ct);

        // 3. Duplicate application?
        var alreadyLive = await db.Holds.AnyAsync(
            h => h.ClassId == classId && h.StudentId == studentId &&
                 (h.Status == HoldStatus.Held || h.Status == HoldStatus.Confirmed), ct);
        if (alreadyLive)
            throw ApiException.Conflict("duplicate_application",
                "This student already has an active application or confirmed admission for this class.");

        // 4. Capacity.
        var used = await db.Holds.CountAsync(
            h => h.ClassId == classId && (h.Status == HoldStatus.Held || h.Status == HoldStatus.Confirmed), ct);
        if (used >= totalSeats)
            throw ApiException.Conflict("no_seats_available", "No seats are available in this class.");

        // 5. Reserve.
        var hold = new AdmissionHold
        {
            Id = Ids.New("h"),
            ClassId = classId,
            StudentId = studentId,
            Status = HoldStatus.Held,
            CreatedAt = now,
            ExpiresAt = now.AddSeconds(options.Value.HoldDurationSeconds),
        };
        db.Holds.Add(hold);

        try
        {
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            throw ApiException.Conflict("duplicate_application",
                "This student already has an active application or confirmed admission for this class.");
        }

        return new HoldCreatedDto(hold.Id, hold.ClassId, hold.StudentId, hold.Status, hold.ExpiresAt);
    }

    public async Task<HoldStatusDto> GetAsync(string holdId, CancellationToken ct)
    {
        var hold = await db.Holds.AsNoTracking().FirstOrDefaultAsync(h => h.Id == holdId, ct)
                   ?? throw ApiException.NotFound("hold_not_found", "Application not found.");
        var now = clock.GetUtcNow().UtcDateTime;
        return new HoldStatusDto(hold.Id, hold.ClassId, hold.EffectiveStatus(now), hold.ExpiresAt);
    }

    public async Task<HoldConfirmedDto> ConfirmAsync(string holdId, string? studentHeader, CancellationToken ct)
    {
        var studentId = StudentIdValidator.Require(studentHeader);
        var now = clock.GetUtcNow().UtcDateTime;

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var hold = await LockHoldAsync(holdId, ct);

        if (hold.StudentId != studentId)
            throw ApiException.Forbidden("not_your_application", "This application belongs to a different student.");

        switch (hold.Status)
        {
            case HoldStatus.Confirmed:
                // Idempotent: repeating a confirm changes nothing and still answers 200.
                return new HoldConfirmedDto(hold.Id, HoldStatus.Confirmed);

            case HoldStatus.Cancelled:
                throw ApiException.Conflict("hold_cancelled", "This application was cancelled and cannot be confirmed.");

            case HoldStatus.Expired:
                throw ApiException.Conflict("hold_expired", "This reservation has expired. Please apply again.");
        }

        if (hold.ExpiresAt <= now)
        {
            hold.Status = HoldStatus.Expired;
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            throw ApiException.Conflict("hold_expired", "This reservation has expired. Please apply again.");
        }

        hold.Status = HoldStatus.Confirmed;
        hold.ConfirmedAt = now;
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return new HoldConfirmedDto(hold.Id, hold.Status);
    }

    public async Task CancelAsync(string holdId, string? studentHeader, CancellationToken ct)
    {
        var studentId = StudentIdValidator.Require(studentHeader);
        var now = clock.GetUtcNow().UtcDateTime;

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var hold = await LockHoldAsync(holdId, ct);

        if (hold.StudentId != studentId)
            throw ApiException.Forbidden("not_your_application", "This application belongs to a different student.");

        switch (hold.Status)
        {
            case HoldStatus.Cancelled:
                return; // already cancelled -> still 204, nothing to change

            case HoldStatus.Confirmed:
                throw ApiException.Conflict("hold_confirmed",
                    "A confirmed admission cannot be cancelled here. Please contact the school office.");

            case HoldStatus.Expired:
                throw ApiException.Conflict("hold_expired", "This reservation has already expired.");
        }

        if (hold.ExpiresAt <= now)
        {
            hold.Status = HoldStatus.Expired;
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            throw ApiException.Conflict("hold_expired", "This reservation has already expired.");
        }

        hold.Status = HoldStatus.Cancelled;
        hold.CancelledAt = now;
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }

    public async Task<List<MyHoldDto>> ListMineAsync(string? studentHeader, CancellationToken ct)
    {
        var studentId = StudentIdValidator.Require(studentHeader);
        var now = clock.GetUtcNow().UtcDateTime;

        var rows = await (from h in db.Holds.AsNoTracking()
                          join c in db.Classes.AsNoTracking() on h.ClassId equals c.Id
                          where h.StudentId == studentId
                          orderby h.CreatedAt descending
                          select new { Hold = h, ClassName = c.Name }).ToListAsync(ct);

        return rows.Select(r => new MyHoldDto(
            r.Hold.Id, r.Hold.ClassId, r.ClassName, r.Hold.EffectiveStatus(now), r.Hold.ExpiresAt,
            r.Hold.CreatedAt, r.Hold.ConfirmedAt, r.Hold.CancelledAt)).ToList();
    }

    public async Task<List<AdminHoldDto>> ListAllAsync(string? classId, string? status, string? search, CancellationToken ct)
    {
        var now = clock.GetUtcNow().UtcDateTime;

        var query = from h in db.Holds.AsNoTracking()
                    join c in db.Classes.AsNoTracking() on h.ClassId equals c.Id
                    select new { Hold = h, ClassName = c.Name };

        if (!string.IsNullOrWhiteSpace(classId))
            query = query.Where(x => x.Hold.ClassId == classId);

        if (!string.IsNullOrWhiteSpace(status))
        {
            switch (status.Trim().ToUpperInvariant())
            {
                case HoldStatus.Held:
                    query = query.Where(x => x.Hold.Status == HoldStatus.Held && x.Hold.ExpiresAt > now);
                    break;
                case HoldStatus.Expired:
                    query = query.Where(x => x.Hold.Status == HoldStatus.Expired ||
                                             (x.Hold.Status == HoldStatus.Held && x.Hold.ExpiresAt <= now));
                    break;
                case HoldStatus.Confirmed:
                case HoldStatus.Cancelled:
                    var s = status.Trim().ToUpperInvariant();
                    query = query.Where(x => x.Hold.Status == s);
                    break;
                default:
                    throw ApiException.BadRequest("status_invalid", "status must be HELD, CONFIRMED, EXPIRED or CANCELLED.");
            }
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = "%" + search.Trim().Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%";
            query = query.Where(x =>
                EF.Functions.ILike(x.Hold.StudentId, pattern) ||
                EF.Functions.ILike(x.Hold.Id, pattern) ||
                EF.Functions.ILike(x.ClassName, pattern));
        }

        var rows = await query.OrderByDescending(x => x.Hold.CreatedAt).Take(500).ToListAsync(ct);
        return rows.Select(r => new AdminHoldDto(
            r.Hold.Id, r.Hold.ClassId, r.ClassName, r.Hold.StudentId, r.Hold.EffectiveStatus(now),
            r.Hold.CreatedAt, r.Hold.ExpiresAt, r.Hold.ConfirmedAt, r.Hold.CancelledAt)).ToList();
    }

    /// <summary>Loads one hold with a row lock (must be called inside a transaction).</summary>
    private async Task<AdmissionHold> LockHoldAsync(string holdId, CancellationToken ct)
    {
        var rows = await db.Holds
            .FromSql($"SELECT * FROM admission_holds WHERE id = {holdId} FOR UPDATE")
            .ToListAsync(ct);
        return rows.FirstOrDefault() ?? throw ApiException.NotFound("hold_not_found", "Application not found.");
    }
}
