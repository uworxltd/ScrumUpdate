// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace KhojiGenAIServer.Data;

[Table("TeamUserPreferences", Schema = "kgs")]
public class TeamUserPreference
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [MaxLength(255)]
    public string MsftTeamsAadObjectId { get; set; }

    public int? PreferredInstanceId { get; set; }
}

[Table("DistributedCacheEntry", Schema = "kgs")]
public class DistributedCacheEntry
{
    [Key]
    public string Key { get; set; }

    public byte[] Value { get; set; }

    public DateTimeOffset? AbsoluteExpiration { get; set; }

    public TimeSpan? SlidingExpiration { get; set; }

    public DateTimeOffset? ExpiresAt { get; set; }
}

[Table("ConversationReferenceEntity", Schema = "kgs")]
public class ConversationReferenceEntity
{
    [Key]
    public string Key { get; set; } = default!;
    public string ReferenceJson { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

[Table("ProactiveSubscriptions", Schema = "kgs")]
public class ProactiveSubscription
{
    [Key]
    public Guid SubscriptionId { get; set; }

    [Required]
    public string ServiceType { get; set; } = string.Empty;

    [Required]
    public string ChannelId { get; set; } = string.Empty;

    [Required]
    public int InstanceId { get; set; }

    public string? UserEmail { get; set; }

    public DateTime Created { get; set; }
    public DateTime? Updated { get; set; }   // nullable

    public int ConsecutiveFailureCount { get; set; } = 0;

    public string LastFailureMessage { get; set; } = string.Empty;

    public JObject? SubscriptionParameters { get; set; }
}

[Table("StoredKeyValues", Schema = "kgs")]
public class StoredKeyValue
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    public int InstanceId { get; set; } = 0;
    public string DictionaryName { get; set; } = string.Empty; // To support multiple dictionary instances

    [Required]
    public string Key { get; set; } = string.Empty;
    [Required]
    public int Order { get; set; }

    public string ValueType { get; set; } = string.Empty;
    public string ValueJson { get; set; } = string.Empty;
}

public enum JobStatus
{
    Pending = 0,
    Running = 1,
    Success = 2,
    Failed = 3,
    Skipped = 4
}

[Table("JobDefinitions", Schema = "kgs")]
public class JobDefinition
{
    public int Id { get; set; }  // PK
    public string JobType { get; set; } = string.Empty; // nvarchar(100)
    public int InstanceId { get; set; }
    public string ConstructionString { get; set; } = string.Empty;

    // Scheduling & execution state
    public DateTime? LastRunTime { get; set; }
    public JobStatus LastRunStatus { get; set; } = JobStatus.Pending;
    public string? LastRunResult { get; set; }

    // Failure & retry handling
    public int ConsecutiveFailureCount { get; set; } = 0;
    public int MaxRetries { get; set; } = 5;   // configurable
    public bool IsDisabled { get; set; } = false;

    // Scheduling
    public DateTime? NextRunTime { get; set; }

    // Concurrency
    public bool IsRunning { get; set; } = false;
    public string? LockedBy { get; set; }
    public DateTime? LockTime { get; set; }

    // Auditing
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<JobRunHistory> RunHistory { get; set; } = [];
}

[Table("JobRunHistories", Schema = "kgs")]
public class JobRunHistory
{
    public int Id { get; set; } // PK
    public int JobDefinitionId { get; set; } // FK
    public DateTime RunTime { get; set; }
    public JobStatus Status { get; set; }
    public string? Result { get; set; }
    public TimeSpan? Duration { get; set; }

    // Auditing
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public JobDefinition JobDefinition { get; set; } = null!;
}

[Table("LlmCallLogs", Schema = "kgs")]
public class LlmCallLog
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string LlmName { get; set; } = string.Empty; // LLM identifier

    [Required]
    [MaxLength(100)]
    public string PromptName { get; set; } = string.Empty;

    public int InputTokens { get; set; } = 0; // Number of input tokens
    public int OutputTokens { get; set; } = 0; // Number of output tokens

    public int? TenantId { get; set; } // Optional tenant identifier

    public TimeSpan? ResponseTime { get; set; } // Time taken for the AI call

    // Auditing
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("LlmCallFailures", Schema = "kgs")]
public class LlmCallFailure
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string LlmName { get; set; } = string.Empty; // LLM identifier

    [Required]
    [MaxLength(100)]
    public string PromptName { get; set; } = string.Empty;

    public int? StatusCode { get; set; } // Optional Http status code

    [MaxLength(500)]
    public string ErrorCode { get; set; }

    public int? TenantId { get; set; } // Optional tenant identifier

    [MaxLength(100)]
    public string ExceptionType { get; set; }

    [MaxLength(500)]
    public string ExceptionMessage { get; set; }

    public string Exception { get; set; }

    // Auditing
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class KGSDbContext : DbContext
{
    readonly bool dontLetItDispose = false;
    readonly string connectionString = KhojiConstants.DatabaseConnectionString;

    public KGSDbContext()
    { }

    public KGSDbContext(string connectionString, bool dontLetItDispose = false)
    {
        this.connectionString = connectionString;
        this.dontLetItDispose = dontLetItDispose;
    }

    public KGSDbContext(DbContextOptions<KGSDbContext> options, bool dontLetItDispose = false) : base(options)
    {
        this.dontLetItDispose = dontLetItDispose;
    }

    public DbSet<TeamUserPreference> TeamUserPreferences { get; set; }
    public DbSet<DistributedCacheEntry> DistributedCacheEntries { get; set; }

    public DbSet<ConversationReferenceEntity> ConversationReferences { get; set; }
    public DbSet<ProactiveSubscription> ProactiveSubscriptions { get; set; }

    public DbSet<StoredKeyValue> StoredKeyValues { get; set; }

    public DbSet<JobDefinition> JobDefinitions { get; set; }
    public DbSet<JobRunHistory> JobRunHistories { get; set; }

    public DbSet<LlmCallLog> LlmCallLogs { get; set; }
    public DbSet<LlmCallFailure> LlmCallFailures { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder options)
    {
        if (!options.IsConfigured)
        {
            if (!string.IsNullOrEmpty(this.connectionString))
                options.UseNpgsql(this.connectionString);
            else
                options.UseNpgsql(KhojiConstants.DatabaseConnectionString);
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // configure ef to use same enum as defined in C#
        modelBuilder.HasPostgresEnum<JobStatus>(schema: "kgs");

        base.OnModelCreating(modelBuilder);

        // Apply TickerQ entity configurations explicitly
        //modelBuilder.ApplyConfiguration(new TimeTickerConfigurations("kgs"));
        //modelBuilder.ApplyConfiguration(new CronTickerConfigurations("kgs"));
        //modelBuilder.ApplyConfiguration(new CronTickerOccurrenceConfigurations("kgs"));

        modelBuilder.Entity<TeamUserPreference>(entity =>
        {
            entity.Property(t => t.Id)
                .UseIdentityColumn(); // Configure PostgreSQL auto-increment for primary keys

            entity.HasIndex(t => t.MsftTeamsAadObjectId)
                .IsUnique(); // Configure unique constraint for MsftTeamsAadObjectId
        });

        modelBuilder.Entity<DistributedCacheEntry>()
            .HasKey(e => e.Key);

        modelBuilder.Entity<ProactiveSubscription>(entity =>
        {
            entity.HasIndex(e => new { e.ServiceType, e.ChannelId, e.InstanceId, e.UserEmail })
                  .IsUnique();

            // Created defaults to NOW()
            entity.Property(e => e.Created)
                  .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Updated stays NULL on insert, only updated later
            entity.Property(e => e.Updated)
                  .HasDefaultValue(null);

            // JSON column (PostgreSQL jsonb)
            entity.Property(e => e.SubscriptionParameters)
                  .HasColumnType("jsonb")
                  .HasConversion(
                    v => v.ToString(Formatting.None),
                    v => JObject.Parse(v));
        });

        modelBuilder.Entity<StoredKeyValue>(entity =>
        {
            entity.Property(t => t.Id)
                .UseIdentityColumn(); // Configure PostgreSQL auto-increment for primary keys

            entity.HasIndex(e => new { e.InstanceId, e.DictionaryName, e.Key })
                .IsUnique()
                .HasDatabaseName("IX_StoredKeyValues_Key_Unique");

            entity.HasIndex(e => new { e.InstanceId, e.DictionaryName, e.Order })
            .IsUnique()
            .HasDatabaseName("IX_StoredKeyValues_Order_Unique");
        });

        modelBuilder.Entity<JobDefinition>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.JobType)
                  .HasMaxLength(100)
                  .IsRequired();

            entity.Property(e => e.ConstructionString)
                  .IsRequired();

            entity.HasIndex(e => new { e.JobType, e.InstanceId })
                  .IsUnique();

            entity.Property(e => e.LastRunStatus)
                  .HasConversion<int>(); // enum as int

            entity.Property(e => e.IsRunning)
                  .HasDefaultValue(false);

            entity.Property(e => e.IsDisabled)
                  .HasDefaultValue(false);

            entity.Property(e => e.MaxRetries)
                  .HasDefaultValue(5);

            entity.Property(e => e.CreatedAt)
                  .HasDefaultValueSql("NOW()");

            entity.Property(e => e.UpdatedAt)
                  .HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<JobRunHistory>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasOne(e => e.JobDefinition)
                  .WithMany(j => j.RunHistory)
                  .HasForeignKey(e => e.JobDefinitionId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.Property(e => e.Status)
                  .HasConversion<int>(); // enum as int

            entity.Property(e => e.CreatedAt)
                  .HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<LlmCallLog>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                  .UseIdentityColumn(); // PostgreSQL auto-increment

            entity.Property(e => e.LlmName)
                  .HasMaxLength(100)
                  .IsRequired();

            entity.Property(e => e.PromptName)
                  .HasMaxLength(100)
                  .IsRequired();

            entity.Property(e => e.CreatedAt)
                  .HasDefaultValueSql("NOW()");

            // Indexes for common queries
            entity.HasIndex(e => e.LlmName);
            entity.HasIndex(e => e.PromptName);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => new { e.TenantId, e.CreatedAt });
        });

        modelBuilder.Entity<LlmCallFailure>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                  .UseIdentityColumn(); // PostgreSQL auto-increment

            entity.Property(e => e.LlmName)
                  .HasMaxLength(100)
                  .IsRequired();

            entity.Property(e => e.PromptName)
                  .HasMaxLength(100)
                  .IsRequired();

            entity.Property(e => e.CreatedAt)
                  .HasDefaultValueSql("NOW()");

            // Indexes for common queries
            entity.HasIndex(e => e.LlmName);
            entity.HasIndex(e => e.PromptName);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.StatusCode);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => new { e.TenantId, e.CreatedAt });
        });
    }

    public override void Dispose()
    {
        if (!dontLetItDispose) base.Dispose();
    }
}
