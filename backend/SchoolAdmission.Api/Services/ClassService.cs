using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.DTOs;
using SchoolAdmission.Api.Entities;

namespace SchoolAdmission.Api.Services;

public class ClassService(AppDbContext db, TimeProvider clock)
{
    public async Task<ClassCreatedDto> CreateAsync(CreateClassRequest req, CancellationToken ct)
    {
        var name = req.Name!.Trim();
        if (name.Length == 0)
            throw ApiException.BadRequest("name_invalid", "name must not be blank.");

        var now = clock.GetUtcNow().UtcDateTime;
        var entity = new SchoolClass
        {
            Id = Ids.New("c"),
            Name = name,
            TotalSeats = req.TotalSeats!.Value,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Classes.Add(entity);
        await db.SaveChangesAsync(ct);
        return new ClassCreatedDto(entity.Id, entity.Name, entity.TotalSeats);
    }

    public async Task<List<ClassDto>> ListAsync(CancellationToken ct)
    {
        var rows = await Query().OrderBy(r => r.Name).ThenBy(r => r.Id).ToListAsync(ct);
        return rows.Select(ToDto).ToList();
    }

    public async Task<ClassDto> GetAsync(string classId, CancellationToken ct)
    {
        var row = await Query().Where(r => r.Id == classId).FirstOrDefaultAsync(ct)
                  ?? throw ApiException.NotFound("class_not_found", "Class not found.");
        return ToDto(row);
    }

    private sealed record Row(string Id, string Name, int TotalSeats, int Held, int Confirmed);

    // Seat usage is derived from hold rows on every read - there is no stored counter to drift.
    // A HELD row past its deadline no longer counts, even before the sweeper marks it EXPIRED.
    private IQueryable<Row> Query()
    {
        var now = clock.GetUtcNow().UtcDateTime;
        return db.Classes.AsNoTracking().Select(c => new Row(
            c.Id,
            c.Name,
            c.TotalSeats,
            db.Holds.Count(h => h.ClassId == c.Id && h.Status == HoldStatus.Held && h.ExpiresAt > now),
            db.Holds.Count(h => h.ClassId == c.Id && h.Status == HoldStatus.Confirmed)));
    }

    private static ClassDto ToDto(Row r) =>
        new(r.Id, r.Name, r.TotalSeats, r.Held, r.Confirmed, Math.Max(0, r.TotalSeats - r.Held - r.Confirmed));
}
