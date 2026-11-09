using System.Text.RegularExpressions;

namespace SchoolAdmission.Api.Services;

/// <summary>An expected failure that maps to a 4xx response with a readable message.</summary>
public class ApiException(int statusCode, string code, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
    public string Code { get; } = code;

    public static ApiException BadRequest(string code, string message) => new(400, code, message);
    public static ApiException Forbidden(string code, string message) => new(403, code, message);
    public static ApiException NotFound(string code, string message) => new(404, code, message);
    public static ApiException Conflict(string code, string message) => new(409, code, message);
}

public static class Ids
{
    public static string New(string prefix) => $"{prefix}_{Guid.NewGuid():N}"[..(prefix.Length + 1 + 12)];
}

public static partial class StudentIdValidator
{
    [GeneratedRegex("^[0-9]{17}$")]
    private static partial Regex SeventeenDigits();

    /// <summary>Returns the trimmed student id or throws a 400.</summary>
    public static string Require(string? header)
    {
        var value = header?.Trim();
        if (string.IsNullOrEmpty(value))
            throw ApiException.BadRequest("student_id_missing", "The X-Student-Id header is required.");
        if (!SeventeenDigits().IsMatch(value))
            throw ApiException.BadRequest("student_id_invalid", "X-Student-Id must be exactly 17 digits.");
        return value;
    }
}
