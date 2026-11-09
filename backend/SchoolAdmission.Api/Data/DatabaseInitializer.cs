using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SchoolAdmission.Api.Configurations;
using SchoolAdmission.Api.Entities;

namespace SchoolAdmission.Api.Data;

/// <summary>
/// Applies the embedded SQL migrations (Migrations/NNN_*.sql) in order and records them in
/// schema_migrations. A PostgreSQL advisory lock makes it safe when two backend instances
/// start at the same time. Retries while PostgreSQL is still booting.
/// </summary>
public class DatabaseInitializer(
    IConfiguration configuration,
    IServiceScopeFactory scopes,
    ILogger<DatabaseInitializer> logger)
{
    private const long AdvisoryLockKey = 727_274_001;

    public async Task InitializeAsync(CancellationToken ct = default)
    {
        var cs = configuration.GetConnectionString("Default")
                 ?? throw new InvalidOperationException("ConnectionStrings__Default is not configured.");

        await RetryAsync(() => ApplyMigrationsAsync(cs, ct), ct);

        var options = AdmissionOptions.FromConfiguration(configuration);
        if (options.SeedDemoData)
        {
            using var scope = scopes.CreateScope();
            await DemoSeeder.SeedAsync(scope.ServiceProvider.GetRequiredService<AppDbContext>(), ct);
        }
    }

    private async Task RetryAsync(Func<Task> action, CancellationToken ct)
    {
        const int maxAttempts = 30;
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                await action();
                return;
            }
            catch (Exception ex) when (attempt < maxAttempts && ex is NpgsqlException or System.Net.Sockets.SocketException)
            {
                logger.LogWarning("Database not ready (attempt {Attempt}/{Max}): {Message}", attempt, maxAttempts, ex.Message);
                await Task.Delay(TimeSpan.FromSeconds(2), ct);
            }
        }
    }

    private async Task ApplyMigrationsAsync(string connectionString, CancellationToken ct)
    {
        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync(ct);

        await using (var lockCmd = new NpgsqlCommand("SELECT pg_advisory_lock(@k)", conn))
        {
            lockCmd.Parameters.AddWithValue("k", AdvisoryLockKey);
            await lockCmd.ExecuteNonQueryAsync(ct);
        }

        try
        {
            await using (var create = new NpgsqlCommand(
                "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())", conn))
            {
                await create.ExecuteNonQueryAsync(ct);
            }

            var assembly = Assembly.GetExecutingAssembly();
            var scripts = assembly.GetManifestResourceNames()
                .Where(n => n.EndsWith(".sql", StringComparison.OrdinalIgnoreCase))
                .OrderBy(n => n, StringComparer.Ordinal)
                .ToList();

            foreach (var resource in scripts)
            {
                var name = resource[(resource.LastIndexOf(".Migrations.", StringComparison.Ordinal) + ".Migrations.".Length)..];

                await using (var check = new NpgsqlCommand("SELECT 1 FROM schema_migrations WHERE name = @n", conn))
                {
                    check.Parameters.AddWithValue("n", name);
                    if (await check.ExecuteScalarAsync(ct) is not null) continue;
                }

                using var reader = new StreamReader(assembly.GetManifestResourceStream(resource)!);
                var sql = await reader.ReadToEndAsync(ct);

                await using var tx = await conn.BeginTransactionAsync(ct);
                await using (var run = new NpgsqlCommand(sql, conn, tx))
                {
                    await run.ExecuteNonQueryAsync(ct);
                }
                await using (var record = new NpgsqlCommand("INSERT INTO schema_migrations (name) VALUES (@n)", conn, tx))
                {
                    record.Parameters.AddWithValue("n", name);
                    await record.ExecuteNonQueryAsync(ct);
                }
                await tx.CommitAsync(ct);

                logger.LogInformation("Applied migration {Name}", name);
            }
        }
        finally
        {
            await using var unlock = new NpgsqlCommand("SELECT pg_advisory_unlock(@k)", conn);
            unlock.Parameters.AddWithValue("k", AdvisoryLockKey);
            await unlock.ExecuteNonQueryAsync(CancellationToken.None);
        }
    }
}

public static class DemoSeeder
{
    public static async Task SeedAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.Classes.AnyAsync(ct)) return;

        var now = DateTime.UtcNow;
        var demo = new (string Name, int Seats)[]
        {
            ("Class 6 - Morning Shift", 120),
            ("Class 6 - Day Shift", 100),
            ("Class 7 - Morning Shift", 100),
            ("Class 7 - Day Shift", 80),
            ("Class 8 - Morning Shift", 90),
        };

        foreach (var (name, seats) in demo)
        {
            db.Classes.Add(new SchoolClass
            {
                Id = Services.Ids.New("c"),
                Name = name,
                TotalSeats = seats,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }

        await db.SaveChangesAsync(ct);
    }
}
