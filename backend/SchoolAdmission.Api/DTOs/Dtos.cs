using System.ComponentModel.DataAnnotations;

namespace SchoolAdmission.Api.DTOs;

public class CreateClassRequest
{
    [Required(AllowEmptyStrings = false, ErrorMessage = "name is required.")]
    [StringLength(120, MinimumLength = 1, ErrorMessage = "name must be 1-120 characters.")]
    public string? Name { get; set; }

    [Required(ErrorMessage = "totalSeats is required.")]
    [Range(1, 100_000, ErrorMessage = "totalSeats must be between 1 and 100000.")]
    public int? TotalSeats { get; set; }
}

public record ClassCreatedDto(string Id, string Name, int TotalSeats);

public record ClassDto(
    string Id,
    string Name,
    int TotalSeats,
    int HeldSeats,
    int ConfirmedSeats,
    int AvailableSeats);

public record HoldCreatedDto(string HoldId, string ClassId, string StudentId, string Status, DateTime ExpiresAt);

public record HoldStatusDto(string HoldId, string ClassId, string Status, DateTime ExpiresAt);

public record HoldConfirmedDto(string HoldId, string Status);

public record MyHoldDto(
    string HoldId,
    string ClassId,
    string ClassName,
    string Status,
    DateTime ExpiresAt,
    DateTime CreatedAt,
    DateTime? ConfirmedAt,
    DateTime? CancelledAt);

public record AdminHoldDto(
    string HoldId,
    string ClassId,
    string ClassName,
    string StudentId,
    string Status,
    DateTime CreatedAt,
    DateTime ExpiresAt,
    DateTime? ConfirmedAt,
    DateTime? CancelledAt);
