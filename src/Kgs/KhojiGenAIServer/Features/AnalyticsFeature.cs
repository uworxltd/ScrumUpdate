// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Analytics;
using KhojiGenAIServer.Data;
using KhojiGenAIServer.Extensions;
using System.Text;
using System.Text.Json;
using Uworx.Khoji.Abstractions;

namespace KhojiGenAIServer.Features;

// public because of tests
public static class AnalyticsFeature
{
    //static string prependAIWarning(string message)
    //{
    //    var sb = new StringBuilder();

    //    sb.AppendLine("**AI-generated content:** Responses may not always be accurate. Please verify important details. To report concerns, use the Support option on the Hi card.");
    //    sb.AppendLine();
    //    sb.AppendLine(message);

    //    return sb.ToString();
    //}

    static string appendAIWarning(string message) =>
        appendDisclaimer(message,
            disclaimer: "**AI-generated content:** Responses may not always be accurate. Please verify important details. To report concerns, use the Support option on the Hi card.",
            addHorizontalRule: false);

    static string appendDisclaimer(string message, string disclaimer, bool addHorizontalRule)
    {
        var sb = new StringBuilder(message);

        sb.AppendLine("   "); // for previous line
        //sb.AppendLine();
        //sb.AppendLine();

        if (addHorizontalRule)
        {
            sb.AppendLine();
            sb.AppendLine("---");
        }
        //if (addHorizontalRule) sb.AppendLine("─────────────────────────────────────");

        sb.AppendLine(disclaimer);

        return sb.ToString();
    }

    static async Task<IDataOutcome<string>> analyzeSprint(KssGateway kss, string atlassianTenantName,
        string sprintName = null, int? sprintId = null)
    {
        string additionalInfo = "sprint";

        var sprintIdResult = !string.IsNullOrEmpty(sprintName) ? kss.GetSprint(sprintName, out additionalInfo)
            : sprintId.HasValue ? kss.GetSprint(sprintId.Value, out additionalInfo)
            : null;

        if (sprintIdResult is int selectedSprintId)
        {
            var engine = new WorkflowEngine(kss.Logger, kss.ConnectionString);
            var result = await engine.ExecuteWorkflowAsync(kss.InstanceId, "sprint_analyzer",
                isAbsolute: false,
                runtimeInputs: new Dictionary<string, object>
                {
                    ["sprint_id"] = selectedSprintId,
                    ["additionalInfo"] = $"Today is: {DateTime.Now:d}, we are analyzing {additionalInfo}"
                });

            var analysis = result?.ToString();

            if (string.IsNullOrWhiteSpace(analysis))
                return Outcomes.Failure<string>("Unexpected result from Workflow");

            bool horizontalRuleAdded = false;
            if (analysis.Contains("company-name.atlassian.net") ||
                analysis.Contains("http://", StringComparison.OrdinalIgnoreCase) || analysis.Contains("https://", StringComparison.OrdinalIgnoreCase))
            {
                analysis = appendDisclaimer(analysis.Replace("company-name.atlassian.net", $"{atlassianTenantName}.atlassian.net"),
                    "🔗 *Links open in external site*",
                    addHorizontalRule: true);
                horizontalRuleAdded = true;
            }

            return Outcomes.Success(appendAIWarning(appendDisclaimer(analysis,
                "*Sprint analysis is generated based on available synced data. Results may be incomplete, depending on the configured synchronization settings*",
                addHorizontalRule: !horizontalRuleAdded))); // we dont want it if its already added
        }
        else
            return Outcomes.Failure<string>(additionalInfo);
    }

    public static async Task<IDataOutcome<string>> ScrumUpdateAsync(this KssGateway kss, string atlassianTenantName, string accountId)
    {
        if (kss.CanQueryTenantData)
        {
            var today = DateTime.Today;
            var lastWorkingDay = today.LastWorkingDay();
            var engine = new WorkflowEngine(kss.Logger, kss.ConnectionString);

            var result = await engine.ExecuteWorkflowAsync(kss.InstanceId, "scrum_update",
                isAbsolute: false,
                runtimeInputs: new()
                {
                    ["account_id"] = accountId,
                    ["instance_id"] = kss.InstanceId,
                    ["today_date"] = today.ToIsoDateString(),
                    ["yesterday_date"] = lastWorkingDay.ToIsoDateString(),
                    ["additionalInfo"] = "This is the provided json with today activity, yesterday activity, " +
                        "and the issues assigned to user that may be present in activity, according to that generate scrum update"
                });

            var scrumUpdate = result?.ToString();

            if (string.IsNullOrWhiteSpace(scrumUpdate))
                return Outcomes.Failure<string>("Unexpected result from Workflow");

            bool horizontalRuleAdded = false;
            if (scrumUpdate.Contains("company-name.atlassian.net") ||
                scrumUpdate.Contains("http://", StringComparison.OrdinalIgnoreCase) || scrumUpdate.Contains("https://", StringComparison.OrdinalIgnoreCase))
            {
                scrumUpdate = appendDisclaimer(scrumUpdate.Replace("company-name.atlassian.net", $"{atlassianTenantName}.atlassian.net"),
                    "🔗 *Links open in external site*",
                    addHorizontalRule: true);
                horizontalRuleAdded = true;
            }

            return Outcomes.Success(appendAIWarning(appendDisclaimer(scrumUpdate,
                "*Scrum update is generated based on available synced data. Results may be incomplete, depending on the configured synchronization settings*",
                addHorizontalRule: !horizontalRuleAdded))); // we dont want it if its already added
        }
        else
            return Outcomes.Failure<string>("It looks like your Jira data is not synced, please resync it first");
    }

    public static async Task<IDataOutcome<string>> AnalyzeSprintAsync(this KssGateway kss, string atlassianTenantName, int sprintId) =>
        await analyzeSprint(kss, atlassianTenantName, sprintId: sprintId);

    public static async Task<IDataOutcome<string>> AnalyzeSprintAsync(this KssGateway kss, string atlassianTenantName, string sprintName) =>
        await analyzeSprint(kss, atlassianTenantName, sprintName: sprintName);

    public static async Task<IResult> HandleAsync(IServiceProvider services, string yamlFilePath,
        HttpRequest request, HttpResponse response)
    {
        // Check for x-instanceId header
        if (!request.Headers.TryGetValue("x-instanceId", out var tenantHeader) ||
            !int.TryParse(tenantHeader, out var instanceId))
            return Results.BadRequest(new { error = "Missing or invalid x-instanceId header" });

        var runtimeInputs = await JsonSerializer.DeserializeAsync<Dictionary<string, object>>(request.Body);

        var engine = new WorkflowEngine(services.GetService<ILogger<WorkflowEngine>>(),
            KhojiConstants.DatabaseConnectionString);
        var result = await engine.ExecuteWorkflowAsync(instanceId, yamlFilePath,
            isAbsolute: false,
            runtimeInputs);

        return Results.Json(result);
    }
}
