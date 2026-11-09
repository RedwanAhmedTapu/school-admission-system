using Microsoft.Extensions.Options;
using SchoolAdmission.Api.Configurations;
using SchoolAdmission.Api.Services;

namespace SchoolAdmission.Api.BackgroundServices;

/// <summary>Runs the expiry sweep on a timer, with no API call needed. Resumes after a restart.</summary>
public class HoldExpiryWorker(
    IServiceScopeFactory scopes,
    IOptions<AdmissionOptions> options,
    ILogger<HoldExpiryWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = TimeSpan.FromSeconds(options.Value.SweepIntervalSeconds);
        using var timer = new PeriodicTimer(interval);

        do
        {
            try
            {
                using var scope = scopes.CreateScope();
                var expired = await scope.ServiceProvider.GetRequiredService<HoldExpiryService>().SweepAsync(stoppingToken);
                if (expired > 0)
                    logger.LogInformation("Released {Count} expired reservation(s).", expired);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                // Never let one failed sweep (e.g. DB restarting) stop the worker.
                logger.LogError(ex, "Expiry sweep failed; will retry.");
            }
        }
        while (await WaitAsync(timer, stoppingToken));
    }

    private static async Task<bool> WaitAsync(PeriodicTimer timer, CancellationToken ct)
    {
        try { return await timer.WaitForNextTickAsync(ct); }
        catch (OperationCanceledException) { return false; }
    }
}
