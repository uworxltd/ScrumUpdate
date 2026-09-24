CREATE OR REPLACE VIEW tenant_1005.v_sprint_summary_now AS
WITH ns AS (
  SELECT m.sprint_id, i.issue_key, COALESCE(i.story_points,0) AS sp,
         i.assignee_account_id
  FROM tenant_1005.v_issue_sprint_membership_final m
  JOIN tenant_1005.issues i ON i.issue_key = m.issue_key
  WHERE m.start_ts <= now() AND (m.end_ts IS NULL OR m.end_ts > now())
),
d AS (SELECT * FROM tenant_1005.v_issue_done_at)
SELECT s.sprint_id, s.name,
       COUNT(ns.issue_key) AS issues_in_scope_now,
       SUM(ns.sp)::numeric(10,2) AS points_in_scope_now,
       SUM(CASE WHEN d.done_at IS NOT NULL AND d.done_at <= now() THEN ns.sp ELSE 0 END)::numeric(10,2) AS points_done_now,
       (SUM(ns.sp) - SUM(CASE WHEN d.done_at IS NOT NULL AND d.done_at <= now() THEN ns.sp ELSE 0 END))::numeric(10,2) AS points_remaining_now,
       SUM(CASE WHEN ns.assignee_account_id IS NULL THEN 1 ELSE 0 END) AS unassigned_issues_now
FROM tenant_1005.sprints s
LEFT JOIN ns ON ns.sprint_id = s.sprint_id
LEFT JOIN d  ON d.issue_key  = ns.issue_key
GROUP BY s.sprint_id, s.name;
