// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Chat.Plugins;
using KhojiGenAIServer.Data;
using KhojiGenAIServer.DatabaseCollections;
using KhojiGenAIServer.Extensions;
using KhojiGenAIServer.Infrastructure;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Caching.Distributed;
using System.Text;

namespace KhojiGenAIServer.Features.Watches;

// public because of tests
public class WatchlistJob
{
    readonly ILogger logger;
    readonly string connectionString;

    WatchlistJob(ILogger logger, string connectionString) =>
        (this.logger, this.connectionString) = (logger, connectionString);

    public WatchlistJob(ILogger<WatchlistJob> logger) : this(logger, KhojiConstants.DatabaseConnectionString)
    { }

    public static WatchlistJob Create(ILogger logger, string connectionString) =>
        new WatchlistJob(logger, connectionString);

    async Task<string> generateUpdatesAsync(int instanceId)
    {
        var gateway = new KssGateway(logger, this.connectionString, instanceId);
        return await gateway.GenerateTodaysUpdatesAsync(atlassianTenantName: null, gateway.GetConfiguredSprint());
    }

    void handleSync(int instanceId) =>
        logger.LogInformation($"[TodaysUpdates:{instanceId}] ↪️ Content not updated, we need to sync");

    async Task processTenantAsync(int instanceId)
    {
        try
        {
            using var db = new KGSDbContext(this.connectionString);
            var qjd = from j in db.JobDefinitions
                      where j.JobType == nameof(WatchlistJob)
                      && j.InstanceId == instanceId
                      select j;
            var rjd = qjd.FirstOrDefault();
            if (null == rjd)
            {
                rjd = new JobDefinition
                {
                    JobType = nameof(WatchlistJob),
                    InstanceId = instanceId
                };
                db.JobDefinitions.Add(rjd);
                db.SaveChanges();
                this.logger.LogInformation($"[TodaysUpdates:{instanceId}] 💾 Record created...");
            }

            var cutoff = DateTime.UtcNow.Date.AddDays(-1);
            if (rjd.LastRunTime is not null && rjd.LastRunTime > cutoff) return;

            IDistributedCache cache = new PostgresDistributedCache(this.connectionString);
            var kssGateway = new KssGateway(this.logger, this.connectionString, instanceId);

            if (kssGateway.CanQueryTenantData)
            {
                this.logger.LogInformation($"[TodaysUpdates:{instanceId}] ✅ Status OK. Proceeding...");
                var kbsGateway = new KbsGateway(logger, this.connectionString);
                await HandleOkAsync(cache, kbsGateway, kssGateway, instanceId,
                    newInsights: null); // we are not interested
                rjd.LastRunStatus = JobStatus.Success;
            }
            else if (kssGateway.NeedsSync)
            {
                this.logger.LogInformation($"[TodaysUpdates:{instanceId}] ⚠️ Needs a sync...");
                cache.Remove($"todays-updates-{instanceId}");
                handleSync(instanceId);
                rjd.LastRunStatus = JobStatus.Skipped;
            }
            else
            {
                this.logger.LogInformation($"[TodaysUpdates:{instanceId}] 🚧 Something weird happened...");
                cache.Remove($"todays-updates-{instanceId}");
                rjd.LastRunStatus = JobStatus.Failed;
            }

            rjd.LastRunTime = DateTime.UtcNow;
            rjd.UpdatedAt = DateTime.UtcNow;
            db.SaveChanges();
            this.logger.LogInformation($"[TodaysUpdates:{instanceId}] 💾 Record updated...");
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, $"[TodaysUpdates:{instanceId}] 🔥 Failure");
        }
    }

    public async Task HandleOkAsync(IDistributedCache cache, KbsGateway kbsGateway, KssGateway kssGateway, int instanceId,
        Action<string> newInsights)
    {
        if (kbsGateway.GetConfiguredSprintId(instanceId) is not int sid)
        {
            this.logger.LogWarning($"[TodaysUpdates:{instanceId}] ⚠️ No configured sprint found");
            return;
        }

        if (kssGateway.GetSprint(sid, out string additional) is not int sprintId)
        {
            this.logger.LogWarning($"[TodaysUpdates:{instanceId}] [{sid}] ⚠️ The configured sprint is no more an active sprint or is not getting synced anymore");
            return;
        }

        this.logger.LogInformation($"[TodaysUpdates:{instanceId}] Generating Insights for {sprintId}");

        try
        {
            var insights = await generateUpdatesAsync(instanceId);
            if (string.IsNullOrWhiteSpace(insights))
                cache.Remove($"todays-updates-{instanceId}");
            else
            {
                cache.SetString($"todays-updates-{instanceId}", insights, new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(30)
                });

                newInsights?.Invoke(insights);
            }
        }
        catch (Exception ex)
        { this.logger.LogError(ex, $"[TodaysUpdates:{instanceId}] [{sprintId}] Failed to process"); }
    }

    //[TickerFunction(functionName: nameof(GenerateUpdatesAsync), cronExpression: "??")] // every 15mins
    public async Task GenerateUpdatesAsync()
    {
        if (DateTime.UtcNow.Hour < 2)
        {
            this.logger.LogInformation("[TodaysUpdates] skipping because of early hours");
            return;
        }
        else if (DateTime.UtcNow.IsWeekend())
        {
            this.logger.LogInformation("[TodaysUpdates] skipping because of weekend");
            return;
        }
        else
            this.logger.LogInformation("[TodaysUpdates] starting");

        try
        {
            var dataAccess = new PgDataAccess(this.connectionString);
            var tenants = dataAccess.ExecuteReader<(string TenantId, string SchemaName)>(@"
            SELECT tenant_id, schema_name
	        FROM kss_system.tenants
            ORDER BY tenant_id
            ",
            r => (r.GetString(0), r.GetString(1)));

            this.logger.LogInformation($"[TodaysUpdates] {tenants.Count} tenants in KSS");

            //var tasks = tenants.Select(t => processTenant(t.TenantId, t.SchemaName));
            //await Task.WhenAll(tasks);

            foreach (var t in tenants)
                if (int.TryParse(t.TenantId, out var tenantId))
                    await processTenantAsync(tenantId);
                else
                    this.logger.LogInformation($"[TodaysUpdates] skipping {t.TenantId} [{t.SchemaName}], couldnt parse it as number");

            this.logger.LogInformation($"[TodaysUpdates] ending");
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, $"[TodaysUpdates] failed");
        }
    }

    public async Task<string> ForTestAsync(int instanceId) =>
        await generateUpdatesAsync(instanceId);
}

static class WatchlistExtensions
{
    static async Task<string> generateLlmResponseAsync(KssGateway gateway, IChatClient client, List<string> insights)
    {
        var chatMessages = new List<ChatMessage>
        {
            new ChatMessage(ChatRole.System,
            "Generate a response using the information available, response should be professional and data oriented")
        };
        chatMessages.AddRange(insights.Select(s => new ChatMessage(ChatRole.User, s)));

        var response = await LlmIntegration.MakeAICallAsync(gateway.Logger, client,
            "watchlist-updates", chatMessages,
            tenantId: gateway.InstanceId);

        return response.Text;
    }

    public static async Task<string> GenerateTodaysUpdatesAsync(this KssGateway gateway,
        string atlassianTenantName, int sprintId,
        bool shouldSave = true)
    {
        Dictionary<string, WorkItemSnapshot> snapshots = new();

        foreach (var i in gateway.GetBlockedIssues(sprintId))
            snapshots.Add(i.issue_key, new WorkItemSnapshot
            {
                Key = i.issue_key,
                IsBlocked = true
            });
        foreach (var i in gateway.GetUnassignedIssues(sprintId))
            if (snapshots.ContainsKey(i.issue_key))
                snapshots[i.issue_key].IsAssigned = false;
            else
                snapshots.Add(i.issue_key, new WorkItemSnapshot
                {
                    Key = i.issue_key,
                    IsAssigned = false
                });
        foreach (var i in gateway.GetUnstartedHighPriorityIssues(sprintId))
            if (snapshots.ContainsKey(i.issue_key))
                snapshots[i.issue_key].ShouldHaveStarted = true;
            else
                snapshots.Add(i.issue_key, new WorkItemSnapshot
                {
                    Key = i.issue_key,
                    ShouldHaveStarted = true
                });
        foreach (var i in gateway.GetCarryOverIssues(sprintId))
            if (snapshots.ContainsKey(i.issue_key))
                snapshots[i.issue_key].ShouldHaveCompleted = true;
            else
                snapshots.Add(i.issue_key, new WorkItemSnapshot
                {
                    Key = i.issue_key,
                    ShouldHaveCompleted = true
                });


        var trackableDictionary = new TrackableDictionary<TrackedWorkItem>(gateway.Logger, gateway.ConnectionString, gateway.InstanceId,
            "TodaysUpdates"); // we can add sprint for uid
        var diff = trackableDictionary.Difference(snapshots.Values);

        if (shouldSave) await trackableDictionary.ReplaceWithAsync(diff.NextState);

        bool externalLinkAdded = false;
        var toReturn = diff.ToFriendlyString(returnNullWhenNothing: true, // so we can deterministically detect no issues detected (clear cache)
            getLink: key =>
            {
                externalLinkAdded = true;
                return atlassianTenantName.HasText() ? $"🔗 [{key}](https://{atlassianTenantName}.atlassian.net/browse/{key})" : key;
            });

        var sb = new StringBuilder(toReturn);
        if (externalLinkAdded)
        {
            sb.AppendLine("---");
            sb.AppendLine("🔗 *Links open in external site*");
        }

        return sb.ToString();
    }

    public static async Task<string> GenerateUpdatesAsync(this SprintPlugin plugin, IChatClient client = null)
    {
        var insights = new List<string>();

        var blocked = plugin.GetBlockedIssuesAsString();
        if (!string.IsNullOrEmpty(blocked) && blocked != "{}" && blocked != "[]")
        {
            insights.Add("⚠️ There are blocked issues that need attention");
            insights.Add(blocked);
        }

        var unassigned = plugin.GetUnassignedIssuesAsString();
        if (!string.IsNullOrEmpty(unassigned) && unassigned != "{}" && unassigned != "[]")
        {
            insights.Add("📋 Some issues still need to be assigned");
            insights.Add(unassigned);
        }

        var highPriorityUnstarted = plugin.GetUnstartedHighPriorityIssuesAsString();
        if (!string.IsNullOrEmpty(highPriorityUnstarted) && highPriorityUnstarted != "{}" && highPriorityUnstarted != "[]")
        {
            insights.Add("🔥 High priority work hasn't been started yet");
            insights.Add(highPriorityUnstarted);
        }

        return client is null
            ? insights.Any()
                ? $"**Sprint Health Check**:\n{string.Join("\n", insights)}"
                : "✅ No immediate issues detected in the current sprint"
            : insights.Any()
                ? await generateLlmResponseAsync(plugin.Gateway, client, insights)
                : null; // so we can deterministically detect no issues detected (clear cache)
    }
}
