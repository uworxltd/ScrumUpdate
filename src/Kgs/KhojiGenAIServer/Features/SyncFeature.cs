// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Data;
using KhojiGenAIServer.Extensions;
using KhojiGenAIServer.Features.Watches;
using KhojiGenAIServer.Infrastructure;
using KhojiGenAIServer.Services;
using Microsoft.Agents.Builder;
using Microsoft.TeamsFx.Conversation;
using System.Text.Json;
using Unleash;

namespace KhojiGenAIServer.Features;

static class SyncFeature
{
    class XJobIdMetaData
    {
        public string jobId { get; set; } = null;
    }

    enum SyncResult { DataSyncDisabled, SyncStarted, TriggerFailed }

    static SyncResult sync(ILogger logger, int instanceId, string email, JsonElement payload, out string jobId)
    {
        var client = new KbsClient(email);
        client.InitializeToken();

        if (client.SyncStarted(logger, instanceId, payload, out jobId))
            return SyncResult.SyncStarted;
        else
        {
            logger.LogError($"[SyncFeature] Failed to trigger sync for {email}");
            return SyncResult.TriggerFailed;
        }
    }

    static SyncResult sync(ILogger logger, string connectionString, int instanceId, string email, out string jobId)
    {
        jobId = null;
        var gw = new KbsGateway(logger, connectionString);
        if (!gw.IsDataSyncEnabled(instanceId)) return SyncResult.DataSyncDisabled;


        var payload = new { job_type = "sprints_list_sync" };
        return sync(logger, instanceId, email, JsonSerializer.SerializeToElement(payload), out jobId);
    }

    public static void SyncStartedProactiveJobHandler(ILogger logger, IUnleash unleash, ConversationBot conversationBot, string connectionString,
        KGSDbContext db, ProactiveSubscription row)
    {
        var email = row.UserEmail;
        var instanceId = row.InstanceId;
        var serviceType = row.ServiceType;
        var jobId = row.SubscriptionParameters?["jobId"]?.ToString();

        if (string.IsNullOrEmpty(jobId))
        {
            logger.LogInformation($"[{serviceType}:{instanceId}] ⚠️ Unable to determine jobId, giving up...");
            db.ProactiveSubscriptions.Remove(row);
            db.SaveChanges();
            return;
        }

        var c = new KbsClient(email)
            .InitializeToken();

        if (c.SyncJobStatus(logger, instanceId, jobId, out string jobType) && !string.IsNullOrWhiteSpace(jobType))
        {
            logger.LogInformation($"[{serviceType}:{instanceId}] ✅ {jobType} is completed");

            if (jobType == "sprints_list_sync")
            {
                var g = new KbsGateway(logger, connectionString);
                var config = g.GetSprintAnalyticsConfigurations(instanceId);
                var sprintIdKey = "sprint.analytics.target.sprint.id";

                if (config != null && config.ContainsKey(sprintIdKey) && int.TryParse(config[sprintIdKey], out int sprintId) && sprintId > 0)
                {
                    var payload = new
                    {
                        job_type = "sprint_issues_worklog_workflow",
                        parameters = new
                        {
                            sprint_ids = new[] { sprintId },
                            sprint_states = new[] { "active" },
                            include_comments = true,
                            include_changelog = true,
                            include_subtasks = true
                        }
                    };

                    var result = sync(logger, instanceId, email, JsonSerializer.SerializeToElement(payload), out string nextJobId);
                    if (result == SyncResult.SyncStarted)
                    {
                        logger.LogInformation($"[{serviceType}:{instanceId}] ✅ Queued sprint_issues_worklog_workflow job {nextJobId}");
                        row.SubscriptionParameters = Newtonsoft.Json.Linq.JObject.FromObject(new XJobIdMetaData { jobId = nextJobId });
                        db.SaveChanges();
                    }
                    else
                    {
                        logger.LogInformation($"[{serviceType}:{instanceId}] ⚠️ Couldnt queue sprint_issues_worklog_workflow job, giving up...");
                        db.ProactiveSubscriptions.Remove(row);
                        db.SaveChanges();
                        return;
                    }
                }
                else
                {
                    logger.LogInformation($"[{serviceType}:{instanceId}] ⚠️ Couldnt find {sprintIdKey} config, giving up...");
                    db.ProactiveSubscriptions.Remove(row);
                    db.SaveChanges();
                    return;
                }
            }
            else if (jobType == "sprint_issues_worklog_workflow")
            {
                var kbsG = new KbsGateway(logger, connectionString);
                var config = kbsG.GetSprintAnalyticsConfigurations(instanceId);

                var sprintIdKey = "sprint.analytics.target.sprint.id";

                if (config != null
                    && config.ContainsKey(sprintIdKey) && int.TryParse(config[sprintIdKey], out int sprintId) && sprintId > 0)
                {
                    var kssG = new KssGateway(logger, connectionString, instanceId);
                    if (kssG.GetSprint(sprintId, out DateTime? start, out DateTime? end, out string errorOrMessage) is int &&
                        start.HasValue && end.HasValue)
                    {
                        var nowUtc = DateTime.UtcNow;
                        if (end > nowUtc) end = nowUtc;

                        var jqlEnd = end.Value.AddDays(1);
                        var jql = $"updated >= \"{start.Value:yyyy-MM-dd}\" AND updated <= \"{jqlEnd:yyyy-MM-dd}\"";

                        var projectIdKey = "sprint.analytics.target.project.key";
                        if (config.ContainsKey(projectIdKey) && config.TryGetValue(projectIdKey, out string projectId) && !string.IsNullOrWhiteSpace(projectId))
                            jql = $"project = '{projectId}' AND {jql}";

                        var payload = new
                        {
                            job_type = "jql_issues_worklog_workflow",
                            parameters = new
                            {
                                jql = jql,
                                include_comments = true,
                                include_changelog = true
                            }
                        };

                        var result = sync(logger, instanceId, email, JsonSerializer.SerializeToElement(payload), out string nextJobId);
                        if (result == SyncResult.SyncStarted)
                        {
                            logger.LogInformation($"[{serviceType}:{instanceId}] ✅ Queued jql_issues_worklog_workflow job {nextJobId}");
                            row.SubscriptionParameters = Newtonsoft.Json.Linq.JObject.FromObject(new XJobIdMetaData { jobId = nextJobId });
                            db.SaveChanges();
                        }
                        else
                        {
                            logger.LogInformation($"[{serviceType}:{instanceId}] ⚠️ Couldnt queue jql_issues_worklog_workflow job, giving up...");
                            db.ProactiveSubscriptions.Remove(row);
                            db.SaveChanges();
                            return;
                        }
                    }
                }
                else
                {
                    logger.LogInformation($"[{serviceType}:{instanceId}] ⚠️ Couldnt find {sprintIdKey} config, giving up...");
                    db.ProactiveSubscriptions.Remove(row);
                    db.SaveChanges();
                    return;
                }
            }
            else if (jobType == "jql_issues_worklog_workflow")
            {
                db.ProactiveSubscriptions.Remove(row);
                logger.LogInformation($"[{serviceType}:{instanceId}] ✅ Sync completed");

                if (null != conversationBot)
                {
                    bool cheatCodesFeatureFlag = false;
                    if (null != unleash) cheatCodesFeatureFlag = unleash.IsEnabled("cheat-codes", false);

                    bool insightsCalculated = false;
                    string insights = null;

                    foreach (var installation in conversationBot.GetAllInstallationsAsync().Result)
                        if (installation.ConversationReference.Conversation.Id == row.ChannelId)
                        {
                            installation.SendMessage($"Sync was successfully completed").Wait();
                            logger.LogInformation($"[{serviceType}:{instanceId}] ✅ Message sent to {row.ChannelId}");

                            if (!insightsCalculated && cheatCodesFeatureFlag)
                            {
                                insightsCalculated = true;

                                var job = WatchlistJob.Create(logger, connectionString);
                                var kbsGateway = new KbsGateway(logger, connectionString);
                                var kssGateway = new KssGateway(logger, connectionString, instanceId);
                                var cache = new PostgresDistributedCache(connectionString);

                                job.HandleOkAsync(cache, kbsGateway, kssGateway, instanceId,
                                    newInsights: s => insights = s).Wait();
                            }

                            if (!string.IsNullOrWhiteSpace(insights) && cheatCodesFeatureFlag)
                            {
                                insights += "   \n   \n**cheat-code** flag was enabled";
                                installation.SendMessage(insights).Wait();
                                logger.LogInformation($"[{serviceType}:{instanceId}] ✅ Insights sent to {row.ChannelId}");
                            }
                        }
                }
            }
            else
            {
                logger.LogInformation($"[{serviceType}:{instanceId}] ⚠️ Dont know what to do next, giving up...");
                db.ProactiveSubscriptions.Remove(row);
                db.SaveChanges();
                return;
            }
        }
    }

    public static async Task TriggerSyncingAsync(this ITurnContext turnContext, ILogger logger, string connectionString, int instanceId, string email, CancellationToken token)
    {
        await turnContext.SendActivityAsync(sync(logger, connectionString,
            instanceId, email, out string jobId) switch
        {
            SyncResult.DataSyncDisabled => $"Jira sync is disabled for your instance, visit {KhojiConstants.KhojiXBaseUrl} to enable it first!",
            SyncResult.SyncStarted when
                turnContext.SubscribeProactively(email, instanceId, serviceType: "x-supervisor-syncstart", metaData: new XJobIdMetaData { jobId = jobId }) is
                    ProactiveSubscriptions.SubscriptionStatus.Subscribed or ProactiveSubscriptions.SubscriptionStatus.Updated
                    => "Sync is triggered successfully",
            _ => "Failed to trigger the sync"
        },
            cancellationToken: token);
    }

    public static void TriggerSyncing(ILogger logger, string connectionString, int instanceId, string email, string channelId)
    {
        var result = sync(logger, connectionString, instanceId, email, out var jobId);

        if (result == SyncResult.SyncStarted)
        {
            var status = ProactiveSubscriptions.SubscribeProactively(channelId, email, instanceId, serviceType: "x-supervisor-syncstart", metaData: new XJobIdMetaData { jobId = jobId });
            if (status == ProactiveSubscriptions.SubscriptionStatus.Subscribed || status == ProactiveSubscriptions.SubscriptionStatus.Updated)
                logger.LogInformation($"[AutoSync:{instanceId}] x-supervisor-syncstart subscribed for {email}, {channelId}");
            else
                logger.LogError($"[AutoSync:{instanceId}] x-supervisor-syncstart subscription failed for {email}, {channelId}");
        }
        else
            logger.LogError($"[AutoSync:{instanceId}] {result} for {email}");
    }
}
