// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using Dapplo.Jira;
using KhojiGenAIServer.Chat.Plugins;
using KhojiGenAIServer.Chat.Teams;
using KhojiGenAIServer.Data;
using KhojiGenAIServer.Features;
using KhojiGenAIServer.Features.Watches;
using KhojiGenAIServer.Infrastructure;
using KhojiGenAIServer.Jobs;
using KhojiGenAIServer.Services;
using Microsoft.Agents.Builder;
using Microsoft.Agents.Core.Models;
using Microsoft.Extensions.Caching.Distributed;
using System.Text;
using System.Text.Json;
using Uworx.Khoji.Abstractions;

namespace KhojiGenAIServer.Extensions;

static class TurnContextExtensions
{
    static IActivity createAILabeledActivity(string message)
    {
        var properties = new Dictionary<string, JsonElement>
        {
            { "@type", JsonDocument.Parse(@"""Message""").RootElement },
            { "@context", JsonDocument.Parse(@"""https://schema.org""").RootElement },
            { "additionalType", JsonDocument.Parse(@"[ ""AIGeneratedContent"" ]").RootElement }
        };

        var activity = MessageFactory.Text(message);

        activity.Entities = [
            new Entity
            {
                Type = "https://schema.org/Message",
                Properties = properties
            }
        ];

        return activity;
    }

    static async Task<bool> analyzeSprintAsync(this ITurnContext turnContext, CancellationToken token, ILogger logger,
        string email, string fromName, int instanceId,
        string sprintName = null, int? sprintId = null)
    {
        logger.LogInformation($"[{fromName}] Trying Sprint Analysis (name: {sprintName}) for {instanceId}");

        var kbs = new KbsClient(email).InitializeToken();
        var credentials = kbs.GetJiraCredentials(instanceId);
        if (credentials == null)
        {
            await turnContext.SendActivityAsync($"Couldnt get Jira credentials for {email}", cancellationToken: token);
            return true;
        }

        IDataOutcome<string> result = Outcomes.Failure<string>("Neither sprint name nor sprint id was available");
        var kss = new KssGateway(logger, KhojiConstants.DatabaseConnectionString, instanceId);

        if (sprintName.HasText())
        {
            await turnContext.SendActivityAsync(Activity.CreateTypingActivity(), cancellationToken: token);
            result = await kss.AnalyzeSprintAsync(credentials.TenantName, sprintName);
        }
        else if (sprintId.HasValue)
        {
            await turnContext.SendActivityAsync(Activity.CreateTypingActivity(), cancellationToken: token);
            result = await kss.AnalyzeSprintAsync(credentials.TenantName, sprintId.Value);
        }

        if (result.Succeeded && !string.IsNullOrEmpty(result.Data))
        {
            await turnContext.SendActivityAsync(createAILabeledActivity(result.Data), cancellationToken: token);
            //await turnContext.SendActivityAsync(MessageFactory.Attachment(AdaptiveCardsHelper.GenerateReportIssueButtonCard(postFix: "analyzeSprint")),
            //    cancellationToken: token);
        }

        return result.Succeeded;
    }

    public static async Task<bool> AnalyzeSprintAsync(this ITurnContext turnContext, CancellationToken token, ILogger logger,
        string email, string fromName, int instanceId, string sprintName) =>
        await analyzeSprintAsync(turnContext, token, logger, email, fromName, instanceId,
            sprintName: sprintName, sprintId: null);

    public static async Task<bool> AnalyzeSprintAsync(this ITurnContext turnContext, CancellationToken token, ILogger logger,
        string email, string fromName, int instanceId, int sprintId) =>
        await analyzeSprintAsync(turnContext, token, logger, email, fromName, instanceId,
            sprintName: null, sprintId: sprintId);

    public static async Task SendWelcomeCardAsync(this ITurnContext turnContext, CancellationToken token, ILogger logger,
        string fromName)
    {
        logger.LogInformation($"Sending welcome card to {fromName}");
        await turnContext.SendActivityAsync(MessageFactory.Attachment(AdaptiveCardsHelper.GenerateUnregisteredUserCard(
            turnContext.Activity.From.AadObjectId,
            Environment.GetEnvironmentVariable("TEAMS_APP_ID") ?? "null",
            KhojiConstants.KhojiXBaseUrl)),
            cancellationToken: token);
    }

    public static async Task SendScrumUpdateAsync(this ITurnContext turnContext, CancellationToken token, ILogger logger,
        string fromName, string email, int instanceId)
    {
        logger.LogInformation($"Sending scrum update card to {fromName}");
        await turnContext.SendActivityAsync(MessageFactory.Attachment(AdaptiveCardsHelper.GenerateScrumUpdateCard(
            new KbsClient(email)
            .InitializeToken()
            .GetUserScrumUpdate(instanceId),
            fromName)),
            cancellationToken: token);
    }

    public static async Task SendWeeklyRetroAsync(this ITurnContext turnContext, CancellationToken token, ILogger logger,
        string fromName, string email, int instanceId)
    {
        logger.LogInformation($"Sending weekly retro card to {fromName}");
        await turnContext.SendActivityAsync(MessageFactory.Attachment(AdaptiveCardsHelper.GenerateWeeklyRetroCard(
            new KbsClient(email)
            .InitializeToken()
            .GetUserWeeklyRetro(instanceId),
            fromName)),
            cancellationToken: token);
    }

    public static async Task SendHelpCardAsync(this ITurnContext turnContext, CancellationToken token, ILogger logger,
        string fromName, int instanceId, bool isSupervisor,
        bool scrumUpdatesFeatureFlag, bool worklogInsightsFeatureFlag, bool standupBoardFeatureFlag, bool sprintWatchFeatureFlag,
        bool allowChangingInstance)
    {
        bool kssHasData = false;
        bool kssNeedsSync = false;
        string kssLastSync = null;
        bool insightsAvailable = false;

        if (isSupervisor)
        {
            var g = new KssGateway(logger, KhojiConstants.DatabaseConnectionString, instanceId);
            kssHasData = g.HasData;
            kssNeedsSync = g.NeedsSync;
            kssLastSync = g.LastSync;

            IDistributedCache cache = new PostgresDistributedCache(KhojiConstants.DatabaseConnectionString);
            if (cache.GetString($"todays-updates-{instanceId}") is { Length: > 0 } s)
                insightsAvailable = true;
        }

        logger.LogInformation($"Sending HelpCard to {fromName}, instanceId: {instanceId}, isSupervisor: {isSupervisor}, " +
            $"scrumUpdatesFeatureFlag: {scrumUpdatesFeatureFlag}, worklogInsightsFeatureFlag: {worklogInsightsFeatureFlag}, standupBoardFeatureFlag: {standupBoardFeatureFlag}, sprintWatchFeatureFlag: {sprintWatchFeatureFlag}, " +
            $"kssHasData: {kssHasData}, kssNeedsSync: {kssNeedsSync}, insightsAvailable: {insightsAvailable}, allowChangingInstance: {allowChangingInstance}");
        await turnContext.SendActivityAsync(MessageFactory.Attachment(AdaptiveCardsHelper.GenerateHelpCard(isSupervisor,
            scrumUpdatesFeatureFlag, worklogInsightsFeatureFlag, standupBoardFeatureFlag, sprintWatchFeatureFlag,
            kssHasData, kssNeedsSync, kssLastSync,
            insightsAvailable, allowChangingInstance)),
            cancellationToken: token);
    }

    public static async Task SendInstanceSelectionCardAsync(this ITurnContext turnContext, CancellationToken token, ILogger logger,
        string fromName, IEnumerable<(string InstanceName, int InstanceId)> instanceData)
    {
        logger.LogInformation($"[{fromName}] Sending instance selection card");
        await turnContext.SendActivityAsync(MessageFactory.Attachment(AdaptiveCardsHelper.GenerateInstanceSelectionCard(instanceData)),
            cancellationToken: token);
    }

    static Dictionary<string, string> expectingUserReply = new Dictionary<string, string>();
    public static async Task<bool> HandleKhojiXBotCodeAsync(this ITurnContext turnContext, CancellationToken token, ILogger logger,
        bool scrumUpdatesFeatureFlag, bool worklogInsightsFeatureFlag, bool standupBoardFeatureFlag, bool sprintWatchFeatureFlag,
        string fromName, string email, int instanceId, bool isSupervisor, string cleanedMessage)
    {
        if (cleanedMessage == null) return false;

        var botCode = cleanedMessage;
        if (expectingUserReply.ContainsKey(turnContext.Activity.From.AadObjectId)) // we are expecting a reply
        {
            expectingUserReply.Remove(turnContext.Activity.From.AadObjectId);

            if (!cleanedMessage.StartsWith(botCode, StringComparison.InvariantCultureIgnoreCase))
                botCode = expectingUserReply[turnContext.Activity.From.AadObjectId] + " " + cleanedMessage;
        }

        if (scrumUpdatesFeatureFlag && botCode.Equals("x-khojicloud-scrumupdate", StringComparison.InvariantCultureIgnoreCase))
        {
            await SendScrumUpdateAsync(turnContext, token, logger, fromName, email, instanceId);
            return true;
        }
        else if (worklogInsightsFeatureFlag && botCode.Equals("x-khojicloud-weeklyretro", StringComparison.InvariantCultureIgnoreCase))
        {
            await SendWeeklyRetroAsync(turnContext, token, logger, fromName, email, instanceId);
            return true;
        }
        else if (botCode.Equals("x-khojicloud-worklog", StringComparison.InvariantCultureIgnoreCase))
        {
            var generatedWorklogUsingAi = new KbsClient(email)
                .InitializeToken()
                .GenerateAIWorkLog(instanceId);

            string card = AdaptiveCardsHelper.GenerateAIWorklogCard(generatedWorklogUsingAi, email, fromName, includeUnsubscribe: false);
            if (!string.IsNullOrEmpty(card))
                await turnContext.SendActivityAsync(MessageFactory.Attachment(AdaptiveCardsHelper.GenerateAdaptiveCardAttachment(card)),
                    cancellationToken: token);
            else
                await turnContext.SendActivityAsync($"Failed to generate Worklog Card for {email} [{instanceId}]",
                    cancellationToken: token);

            return true;
        }
        else if (botCode.Equals("x-khojicloud-worklogreminder", StringComparison.InvariantCultureIgnoreCase))
        {
            await turnContext.SendActivityAsync(
                MessageFactory.Attachment(AdaptiveCardsHelper.GenerateScheduleCard("x-khojicloud-schedule-worklog-reminders",
                "Schedule Work Log Reminder")),
                cancellationToken: token);
            return true;
        }
        else if (botCode.Equals("x-khojicloud-support", StringComparison.InvariantCultureIgnoreCase))
        {
            await turnContext.SendActivityAsync(MessageFactory.Attachment(AdaptiveCardsHelper.GenerateSupportCard(email)),
                cancellationToken: token);

            return true;
        }
        else if (botCode.StartsWith("x-khojicloud-reportIssue", StringComparison.InvariantCultureIgnoreCase))
        {
            var messageParts = botCode.Split(" ", 2);
            var kind = messageParts.Length > 1 ? messageParts[1] ?? "unknown" : "unknown"; // scrumUpdate | weeklyRetro | workLogs

            await turnContext.SendActivityAsync(MessageFactory.Attachment(AdaptiveCardsHelper.GenerateReportIssueCard(email, kind)),
                cancellationToken: token);

            return true;
        }
        else if (botCode.Equals("x-subscription-changeInstance", StringComparison.InvariantCultureIgnoreCase))
        {
            var gateway = new KbsGateway(logger, KhojiConstants.DatabaseConnectionString);
            await SendInstanceSelectionCardAsync(turnContext, token, logger, fromName,
                gateway.GetSubscriptions(turnContext.Activity.From.AadObjectId).Select(d => (d.InstanceName, d.InstanceId)));
            return true;
        }
        else if (botCode.Equals("x-subscription-signout", StringComparison.InvariantCultureIgnoreCase))
        {
            var gateway = new KbsGateway(logger, KhojiConstants.DatabaseConnectionString);
            var r = gateway.Disconnect(turnContext.Activity.From.AadObjectId);
            if (r > 0)
                await turnContext.SendActivityAsync("You are signed out successfully",
                    cancellationToken: token);
            else
                await turnContext.SendActivityAsync("You are signed out",
                    cancellationToken: token);

            return true;
        }
        else if (botCode.Equals("x-timesheet-disable", StringComparison.InvariantCultureIgnoreCase))
        {
            if (turnContext.UnsubscribeProactively(instanceId, serviceType: "x-proactive-TimeSheet", email) == ProactiveSubscriptions.SubscriptionStatus.Unsubscribed)
                await turnContext.SendActivityAsync("Work Log Reminders are disabled successfully",
                    cancellationToken: token);
            else
                await turnContext.SendActivityAsync("Work Log Reminders were not enabled",
                    cancellationToken: token);

            return true;
        }
        else if (botCode.Equals("x-sprintwatch-disable", StringComparison.InvariantCultureIgnoreCase))
        {
            if (turnContext.UnsubscribeProactively(instanceId, serviceType: "x-sprintwatch") == ProactiveSubscriptions.SubscriptionStatus.Unsubscribed)
                await turnContext.SendActivityAsync("📊 Sprint Watch has been successfully disabled. Monitoring is paused, but you can reactivate it anytime!",
                    cancellationToken: token);
            else
                await turnContext.SendActivityAsync("Sprint watch was not enabled",
                    cancellationToken: token);

            return true;
        }
        else if (sprintWatchFeatureFlag && botCode.StartsWith("x-sprintwatch", StringComparison.InvariantCultureIgnoreCase))
        {
            var messageParts = botCode.Split(" ", 2); // we should not use cleanedMessage here it will have project = 'KFX' only and not x-sprintwatch JQL
            var jql = messageParts.Length > 1 ? messageParts[1] : null;
            string additionalMessage = null;

            if (jql == null)
            {
                var projects = await JiraHelper.GetProjectsAsync(logger, $"[Bot:x-sprintwatch:{instanceId}]",
                    email, instanceId, token);

                if (projects == null || projects.Count <= 0)
                    await turnContext.SendActivityAsync($"Sadly I couldnt find any project in your JIRA 😔",
                        cancellationToken: token);
                else
                {
                    expectingUserReply[turnContext.Activity.From.AadObjectId] = "x-sprintwatch";
                    var options = projects.ToDictionary(
                        keySelector: k => k.Value, // projects key is fancy name and value name is code
                        elementSelector: v => $"x-sprintwatch project: {v.Key}");

                    await turnContext.SendActivityAsync(MessageFactory.Attachment(AdaptiveCardsHelper.GenerateOptionsCard(
                        title: "Select your Jira Project:", options)));
                }

                return true;
            }
            else if (jql.StartsWith("project: "))
            {
                var dict = jql.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(part => part.Split(':', 2))
                    .ToDictionary(keySelector: parts => parts[0].Trim(),
                        elementSelector: parts => parts.Length > 1 ? parts[1].Trim() : string.Empty,
                        StringComparer.OrdinalIgnoreCase);

                string project = dict["project"];
                additionalMessage = $" for project {project}";
                var jiraClient = await JiraHelper.GetJiraClient(logger, $"[Bot:x-sprintwatch:{instanceId}]",
                    email, instanceId);

                if (!dict.ContainsKey("board"))
                {
                    Dapplo.Jira.Entities.SearchResult<Dapplo.Jira.Entities.Board, Tuple<string, string, string>> boards = null;

                    try
                    {
                        boards = await jiraClient.Agile.GetBoardsAsync(projectKeyOrId: project);
                    }
                    catch (JiraException e)
                    {
                        logger.LogError(e, $"Failed to retreive Jira boards in {project} project");
                    }

                    if (boards == null || boards.Count <= 0)
                    {
                        await turnContext.SendActivityAsync($"Sadly I couldnt find any board in your JIRA Project {project} 😔",
                            cancellationToken: token);
                        return true;
                    }
                    else if (boards.Count == 1)
                        dict.Add("board", boards.First().Id.ToString());
                    else
                    {
                        var options = boards
                            //.ToDictionary(keySelector: k => k.Name, elementSelector: v => $"x-sprintwatch project: {project}, board: {v.Id}");
                            .GroupBy(b => b.Name)
                            .SelectMany(g => g.Select((board, index) => new
                            {
                                Name = index == 0 ? g.Key : $"{g.Key} {index + 1}",
                                Value = $"x-sprintwatch project: {project}, board: {board.Id}"
                            }))
                            .ToDictionary(x => x.Name, x => x.Value);
                        await turnContext.SendActivityAsync(MessageFactory.Attachment(AdaptiveCardsHelper.GenerateOptionsCard(
                            title: $"Select your {project} Board:", options)));
                        return true;
                    }
                }

                if (dict.TryGetValue("board", out var sboard) && long.TryParse(sboard, out long board) && !dict.ContainsKey("sprint"))
                {
                    Dapplo.Jira.Entities.SearchResult<Dapplo.Jira.Entities.Sprint, Tuple<long, string>> sprints = null;

                    try
                    {
                        sprints = await jiraClient.Agile.GetSprintsAsync(board, stateFilter: "active");
                    }
                    catch (JiraException e)
                    {
                        logger.LogError(e, $"Failed to retreive active sprint for {project} / {board} board");
                    }

                    if (sprints == null || sprints.Count <= 0)
                    {
                        await turnContext.SendActivityAsync($"Sadly I couldnt find any active sprint on the selected board {project} / {board} 😔",
                            cancellationToken: token);
                        return true;
                    }
                    else if (sprints.Count == 1)
                    {
                        var sprint = sprints.First();
                        additionalMessage = $"{sprint.Name}";
                        dict.Add("sprint", sprint.Id.ToString());
                    }
                    else
                    {
                        var options = sprints.ToDictionary(keySelector: k => k.Name,
                            elementSelector: v => $"x-sprintwatch project: {project}, board: {board}, sprint: {v.Id}");
                        await turnContext.SendActivityAsync(MessageFactory.Attachment(AdaptiveCardsHelper.GenerateOptionsCard(
                            title: $"Select your {project} Sprint:", options)));
                        return true;
                    }
                }

                if (dict.TryGetValue("board", out var sboardFinal) && long.TryParse(sboardFinal, out long boardFinal)
                    && dict.TryGetValue("sprint", out var ssprintFinal) && long.TryParse(ssprintFinal, out long sprintFinal))
                {
                    logger.LogInformation($"Saving into KBS, project: {project}, board: {boardFinal}, sprint: {sprintFinal}");
                    var kbs = new KbsGateway(logger, KhojiConstants.DatabaseConnectionString);

                    kbs.UpdateSprintAnalyticsConfiguration(instanceId, "sprint.analytics.target.project.key", project);
                    kbs.UpdateSprintAnalyticsConfiguration(instanceId, "sprint.analytics.target.board.id", boardFinal.ToString());
                    kbs.UpdateSprintAnalyticsConfiguration(instanceId, "sprint.analytics.target.sprint.id", sprintFinal.ToString());

                    jql = $"project = '{project}' AND Sprint = {sprintFinal} ORDER BY created DESC";
                }
            }

            // Validate JQL by hitting it; and if we get some items, store them as well to avoid initial added items flood
            try
            {
                (var proactive, var tenantName) = await JiraHelper.SyncJiraItemsAsync(logger,
                    KhojiConstants.DatabaseConnectionString, email, instanceId, "x-sprintwatch", jql,
                    items => { });

                if (turnContext.SubscribeProactively(email, instanceId, serviceType: "x-sprintwatch",
                    metaData: new XJqlJobMetaData { Jql = jql }) is
                    ProactiveSubscriptions.SubscriptionStatus.Subscribed or ProactiveSubscriptions.SubscriptionStatus.Updated)
                {
                    var message = additionalMessage is { Length: > 0 }
                        ? $"📊 Sprint Watch is up and running for Sprint {additionalMessage}. Insights and updates are coming your way!"
                        : "";
                    await turnContext.SendActivityAsync(message,
                        cancellationToken: token);
                    logger.LogInformation($"[{instanceId}] {message}, JQL: {jql}");
                }
                else
                {
                    await turnContext.SendActivityAsync("Could not enable Sprint watch",
                        cancellationToken: token);
                    logger.LogInformation($"Could not enable Sprint watch for {instanceId} with JQL: {jql}");
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, $"[{fromName}] Failed to validate JQL {jql} for x-sprintwatch");
                await turnContext.SendActivityAsync($"Failed to validate JQL {jql}, reason: {ex.Message}",
                    cancellationToken: token);
            }

            return true;
        }

        if (standupBoardFeatureFlag)
        {
            if (botCode.StartsWith("x-supervisor", StringComparison.InvariantCultureIgnoreCase) && !isSupervisor)
            {
                await turnContext.SendActivityAsync($"Please contact your supervisor, this option is only meant for them to use 😔",
                    cancellationToken: token);

                return true;
            }

            if (botCode.Equals("x-supervisor-teammembers-update", StringComparison.InvariantCultureIgnoreCase))
            {
                await SendTeamSelectionCardAsync(turnContext, token, logger, standupBoardFeatureFlag, email, instanceId);
                return true;
            }
            else if (botCode.Equals("x-supervisor-todaysupdates", StringComparison.InvariantCultureIgnoreCase))
            {
                IDistributedCache cache = new PostgresDistributedCache(KhojiConstants.DatabaseConnectionString);
                if (cache.GetString($"todays-updates-{instanceId}") is { Length: > 0 } s)
                    await turnContext.SendActivityAsync(s, cancellationToken: token);
                else
                    logger.LogInformation($"todays-updates-{instanceId} Cache not found");

                return true;
            }
            else if (botCode.Equals("x-supervisor-teammworklogs", StringComparison.InvariantCultureIgnoreCase))
            {
                var kssG = new KssGateway(logger, KhojiConstants.DatabaseConnectionString, instanceId);
                if (!kssG.CanQueryTenantData)
                    await turnContext.SendActivityAsync("It looks like your data is not synced or out of sync, please resync it to ensure up to date analysis",
                        cancellationToken: token);
                else
                {
                    var kbsG = new KbsGateway(logger, KhojiConstants.DatabaseConnectionString);
                    var teams = kbsG.GetUserTeams(instanceId, email);

                    if (null != teams && teams.Count() == 1)
                    {
                        var hoursKey = "worklog.day.hour";
                        var weekendKey = "include.weekends.in.worklog.stats";
                        var configs = kbsG.GetConfigurations(instanceId, [hoursKey, weekendKey]) ?? new Dictionary<string, string>();
                        decimal hoursPerDay = configs.ContainsKey(hoursKey) && decimal.TryParse(configs[hoursKey], out decimal d) ? d : 8;
                        bool observeWeekends = !(configs.ContainsKey(weekendKey) && bool.TryParse(configs[weekendKey], out bool b) ? b : false); // not of include weekends = observeweekends

                        var used = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                        var members = kbsG.GetTeamMembers(teams.First().teamId).OrderBy(m => m.name);
                        var lastWeek = new Dictionary<string, Dictionary<DateOnly, (int seconds, string friendly)>>();
                        var thisWeek = new Dictionary<string, Dictionary<DateOnly, (int seconds, string friendly)>>();
                        DateTime lastWeekDateTime = default;
                        DateTime thisWeekDateTime = default;

                        foreach (var member in members)
                        {
                            try
                            {
                                var parts = member.name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                                string chosen = null;

                                foreach (var part in parts)
                                {
                                    if (used.Add(part)) // if we have added into hashset, it was unique
                                    {
                                        chosen = part;
                                        break;
                                    }
                                }

                                if (chosen != null)
                                {
                                    (lastWeekDateTime, var lw) = kssG.GetDailyWorklogsOfLastWeek(member.accountId, out string errorOrMessage);
                                    (thisWeekDateTime, var tw) = kssG.GetDailyWorklogsOfThisWeek(member.accountId, out errorOrMessage);
                                    lastWeek.Add(chosen, lw);
                                    thisWeek.Add(chosen, tw);
                                }
                            }
                            catch (Exception ex)
                            {
                                logger.LogError(ex, $"Failed to fetch worklogs of {member}");
                                /* ignore and move on for now */
                            }
                        }

                        if (lastWeekDateTime != default && thisWeekDateTime != default)
                        {
                            logger.LogInformation($"Sending Worklog card to {fromName}, instanceId: {instanceId}, isSupervisor: {isSupervisor}");

                            var kssLastSync = kssG.LastSync;
                            if (!string.IsNullOrEmpty(kssLastSync))
                                kssLastSync = $"Your instance synced {kssLastSync}";
                            else
                                kssLastSync = $"Your instance is never synced";

                            await turnContext.SendActivityAsync(MessageFactory.Attachment(
                                AdaptiveCardsHelper.GenerateWorklogsWeekCard(hoursPerDay, observeWeekends,
                                "Last Week", lastWeekDateTime, lastWeek, addResponsiveDisclaimer: true)),
                                cancellationToken: token);
                            await turnContext.SendActivityAsync(MessageFactory.Attachment(
                                AdaptiveCardsHelper.GenerateWorklogsWeekCard(hoursPerDay, observeWeekends,
                                "This Week", thisWeekDateTime, thisWeek, addResponsiveDisclaimer: false, disclaimer: kssLastSync)),
                                cancellationToken: token);
                            await turnContext.SendActivityAsync(MessageFactory.Attachment(
                                AdaptiveCardsHelper.GenerateWorklogsFactCard(hoursPerDay, observeWeekends,
                                lastWeek, thisWeek)),
                                cancellationToken: token);
                        }
                        else
                            logger.LogError("Couldnt determine last and this week's starts");
                    }
                    else
                        await turnContext.SendActivityAsync("We only support single team per instance",
                            cancellationToken: token);
                }

                return true;
            }
            else if (botCode.Equals("x-supervisor-sprintanalyzer", StringComparison.InvariantCultureIgnoreCase))
            {
                var g = new KbsGateway(logger, KhojiConstants.DatabaseConnectionString);
                if (g.GetConfiguredSprintId(instanceId) is int sprintId)
                    await AnalyzeSprintAsync(turnContext, token, logger, email, fromName, instanceId, sprintId);
                else
                    await turnContext.SendActivityAsync($"No configured sprint found, visit {KhojiConstants.KhojiXBaseUrl} and select your sprint first!",
                        cancellationToken: token);

                return true;
            }
            else if (botCode.Equals("x-supervisor-syncauto-disable", StringComparison.InvariantCultureIgnoreCase))
            {
                var status = turnContext.UnsubscribeProactively(instanceId, serviceType: "x-supervisor-syncauto");
                if (status == ProactiveSubscriptions.SubscriptionStatus.Unsubscribed)
                    await turnContext.SendActivityAsync("Auto Sync is disabled successfully",
                        cancellationToken: token);
                else
                    await turnContext.SendActivityAsync("Auto Sync was not enabled",
                        cancellationToken: token);

                return true;
            }
            else if (botCode.Equals("x-supervisor-syncauto", StringComparison.InvariantCultureIgnoreCase))
            {
                var gw = new KbsGateway(logger, KhojiConstants.DatabaseConnectionString);
                if (!gw.IsDataSyncEnabled(instanceId))
                {
                    await turnContext.SendActivityAsync($"Jira sync is disabled for your instance, visit {KhojiConstants.KhojiXBaseUrl} to enable it first!",
                        cancellationToken: token);
                    return true;
                }

                var status = turnContext.SubscribeProactively(email, instanceId, serviceType: "x-supervisor-syncauto");
                if (status == ProactiveSubscriptions.SubscriptionStatus.Subscribed || status == ProactiveSubscriptions.SubscriptionStatus.Updated)
                    await turnContext.SendActivityAsync("Auto Sync is enabled successfully",
                        cancellationToken: token);

                return true;
            }
            else if (botCode.Equals("x-supervisor-syncstart", StringComparison.InvariantCultureIgnoreCase))
            {
                await turnContext.TriggerSyncingAsync(logger, KhojiConstants.DatabaseConnectionString, instanceId, email, token);

                return true;
            }
        }

        return false;
    }

    public static async Task<bool> HandleCheatCodeAsync(this ITurnContext turnContext, CancellationToken token, ILogger logger,
        string fromName, string email, int instanceId, bool isSupervisor, string cleanedMessage)
    {
        if (cleanedMessage == null) return false;

        if (cleanedMessage.Equals("x-codes", StringComparison.InvariantCultureIgnoreCase))
        {
            await turnContext.SendActivityAsync($"x-calendar, it will show the calendar entries",
                cancellationToken: token);
            await turnContext.SendActivityAsync($"x-requests-file, you need to specify the file name and it will show the file download card",
                cancellationToken: token);
            await turnContext.SendActivityAsync($"x-chathistory, it will clear the chat history",
                cancellationToken: token);
            await turnContext.SendActivityAsync($"x-todaysupdates, it will show the today's updates, you can optionally specify 'save'",
                cancellationToken: token);
            await turnContext.SendActivityAsync($"x-todaysupdates-job, it will trigger the today's updates job",
                cancellationToken: token);
            await turnContext.SendActivityAsync($"x-adaptivecard, it can be used to display given adaptive card, it needs (just the) filename of available json schemas",
                cancellationToken: token);
            await turnContext.SendActivityAsync($"x-subscription-exceptions and x-subscription-exceptions-disable, it can be used to subscribe to Bot exceptions, you can send x-subscription-exception to raise a dummy exception",
                cancellationToken: token);
            await turnContext.SendActivityAsync($"x-subscription-kiadebugging and x-subscription-kiadebugging-disable, it can be used to subscribe to KIA debug messages",
                cancellationToken: token);
            await turnContext.SendActivityAsync($"x-proactive-timesheet and x-proactive-timesheet-disable, can be used for AI/Timesheet Reminders",
                cancellationToken: token);

            return true;
        }

        /*
        if (cleanedMessage.StartsWith("x-calendar", StringComparison.InvariantCultureIgnoreCase))
        {
            var userTimeZone = cleanedMessage.SplitAndGiveNth(" ", 1) ?? "Asia/Karachi";
            // or "UTC"; // forcing for now as mailboxSettings is not coming from graph api, probably because of missing consent (code below)

            KbsClient.Credentials aadMsftToken = new KbsClient(email)
                .InitializeToken()
                .GetCalendarCredentials(instanceId);

            var tokenProvider = new BaseBearerTokenAuthenticationProvider(new StaticTokenProvider(aadMsftToken.Token));
            var graphClient = new GraphServiceClient(tokenProvider);

            var me = await graphClient.Me.GetAsync(r =>
            {
                r.QueryParameters.Select = ["displayName", "mail"];//, "mailboxSettings" ];
            });
            await turnContext.SendActivityAsync($"Graph client connected as: {me?.DisplayName} ({me?.Mail})",
                cancellationToken: token);

            //var userTimeZone = me.MailboxSettings?.TimeZone ?? "UTC";
            //await turnContext.SendActivityAsync($"Your timezone is {userTimeZone}",
            //    cancellationToken: token);

            //var events = await graphClient.Me.Events.GetAsync(r =>
            //{
            //    r.QueryParameters.Top = 2000;
            //    r.QueryParameters.Orderby = ["start/dateTime"];
            //});
            //string s = "";
            //foreach (var ev in events.Value)
            //    s += $"* {ev.Subject} - {ev.Start.DateTime} \n";
            //await turnContext.SendActivityAsync(s, cancellationToken: token);

            var today = TimeZoneInfo.ConvertTime(DateTime.Now, TimeZoneInfo.FindSystemTimeZoneById(userTimeZone));
            var startOfDay = new DateTime(today.Year, today.Month, today.Day, 0, 0, 0, DateTimeKind.Unspecified);
            var endOfDay = startOfDay.AddDays(1);

            var events = await graphClient.Me.CalendarView.GetAsync(r =>
            {
                r.QueryParameters.StartDateTime = startOfDay.ToString("o");
                r.QueryParameters.EndDateTime = endOfDay.ToString("o");
                r.QueryParameters.Orderby = new[] { "start/dateTime" };
                r.QueryParameters.Top = 50;

                r.Headers.Add("Prefer", $"outlook.timezone=\"{userTimeZone}\"");
            }, cancellationToken: token);

            var sb = new StringBuilder();
            if (events?.Value != null)
            {
                foreach (var ev in events.Value)
                {
                    var startTime = ev.Start?.DateTime ?? "No start time";
                    sb.AppendLine($"* {ev.Subject ?? "No subject"} - {startTime}");
                }
            }
            await turnContext.SendActivityAsync(MessageFactory.Text(sb.ToString()), cancellationToken: token);

            return true;
        }
        */
        if (cleanedMessage.StartsWith("x-requests-file", StringComparison.InvariantCultureIgnoreCase) && Globals.IsDebugging)
        {
            var fileName = cleanedMessage.SplitAndGiveNth(" ", 1) ?? null;
            if (!string.IsNullOrWhiteSpace(fileName))
            {
                if (!string.IsNullOrWhiteSpace(Globals.RequestsFolderAbsolutePath) && Directory.Exists(Globals.RequestsFolderAbsolutePath))
                {
                    foreach (var file in Directory.GetFiles(Globals.RequestsFolderAbsolutePath, fileName + "*", SearchOption.TopDirectoryOnly).Select(Path.GetFileName))
                    {

                        logger.LogInformation($"Sending {file} file download card to {fromName}");
                        await turnContext.SendActivityAsync(MessageFactory.Attachment(new Attachment
                        {
                            ContentType = "application/vnd.microsoft.card.hero",
                            Content = new HeroCard
                            {
                                Title = $"Download/View {file}",
                                Buttons = new List<CardAction>
                        {
                            new CardAction(ActionTypes.OpenUrl, "Download",
                                value: $"{KhojiConstants.KhojiXBaseUrl}/requests/{file}")
                        }
                            }
                        }),
                        cancellationToken: token);
                    }
                }
            }
            else
                await turnContext.SendActivityAsync("You didnt specify any file",
                    cancellationToken: token);
            return true;
        }
        else if (cleanedMessage.Equals("x-chathistory", StringComparison.InvariantCultureIgnoreCase))
        {
            Agents.ClearChatHistory(turnContext.Activity.From.AadObjectId);
            await turnContext.SendActivityAsync(
                $"{turnContext.Activity.From.Name}, your chat history is cleared",
                cancellationToken: token);

            return true;
        }
        else if (cleanedMessage.StartsWith("x-poker", StringComparison.InvariantCulture))
        {
            var second = cleanedMessage.SplitAndGiveNth(" ", 1) ?? "";
            var third = cleanedMessage.SplitAndGiveNth(" ", 2) ?? "";

            if (second.HasText() && third.HasText())
            {
                if (decimal.TryParse(third, out decimal estimated))
                {
                    PokerHelper.GetPokerResults(second)[turnContext.Activity.From.Name] = estimated;
                    await turnContext.SendActivityAsync($"{turnContext.Activity.From.Name} has voted on {second}", cancellationToken: token);
                }
                else
                    await turnContext.SendActivityAsync($"[{turnContext.Activity.From.Name}] Couldnt parse {third} for {second}", cancellationToken: token);
            }
            else if (second.HasText())
            {
                if (PokerHelper.GetPokerResults(second) is { Count: > 0 } result)
                {
                    var sb = new StringBuilder();
                    sb.AppendLine($"[{second}] Poker Result   "); // end the line with 3 spaces for markdown new line
                    // https://stackoverflow.com/questions/52637567/how-to-insert-newline-into-ms-teams-markdown
                    foreach (var k in result.Keys.OrderBy(k => k))
                        sb.AppendLine($"{k}: {result[k]}   ");

                    await turnContext.SendActivityAsync(MessageFactory.Text(sb.ToString()), cancellationToken: token);
                    PokerHelper.ClearPoker(second);
                }
                else
                    await turnContext.SendActivityAsync(MessageFactory.Attachment(AdaptiveCardsHelper.GeneratePokerCard("x-poker", second)),
                        cancellationToken: token);
            }
            else
                await turnContext.SendActivityAsync("You need to specify something for the key, ticket id, without any space", cancellationToken: token);

            return true;
        }
        else if (cleanedMessage.StartsWith("x-todaysupdates", StringComparison.InvariantCultureIgnoreCase))
        {
            if (!isSupervisor) return false;

            var updateCache = (cleanedMessage.SplitAndGiveNth(" ", 1) ?? "").ToLower() == "save";

            try
            {
                var kbs = new KbsClient(email).InitializeToken();
                var credentials = kbs.GetJiraCredentials(instanceId);
                if (credentials == null)
                {
                    await turnContext.SendActivityAsync($"Couldnt get Jira credentials for {email}", cancellationToken: token);
                    return true;
                }

                var gateway = new KssGateway(logger, KhojiConstants.DatabaseConnectionString, instanceId);
                var insights = await gateway.GenerateTodaysUpdatesAsync(credentials.TenantName, gateway.GetConfiguredSprint(), shouldSave: updateCache);

                if (!string.IsNullOrWhiteSpace(insights))
                    await turnContext.SendActivityAsync(insights, cancellationToken: token);
                else
                    await turnContext.SendActivityAsync("Didnt got any insight", cancellationToken: token);

                if (updateCache)
                {
                    IDistributedCache cache = new PostgresDistributedCache(KhojiConstants.DatabaseConnectionString);
                    if (string.IsNullOrWhiteSpace(insights))
                    {
                        cache.Remove($"todays-updates-{instanceId}");
                        await turnContext.SendActivityAsync($"todays-updates-{instanceId} is removed",
                            cancellationToken: token);
                    }
                    else
                    {
                        cache.SetString($"todays-updates-{instanceId}", insights, new DistributedCacheEntryOptions
                        {
                            AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(9)
                        });
                        await turnContext.SendActivityAsync($"todays-updates-{instanceId} is updated",
                            cancellationToken: token);
                    }
                }
            }
            catch (PluginException ex)
            {
                var message = !string.IsNullOrWhiteSpace(ex.Message)
                    ? $"Failed to get proactive insights, reason: {ex.Message}"
                    : $"Failed to get proactive insights, plugin failed";

                logger.LogError(ex, message);
                await turnContext.SendActivityAsync(message,
                    cancellationToken: token);
            }
            catch (Exception ex)
            {
                var message = !string.IsNullOrWhiteSpace(ex.Message)
                    ? $"Failed to do proactive insights, reason: {ex.Message}"
                    : $"Failed to do proactive insights";

                logger.LogError(ex, message);
                await turnContext.SendActivityAsync(message,
                    cancellationToken: token);
            }

            return true;
        }
        else if (cleanedMessage.Equals("x-todaysupdates-job", StringComparison.InvariantCultureIgnoreCase))
        {
            await turnContext.SendActivityAsync("Triggering the job",
                cancellationToken: token);
            var job = WatchlistJob.Create(logger, KhojiConstants.DatabaseConnectionString);
            _ = job.GenerateUpdatesAsync();

            return true;
        }
        else if (cleanedMessage.StartsWith("x-adaptivecard", StringComparison.InvariantCultureIgnoreCase))
        {
            var card = cleanedMessage.SplitAndGiveNth(" ", 1) ?? null;
            if (!string.IsNullOrWhiteSpace(card))
            {
                logger.LogInformation($"Sending {card} card to {fromName}");
                if (AdaptiveCardsHelper.GenerateCard(card) is { } attachment)
                    await turnContext.SendActivityAsync(MessageFactory.Attachment(attachment),
                        cancellationToken: token);
                else
                    await turnContext.SendActivityAsync($"I couldnt find {card}",
                        cancellationToken: token);
            }
            else
                await turnContext.SendActivityAsync("You didnt specify any card",
                    cancellationToken: token);

            return true;
        }
        else if (cleanedMessage.Equals("x-subscription-exception", StringComparison.InvariantCultureIgnoreCase))
            throw new ApplicationException("Dummy exception");
        else if (cleanedMessage.Equals("x-subscription-kiadebugging-disable", StringComparison.InvariantCultureIgnoreCase))
        {
            var status = turnContext.UnsubscribeProactively(instanceId: 0, serviceType: "x-subscription-kiadebugging");
            if (status == ProactiveSubscriptions.SubscriptionStatus.Unsubscribed)
                await turnContext.SendActivityAsync("KIA debugging is unsubscribed from this channel",
                    cancellationToken: token);
            else
                await turnContext.SendActivityAsync("KIA debugging was not subscribed on this channel",
                    cancellationToken: token);

            return true;
        }
        else if (cleanedMessage.Equals("x-subscription-kiadebugging", StringComparison.InvariantCultureIgnoreCase))
        {
            var status = turnContext.SubscribeProactively(email, instanceId: 0, serviceType: "x-subscription-kiadebugging");
            if (status == ProactiveSubscriptions.SubscriptionStatus.Subscribed)
                await turnContext.SendActivityAsync("KIA debugging is subscribed for this channel",
                    cancellationToken: token);
            else if (status == ProactiveSubscriptions.SubscriptionStatus.Updated)
                await turnContext.SendActivityAsync("KIA debugging subscription is updated for this channel",
                    cancellationToken: token);

            return true;
        }
        else if (cleanedMessage.Equals("x-subscription-exceptions-disable", StringComparison.InvariantCultureIgnoreCase))
        {
            var status = turnContext.UnsubscribeProactively(instanceId: 0, serviceType: "x-subscription-exceptions");
            if (status == ProactiveSubscriptions.SubscriptionStatus.Unsubscribed)
                await turnContext.SendActivityAsync("Exceptions are unsubscribed from this channel",
                    cancellationToken: token);
            else
                await turnContext.SendActivityAsync("Exceptions were not subscribed on this channel",
                    cancellationToken: token);

            return true;
        }
        else if (cleanedMessage.Equals("x-subscription-exceptions", StringComparison.InvariantCultureIgnoreCase))
        {
            var status = turnContext.SubscribeProactively(email, instanceId: 0, serviceType: "x-subscription-exceptions");
            if (status == ProactiveSubscriptions.SubscriptionStatus.Subscribed)
                await turnContext.SendActivityAsync("Exceptions are subscribed for this channel",
                    cancellationToken: token);
            else if (status == ProactiveSubscriptions.SubscriptionStatus.Updated)
                await turnContext.SendActivityAsync("Exceptions subscription is updated for this channel",
                    cancellationToken: token);

            return true;
        }
        else if (cleanedMessage.Equals("x-proactive-timesheet-disable", StringComparison.InvariantCultureIgnoreCase))
        {
            var jobUtils = new XJobUtils(logger);
            var status = await jobUtils.UnScheduleProActiveInsights(
                email,
                instanceId,
                turnContext.Activity.Conversation.Id,
                XTimeSheetJob.ServiceType
            );

            var message = status switch
            {
                XJobScheduleStatus.UnScheduled =>
                    "Your work log reminders have been disabled",
                XJobScheduleStatus.NotFound =>
                    "No matching work log reminder schedule found",
                _ => string.Empty
            };

            await turnContext.SendActivityAsync(message, cancellationToken: token);

            return true;
        }
        else if (cleanedMessage.StartsWith("x-proactive-timesheet", StringComparison.InvariantCultureIgnoreCase))
        {
            await turnContext.SendActivityAsync(
                MessageFactory.Attachment(AdaptiveCardsHelper.GenerateScheduleCard(
                    "x-khojicloud-schedule-worklog-reminders",
                    "Schedule Work Log Reminder"
                )),
                cancellationToken: token);
            return true;
        }

        return false;
    }

    public static async Task<bool> HandleKhojiXValueAction(this ITurnContext turnContext, CancellationToken token, ILogger logger,
        string email, int instanceId, bool isSupervisor, string cleanedMessage,
        Action<ITurnContext, string, Dictionary<string, object>> postHogCapture)
    {
        if (turnContext.Activity.Value is { } v)
        {
            var jsonElement = JsonSerializer.SerializeToElement(v);

            switch (jsonElement.TryGetValue("action", out string action) ? action : null)
            {
                case "x-khojicloud-submit":
                    if (jsonElement.TryGetValue("email", out string emailSubmit) &&
                        jsonElement.TryGetValue("kind", out string kindSubmit))
                    {
                        if (kindSubmit == "support" &&
                            jsonElement.TryGetValue("issueType", out string issueTypeSupport) &&
                            jsonElement.TryGetValue("title", out string titleSupport) &&
                            jsonElement.TryGetValue("description", out string descriptionSupport))
                        {
                            logger.LogInformation($"[{turnContext.Activity.From.Name}] reporting support request");
                            postHogCapture(turnContext, "reportIssue.support", new Dictionary<string, object>
                            {
                                ["email"] = emailSubmit,
                                ["instanceId"] = instanceId,
                                ["isSupervisor"] = isSupervisor,
                                ["message"] = cleanedMessage,
                                ["kind"] = kindSubmit,
                                ["issueType"] = issueTypeSupport,
                                ["title"] = titleSupport,
                                ["description"] = descriptionSupport
                            });

                            await turnContext.SendActivityAsync(MessageFactory.Text("✅ Thanks for your feedback! We've recorded your support request and will review it"),
                                token);
                        }
                        else if (kindSubmit.StartsWith("reportIssue") &&
                            jsonElement.TryGetValue("issueType", out string issueTypeReportIssue) &&
                            jsonElement.TryGetValue("description", out string descriptionReportIssue))
                        {
                            logger.LogInformation($"[{turnContext.Activity.From.Name}] reporting issue");
                            postHogCapture(turnContext, kindSubmit, new Dictionary<string, object>
                            {
                                ["email"] = emailSubmit,
                                ["instanceId"] = instanceId,
                                ["isSupervisor"] = isSupervisor,
                                ["message"] = cleanedMessage,
                                ["kind"] = kindSubmit,
                                ["issueType"] = issueTypeReportIssue,
                                ["description"] = descriptionReportIssue
                            });

                            await turnContext.SendActivityAsync(MessageFactory.Text("✅ Thanks for your feedback! We've recorded your report and will review it"),
                                token);
                        }
                    }

                    return true;
                case "x-khojicloud-teammember-select":
                    if (jsonElement.TryGetProperty("accountId", out var jiraAccountId))
                    {
                        var accountId = jiraAccountId.GetString();

                        var kbs = new KbsClient(email).InitializeToken();
                        var credentials = kbs.GetJiraCredentials(instanceId);
                        if (credentials == null)
                        {
                            await turnContext.SendActivityAsync($"Couldnt get Jira credentials for {email}", cancellationToken: token);
                            return true;
                        }

                        logger.LogInformation($"Generating Scrum Update for accountId: {accountId}, instanceId: {instanceId}, tenantName: {credentials.TenantName}");

                        var kss = new KssGateway(logger, KhojiConstants.DatabaseConnectionString, instanceId);

                        await turnContext.SendActivityAsync(Activity.CreateTypingActivity(), cancellationToken: token);
                        var result = await kss.ScrumUpdateAsync(credentials.TenantName, accountId);

                        if (result.Succeeded && !string.IsNullOrEmpty(result.Data))
                        {
                            await turnContext.SendActivityAsync(createAILabeledActivity(result.Data),
                                cancellationToken: token);
                            //await turnContext.SendActivityAsync(MessageFactory.Attachment(AdaptiveCardsHelper.GenerateReportIssueButtonCard(postFix: "memberScrumUpdate")),
                            //    cancellationToken: token);
                        }
                    }

                    return true;
                case "x-khojicloud-submit-ai-worklog":
                    if (jsonElement.TryGetValue("aud", out string audience))
                    {
                        if (audience != email)
                        {
                            await turnContext.SendActivityAsync(
                                "This activity is not meant for you!! please submit your own logs.",
                                cancellationToken: token
                            );
                            return true;
                        }

                        if (
                            jsonElement.TryGetValue("workLogs", out List<KbsClient.WorkLogAIDetails> worklogs) &&
                            jsonElement.TryGetValue("identifier", out string identifier)
                        )
                        {
                            var message = new KbsClient(email)
                                .InitializeToken()
                                .PostAiGeneratedWorklogsOnSource(worklogs, identifier, instanceId);

                            await turnContext.SendActivityAsync(message, cancellationToken: token);
                        }
                    }

                    return true;
                case "x-khojicloud-schedule-worklog-reminders":
                    if (jsonElement.TryGetValue("time", out string selectedTime) &&
                        jsonElement.TryGetValue("timezone", out string selectedTimeZone))
                    {
                        var jobUtils = new XJobUtils(logger);

                        var status = await jobUtils.ScheduleProactiveInsights(email, instanceId, turnContext.Activity.Conversation.Id,
                            XTimeSheetJob.ServiceType,
                            new XTimeSheetJobMetaData
                            {
                                Time = DateTime.UtcNow.ChangeUserSpecifiedTimeZoneTimeToUTC(selectedTimeZone, selectedTime).ToString()
                            });

                        var message = status switch
                        {
                            XJobScheduleStatus.Conflict =>
                                "Looks like you have already have same schedule, reply me with 'x-disable-proactive-timesheet' and i can remove it for you",
                            XJobScheduleStatus.Updated =>
                                "Schedule for work log reminder has been updated",
                            XJobScheduleStatus.Scheduled =>
                                "Schedule for work log reminder has been created",
                            _ => string.Empty
                        };

                        await turnContext.SendActivityAsync(message, cancellationToken: token);
                    }
                    else
                        await turnContext.SendActivityAsync("Something went wrong, please try again later", cancellationToken: token);

                    return true;
                default:

                    return false;
            }
        }

        return false;
    }

    public static async Task SendTeamSelectionCardAsync(this ITurnContext turnContext, CancellationToken token, ILogger logger,
        bool standupBoardFeatureFlag,
        string email, int instanceId)
    {
        var gateway = new KbsGateway(logger, KhojiConstants.DatabaseConnectionString);
        var userTeams = gateway.GetUserTeams(instanceId, email);

        if (userTeams == null || !userTeams.Any())
        {
            logger.LogInformation($"No teams found for user {email} in instance {instanceId}");
            await turnContext.SendActivityAsync("You are not supervisor of any team in this instance.",
                cancellationToken: token);
            return;
        }

        var userTeamsList = userTeams.ToList();

        if (userTeamsList.Count > 1 /*check if user has access to multiple teams*/)
        {
            logger.LogInformation($"Sending Team selection card async for instance {instanceId}");
            await turnContext.SendActivityAsync("Khojix currently doesnt support multiple teams, dw devs are actively working on this feature");
        }
        else
        {
            logger.LogInformation($"Sending Team members selection card async for instance {instanceId}");
            await turnContext.SendTeamMembersCardAsync(token, logger, standupBoardFeatureFlag, email, instanceId, userTeamsList.First());
        }
    }

    public static async Task SendTeamMembersCardAsync(this ITurnContext turnContext, CancellationToken token, ILogger logger,
        bool standupBoardFeatureFlag,
        string email, int instanceId, (string teamName, int teamId) team)
    {
        logger.LogInformation($"Sending members selection card async for instance {instanceId}");

        var gateway = new KbsGateway(logger, KhojiConstants.DatabaseConnectionString);
        var teamMembers = gateway.GetTeamMembers(team.teamId);

        if (teamMembers == null || !teamMembers.Any())
        {
            logger.LogInformation($"No team members found for team {team.teamId} in instance {instanceId}");
            await turnContext.SendActivityAsync("No team members found for team.",
                cancellationToken: token);
            return;
        }

        string kssLastSync = null;
        var g = new KssGateway(logger, KhojiConstants.DatabaseConnectionString, instanceId);
        kssLastSync = g.LastSync;

        await turnContext.SendActivityAsync(MessageFactory.Attachment(
            AdaptiveCardsHelper.GenerateTeamMembersSelectionCard(standupBoardFeatureFlag, team.teamName, teamMembers, kssLastSync)),
            cancellationToken: token);
    }
}
