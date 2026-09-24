CREATE OR REPLACE VIEW tenant_1001.v_issue_sprint_membership AS
WITH a AS (
  SELECT issue_key, sprint_id, MIN(created_date) AS start_ts
  FROM tenant_1001.v_sprint_scope_events
  WHERE event_type='added'
  GROUP BY issue_key, sprint_id
),
r AS (
  SELECT e.issue_key, e.sprint_id, MIN(e.created_date) AS end_ts
  FROM tenant_1001.v_sprint_scope_events e
  JOIN a ON a.issue_key=e.issue_key AND a.sprint_id=e.sprint_id
  WHERE e.event_type='removed' AND e.created_date > a.start_ts
  GROUP BY e.issue_key, e.sprint_id
)
SELECT a.issue_key, a.sprint_id, a.start_ts, r.end_ts
FROM a LEFT JOIN r
ON r.issue_key=a.issue_key AND r.sprint_id=a.sprint_id;


CREATE OR REPLACE VIEW tenant_1001.v_issue_sprint_membership_final AS
SELECT m.issue_key, m.sprint_id, m.start_ts, m.end_ts
FROM tenant_1001.v_issue_sprint_membership m
UNION ALL
SELECT si.issue_key, si.sprint_id,
       s.start_date AS start_ts,
       COALESCE(s.complete_date, s.end_date) AS end_ts
FROM tenant_1001.sprint_issues si
JOIN tenant_1001.sprints s ON s.sprint_id = si.sprint_id
LEFT JOIN tenant_1001.v_issue_sprint_membership m
  ON m.issue_key=si.issue_key AND m.sprint_id=si.sprint_id
WHERE m.issue_key IS NULL;