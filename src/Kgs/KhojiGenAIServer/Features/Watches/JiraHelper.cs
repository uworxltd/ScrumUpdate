// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using Dapplo.Jira;
using Dapplo.Jira.Entities;
using KhojiGenAIServer.DatabaseCollections;
using KhojiGenAIServer.Services;
using static KhojiGenAIServer.Features.Watches.ProactiveJql;

namespace KhojiGenAIServer.Features.Watches;

static class JiraHelper
{
    public static async Task<IJiraClient> GetJiraClient(ILogger logger, string logPrefix, string email, int instanceId)
    {
        var credentials = new KbsClient(email)
            .InitializeToken()
            .GetJiraCredentials(instanceId);
        logger.LogInformation($"{logPrefix} 👉 Jira credentials fetched, {email} {credentials.JiraCloudTenantId}");

        var jiraClient = JiraClient
            .Create(new Uri($"https://api.atlassian.com/ex/jira/{credentials.JiraCloudTenantId}"))
            .SetBearerAuthentication(credentials.Token);

        return jiraClient;
    }

    public static async Task<Dictionary<string, string>> GetProjectsAsync(ILogger logger, string logPrefix, string email, int instanceId,
        CancellationToken token)
    {
        var dict = new Dictionary<string, string>();

        var jiraClient = await GetJiraClient(logger, logPrefix, email, instanceId);
        var projects = await jiraClient.Project.GetAllAsync(cancellationToken: token);

        foreach (var project in projects.OrderBy(p => p.Name))
            if (!dict.ContainsKey(project.Key))
                dict.Add(project.Key, project.Name);

        logger.LogInformation($"{logPrefix} 👉 Fetched {dict.Count} projects");
        return dict;
    }

    public static async Task<(ProactiveJql proactive, string tenantName)> SyncJiraItemsAsync(ILogger logger, string connectionString,
        string email, int instanceId, string serviceType, string jql,
        Action<IEnumerable<JiraItem>> OnJiraItems)
    {
        string step = "GetJiraCredentials";

        try
        {
            var credentials = new KbsClient(email)
                .InitializeToken()
                .GetJiraCredentials(instanceId);
            logger.LogInformation($"[{serviceType}:{instanceId}] 👉 Jira credentials fetched, {email} {credentials.JiraCloudTenantId}");

            step = "JiraClient::SearchAsync";
            var jiraClient = JiraClient
                .Create(new Uri($"https://api.atlassian.com/ex/jira/{credentials.JiraCloudTenantId}"))
                .SetBearerAuthentication(credentials.Token);
            var issues = await jiraClient.Issue.SearchAsync(jql,
                new Page { StartAt = 0, MaxResults = 100 },
                fields: [.. JiraConfig.SearchFields, "customfield_10016"]);

            step = "Translating to JiraItem";
            var items = issues.Select(i => new JiraItem(i.Fields.Project.Key,
                i.Key, i.Fields.Summary, i.Fields.Status.Name,
                (((IssueV2)i).GetCustomField("customfield_10016") ?? "0").ToString() ?? "0",
                i.Fields.Assignee?.DisplayName ?? "Unassigned"));
            logger.LogInformation($"[{serviceType}:{instanceId}] 👉 Fetched {items.Count()} items from JQL: {jql}");
            if (null != OnJiraItems) OnJiraItems(items);

            step = $"DatabaseDictionary-{nameof(ProactiveJql)}";
            var proactive = new ProactiveJql();
            var trackableDictionary = new TrackableDictionary<JiraItem>(logger, connectionString,
                instanceId, nameof(ProactiveJql));
            logger.LogInformation($"[{serviceType}:{instanceId}] 👉 Fetched {trackableDictionary.Count()} items from {nameof(ProactiveJql)} Database Dictionary");

            trackableDictionary.OnAddition += i => proactive.AddedItems.Add(i);
            trackableDictionary.OnRemoval += i => proactive.DeletedItems.Add(i);
            trackableDictionary.OnDifference += (v, m) => proactive.ChangedItems.Add(v, m);
            await trackableDictionary.ReplaceWithAsync(items, i => i.Key);

            return (proactive, credentials.TenantName);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"[{serviceType}:{instanceId}] ⚠️ {step} failed");
            throw;
        }
    }
}
