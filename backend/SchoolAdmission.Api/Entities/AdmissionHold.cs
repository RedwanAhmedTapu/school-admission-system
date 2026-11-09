namespace SchoolAdmission.Api.Entities;

public static class HoldStatus
{
    public const string Held = "HELD";
    public const string Confirmed = "CONFIRMED";
    public const string Expired = "EXPIRED";
    public const string Cancelled = "CANCELLED";
}

public class AdmissionHold
{
    public string Id { get; set; } = default!;
    public string ClassId { get; set; } = default!;
    public string StudentId { get; set; } = default!;
    public string Status { get; set; } = HoldStatus.Held;
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public DateTime? CancelledAt { get; set; }

    /// <summary>
    /// The status a client should see right now. A HELD row whose deadline has passed is
    /// reported as EXPIRED immediately, even if the background sweeper has not persisted it yet.
    /// </summary>
    public string EffectiveStatus(DateTime utcNow) =>
        Status == HoldStatus.Held && ExpiresAt <= utcNow ? HoldStatus.Expired : Status;
}
