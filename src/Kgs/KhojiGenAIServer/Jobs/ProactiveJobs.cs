// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Data;
using KhojiGenAIServer.Extensions;
using KhojiGenAIServer.Features;
using KhojiGenAIServer.Features.Watches;
using Microsoft.TeamsFx.Conversation;
using TickerQ.Utilities.Base;
using Unleash;

namespace KhojiGenAIServer.Jobs;

internal class ProactiveJobs(
    IUnleash unleash,
    ILogger<ProactiveJobs> logger,
    ConversationBot conversationBot)
{
    readonly string connectionString = KhojiConstants.DatabaseConnectionString;

    void iterate(List<(string serviceType, Action<KGSDbContext, ProactiveSubscription> action)> jobs)
    {
        foreach (var job in jobs)
        {
            if (string.IsNullOrWhiteSpace(job.serviceType)) continue;
            if (job.action == null) continue;

            using (var db = new KGSDbContext(this.connectionString))
            {
                var q = from s in db.ProactiveSubscriptions
                        where s.ServiceType == job.serviceType
                        select s;

                var subscriptions = q.ToArray();
                if (!subscriptions.Any()) return;

                foreach (var r in subscriptions)
                {
                    var serviceType = r.ServiceType;
                    logger.LogInformation($"[{serviceType}:{r.InstanceId}] 🚀 Starting for {r.UserEmail}");

                    try
                    {
                        job.action(db, r);
                        logger.LogInformation($"[{serviceType}:{r.InstanceId}] ✅ Completed for {r.UserEmail}");
                    }
                    catch (Exception ex)
                    {
                        logger.LogError(ex, $"[{serviceType}:{r.InstanceId}] ⚠️ Failed for {r.UserEmail}");
                    }
                }

                try
                {
                    db.SaveChanges(); // in case action forgot to update
                }
                catch { } // not sure if state is not changed, savechanges silently ignore or throws exception
            }
        }
    }

    [TickerFunction(functionName: nameof(ProcessProactiveSubscriptionsQuickly), cronExpression: "0 * * * * *")] // every min
    public void ProcessProactiveSubscriptionsQuickly()
    {
        iterate([
            ("x-supervisor-syncstart",
            (db, row) => SyncFeature.SyncStartedProactiveJobHandler(logger, unleash, conversationBot, this.connectionString, db, row))
        ]);
    }

    [TickerFunction(functionName: nameof(ProcessProactiveSubscriptions), cronExpression: "0 */5 * * * *")]  // every 5 min
    public void ProcessProactiveSubscriptions()
    {
        bool sprintWatchFeatureFlag = false;
        if (null != unleash) sprintWatchFeatureFlag = unleash.IsEnabled("sprint-watch", false);

        if (sprintWatchFeatureFlag)
            iterate([("x-sprintwatch", (db, r) => this.SprintWatchJqlJobAsync(logger,
                conversationBot, this.connectionString, db, r).Wait())]);
    }

    [TickerFunction(functionName: nameof(ProcessProactiveSubscriptionsNormally), cronExpression: "0 */15 * * * *")] // every 15mins
    public void ProcessProactiveSubscriptionsNormally()
    {
        bool sprintWatchFeatureFlag = false;
        if (null != unleash) sprintWatchFeatureFlag = unleash.IsEnabled("sprint-watch", false);

        if (sprintWatchFeatureFlag)
            iterate([("x-sprintwatch", (db, r) => this.SprintActiveCheckJobAsync(logger,
                conversationBot, this.connectionString, db, r).Wait())]);

        //if (DateTime.UtcNow.Hour > 5)
        //{
        //    this.logger.LogInformation("[AutoSync] skipping because of day hours");
        //    return;
        //} else
        if (DateTime.UtcNow.IsWeekend()) return;

        try
        {
            var db = new KGSDbContext(this.connectionString);
            var q = from s in db.ProactiveSubscriptions
                    where s.ServiceType == "x-supervisor-syncauto"
                    select s;

            foreach (var r in q.ToArray())
            {
                try
                {
                    if (!r.Updated.HasValue || DateTime.UtcNow.Date > r.Updated.Value.Date)
                    {
                        SyncFeature.TriggerSyncing(logger, this.connectionString, r.InstanceId, r.UserEmail, r.ChannelId);

                        r.Updated = DateTime.UtcNow;
                        db.SaveChanges();
                    }
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, $"[AutoSync:{r.InstanceId}] failed for {r.UserEmail}");
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"[AutoSync] failed");
        }
    }
}
