namespace SchoolAdmission.Api.Entities;

/// <summary>One class + shift combination, e.g. "Class 6 - Morning Shift".</summary>
public class SchoolClass
{
    public string Id { get; set; } = default!;
    public string Name { get; set; } = default!;
    public int TotalSeats { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
