namespace SchoolAdmission.Api.Configurations;

public class AdmissionOptions
{
    public const int DefaultHoldDurationSeconds = 600;
    public const int DefaultSweepIntervalSeconds = 5;

    /// <summary>HOLD_DURATION_SECONDS (default 600).</summary>
    public int HoldDurationSeconds { get; set; } = DefaultHoldDurationSeconds;

    /// <summary>EXPIRY_SWEEP_INTERVAL_SECONDS (default 5).</summary>
    public int SweepIntervalSeconds { get; set; } = DefaultSweepIntervalSeconds;

    /// <summary>SEED_DEMO_DATA (default true) - inserts demo classes into an empty database.</summary>
    public bool SeedDemoData { get; set; } = true;

    public static AdmissionOptions FromConfiguration(IConfiguration cfg)
    {
        var o = new AdmissionOptions();

        if (int.TryParse(cfg["HOLD_DURATION_SECONDS"], out var hold) && hold > 0)
            o.HoldDurationSeconds = hold;

        if (int.TryParse(cfg["EXPIRY_SWEEP_INTERVAL_SECONDS"], out var sweep) && sweep > 0)
            o.SweepIntervalSeconds = sweep;

        if (bool.TryParse(cfg["SEED_DEMO_DATA"], out var seed))
            o.SeedDemoData = seed;

        return o;
    }
}
