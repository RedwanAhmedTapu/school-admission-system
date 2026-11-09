using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using SchoolAdmission.Api.BackgroundServices;
using SchoolAdmission.Api.Configurations;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Middleware;
using SchoolAdmission.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Configuration is read lazily (inside factories) so environment variables and test overrides
// are always honoured.
builder.Services.AddSingleton<IOptions<AdmissionOptions>>(sp =>
    Options.Create(AdmissionOptions.FromConfiguration(sp.GetRequiredService<IConfiguration>())));

builder.Services.AddDbContext<AppDbContext>((sp, o) =>
{
    var cs = sp.GetRequiredService<IConfiguration>().GetConnectionString("Default")
             ?? throw new InvalidOperationException("ConnectionStrings__Default is not configured.");
    o.UseNpgsql(cs);
});

builder.Services.TryAddSingleton(TimeProvider.System);
builder.Services.AddScoped<ClassService>();
builder.Services.AddScoped<HoldService>();
builder.Services.AddScoped<HoldExpiryService>();
builder.Services.AddSingleton<DatabaseInitializer>();
builder.Services.AddHostedService<HoldExpiryWorker>();

builder.Services
    .AddControllers()
    .ConfigureApiBehaviorOptions(o =>
    {
        // Bad JSON / failed validation -> 400 in our own error shape, never 500.
        o.InvalidModelStateResponseFactory = ctx =>
        {
            var message = string.Join(" ", ctx.ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => string.IsNullOrWhiteSpace(e.ErrorMessage) ? "Invalid value." : e.ErrorMessage)
                .Distinct());
            if (string.IsNullOrWhiteSpace(message)) message = "The request body is invalid.";
            return new BadRequestObjectResult(new { error = new { code = "validation_failed", message } });
        };
    });

// The SPA runs on another origin (localhost:3000), so CORS is required. Open for this exercise.
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .AllowAnyOrigin()
    .AllowAnyHeader()
    .AllowAnyMethod()
    .WithExposedHeaders("X-Server-Time")));

var app = builder.Build();

await app.Services.GetRequiredService<DatabaseInitializer>().InitializeAsync();

app.UseMiddleware<ExceptionMiddleware>();
app.UseCors();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();

public partial class Program;
