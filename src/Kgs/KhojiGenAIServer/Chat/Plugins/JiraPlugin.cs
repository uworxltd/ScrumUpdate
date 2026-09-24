// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using Dapplo.Jira;
using Dapplo.Jira.Entities;
using Dapplo.Jira.Query;
using KhojiGenAIServer.Services;
using System.ComponentModel;
using System.Text.Json;
using Uworx.Khoji.Agile.AI;

namespace KhojiGenAIServer.Chat.Plugins;

class JiraPlugin
{
    IJiraClient jira;

    public JiraPlugin(int instanceId, string email)
    {
        KbsClient.JiraCredentials credentials = new KbsClient(email)
            .InitializeToken()
            .GetJiraCredentials(instanceId);

        this.jira = JiraClient.Create(new Uri($"https://api.atlassian.com/ex/jira/{credentials.JiraCloudTenantId}"))
            .SetBearerAuthentication(credentials.Token);
    }

    [ToolFunction("jira_get_issue")]
    [Description("Get details of a Jira issue")]
    public async Task<string> GetIssue(
        [Description("Issue key, e.g., 'PROJ-123'")] string issueKey)
    {
        var result = await this.jira.Issue.SearchAsync(Where.IssueKey.Is(issueKey));
        foreach (var issue in result)
            return JsonSerializer.Serialize(issue, new JsonSerializerOptions { WriteIndented = true });

        return $"{issueKey} not found";
    }

    [ToolFunction("jira_add_comment")]
    [Description("Add a comment to an issue.")]
    public async Task<string> AddComment(
        [Description("Issue key, e.g., 'PROJ-123'")] string issueKey,
        [Description("Comment text in Markdown")] string comment)
    {
        Issue foundIssue = null;
        var result = await this.jira.Issue.SearchAsync(Where.IssueKey.Is(issueKey));
        foreach (var issue in result)
        {
            foundIssue = issue;
            break;
        }

        if (foundIssue == null) return $"{issueKey} not found";

        await foundIssue.AddCommentAsync(comment);
        return $"Comment added to {issueKey}";
    }

    [ToolFunction("jira_add_worklog")]
    [Description("Add a worklog entry to an issue.")]
    public async Task<string> AddWorklog(
        [Description("Issue key, e.g., 'PROJ-123'")] string issueKey,
        [Description("Time spent, e.g., '1h 30m', '1d', '30m'")] string timeSpent,
        [Description("Optional: comment in Markdown")] string comment = null)
    {
        var worklog = new Worklog { TimeSpent = timeSpent };
        if (comment != null) worklog.Comment = comment;

        await jira.WorkLog.CreateAsync(issueKey, worklog);

        return $"Worklog added to {issueKey}";
    }
}
