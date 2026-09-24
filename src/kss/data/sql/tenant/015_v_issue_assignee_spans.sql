DROP FUNCTION IF EXISTS {schema_name}.fn_issue_insights_grid_json(integer, text[], integer);


CREATE OR REPLACE VIEW {schema_name}.v_issue_assignee_spans AS
WITH first_assignee AS (
  SELECT i.issue_key,
         CASE
           WHEN fc.issue_key IS NOT NULL AND fc.from_display_value IS NULL THEN 'Unassigned'
           WHEN fc.issue_key IS NULL THEN COALESCE(i.assignee_display_name, 'Unassigned')
           ELSE fc.from_display_value
         END AS assignee_name,
         CASE
           WHEN fc.issue_key IS NOT NULL AND fc.from_value IS NULL THEN NULL
           WHEN fc.issue_key IS NULL THEN i.assignee_account_id
           ELSE fc.from_value
         END AS assignee_account_id
  FROM {schema_name}.issues i
  LEFT JOIN LATERAL (
    SELECT cl.issue_key, cl.from_display_value, cl.from_value
    FROM {schema_name}.changelogs cl
    WHERE cl.issue_key = i.issue_key
      AND cl.field_name = 'assignee'
    ORDER BY cl.created_date
    LIMIT 1
  ) fc ON TRUE
),
events AS (
  -- seed at creation
  SELECT i.issue_key, i.created_date AS ts,
         fa.assignee_name, fa.assignee_account_id
  FROM {schema_name}.issues i
  LEFT JOIN first_assignee fa ON fa.issue_key = i.issue_key

  UNION ALL

  -- subsequent changes; NULL => Unassigned
  SELECT cl.issue_key, cl.created_date AS ts,
         COALESCE(cl.to_display_value, 'Unassigned') AS assignee_name,
         cl.to_value AS assignee_account_id
  FROM {schema_name}.changelogs cl
  WHERE cl.field_name = 'assignee'
),
ordered AS (
  SELECT e.*,
         lead(e.ts) OVER (PARTITION BY e.issue_key ORDER BY e.ts) AS next_ts,
         lag(e.assignee_account_id) OVER (PARTITION BY e.issue_key ORDER BY e.ts) AS prev_id,
         lag(e.assignee_name) OVER (PARTITION BY e.issue_key ORDER BY e.ts) AS prev_name
  FROM events e
),
dedup AS (
  -- drop no-op events (same assignee as previous)
  SELECT *
  FROM ordered
  WHERE prev_id IS NULL
     OR prev_id IS DISTINCT FROM assignee_account_id
     OR prev_name IS DISTINCT FROM assignee_name
)
SELECT
  issue_key,
  assignee_name,
  ts  AS from_ts,
  next_ts AS to_ts,
  assignee_account_id
FROM dedup
ORDER BY issue_key, from_ts;
