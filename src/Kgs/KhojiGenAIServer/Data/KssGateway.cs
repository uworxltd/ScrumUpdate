// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Extensions;
using Uworx.Khoji.Agile;

namespace KhojiGenAIServer.Data;

// public because of tests
public class KssGateway : BaseAgileInstanceComponent
{
    public record IssueRecord(string issue_key, string summary, string issue_type, string priority, string status, string assignee = null);
    public record BlockedIssueRecord(string blocking_issue, string issue_key, string summary, string issue_type, string priority, string status, string assignee = null);
    public record TeamMemberProgress(string assignee_account_id, string assignee_display_name,
        int total_assigned_issues, int in_progress_count, int todo_count, int done_count,
        int total_story_points, int in_progress_points);
    public record SprintProgress(string sprint_name, int total_committed_issues, int total_committed_points, int completed_issues,
        int in_progress_issues, int not_started_issues, int completed_points, int in_progress_points, decimal completion_percentage);
    public record TeamMemberLoad(string assignee_account_id, string assignee_display_name,
        int current_assignments, int active_work);

    DateTime? lastSuccessfulSync = null;
    bool? hasData = null;
    bool? needsSync = null;

    string schema => $"tenant_{base.InstanceId}";

    public bool HasData => this.hasData ?? false;
    public bool NeedsSync => this.needsSync ?? true;
    public bool CanQueryTenantData => this.HasData && !this.NeedsSync;

    public string LastSync
    {
        get
        {
            if (lastSuccessfulSync == null)
                return null;
            //return "Never";

            var diff = DateTime.UtcNow - lastSuccessfulSync.Value;

            if (diff.TotalMinutes < 1)
                return "less than a minute ago";

            if (diff.TotalHours < 1)
            {
                int mins = (int)diff.TotalMinutes;
                return $"{mins} minute{(mins > 1 ? "s" : "")} ago";
            }

            if (diff.TotalDays < 1)
            {
                int hours = (int)diff.TotalHours;
                int mins = diff.Minutes;

                if (hours == 1 && mins > 0)
                    return "more than an hour ago";

                return $"{hours} hour{(hours > 1 ? "s" : "")} ago";
            }

            if (diff.TotalDays < 2)
            {
                int days = (int)diff.TotalDays;
                int hours = diff.Hours;

                if (days == 1 && hours > 0)
                    return "more than a day ago";

                return "1 day ago";
            }

            int d = (int)diff.TotalDays;
            return $"{d} day{(d > 1 ? "s" : "")} ago";
        }
    }

    bool checkTenantStatus()
    {
        this.hasData = this.needsSync = null;

        var dataAccess = new PgDataAccess(base.ConnectionString);
        var status = dataAccess.ExecuteReader<(DateTime? lastSync, bool HasData, bool NeedsSync)>(@"
            SELECT last_successful_job_date, has_data, needs_sync
            FROM kss_system.get_tenant_comprehensive_status(@tenant)
            ",
            r => (r.IsDBNull(0) ? null : r.GetDateTime(0), r.GetBoolean(1), r.GetBoolean(2)),
            [("@tenant", base.InstanceId.ToString())]);

        if (status == null || status.Count == 0) return false;

        var detail = status.FirstOrDefault();
        this.lastSuccessfulSync = detail.lastSync;
        this.hasData = detail.HasData;
        this.needsSync = detail.NeedsSync;
        return true;
    }

    public KssGateway(ILogger logger, string connectionString, int instanceId) : base(logger, connectionString, instanceId)
    {
        if (!this.checkTenantStatus())
            throw new ArgumentException($"{instanceId} is not valid Tenant for queries");
    }

    int? getSprint(out DateTime? start, out DateTime? end, out string errorOrMessage, string sprintName = null, int? sprintId = null)
    {
        if (sprintName is null && sprintId is null)
        {
            errorOrMessage = "We need either the sprint name or its id";

            start = end = null;
            return null;
        }

        if (!CanQueryTenantData)
        {
            errorOrMessage = $"{base.InstanceId} is not ready for queries, hasData: {this.HasData}, needsSync: {this.NeedsSync}";

            start = end = null;
            return null;
        }

        var dataAccess = new PgDataAccess(base.ConnectionString);
        if (!dataAccess.ExecuteScalar<bool>(@"
			SELECT COUNT(*) = 2 AS both_exist
			FROM information_schema.tables
			WHERE table_schema = @schema
			  AND table_name IN ('sprints', 'sprint_issues')
			",
            [("@schema", schema)]))
        {
            errorOrMessage = $"Couldnt find the required table structures in {schema} schema";

            start = end = null;
            return null;
        }

        var condition = "state = 'ACTIVE'";
        if (sprintId.HasValue)
            condition = $"sprint_id = {sprintId.Value}";
        if (!string.IsNullOrEmpty(sprintName))
            condition = $"name = '{sprintName}'";

        var activeSprints = dataAccess.ExecuteReader<(int SprintId, int BoardId,
            string Name, DateTime Start, DateTime End, string Goal, DateTime Sync)>($@"
			SELECT sprint_id, board_id, name, start_date, end_date, goal, last_synced_at
			FROM {schema}.sprints
			WHERE {condition}
			",
            r => (r.GetInt32(0), r.GetInt32(1),
                r.GetString(2), r.GetDateTime(3), r.GetDateTime(4), r.GetString(5), r.GetDateTime(6)));

        if (activeSprints == null || activeSprints.Count == 0)
        {
            errorOrMessage = $"Couldnt find any active sprint in {schema} schema";

            start = end = null;
            return null;
        }

        var firstActiveSprint = activeSprints.FirstOrDefault();

        errorOrMessage = $"Sprint Title: {firstActiveSprint.Name}, From Board: {firstActiveSprint.BoardId}, Started: {firstActiveSprint.Start:d}, will end: {firstActiveSprint.End:d} has goal: {firstActiveSprint.Goal}";

        start = firstActiveSprint.Start;
        end = firstActiveSprint.End;
        return firstActiveSprint.SprintId;
    }

    public int? GetSprint(string sprintName, out DateTime? start, out DateTime? end, out string errorOrMessage) =>
        getSprint(out start, out end, out errorOrMessage, sprintName, sprintId: null);

    public int? GetSprint(string sprintName, out string errorOrMessage) =>
        getSprint(out _, out _, out errorOrMessage, sprintName, sprintId: null);

    public int? GetSprint(int sprintId, out DateTime? start, out DateTime? end, out string errorOrMessage) =>
        getSprint(out start, out end, out errorOrMessage, sprintName: null, sprintId);

    public int? GetSprint(int sprintId, out string errorOrMessage) =>
        getSprint(out _, out _, out errorOrMessage, sprintName: null, sprintId);

    public List<IssueRecord> GetUnassignedIssues(int sprintId)
    {
        var schemaSql = $"SET search_path TO {schema};";

        var dataAccess = new PgDataAccess(base.ConnectionString);
        return dataAccess.ExecuteReader(
            schemaSql + @"
                SELECT i.issue_key, i.summary, i.issue_type, i.priority, i.status
                FROM issues AS i JOIN sprint_issues AS si ON i.issue_key = si.issue_key
                WHERE si.sprint_id = @sprintId
                    AND i.status_category not in ('Done', 'Closed', 'Resolved')
                    AND (i.assignee_account_id IS NULL OR trim(i.assignee_account_id) = '');
                ",
            r => new IssueRecord(issue_key: r.GetString(0), summary: r.GetString(1), issue_type: r.GetString(2),
                priority: r.GetString(3), status: r.GetString(4)),
            [("@sprintid", sprintId)]);
    }

    public List<IssueRecord> GetCarryOverIssues(int sprintId)
    {
        var schemaSql = $"SET search_path TO {schema};";

        var dataAccess = new PgDataAccess(base.ConnectionString);
        return dataAccess.ExecuteReader(
            schemaSql + @"
                SELECT i.issue_key, i.summary, i.issue_type, i.priority, i.status, i.assignee_display_name
                FROM issues AS i JOIN sprint_issues AS si ON i.issue_key = si.issue_key
                WHERE si.sprint_id = @sprintid
                  AND i.status_category not in ('Done', 'Closed', 'Resolved')
                  AND EXISTS (
                    SELECT 1
                    FROM sprint_issues si2
                    WHERE si2.issue_key = i.issue_key
                      AND si2.sprint_id <> @sprintid
                  );
                ",
            r => new IssueRecord(issue_key: r.GetString(0), summary: r.GetString(1), issue_type: r.GetString(2),
                priority: r.GetString(3), status: r.GetString(4), assignee: r.GetString(5)),
            [("@sprintid", sprintId)]);
    }

    public List<IssueRecord> GetUnstartedHighPriorityIssues(int sprintId)
    {
        var schemaSql = $"SET search_path TO {schema};";

        var dataAccess = new PgDataAccess(base.ConnectionString);
        return dataAccess.ExecuteReader(
            schemaSql + @"
                SELECT i.issue_key, i.summary, i.issue_type, i.priority, i.status, i.assignee_display_name
                FROM issues AS i JOIN sprint_issues AS si ON i.issue_key = si.issue_key
                WHERE si.sprint_id = @sprintid 
                    AND i.status_category in ('To Do', 'Pending')
                    AND i.priority IN ('Highest', 'High');
                ",
            r => new IssueRecord(issue_key: r.GetString(0), summary: r.GetString(1), issue_type: r.GetString(2),
                priority: r.GetString(3), status: r.GetString(4), assignee: r.GetString(5)),
            [("@sprintid", sprintId)]);
    }

    public List<BlockedIssueRecord> GetBlockedIssues(int sprintId)
    {
        var schemaSql = $"SET search_path TO {schema};";

        var dataAccess = new PgDataAccess(base.ConnectionString);
        return dataAccess.ExecuteReader(
            schemaSql + @"
                SELECT il.linked_issue_key AS blocking_issue, i.issue_key, i.summary, i.issue_type, i.priority, i.status, i.assignee_display_name
                FROM issues AS i JOIN sprint_issues AS si_blocked ON si_blocked.issue_key = i.issue_key
                        AND si_blocked.sprint_id = @sprintid
                    JOIN issue_links AS il ON il.source_issue_key = i.issue_key         -- source_issue_key, linked_issue_key
                        AND il.link_type = 'is blocked by'                              -- blocks, is blocked by
                    JOIN issues AS b ON il.linked_issue_key = b.issue_key               -- blocking issue
                        AND b.status_category not in ('Done', 'Closed', 'Resolved')         -- blocking issue should not be closed
                    JOIN sprint_issues AS si_blocking ON si_blocking.issue_key = il.linked_issue_key
                        AND si_blocking.sprint_id = @sprintid;
                ",
            r => new BlockedIssueRecord(blocking_issue: r.GetString(0), issue_key: r.GetString(1), summary: r.GetString(2), issue_type: r.GetString(3),
                priority: r.GetString(4), status: r.GetString(5), assignee: r.GetString(6)),
            [("@sprintid", sprintId)]);
    }

    public List<TeamMemberProgress> GetTeamWorkloadAnalysis(int sprintId)
    {
        var schemaSql = $"SET search_path TO {schema};";
        var dataAccess = new PgDataAccess(base.ConnectionString);
        return dataAccess.ExecuteReader(
            schemaSql + @"
                SELECT i.assignee_account_id, i.assignee_display_name,
                    COUNT(*) as total_assigned_issues,
                    SUM(CASE WHEN i.status_category = 'In Progress' THEN 1 ELSE 0 END) as in_progress_count,
                    SUM(CASE WHEN i.status_category = 'To Do' THEN 1 ELSE 0 END) as todo_count,
                    SUM(CASE WHEN i.status_category = 'Done' THEN 1 ELSE 0 END) as done_count,
                    -- Include story points if available
                    COALESCE(SUM(i.story_points), 0) as total_story_points,
                    COALESCE(SUM(CASE WHEN i.status_category = 'In Progress' THEN i.story_points ELSE 0 END), 0) as in_progress_points
                FROM issues AS i JOIN sprint_issues AS si ON i.issue_key = si.issue_key
                WHERE si.sprint_id = @sprintid
                    AND i.assignee_account_id IS NOT NULL
                GROUP BY i.assignee_account_id, i.assignee_display_name
                ORDER BY in_progress_count DESC, total_assigned_issues DESC;
                ",
            r => new TeamMemberProgress(assignee_account_id: r.GetString(0), assignee_display_name: r.GetString(1),
                total_assigned_issues: r.GetInt32(2), in_progress_count: r.GetInt32(3), todo_count: r.GetInt32(4), done_count: r.GetInt32(5),
                total_story_points: r.GetInt32(6), in_progress_points: r.GetInt32(7)),
            [("@sprintid", sprintId)]);
    }

    public List<SprintProgress> GetSprintProgressSummary(int sprintId)
    {
        // Check Query / Reader Type
        var schemaSql = $"SET search_path TO {schema};";
        var dataAccess = new PgDataAccess(base.ConnectionString);
        return dataAccess.ExecuteReader(
            schemaSql + @"
                SELECT s.sprint_name,
                    COUNT(*) as total_committed_issues,
                    COALESCE(SUM(i.story_points), 0) as total_committed_points,
                    SUM(CASE WHEN i.status_category = 'Done' THEN 1 ELSE 0 END) as completed_issues,
                    SUM(CASE WHEN i.status_category = 'In Progress' THEN 1 ELSE 0 END) as in_progress_issues,
                    SUM(CASE WHEN i.status_category = 'To Do' THEN 1 ELSE 0 END) as not_started_issues,
                    COALESCE(SUM(CASE WHEN i.status_category = 'Done' THEN i.story_points ELSE 0 END), 0) as completed_points,
                    COALESCE(SUM(CASE WHEN i.status_category = 'In Progress' THEN i.story_points ELSE 0 END), 0) as in_progress_points,
                    ROUND(
                        (SUM(CASE WHEN i.status_category = 'Done' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2
                    ) as completion_percentage
                FROM sprints AS s
                JOIN sprint_issues AS si ON s.sprint_id = si.sprint_id
                JOIN issues AS i ON si.issue_key = i.issue_key
                WHERE s.sprint_id = @sprintid
                    AND s.state = 'active' 
                GROUP BY s.sprint_id, s.sprint_name;
                ",
            r => new SprintProgress(sprint_name: r.GetString(0), total_committed_issues: r.GetInt32(1), total_committed_points: r.GetInt32(2), completed_issues: r.GetInt32(3),
                in_progress_issues: r.GetInt32(4), not_started_issues: r.GetInt32(5), completed_points: r.GetInt32(6), in_progress_points: r.GetInt32(7),
                completion_percentage: r.GetDecimal(8)),
            [("@sprintid", sprintId)]);
    }

    public List<TeamMemberLoad> GetAvailableTeamMembers(int sprintId)
    {
        var schemaSql = $"SET search_path TO {schema};";

        var dataAccess = new PgDataAccess(base.ConnectionString);
        return dataAccess.ExecuteReader(
            schemaSql + @"
                WITH workload_summary AS (
                    SELECT i.assignee_account_id, i.assignee_display_name,
                        COUNT(*) as current_assignments,
                        SUM(CASE WHEN i.status_category = 'In Progress' THEN 1 ELSE 0 END) as active_work
                    FROM issues AS i
                    JOIN sprint_issues AS si ON i.issue_key = si.issue_key
                    WHERE si.sprint_id = @sprintid
                        AND i.assignee_account_id IS NOT NULL
                    GROUP BY i.assignee_account_id, i.assignee_display_name
                )
                SELECT assignee_account_id, assignee_display_name, current_assignments, active_work
                FROM workload_summary
                WHERE active_work <= 2                                                          -- Arbitrary threshold
                ORDER BY active_work ASC, current_assignments ASC;
                ",
            r => new TeamMemberLoad(assignee_account_id: r.GetString(0), assignee_display_name: r.GetString(1),
                current_assignments: r.GetInt32(2), active_work: r.GetInt32(3)),
            [("@sprintid", sprintId)]);
    }

    #region We need to see how best to surface these concepts / queries
    /*
-- Find team members still working on issues from the previous sprint
SELECT 
    i.assignee_account_id,
    i.assignee_display_name,
    i.issue_key,
    i.summary,
    i.status,
    i.priority,
    prev_s.sprint_name as previous_sprint
FROM issues AS i
JOIN sprint_issues AS si ON i.issue_key = si.issue_key
JOIN sprints AS prev_s ON si.sprint_id = prev_s.sprint_id
WHERE prev_s.sprint_id = (
    -- Get the previous sprint
    SELECT sprint_id 
    FROM sprints 
    WHERE board_id = YOUR_BOARD_ID -- e.g., 101
      AND state = 'closed'
      AND end_date = (
          SELECT MAX(end_date) 
          FROM sprints 
          WHERE board_id = YOUR_BOARD_ID AND state = 'closed'
      )
    LIMIT 1
)
AND i.status_category <> 'Done'
AND i.assignee_account_id IS NOT NULL
ORDER BY i.assignee_display_name, i.priority;

-- Find carry-over issues that should be prioritized but aren't in progress
SELECT 
    i.issue_key,
    i.summary,
    i.status,
    i.assignee_display_name,
    i.priority,
    DATEDIFF(CURRENT_DATE, i.created_date) as days_old
FROM issues AS i
JOIN sprint_issues AS si ON i.issue_key = si.issue_key
JOIN sprints AS s ON si.sprint_id = s.sprint_id
WHERE s.state = 'active'
  AND s.board_id = YOUR_BOARD_ID -- e.g., 101
  AND i.created_date < s.start_date  -- Carry-over condition
  AND i.status_category = 'To Do'    -- Not started yet
  AND i.assignee_account_id IS NOT NULL  -- Has an owner but not started
ORDER BY i.priority, days_old DESC;
     */
    #endregion

    public Dictionary<DateOnly, (int seconds, string friendly)> GetDailyWorklogs(
        string accountId, DateTime from, DateTime to, out string errorOrMessage)
    {
        errorOrMessage = "";

        if (!CanQueryTenantData)
        {
            errorOrMessage = $"{base.InstanceId} is not ready for queries, hasData: {this.HasData}, needsSync: {this.NeedsSync}";
            return null;
        }

        var dictionary = new Dictionary<DateOnly, int>();
        var fromMidNight = from.Date;
        var toNextDayMidNight = to.Date.AddDays(1);
        var dataAccess = new PgDataAccess(base.ConnectionString);

        var workLogs = dataAccess.ExecuteReader<(string worklogId, DateTime date, string issueId, int seconds)>($@"
            SELECT worklog_id, started_date, issue_key, time_spent_seconds
            FROM {schema}.worklogs
            WHERE author_account_id = @accountId
                AND started_date >= @fromMidNight
                AND started_date < @toNextDayMidNight
            ORDER BY started_date
			",
            r => (r.GetString(0), r.GetDateTime(1), r.GetString(2), r.GetInt32(3)),
            [("@accountid", accountId), ("@fromMidNight", fromMidNight), ("@toNextDayMidNight", toNextDayMidNight)]);

        // we could do grouping but then i had to learn postgresql date only function; choosing to do it in .NET instead
        foreach (var worklog in workLogs)
        {
            var k = DateOnly.FromDateTime(worklog.date);
            var v = worklog.seconds;
            if (v <= 0) continue;

            if (dictionary.ContainsKey(k))
                dictionary[k] += v;
            else
                dictionary[k] = v;
        }

        return dictionary.ToDictionary(
            kvp => kvp.Key,
            kvp =>
            {
                var ts = TimeSpan.FromSeconds(kvp.Value);
                return (kvp.Value, ts.ToHoursAndMinutes());
            });
    }

    public (DateTime, Dictionary<DateOnly, (int seconds, string friendly)>) GetDailyWorklogsOfThisWeek(
        string accountId, out string errorOrMessage) =>
        (DateTime.UtcNow.StartOfWeek(), GetDailyWorklogs(accountId, DateTime.UtcNow.StartOfWeek(), DateTime.UtcNow.EndOfWeek(), out errorOrMessage));

    public (DateTime, Dictionary<DateOnly, (int seconds, string friendly)>) GetDailyWorklogsOfLastWeek(
        string accountId, out string errorOrMessage) =>
        (DateTime.UtcNow.StartOfWeek().AddDays(-7),
        GetDailyWorklogs(accountId, DateTime.UtcNow.StartOfWeek().AddDays(-7), DateTime.UtcNow.EndOfWeek().AddDays(-7), out errorOrMessage));

    public bool KasAvailable(out string jsonKey, out string jsonValue)
    {
        (jsonKey, jsonValue) = (null, null);

        var dataAccess = new PgDataAccess(base.ConnectionString);
        var cache = dataAccess.ExecuteReader<(string key, string value)>($@"
			SELECT key, value
			FROM {schema}.cache_meta
			WHERE key like '{schema}:sprint_and_team_insight_db:combine:%'
            ",
            r => (r.GetString(0), r.GetString(1)));

        if (cache.Count > 0)
        {
            jsonKey = cache[0].key.TrimStart($"tenant_{schema}:sprint_and_team_insight_db:combine:".ToCharArray());
            jsonValue = cache[0].value;

            return true;
        }

        return false;
    }
}
