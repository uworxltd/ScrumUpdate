// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using Newtonsoft.Json.Linq;
using System.ComponentModel;
using System.Text;

namespace KhojiGenAIServer.Chat.Plugins;

class KasPlugin
{
    ILogger logger = null;
    int sprintId = 0;
    dynamic insightDb = null;

    public KasPlugin(ILogger logger, int instanceId, string cacheKey, string cacheValue)
    {
        this.logger = logger;

        dynamic dKey = JObject.Parse(cacheKey);

        this.sprintId = dKey.sprint_id;
        this.insightDb = JObject.Parse(cacheValue);

        this.logger.LogInformation($"[{instanceId}] {this.sprintId} sprint identified");
    }

    public string GetSprintDetail()
    {
        if (this.insightDb.sprint_facts != null &&
            this.insightDb.sprint_facts.facts != null &&
            this.insightDb.sprint_facts.facts.sprint != null)
        {
            var sprint = this.insightDb.sprint_facts.facts.sprint;
            var sb = new StringBuilder();

            sb.AppendLine("## Sprint Details");

            if (sprint.name != null)
                sb.AppendLine($"- Sprint DetailsName: {sprint.name}");

            if (sprint.start_at != null)
                sb.AppendLine($"- Start Date: {sprint.start_at}");

            if (sprint.end_at != null)
                sb.AppendLine($"- End Date: {sprint.end_at}");

            if (sprint.today != null)
                sb.AppendLine($"- Today: {sprint.today}");

            if (sprint.day_index != null)
                sb.AppendLine($"- Today's Sprint Day: {sprint.day_index}");

            if (sprint.days_total != null)
                sb.AppendLine($"- Total Sprint Days: {sprint.days_total}");

            if (sprint.days_remaining != null)
                sb.AppendLine($"- Sprint Days Remaining: {sprint.days_remaining}");

            //if (sprint.sprint_id != null)
            //    sb.AppendLine($"Sprint ID: {sprint.sprint_id}");

            if (this.insightDb.sprint_facts.facts.predict != null)
            {
                var predict = this.insightDb.sprint_facts.facts.predict;

                if (predict != null)
                {
                    sb.AppendLine("###Sprint Story Point Details");
                    if (predict.committed_points != null)
                        sb.AppendLine($"- Committed: {predict.committed_points}");
                    if (predict.completed_points != null)
                        sb.AppendLine($"- Completed/Done: {predict.completed_points}");
                    if (predict.remaining_points != null)
                        sb.AppendLine($"- Todo/Remaining: {predict.remaining_points}");
                }
            }

            if (this.insightDb.sprint_facts.facts.summary_now != null)
            {
                var summary = this.insightDb.sprint_facts.facts.summary_now;

                if (summary != null)
                {
                    sb.AppendLine("###Sprint Status: Item/Issue counts at the moment");
                    if (summary.total_issues_now != null)
                        sb.AppendLine($"- Total Items/Issues: {summary.total_issues_now}");
                    if (summary.unassigned_cnt != null)
                        sb.AppendLine($"- Unassigned: {summary.unassigned_cnt}");
                    if (summary.todo_cnt != null)
                        sb.AppendLine($"- Todo/Remaining: {summary.todo_cnt}");
                    if (summary.wip_cnt != null)
                        sb.AppendLine($"- In progress: {summary.wip_cnt}");
                    if (summary.done_cnt != null)
                        sb.AppendLine($"- Completed/Done: {summary.done_cnt}");

                    sb.AppendLine("###Sprint Status: Item/Issue Story Points at the moment");
                    if (summary.points_now != null)
                        sb.AppendLine($"- Total Story Points: {summary.points_now}");
                    if (summary.points_done_now != null)
                        sb.AppendLine($"- Completed/Done: {summary.points_done_now}");
                    if (summary.points_remaining_now != null)
                        sb.AppendLine($"- Todo/Remaining: {summary.points_remaining_now}");
                }
            }

            return sb.ToString().Trim();
        }

        return null;
    }

    [Description("Retrieve the current sprint status summary, including counts of WIP, done, to-do, unassigned items, and story points (total, completed, and remaining). Use this when the user asks about the current overall sprint progress or workload.")]
    public string GetSprintCurrentStatus()
    {
        this.logger.LogInformation($"[KasPlugin:{this.sprintId}] GetSprintCurrentStatus called");

        if (this.insightDb.sprint_facts != null &&
            this.insightDb.sprint_facts.facts != null &&
            this.insightDb.sprint_facts.facts.summary_now != null)
        {
            var summary = this.insightDb.sprint_facts.facts.summary_now;
            var sb = new StringBuilder();

            sb.AppendLine("##Sprint's Current Status");

            if (summary.unassigned_cnt != null)
                sb.AppendLine($"- Unassigned Count: {summary.unassigned_cnt}");
            if (summary.todo_cnt != null)
                sb.AppendLine($"- To-Do Count: {summary.todo_cnt}");
            if (summary.wip_cnt != null)
                sb.AppendLine($"- Work In Progress Count: {summary.wip_cnt}");
            if (summary.done_cnt != null)
                sb.AppendLine($"- Done Count: {summary.done_cnt}");

            if (summary.total_issues_now != null)
                sb.AppendLine($"- Total Issue Count: {summary.total_issues_now}");

            if (summary.points_now != null)
                sb.AppendLine($"- Total Story Points: {summary.points_now}");
            if (summary.points_done_now != null)
                sb.AppendLine($"- Completed Story Points: {summary.points_done_now}");
            if (summary.points_remaining_now != null)
                sb.AppendLine($"- Remaining Story Points: {summary.points_remaining_now}");

            this.logger.LogInformation($"[KasPlugin:{this.sprintId}] GetSprintCurrentStatus {sb.Length} long response");
            return sb.ToString().Trim();
        }

        return null;
    }

    [Description("Retrieve all sprint backlog items that are not yet assigned to any team member. Use this when the user asks about unassigned tasks, tickets, or issues.")]
    public IEnumerable<string> GetUnassignedItems()
    {
        this.logger.LogInformation($"[KasPlugin:{this.sprintId}] GetUnassignedItems called");

        if (this.insightDb.sprint_facts != null &&
            this.insightDb.sprint_facts.facts != null &&
            this.insightDb.sprint_facts.facts.lists != null &&
            this.insightDb.sprint_facts.facts.lists.unassigned != null)
        {
            yield return "Unassigned Sprint Items";
            int count = 0;

            foreach (var item in this.insightDb.sprint_facts.facts.lists.unassigned)
            {
                if (count == 0) yield return "issue_key|summary|assignee";
                count++;
                yield return $"{item.issue_key}|{item.summary}|{item.assignee}";
            }

            this.logger.LogInformation($"[KasPlugin:{this.sprintId}] GetUnassignedItems yielded {count} items");
            if (count == 0) yield return "No such item";
        }
    }

    [Description("Retrieve all sprint backlog items that are currently in progress (WIP). Use this when the user asks about ongoing tasks, active issues, or work being done by the team.")]
    public IEnumerable<string> GetInProgressItems()
    {
        this.logger.LogInformation($"[KasPlugin:{this.sprintId}] GetInProgressItems called");

        if (this.insightDb.sprint_facts != null &&
            this.insightDb.sprint_facts.facts != null &&
            this.insightDb.sprint_facts.facts.lists != null &&
            this.insightDb.sprint_facts.facts.lists.wip != null)
        {
            yield return "Unassigned Sprint Items";
            int count = 0;

            foreach (var item in this.insightDb.sprint_facts.facts.lists.wip)
            {
                if (count == 0) yield return "issue_key|summary|assignee";
                count++;
                yield return $"{item.issue_key}|{item.summary}|{item.assignee}";
            }

            this.logger.LogInformation($"[KasPlugin:{this.sprintId}] GetInProgressItems yielded {count} items");
            if (count == 0) yield return "No such item";
        }
    }

    [Description("Retrieve all sprint backlog items that are already completed. Use this when the user asks about done tasks, finished issues, or work that has been delivered.")]
    public IEnumerable<string> GetCompletedItems()
    {
        this.logger.LogInformation($"[KasPlugin:{this.sprintId}] GetCompletedItems called");

        if (this.insightDb.sprint_facts != null &&
            this.insightDb.sprint_facts.facts != null &&
            this.insightDb.sprint_facts.facts.lists != null &&
            this.insightDb.sprint_facts.facts.lists.done != null)
        {
            yield return "Completed Sprint Items";
            int count = 0;

            foreach (var item in this.insightDb.sprint_facts.facts.lists.done)
            {
                if (count == 0) yield return "issue_key|summary|assignee";
                count++;
                yield return $"{item.issue_key}|{item.summary}|{item.assignee}";
            }

            this.logger.LogInformation($"[KasPlugin:{this.sprintId}] GetCompletedItems yielded {count} items");
            if (count == 0) yield return "No such item";
        }
    }

    [Description("Retrieve detailed contribution stats for each team member. Includes issues done, points delivered, current assignments, comments, status changes, and recent activity. Use this to answer questions like 'top contributors', 'least active members', or 'who is overloaded'.")]
    public IEnumerable<string> GetContributors()
    {
        this.logger.LogInformation($"[KasPlugin:{this.sprintId}] GetContributors called");

        if (this.insightDb.sprint_facts != null &&
            this.insightDb.sprint_facts.facts != null &&
            this.insightDb.sprint_facts.facts.contributors != null)
        {
            yield return "Scrum Team Member Contributions in the Sprint";
            int count = 0;

            foreach (var item in this.insightDb.sprint_facts.facts.contributors)
            {
                if (count == 0) yield return "person|issues_done_total|points_done_total|issues_assigned_now|points_assigned_now|comments_count_total|status_changes_count_total";
                count++;
                yield return $"{item.person}|{item.issues_done_total}|{item.points_done_total}|{item.issues_assigned_now}|{item.points_assigned_now}|{item.comments_count_total}|{item.status_changes_count_total}";
            }

            this.logger.LogInformation($"[KasPlugin:{this.sprintId}] GetContributors yielded {count} items");
            if (count == 0) yield return "No such item";
        }
    }

    [Description("Retrieve all sprint backlog items currently at risk. Includes hygiene details like stale tasks, blocked issues, missing description/story points, or long inactivity. Use this to answer questions like 'which issues are risky', 'blocked tasks', or 'stale items'.")]
    public IEnumerable<string> GetAtRiskItems()
    {
        this.logger.LogInformation($"[KasPlugin:{this.sprintId}] GetAtRiskItems called");

        if (this.insightDb.sprint_facts != null &&
            this.insightDb.sprint_facts.at_risk != null)
        {
            yield return "Items at risk in Sprint";
            int count = 0;

            foreach (var item in this.insightDb.sprint_facts.at_risk)
            {
                if (count == 0) yield return "issue_key|summary|assignee|status|blocked?|story_points";
                count++;
                yield return $"{item.issue_key}|{item.summary}|{item.assignee}|{item.status}|{item.blocked}|{item.story_points}";
            }

            this.logger.LogInformation($"[KasPlugin:{this.sprintId}] GetAtRiskItems yielded {count} items");
            if (count == 0) yield return "No such item";
        }
    }

    [Description("Retrieve the progress of epics in the sprint. Includes stories count, points done, total points, and remaining points. Use this to answer questions like 'epic completion', 'remaining effort per epic', or 'which epic is lagging behind'.")]
    public IEnumerable<string> GetEpicProgress()
    {
        this.logger.LogInformation($"[KasPlugin:{this.sprintId}] GetEpicProgress called");

        if (this.insightDb.sprint_facts != null &&
            this.insightDb.sprint_facts.epic_progress != null)
        {
            yield return "Epics being worked in Sprint";
            int count = 0;

            foreach (var item in this.insightDb.sprint_facts.epic_progress)
            {
                if (count == 0) yield return "issue_key|summary|stories|points_total|points_done|points_remaining";
                count++;
                yield return $"{item.epic_key}|{item.epic_summary}|{item.stories}|{item.points_total}|{item.points_done}|{item.points_remaining}";
            }

            this.logger.LogInformation($"[KasPlugin:{this.sprintId}] GetEpicProgress yielded {count} items");
            if (count == 0) yield return "No such item";
        }
    }
}
