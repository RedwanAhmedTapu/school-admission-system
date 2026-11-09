using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Entities;

namespace SchoolAdmission.Api.Data;

/// <summary>
/// The schema itself is created by the SQL files in /Migrations (see DatabaseInitializer);
/// this model only maps the existing tables.
/// </summary>
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<SchoolClass> Classes => Set<SchoolClass>();
    public DbSet<AdmissionHold> Holds => Set<AdmissionHold>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<SchoolClass>(e =>
        {
            e.ToTable("classes");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(120);
            e.Property(x => x.TotalSeats).HasColumnName("total_seats");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        b.Entity<AdmissionHold>(e =>
        {
            e.ToTable("admission_holds");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ClassId).HasColumnName("class_id");
            e.Property(x => x.StudentId).HasColumnName("student_id").HasMaxLength(17);
            e.Property(x => x.Status).HasColumnName("status").HasMaxLength(16);
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.ExpiresAt).HasColumnName("expires_at");
            e.Property(x => x.ConfirmedAt).HasColumnName("confirmed_at");
            e.Property(x => x.CancelledAt).HasColumnName("cancelled_at");
            e.HasOne<SchoolClass>().WithMany().HasForeignKey(x => x.ClassId);
        });
    }
}
