// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Data;
using System.ComponentModel;
using System.Reflection;
using System.Text;
using System.Text.Json;
using Uworx.Khoji.Agile.AI;

namespace KhojiGenAIServer.Chat.Plugins;

class SprintPlugin
{
    readonly ILogger logger = null;
    readonly KssGateway kssGateway = null;
    readonly PluginPayload payload = null;
    readonly string connectionString = null;
    readonly int sprintId = 0;

    string schema => $"tenant_{payload.InstanceId}";

    public KssGateway Gateway => kssGateway;

    public SprintPlugin(ILogger logger, PluginPayload payload, string connectionString)
    {
        this.logger = logger;
        this.payload = payload;
        this.connectionString = connectionString;
        this.kssGateway = new KssGateway(this.logger, this.connectionString, payload.InstanceId);
        this.sprintId = this.kssGateway.GetConfiguredSprint();
    }

    string formatRows<T>(IEnumerable<T> records, string delimiter = " |")
    {
        if (records == null || !records.Any())
            return "";

        var sb = new StringBuilder();

        var properties = typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance);
        sb.AppendLine(string.Join(delimiter, properties.Select(p => p.Name)));

        foreach (var record in records)
            sb.AppendLine(string.Join(delimiter, properties.Select(p => p.GetValue(record))));

        return sb.ToString();
    }

    [ToolFunction("get_unassigned_issues")]
    [Description("Gets issues in the current sprint that have no assignee. Use this to identify work that needs owners and ensure sprint commitment accountability.")]
    public string GetUnassignedIssuesAsString()
    {
        logger.LogInformation($"[{schema}:{sprintId}] GetUnassignedIssues");

        try
        {
            var results = this.kssGateway.GetUnassignedIssues(this.sprintId);
            //llama is not liking jsons too much
            //return JsonSerializer.Serialize(results, new JsonSerializerOptions { WriteIndented = true });
            return formatRows(results);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"[{schema}:{sprintId}] GetUnassignedIssues failed");
            return JsonSerializer.Serialize(new { error = ex.Message });
        }
    }

    //[KernelFunction]
    //[Description("Gets carry-over issues that should be prioritized but haven't been started. Use this to identify stalled high-value work that needs immediate attention.")]
    //public string GetStagnantCarryOverWork()
    //{
    //    return "{}";
    //}

    [ToolFunction("get_carryoverwork_status")]
    [Description("Gets carry-over issues from previous sprints and their current status. Use this to track technical debt and ensure high-value work gets completed.")]
    public string GetCarryOverWorkStatus()
    {
        logger.LogInformation($"[{schema}:{sprintId}] GetCarryOverWorkStatus");

        try
        {
            var results = this.kssGateway.GetCarryOverIssues(this.sprintId);
            return formatRows(results);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"[{schema}:{sprintId}] GetCarryOverWorkStatus failed");
            return JsonSerializer.Serialize(new { error = ex.Message });
        }
    }

    //[KernelFunction]
    //[Description("Gets team members still working on issues from the previous sprint. Use this to identify capacity constraints and help with workload planning.")]
    //public string GetPreviousSprintCarryOver()
    //{
    //    return "{}";
    //}

    [ToolFunction("get_highpriority_issues")]
    [Description("Gets high-priority issues that haven't been picked up yet. Use this to ensure critical sprint work is being addressed first.")]
    public string GetUnstartedHighPriorityIssuesAsString()
    {
        logger.LogInformation($"[{schema}:{sprintId}] GetUnstartedHighPriorityIssues");

        try
        {
            var results = this.kssGateway.GetUnstartedHighPriorityIssues(this.sprintId);
            return formatRows(results);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"[{schema}:{sprintId}] GetUnstartedHighPriorityIssues failed");
            return JsonSerializer.Serialize(new { error = ex.Message });
        }
    }

    //[KernelFunction]
    //[Description("Gets issues planned for this sprint that haven't been started yet. Use this to identify potential bottlenecks or team members who might need support.")]
    //public string GetNotStartedTasks()
    //{
    //    logger.LogInformation($"[{schema}:{sprintId}] GetNotStartedTasks");
    //    var schemaSql = $"SET search_path TO {schema};";

    //    try
    //    {
    //        var dataAccess = new PgDataAccess(this.connectionString);
    //        var results = dataAccess.ExecuteReader(
    //            schemaSql + @"
    //            SELECT i.issue_key, i.summary, i.issue_type, i.priority, i.status, i.assignee_display_name
    //            FROM issues AS i JOIN sprint_issues AS si ON i.issue_key = si.issue_key
    //            WHERE si.sprint_id = @sprintid 
    //                AND i.status_category in ('To Do', 'Pending');
    //            ",
    //            r => new issue(issue_key: r.GetString(0), summary: r.GetString(1), issue_type: r.GetString(2),
    //                priority: r.GetString(3), status: r.GetString(4), assignee: r.GetString(5)),
    //            [("@sprintid", this.sprintId)]);

    //        return this.formatRows(results);
    //    }
    //    catch (Exception ex)
    //    {
    //        logger.LogError(ex, $"[{schema}:{sprintId}] GetNotStartedTasks failed");
    //        return JsonSerializer.Serialize(new { error = ex.Message });
    //    }
    //}

    [ToolFunction("get_blocked_issues")]
    [Description("Gets issues that are formally blocked by dependencies. Use this to identify hard blockers that need immediate attention.")]
    public string GetBlockedIssuesAsString()
    {
        logger.LogInformation($"[{schema}:{sprintId}] GetBlockedIssues");

        try
        {
            var results = this.kssGateway.GetBlockedIssues(this.sprintId);
            return formatRows(results) +
                (results.Count > 0
                ? $"\n\nIn the list above, issue_key column has the item that's in the sprint which is blocked by the item in blocking_issue column, we should follow blocking_issue column items and ensure they are taken care so sprint items get unblocked"
                : "");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"[{schema}:{sprintId}] GetBlockedIssues failed");
            return JsonSerializer.Serialize(new { error = ex.Message });
        }
    }


    [ToolFunction("workload_analysis_of_team")]
    [Description("Gets current workload breakdown for each team member. Use this to identify who might be overloaded or available to take on additional work.")]
    public string GetTeamWorkloadAnalysis()
    {
        logger.LogInformation($"[{schema}:{sprintId}] GetTeamWorkloadAnalysis");

        try
        {
            var results = this.kssGateway.GetTeamWorkloadAnalysis(this.sprintId);
            return formatRows(results);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"[{schema}:{sprintId}] GetTeamWorkloadAnalysis failed");
            return JsonSerializer.Serialize(new { error = ex.Message });
        }
    }

    [ToolFunction("sprint_progress")]
    [Description("Gets sprint progress overview including commitment vs completion stats. Use this to assess if the sprint is on track for its goals.")]
    public string GetSprintProgressSummary()
    {
        logger.LogInformation($"[{schema}:{sprintId}] GetSprintProgressSummary");

        try
        {
            var results = this.kssGateway.GetSprintProgressSummary(this.sprintId);
            return formatRows(results);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"[{schema}:{sprintId}] GetSprintProgressSummary failed");
            return JsonSerializer.Serialize(new { error = ex.Message });
        }
    }

    [ToolFunction("get_team_members")]
    [Description("Gets team members with lighter workloads who could take on unassigned tasks. Use this to help redistribute work when issues need owners.")]
    public string GetAvailableTeamMembers()
    {
        logger.LogInformation($"[{schema}:{sprintId}] GetAvailableTeamMembers");

        try
        {
            var results = this.kssGateway.GetAvailableTeamMembers(this.sprintId);
            return formatRows(results);
            //return JsonSerializer.Serialize(results, new JsonSerializerOptions { WriteIndented = true });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"[{schema}:{sprintId}] GetAvailableTeamMembers failed");
            return JsonSerializer.Serialize(new { error = ex.Message });
        }
    }
}
