using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Entities;

namespace SchoolAdmission.Api.Services;

/// <summary>
/// Marks overdue HELD rows as EXPIRED. It is a single atomic UPDATE based on persisted
/// timestamps, so several workers (or backend instances) can run it at once: PostgreSQL
/// gives each row to exactly one of them. Seat counts are derived from rows, so flipping the
/// status is what releases the seat.
/// </summary>
public class HoldExpiryService(AppDbContext db, TimeProvider clock)
{
    public Task<int> SweepAsync(CancellationToken ct)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        return db.Holds
            .Where(h => h.Status == HoldStatus.Held && h.ExpiresAt <= now)
            .ExecuteUpdateAsync(s => s.SetProperty(h => h.Status, HoldStatus.Expired), ct);
    }
}
