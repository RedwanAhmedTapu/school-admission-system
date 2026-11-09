using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.DTOs;
using SchoolAdmission.Api.Services;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
public class ClassesController(ClassService classes, HoldService holds) : ControllerBase
{
    [HttpPost("/classes")]
    public async Task<IActionResult> Create([FromBody] CreateClassRequest request, CancellationToken ct)
    {
        var created = await classes.CreateAsync(request, ct);
        return Created($"/classes/{created.Id}", created);
    }

    [HttpGet("/classes")]
    public async Task<ActionResult<List<ClassDto>>> List(CancellationToken ct) =>
        Ok(await classes.ListAsync(ct));

    [HttpGet("/classes/{classId}")]
    public async Task<ActionResult<ClassDto>> Get(string classId, CancellationToken ct) =>
        Ok(await classes.GetAsync(classId, ct));

    [HttpPost("/classes/{classId}/holds")]
    public async Task<IActionResult> CreateHold(
        string classId, [FromHeader(Name = "X-Student-Id")] string? studentId, CancellationToken ct)
    {
        var hold = await holds.CreateAsync(classId, studentId, ct);
        return Created($"/holds/{hold.HoldId}", hold);
    }
}

[ApiController]
public class HoldsController(HoldService holds) : ControllerBase
{
    [HttpGet("/holds/{holdId}")]
    public async Task<ActionResult<HoldStatusDto>> Get(string holdId, CancellationToken ct) =>
        Ok(await holds.GetAsync(holdId, ct));

    [HttpPost("/holds/{holdId}/confirm")]
    public async Task<ActionResult<HoldConfirmedDto>> Confirm(
        string holdId, [FromHeader(Name = "X-Student-Id")] string? studentId, CancellationToken ct) =>
        Ok(await holds.ConfirmAsync(holdId, studentId, ct));

    [HttpDelete("/holds/{holdId}")]
    public async Task<IActionResult> Cancel(
        string holdId, [FromHeader(Name = "X-Student-Id")] string? studentId, CancellationToken ct)
    {
        await holds.CancelAsync(holdId, studentId, ct);
        return NoContent();
    }

    [HttpGet("/me/holds")]
    public async Task<ActionResult<List<MyHoldDto>>> Mine(
        [FromHeader(Name = "X-Student-Id")] string? studentId, CancellationToken ct) =>
        Ok(await holds.ListMineAsync(studentId, ct));
}

/// <summary>
/// Extra, read-only endpoint for the admin monitoring screen. It is NOT part of the required
/// contract. See ASSUMPTIONS.md: the admin area has no authentication in this exercise.
/// </summary>
[ApiController]
public class AdminController(HoldService holds) : ControllerBase
{
    [HttpGet("/admin/holds")]
    public async Task<ActionResult<List<AdminHoldDto>>> ListHolds(
        [FromQuery] string? classId, [FromQuery] string? status, [FromQuery] string? q, CancellationToken ct) =>
        Ok(await holds.ListAllAsync(classId, status, q, ct));
}
