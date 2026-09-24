// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using Dapplo.Jira;
using Dapplo.Jira.Entities;
using KhojiGenAIServer.Data;
using KhojiGenAIServer.Extensions;
using KhojiGenAIServer.Jobs;
using Microsoft.TeamsFx.Conversation;
using System.ComponentModel;
using System.Text;

namespace KhojiGenAIServer.Features.Watches;

class XJqlJobMetaData
{
    public string Jql;
}

public record BaseWorkItem
{
    public bool IsBlocked { get; set; } = false;
    public bool IsAssigned { get; set; } = true;
    public bool ShouldHaveCompleted { get; set; } = false;
    public bool ShouldHaveStarted { get; set; } = false;
}

public record TrackedWorkItem : BaseWorkItem
{
    public DateTime? BlockedSince { get; set; }
    public DateTime? UnassignedSince { get; set; }
    public DateTime? NotCompletedSince { get; set; }
    public DateTime? NotStartedSince { get; set; }

    public DateTime FirstSeen { get; set; } = DateTime.UtcNow;
}

public record WorkItemSnapshot : BaseWorkItem
{
    public string Key { get; init; } = string.Empty;
}

public record WorkItemChange
{
    public string Key { get; init; } = string.Empty;
    public TrackedWorkItem OldItem { get; init; } = default!;
    public TrackedWorkItem NewItem { get; init; } = default!;
    public bool BlockedChanged { get; init; }
    public bool AssignedChanged { get; init; }
    public bool ShouldCompletedChanged { get; init; }
    public bool ShouldStartedChanged { get; init; }
}

public class WorkItemDifference
{
    static int daysBetween(DateTime? since, DateTime now)
    {
        if (!since.HasValue) return 0;
        return (now - since.Value).Days;
    }

    static string plural(int days) =>
        days == 1 ? "" : "s";

    public List<(string Key, TrackedWorkItem Item)> Added { get; } = new();
    public List<(string Key, TrackedWorkItem Item)> Removed { get; } = new();
    public List<WorkItemChange> Changed { get; } = new();

    // This is the fully computed "next" state that we persist after messaging.
    public Dictionary<string, TrackedWorkItem> NextState { get; } = new();

    public string ToFriendlyString(bool returnNullWhenNothing, Func<string, string> getLink)
    {
        var sb = new StringBuilder();

        if (!Added.Any() && !Removed.Any() && !Changed.Any())
            return returnNullWhenNothing ? null : "No changes since yesterday ✅";

        sb.AppendLine("**New task(s) spotted for the Watchlist** 👀");

        foreach (var (key, item) in Added)
        {
            sb.AppendLine($"- 🚨 Heads up! Task {key} just landed, its " +
                $"{(item.IsBlocked ? "⛔️ Blocked" : "")} " +
                $"{(item.IsAssigned ? "" : "🙋 Unassigned ")} " +
                $"{(item.ShouldHaveCompleted ? "" : "🕓 Overdue")} " +
                $"{(item.ShouldHaveStarted ? "" : "⏳ Not started yet")}");
        }

        foreach (var (key, _) in Removed)
            sb.AppendLine($"- ✅ {key} is now settled/removed");

        foreach (var wi in Changed)
        {
            var key = wi.Key;
            var old = wi.OldItem;
            var cur = wi.NewItem;

            var daysBlocked = daysBetween(wi.OldItem.BlockedSince, DateTime.UtcNow.Date);
            var daysUnassigned = daysBetween(wi.OldItem.UnassignedSince, DateTime.UtcNow.Date);
            var daysNotStarted = daysBetween(wi.OldItem.NotStartedSince, DateTime.UtcNow.Date);
            var daysNotCompleted = daysBetween(wi.OldItem.NotCompletedSince, DateTime.UtcNow.Date);

            if (old.IsBlocked && !cur.IsBlocked) // ⛔️ Blocked → Unblocked
                sb.AppendLine($"- 🟢 **{key}** is no longer blocked ✅");
            //sb.AppendLine($"- 🟢 **{key}** is no longer blocked ✅ " +
            //    $"(was blocked for {daysBlocked} day{plural(daysBlocked)}) " +
            //    $"{(!cur.IsAssigned ? $"🙋‍ Still unassigned (for {daysUnassigned} day{plural(daysUnassigned)}) " : "")}" +
            //    $"{(cur.ShouldHaveStarted ? $"⏳ Not started (for {daysNotStarted} day{plural(daysNotStarted)}) " : "")}" +
            //    $"{(cur.ShouldHaveCompleted ? $"🔥 Overdue (for {daysNotCompleted} day{plural(daysNotCompleted)})" : "")}");
            else if (!old.IsBlocked && cur.IsBlocked) // 🧱 Unblocked → Blocked
                sb.AppendLine($"- ⛔️ **{key}** just got blocked");

            if (!old.IsAssigned && cur.IsAssigned) // 👤 Assignment changes
                sb.AppendLine($"- 🙌 **{key}** has been assigned");
            //sb.AppendLine($"- 🙌 **{key}** has been assigned " +
            //    $"(was unassigned for {daysUnassigned} day{plural(daysUnassigned)})");
            else if (old.IsAssigned && !cur.IsAssigned)
                sb.AppendLine($"- 🙋‍ **{key}** became unassigned");

            //if (!old.IsCompleted && cur.IsCompleted)
            //    sb.AppendLine($"- ✅ **{key}** has been completed! 🎉");
            //if (!old.HasStarted && cur.HasStarted)
            //    sb.AppendLine($"- 🏁 **{key}** has started");

            if (cur.ShouldHaveStarted) // 🕓 Still not started but aging
            {
                if (daysNotStarted >= 3)
                    sb.AppendLine($"- ⏳ **{key}** hasn’t started for {daysNotStarted} day{plural(daysNotStarted)} — needs attention ⚠️");
                else
                    sb.AppendLine($"- ⏳ **{key}** not started yet (for {daysNotStarted} day{plural(daysNotStarted)})");
            }

            if (cur.ShouldHaveCompleted) // 🔥 Overdue but not completed
                sb.AppendLine($"- 🔥 **{key}** is overdue (for {daysNotCompleted} day{plural(daysNotCompleted)})");

            if (old.ShouldHaveCompleted && !cur.ShouldHaveCompleted) // ✅ Newly completed
                sb.AppendLine($"- ✅ **{key}** has been completed! 🎉");
        }

        // Escalation: still blocked/unassigned for long
        foreach (var (key, item) in NextState)
        {
            if (item.IsBlocked && item.BlockedSince.HasValue) // Blocked too long
            {
                var days = (DateTime.UtcNow - item.BlockedSince.Value).Days;
                if (days >= 2)
                    sb.AppendLine($"- ⚠️ **{key}** has been blocked for {days} day{plural(days)}");
            }
            if (!item.IsAssigned && item.UnassignedSince.HasValue) // Unassigned too long
            {
                var days = (DateTime.UtcNow - item.UnassignedSince.Value).Days;
                if (days >= 3)
                    sb.AppendLine($"- ⚠️ **{key}** has been unassigned for {days} day{plural(days)}");
            }
            if (item.ShouldHaveStarted && item.NotStartedSince.HasValue) // Not started for long
            {
                var days = (DateTime.UtcNow - item.NotStartedSince.Value).Days;
                if (days >= 3)
                    sb.AppendLine($"- ⚠️ **{key}** hasn’t started for {days} day{plural(days)}");
            }
            if (item.ShouldHaveStarted && item.NotCompletedSince.HasValue) // Overdue for long
            {
                var days = (DateTime.UtcNow - item.NotCompletedSince.Value).Days;
                if (days >= 2)
                    sb.AppendLine($"- 🔥 **{key}** is overdue for {days} day{plural(days)}");
            }
        }

        return sb.ToString().Trim();
    }
}

class ProactiveJql
{
    public record JiraItem([property: Description("Jira Project")] string ProjectKey,
        [property: Description("Work Item")] string Key,
        string Summary, string Status,
        [property: Description("Story Point")] string StoryPoints,
        string Assignee);

    public List<JiraItem> AddedItems { get; set; } = new();
    public List<JiraItem> DeletedItems { get; set; } = new();
    public Dictionary<JiraItem, string> ChangedItems { get; set; } = new();

    public string ToMarkDownString(string tenant)
    {
        bool externalLinkAdded = false;

        Func<IEnumerable<JiraItem>, string, string, string> markDownTable = (list, header, tenant) =>
        {
            var sb = new StringBuilder();

            sb.AppendLine($"### {header}");
            sb.AppendLine("| Key | Summary | Status | Story Points |  Asignee |");
            sb.AppendLine("|-----|---------|--------|--------------|----------|");

            foreach (var item in list)
            {
                externalLinkAdded = true;
                sb.AppendLine($"| 🔗 [{item.Key}](https://{tenant}.atlassian.net/browse/{item.Key}) | {item.Summary} | {item.Status} | {item.StoryPoints} | {item.Assignee} |");
            }

            sb.AppendLine();

            return sb.ToString();
        };

        var sb = new StringBuilder();

        if (DeletedItems.Count > 0) sb.AppendLine(markDownTable(DeletedItems, $"❌ Removed Sprint Item{(DeletedItems.Count > 1 ? "s" : "")}", tenant));
        if (AddedItems.Count > 0) sb.AppendLine(markDownTable(AddedItems, $"✅ Added Sprint Item{(AddedItems.Count > 1 ? "s" : "")}", tenant));
        if (ChangedItems.Count > 0)
        {
            sb.AppendLine($"### ⚠️ Changed Sprint Item{(ChangedItems.Count > 1 ? "s" : "")}");
            //sb.AppendLine("| Key | Change |");
            //sb.AppendLine("|-----|--------|");

            foreach (var item in ChangedItems)
            {
                externalLinkAdded = true;
                sb.AppendLine($"- 🔗 [{item.Key.Key}](https://{tenant}.atlassian.net/browse/{item.Key.Key}) {item.Key.Summary}, {item.Value}");
            }
        }

        if (externalLinkAdded)
        {
            sb.AppendLine("---");
            sb.AppendLine("🔗 *Links open in external site*");
        }

        return sb.ToString();
    }
}

public static class SprintWatchExtensions
{
    public static WorkItemDifference Difference(this IDictionary<string, TrackedWorkItem> previous,
        IEnumerable<WorkItemSnapshot> current,
        DateTime? nowOverride = null)
    {
        var now = nowOverride ?? DateTime.UtcNow;
        var diff = new WorkItemDifference();

        if (null == current) return diff;
        var currentDict = current.ToDictionary(s => s.Key);//, s => s);// as TrackedWorkItem);

        foreach (var (key, snap) in currentDict)
        {
            if (!previous.TryGetValue(key, out var oldItem))
            {
                var newItem = new TrackedWorkItem
                {
                    IsBlocked = snap.IsBlocked,
                    IsAssigned = snap.IsAssigned,
                    BlockedSince = snap.IsBlocked ? now : null,
                    UnassignedSince = snap.IsAssigned ? null : now,
                    FirstSeen = now
                };

                diff.Added.Add((key, newItem));
                diff.NextState[key] = newItem;
                continue;
            }

            // Transitions
            DateTime? newBlockedSince = snap.IsBlocked
                ? oldItem.IsBlocked
                    ? oldItem.BlockedSince ?? now       // carry over, default to now if missing
                    : now                               // became blocked just now
                : null;                                 // unblocked now

            // conceptually inverse of isblocked
            DateTime? newUnassignedSince = snap.IsAssigned
                ? null                                  // assigned now
                : oldItem.IsAssigned
                    ? now                               // became unassigned just now
                    : oldItem.UnassignedSince ?? now;   // carry over, default to now if missing

            var updated = new TrackedWorkItem
            {
                IsBlocked = snap.IsBlocked,
                IsAssigned = snap.IsAssigned,
                ShouldHaveStarted = snap.ShouldHaveStarted,
                ShouldHaveCompleted = snap.ShouldHaveCompleted,

                BlockedSince = newBlockedSince,
                UnassignedSince = newUnassignedSince,
                NotStartedSince = snap.ShouldHaveStarted // similar to newBlockedSince
                    ? oldItem.ShouldHaveStarted ? oldItem.NotStartedSince ?? now : now
                    : null,
                NotCompletedSince = snap.ShouldHaveCompleted // similar to newBlockedSince
                    ? oldItem.ShouldHaveCompleted ? oldItem.NotCompletedSince ?? now : now
                    : null,
                FirstSeen = oldItem.FirstSeen
            };

            var blockedChanged = oldItem.IsBlocked != updated.IsBlocked;
            var assignedChanged = oldItem.IsAssigned != updated.IsAssigned;

            if (blockedChanged || assignedChanged)
            {
                diff.Changed.Add(new WorkItemChange
                {
                    Key = key,
                    OldItem = oldItem,
                    NewItem = updated,
                    BlockedChanged = blockedChanged,
                    AssignedChanged = assignedChanged
                });
            }

            diff.NextState[key] = updated;
        }

        foreach (var (key, oldItem) in previous)
        {
            if (!currentDict.ContainsKey(key))
                diff.Removed.Add((key, oldItem));
        }

        return diff;
    }
}

static class SprintWatchInternalExtensions
{
    const string ConfigProjectKey = "sprint.analytics.target.project.key";       // KFX
    const string ConfigBoardId = "sprint.analytics.target.board.id";
    const string ConfigSprintId = "sprint.analytics.target.sprint.id";           // 430

    public static int DaysBlocked(this TrackedWorkItem item) =>
        item.BlockedSince.HasValue
        ? (DateTime.UtcNow - item.BlockedSince.Value).Days
        : 0;

    public static int DaysUnassigned(this TrackedWorkItem item) =>
        item.UnassignedSince.HasValue
        ? (DateTime.UtcNow - item.UnassignedSince.Value).Days
        : 0;

    public static DateTime? LastChanged(this TrackedWorkItem item) =>
        new[] { item.BlockedSince, item.UnassignedSince }
        .Where(d => d.HasValue)
        .Max();

    public static async Task SprintWatchJqlJobAsync(this ProactiveJobs job,
        ILogger logger, ConversationBot conversationBot, string connectionString,
        KGSDbContext db, ProactiveSubscription row)
    {
        if (null == conversationBot) return;

        var serviceType = row.ServiceType;
        var instanceId = row.InstanceId;

        if (row.Updated is null)
        {
            row.Updated = DateTime.UtcNow;
            db.SaveChanges();
        }

        if (row.ConsecutiveFailureCount > 9) // too many failures
        {
            logger.LogInformation($"[{serviceType}:{instanceId}] ❌ Too many failures, row.Updated: {row.Updated}, ConsecutiveFailureCount:{row.ConsecutiveFailureCount}");

            bool shouldReturn = true;

            if (row.Updated.Value.ElapsedTime() >= TimeSpan.FromHours(6))
            {
                row.Updated = DateTime.UtcNow;
                db.SaveChanges();

                shouldReturn = false;
            }

            if (shouldReturn) return;
        }
        else if (row.ConsecutiveFailureCount > 0)
        {
            if (row.Updated > DateTime.UtcNow)
            {
                logger.LogInformation($"[{serviceType}:{instanceId}] ❌ Skipping due to previous failures, row.Updated: {row.Updated}, ConsecutiveFailureCount:{row.ConsecutiveFailureCount}");
                return;
            }
        }

        var email = row.UserEmail;
        var jql = row.SubscriptionParameters?["Jql"]?.ToString();
        var kbs = new KbsGateway(logger, connectionString);
        var analyticsConfigurations = kbs.GetSprintAnalyticsConfigurations(instanceId);

        /*
            Instance id: 7751 x-sprintwatch {"Jql": "project = 'KFX' and sprint in openSprints() ORDER BY key"}
            sync.payload
            {"job_type":"recent_activity_issues","parameters":{"jql":"updated >= -7d","sprint_status":"active","include_comments":true,"include_changelog":true,"include_subtasks":true},"priority":10,"created_by":""}
         */

        if (analyticsConfigurations != null &&
            analyticsConfigurations.ContainsKey(ConfigProjectKey) && analyticsConfigurations.ContainsKey(ConfigSprintId) &&
            int.TryParse(analyticsConfigurations[ConfigSprintId], out int sprintId) && sprintId == 0) return;

        if (analyticsConfigurations != null &&
            analyticsConfigurations.ContainsKey(ConfigProjectKey) && analyticsConfigurations.ContainsKey(ConfigSprintId))
            jql = $"project = '{analyticsConfigurations[ConfigProjectKey]}' and sprint = {analyticsConfigurations[ConfigSprintId]} ORDER BY key";

        if (string.IsNullOrWhiteSpace(jql)) return;

        bool installationFound = false;
        logger.LogInformation($"[{serviceType}:{instanceId}] 👉 JQL: {jql}");
        logger.LogInformation($"[{serviceType}:{instanceId}] 👉 Determining bot installation");

        foreach (var installation in conversationBot.GetAllInstallationsAsync().Result)
            if (installation.ConversationReference.Conversation.Id == row.ChannelId)
            {
                installationFound = true;
                var step = "ProactiveJql.SyncJiraItemsAsync";

                try
                {
                    string projectKey = null;
                    (var proactive, var tenantName) = await JiraHelper.SyncJiraItemsAsync(logger, connectionString, email, instanceId, serviceType, jql,
                        items =>
                        {
                            if (items == null || items.Count() < 1) return;

                            var item = items.First();
                            projectKey = item.ProjectKey;
                            //item.
                        });

                    if (analyticsConfigurations != null && !string.IsNullOrWhiteSpace(projectKey) &&
                        !analyticsConfigurations.ContainsKey(ConfigProjectKey))
                    {
                        step = $"Updating Project Key: {projectKey}";
                        kbs.UpdateSprintAnalyticsConfiguration(instanceId, ConfigProjectKey, projectKey);
                    }

                    step = $"ToMarkDownString: {tenantName}";
                    var message = proactive.ToMarkDownString(tenantName);
                    if (!string.IsNullOrWhiteSpace(message))
                    {
                        step = "installation.SendMessage";
                        installation.SendMessage(message).Wait();
                        logger.LogInformation($"[{serviceType}:{instanceId}] ✅ Message sent to {row.ChannelId}");
                    }

                    row.ConsecutiveFailureCount = 0;
                    row.LastFailureMessage = null;
                    row.Updated = DateTime.UtcNow;
                }
                //catch (JiraException ex) when (ex.StatusCode == System.Net.HttpStatusCode.BadRequest) { }
                catch (Exception ex)
                {
                    logger.LogError(ex, $"[{serviceType}:{instanceId}] ⚠️ {step} failed for {row.ChannelId}, will backoff for an hour");

                    row.ConsecutiveFailureCount++;
                    row.LastFailureMessage = ex.ToString();
                    row.Updated = DateTime.UtcNow.AddHours(1); // lets not hit Jira for another hour
                }
                finally
                {
                    db.SaveChanges();
                }

                break;
            }

        if (!installationFound)
        {
            var message = $"Bot installation not found for {row.ChannelId}";
            logger.LogInformation($"[{serviceType}:{instanceId}] ❌ {message}");

            row.ConsecutiveFailureCount++;
            row.LastFailureMessage = message;
            row.Updated = DateTime.UtcNow.AddHours(1); // lets not hit Jira for another hour
            db.SaveChanges();
        }
    }

    public static async Task SprintActiveCheckJobAsync(this ProactiveJobs job,
        ILogger logger, ConversationBot conversationBot, string connectionString,
        KGSDbContext db, ProactiveSubscription row)
    {
        //var serviceType = row.ServiceType;
        var jobType = "SprintActiveCheck";
        var instanceId = row.InstanceId;
        var email = row.UserEmail;

        if (string.IsNullOrWhiteSpace(email) || instanceId <= 0) return;

        var qjd = from j in db.JobDefinitions
                  where j.JobType == jobType
                  && j.InstanceId == instanceId
                  select j;
        var rjd = qjd.FirstOrDefault();
        if (null == rjd)
        {
            rjd = new JobDefinition
            {
                JobType = jobType,
                InstanceId = instanceId
            };
            db.JobDefinitions.Add(rjd);
            db.SaveChanges();
            logger.LogInformation($"[{jobType}:{instanceId}] 💾 Record created...");
        }

        var cutoff = DateTime.UtcNow.Date.AddHours(-3);
        if (rjd.LastRunTime is not null && rjd.LastRunTime > cutoff) return;

        var kbs = new KbsGateway(logger, connectionString);
        var analyticsConfigurations = kbs.GetSprintAnalyticsConfigurations(instanceId);

        if (analyticsConfigurations != null &&
            analyticsConfigurations.TryGetValue(ConfigProjectKey, out var project) &&
            analyticsConfigurations.TryGetValue(ConfigBoardId, out var sboard) && long.TryParse(sboard, out long board) &&
            analyticsConfigurations.TryGetValue(ConfigSprintId, out var ssprint) && long.TryParse(ssprint, out long sprint))
        {
            var jiraClient = await JiraHelper.GetJiraClient(logger, $"[{jobType}:{instanceId}]",
                email, instanceId);

            SearchResult<Sprint, Tuple<long, string>> sprints = null;

            try
            {
                sprints = await jiraClient.Agile.GetSprintsAsync(board, stateFilter: "active");
            }
            catch (JiraException) { }

            bool found = false;

            if (sprints == null || sprints.Count <= 0)
            {
                logger.LogWarning($"[{jobType}:{instanceId}] ⚠️ No active sprint found in {project}:{board}...");
                // should we consider to disable sprint watch?
                // may be new sprint is not yet active
                return;
            }
            else if (sprints.Count == 1)
            {
                var activeSprint = sprints.First();
                if (activeSprint.Id == sprint)
                    found = true;
                else
                {
                    string message;
                    if (sprint > 0)
                        message = $"**Sprint Watch**   \nPreviously selected sprint ({sprint}) is not active anymore, switching to {activeSprint.Name} ({activeSprint.Id})";
                    else
                        message = $"**Sprint Watch**   \nPreviously selected sprint is not active anymore, switching to {activeSprint.Name} ({activeSprint.Id})";

                    kbs.UpdateSprintAnalyticsConfiguration(instanceId, ConfigSprintId, activeSprint.Id.ToString());

                    var q = from s in db.ProactiveSubscriptions
                            where s.ServiceType == "x-supervisor-syncauto" &&
                            s.InstanceId == instanceId
                            select s;
                    var r = q.FirstOrDefault();

                    if (null == r)
                        message += $"   \nVisit {KhojiConstants.KhojiXBaseUrl} to resync the instance";
                    else
                        message += $"   \nAuto Sync is enabled, I will now try to resync the instance";

                    logger.LogInformation($"[{jobType}:{instanceId}] 👉 Message: {message}");

                    // clearning previous sprint items
                    var dictionaryName = nameof(ProactiveJql);
                    var qd = from v in db.StoredKeyValues
                             where v.InstanceId == instanceId
                             && v.DictionaryName == dictionaryName
                             select v;
                    var rds = qd.ToArray();
                    if (null != rds && rds.Length > 0)
                    {
                        db.StoredKeyValues.RemoveRange(rds);
                        await db.SaveChangesAsync();
                        logger.LogInformation($"[{jobType}:{instanceId}] 👉 Previous Sprint items cleared from its {dictionaryName} database dictionary");
                    }

                    logger.LogInformation($"[{jobType}:{instanceId}] 👉 Determining bot installation");
                    foreach (var installation in conversationBot.GetAllInstallationsAsync().Result)
                        if (installation.ConversationReference.Conversation.Id == row.ChannelId)
                        {
                            installation.SendMessage(message).Wait();
                            logger.LogInformation($"[{jobType}:{instanceId}] ✅ Message sent to {row.ChannelId}");
                        }

                    if (null != r) // we had to resync the instance
                        SyncFeature.TriggerSyncing(logger, connectionString, instanceId, email, row.ChannelId);
                }
            }
            else
            {
                foreach (var activeSprint in sprints)
                {
                    if (activeSprint.Id == sprint)
                    {
                        found = true;
                        break;
                    }
                }
            }

            if (!found)
                logger.LogWarning($"[{jobType}:{instanceId}] ⚠️ Selected sprint {sprint} is no more an active sprint in {project}:{board}...");
            else
            {
                rjd.LastRunTime = DateTime.UtcNow;
                db.SaveChanges();
                logger.LogInformation($"[{jobType}:{instanceId}] 💾 Selected sprint {sprint} found and is active, record updated...");
            }
        }
        else
        {
            logger.LogWarning($"[{jobType}:{instanceId}] ⚠️ we dont have all the needed configurations in KBS...");

            // we can potentially disable sprint watch for this tenant, we are here checking for active sprint because sprint watch is enabled
            // but it has started to fail because we dont have everything needed anymore (tenant is deleted/drifted)

            if (ProactiveSubscriptions.UnsubscribeProactively(row.ChannelId, instanceId, row.ServiceType, email) is ProactiveSubscriptions.SubscriptionStatus.Unsubscribed)
            {
                var message = $"Needed Sprint Watch configurations are not available, unsubscribing (Tenant: {instanceId}, Email: {email})";

                foreach (var installation in conversationBot.GetAllInstallationsAsync().Result)
                    if (installation.ConversationReference.Conversation.Id == row.ChannelId)
                    {
                        installation.SendMessage(message).Wait();
                        logger.LogInformation($"[{jobType}:{instanceId}] ✅ Message sent to {row.ChannelId}");
                    }
            }
        }
    }
}
