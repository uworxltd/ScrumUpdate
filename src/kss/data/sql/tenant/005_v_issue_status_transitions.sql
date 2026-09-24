CREATE OR REPLACE VIEW {schema_name}.v_issue_status_transitions AS
WITH t AS (
  SELECT
    s.issue_key,
    s.status AS from_status,
    LEAD(s.status) OVER (PARTITION BY s.issue_key ORDER BY s.from_ts) AS to_status,
    s.from_ts,
    LEAD(s.from_ts) OVER (PARTITION BY s.issue_key ORDER BY s.from_ts) AS next_from_ts,
    s.to_ts
  FROM {schema_name}.v_issue_status_spans s
),
trans AS (
  SELECT
    issue_key,
    from_status,
    to_status,
    from_ts,
    COALESCE(next_from_ts, to_ts) AS transition_ts,
    EXTRACT(EPOCH FROM (COALESCE(next_from_ts, to_ts, now()) - from_ts))::bigint AS duration_secs
  FROM t
  WHERE to_status IS NOT NULL
)
SELECT
  tr.issue_key,
  tr.from_status,
  tr.to_status,
  tr.transition_ts,
  tr.duration_secs,
  a.assignee_name                      AS person,
  m.sprint_id
FROM trans tr
LEFT JOIN {schema_name}.v_issue_assignee_spans a
  ON a.issue_key = tr.issue_key
  AND a.from_ts <= tr.transition_ts
  AND (a.to_ts IS NULL OR a.to_ts > tr.transition_ts)
LEFT JOIN {schema_name}.v_issue_sprint_membership_final m
  ON m.issue_key = tr.issue_key
  AND m.start_ts <= tr.transition_ts
  AND (m.end_ts IS NULL OR m.end_ts > tr.transition_ts);