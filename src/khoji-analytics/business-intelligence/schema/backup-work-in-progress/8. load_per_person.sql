CREATE OR REPLACE VIEW tenant_1005.v_sprint_load_per_person_now AS
WITH ns AS (
  SELECT m.sprint_id, i.issue_key, COALESCE(i.story_points,0) AS sp,
         COALESCE(i.assignee_account_id,'(unassigned)') AS assignee_account_id,
         i.assignee_display_name
  FROM tenant_1005.v_issue_sprint_membership_final m
  JOIN tenant_1005.issues i ON i.issue_key = m.issue_key
  WHERE m.start_ts <= now() AND (m.end_ts IS NULL OR m.end_ts > now())
)
SELECT sprint_id,
       assignee_account_id,
       MAX(assignee_display_name) FILTER (WHERE assignee_display_name IS NOT NULL) AS assignee_display_name,
       COUNT(*) AS issue_count,
       SUM(sp)::numeric(10,2) AS story_points
FROM ns
GROUP BY sprint_id, assignee_account_id
ORDER BY sprint_id, assignee_account_id;
