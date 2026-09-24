-- Assignee spans per issue (seed + changes)
CREATE OR REPLACE VIEW tenant_1005.v_issue_assignee_spans AS
WITH first_assignee AS (
  SELECT i.issue_key,
         COALESCE(
           (SELECT cl.from_display_value
            FROM tenant_1005.changelogs cl
            WHERE cl.issue_key=i.issue_key AND cl.field_name='assignee'
            ORDER BY cl.created_date
            LIMIT 1),
           i.assignee_display_name
         ) AS assignee_name
  FROM tenant_1005.issues i
),
events AS (
  SELECT i.issue_key, i.created_date AS ts, fa.assignee_name
  FROM tenant_1005.issues i
  LEFT JOIN first_assignee fa ON fa.issue_key=i.issue_key
  UNION ALL
  SELECT cl.issue_key, cl.created_date, cl.to_display_value
  FROM tenant_1005.changelogs cl
  WHERE cl.field_name='assignee'
),
ordered AS (
  SELECT issue_key, assignee_name, ts,
         LEAD(ts) OVER (PARTITION BY issue_key ORDER BY ts) AS next_ts
  FROM events
)
SELECT issue_key,
       assignee_name,
       ts  AS from_ts,
       next_ts AS to_ts
FROM ordered
WHERE assignee_name IS NOT NULL;
