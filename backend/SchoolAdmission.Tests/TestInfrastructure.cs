using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Npgsql;

namespace SchoolAdmission.Tests;

/// <summary>A clock the tests can move forward to exercise expiry without sleeping.</summary>
public sealed class MutableClock : TimeProvider
{
    private DateTimeOffset _now = DateTimeOffset.UtcNow;
    public void Advance(TimeSpan by) => _now += by;
    public override DateTimeOffset GetUtcNow() => _now;
}

/// <summary>
/// Boots the real API against a REAL PostgreSQL database (no in-memory fake), so the
/// row locks and the unique index are exercised for real.
/// Connection string: env TEST_DATABASE_CONNECTION.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    public const int HoldSeconds = 600;
    public MutableClock Clock { get; } = new();

    private static readonly string BaseConnection =
        Environment.GetEnvironmentVariable("TEST_DATABASE_CONNECTION")
        ?? "Host=localhost;Port=5432;Database=school_admission_test;Username=postgres;Password=postgres";

    public ApiFactory()
    {
        EnsureDatabaseExists(BaseConnection);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:Default", BaseConnection + ";Maximum Pool Size=100");
        builder.UseSetting("HOLD_DURATION_SECONDS", HoldSeconds.ToString());
        builder.UseSetting("SEED_DEMO_DATA", "false");
        // Keep the background worker out of the way; tests call the sweeper explicitly.
        builder.UseSetting("EXPIRY_SWEEP_INTERVAL_SECONDS", "3600");

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Clock);
        });
    }

    private static void EnsureDatabaseExists(string connection)
    {
        var target = new NpgsqlConnectionStringBuilder(connection);
        var dbName = target.Database!;
        target.Database = "postgres";

        using var conn = new NpgsqlConnection(target.ConnectionString);
        conn.Open();
        using var exists = new NpgsqlCommand("SELECT 1 FROM pg_database WHERE datname = @n", conn);
        exists.Parameters.AddWithValue("n", dbName);
        if (exists.ExecuteScalar() is null)
        {
            using var create = new NpgsqlCommand($"CREATE DATABASE \"{dbName}\"", conn);
            create.ExecuteNonQuery();
        }
    }

    // ---- helpers -----------------------------------------------------------------------

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static long _studentCounter = DateTime.UtcNow.Ticks % 10_000_000_000L;

    /// <summary>A fresh, valid 17-digit student id.</summary>
    public static string NewStudentId() => Interlocked.Increment(ref _studentCounter).ToString("D17");

    public async Task<ClassBody> CreateClassAsync(HttpClient http, int seats, string? name = null)
    {
        var res = await http.PostAsJsonAsync("/classes", new { name = name ?? $"Test Class {Guid.NewGuid():N}", totalSeats = seats });
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<ClassBody>(Json))!;
    }

    public Task<HttpResponseMessage> ApplyAsync(HttpClient http, string classId, string? studentId)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, $"/classes/{classId}/holds");
        if (studentId is not null) req.Headers.Add("X-Student-Id", studentId);
        return http.SendAsync(req);
    }

    public Task<HttpResponseMessage> SendAsync(HttpClient http, HttpMethod method, string url, string? studentId)
    {
        var req = new HttpRequestMessage(method, url);
        if (studentId is not null) req.Headers.Add("X-Student-Id", studentId);
        return http.SendAsync(req);
    }

    public async Task<ClassBody> GetClassAsync(HttpClient http, string classId) =>
        (await http.GetFromJsonAsync<ClassBody>($"/classes/{classId}", Json))!;

    public static async Task<T> ReadAsync<T>(HttpResponseMessage res) =>
        (await res.Content.ReadFromJsonAsync<T>(Json))!;
}

public record ClassBody(string Id, string Name, int TotalSeats, int HeldSeats, int ConfirmedSeats, int AvailableSeats);
public record HoldBody(string HoldId, string ClassId, string StudentId, string Status, DateTime ExpiresAt);
public record HoldStatusBody(string HoldId, string ClassId, string Status, DateTime ExpiresAt);
public record ConfirmBody(string HoldId, string Status);
