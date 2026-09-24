// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

namespace KhojiGenAIServer.Analytics;

static class SprintIssuesProcessor
{
    public static IEnumerable<(string assignee, int count, float totalStoryPoints)> SummariseItems(
        //IEnumerable<(
        //    string issue_id, string issue_type, string summary,
        //    string status, string status_category, string priority,
        //    string assignee_display_name, double story_points, long time_spent
        //    )> input,
        IEnumerable<object> input, // <-- accept objects
        Dictionary<string, object> workflowInputs)
    {
        return input
            .Cast<(
                string issue_id, string issue_type, //string summary,
                string status, /*string status_category,*/ string priority,
                string assignee_display_name, float story_points, long time_spent
            )>() // This cast will work if all items are that tuple type
            .GroupBy(x => x.assignee_display_name)
            .Select(g => (g.Key, g.Count(), g.Sum(x => x.story_points)))
            .ToArray();
    }

    public static IEnumerable<(string issueId, string status, string summary, float daysInCurrentStatus)> MergeIssues(
        object previousResult,
        WorkflowContext context)
    {
        var stagnantTable = context.GetVariable<DynamicTable>("stagnant_issues");
        var blockedTable = context.GetVariable<DynamicTable>("blocked_issues");

        var mergedIssues = new List<(string, string, string, float)>();

        foreach (var row in stagnantTable.AsRows())
            mergedIssues.Add((row["issue_id"].ToString(), "Stagnant",
                row["summary"].ToString(), Convert.ToSingle(row["days_in_status"])));

        foreach (var row in blockedTable.AsRows())
            mergedIssues.Add((row["issue_id"].ToString(), "Blocked",
                row["summary"].ToString(), Convert.ToSingle(row["days_blocked"])));

        return mergedIssues
            .Select(x => (issueId: x.Item1, status: x.Item2, summary: x.Item3, daysInCurrentStatus: x.Item4))
            .OrderByDescending(x => x.daysInCurrentStatus);
    }
}
