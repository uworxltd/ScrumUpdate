CREATE OR REPLACE VIEW tenant_1005.v_sprint_burndown_daily AS
WITH cal AS (SELECT * FROM tenant_1005.v_sprint_calendar),
mem AS (SELECT * FROM tenant_1005.v_issue_sprint_membership_final),
done AS (SELECT * FROM tenant_1005.v_issue_done_at),
scope AS (
  SELECT c.sprint_id, c.day, c.day_end, m.issue_key,
         COALESCE(i.story_points,0) AS sp,
         (d.done_at IS NOT NULL AND d.done_at <= c.day_end) AS is_done_by_day
  FROM cal c
  JOIN mem m ON m.sprint_id = c.sprint_id
            AND m.start_ts <= c.day_end
            AND (m.end_ts IS NULL OR m.end_ts > c.day_end)
  JOIN tenant_1005.issues i ON i.issue_key = m.issue_key
  LEFT JOIN done d ON d.issue_key = m.issue_key
),
agg AS (
  SELECT sprint_id, day,
         SUM(sp) AS scope_points,
         COUNT(*) AS scope_issues,
         SUM(CASE WHEN is_done_by_day THEN sp ELSE 0 END) AS done_points,
         SUM(CASE WHEN is_done_by_day THEN 1 ELSE 0 END)   AS done_issues
  FROM scope
  GROUP BY sprint_id, day
),
changes AS (
  SELECT e.sprint_id,
         date_trunc('day', e.created_date)::date AS day,
         SUM(CASE WHEN e.event_type='added'   THEN COALESCE(i.story_points,0) ELSE 0 END) AS added_points_day,
         SUM(CASE WHEN e.event_type='removed' THEN COALESCE(i.story_points,0) ELSE 0 END) AS removed_points_day,
         SUM(CASE WHEN e.event_type='added'   THEN 1 ELSE 0 END) AS added_issues_day,
         SUM(CASE WHEN e.event_type='removed' THEN 1 ELSE 0 END) AS removed_issues_day
  FROM tenant_1005.v_sprint_scope_events e
  LEFT JOIN tenant_1005.issues i ON i.issue_key = e.issue_key
  GROUP BY e.sprint_id, date_trunc('day', e.created_date)
)
SELECT
  c.sprint_id, c.day,
  COALESCE(a.scope_points,0)::numeric(10,2) AS scope_points,
  COALESCE(a.done_points,0)::numeric(10,2)  AS done_points,
  (COALESCE(a.scope_points,0) - COALESCE(a.done_points,0))::numeric(10,2) AS remaining_points,
  COALESCE(a.scope_issues,0) AS scope_issues,
  COALESCE(a.done_issues,0)  AS done_issues,
  (COALESCE(a.scope_issues,0) - COALESCE(a.done_issues,0)) AS remaining_issues,
  COALESCE(ch.added_points_day,0)::numeric(10,2)   AS added_points_day,
  COALESCE(ch.removed_points_day,0)::numeric(10,2) AS removed_points_day,
  COALESCE(ch.added_issues_day,0)   AS added_issues_day,
  COALESCE(ch.removed_issues_day,0) AS removed_issues_day,
  SUM(COALESCE(ch.added_points_day,0))   OVER (PARTITION BY c.sprint_id ORDER BY c.day) AS added_points_cum,
  SUM(COALESCE(ch.removed_points_day,0)) OVER (PARTITION BY c.sprint_id ORDER BY c.day) AS removed_points_cum,
  SUM(COALESCE(ch.added_issues_day,0))   OVER (PARTITION BY c.sprint_id ORDER BY c.day) AS added_issues_cum,
  SUM(COALESCE(ch.removed_issues_day,0)) OVER (PARTITION BY c.sprint_id ORDER BY c.day) AS removed_issues_cum
FROM cal c
LEFT JOIN agg a  ON a.sprint_id=c.sprint_id AND a.day=c.day
LEFT JOIN changes ch ON ch.sprint_id=c.sprint_id AND ch.day=c.day
ORDER BY c.sprint_id, c.day;
