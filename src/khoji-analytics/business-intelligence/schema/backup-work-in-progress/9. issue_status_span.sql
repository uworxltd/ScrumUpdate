CREATE OR REPLACE VIEW tenant_1005.v_issue_status_spans AS
WITH init AS (
  SELECT i.issue_key,
         i.created_date AS ts,
         COALESCE(
            (SELECT cl.from_display_value
             FROM tenant_1005.changelogs cl
             WHERE cl.issue_key=i.issue_key AND cl.field_name='status'
             ORDER BY cl.created_date
             LIMIT 1),
            i.status
         ) AS status
  FROM tenant_1005.issues i
),
events AS (
  SELECT issue_key, ts, status FROM init
  UNION ALL
  SELECT cl.issue_key, cl.created_date, cl.to_display_value
  FROM tenant_1005.changelogs cl
  WHERE cl.field_name='status'
),
ordered AS (
  SELECT issue_key, status, ts,
         LEAD(ts) OVER (PARTITION BY issue_key ORDER BY ts) AS next_ts
  FROM events
)
SELECT issue_key,
       status,
       ts AS from_ts,
       next_ts AS to_ts,
       EXTRACT(EPOCH FROM (COALESCE(next_ts, now()) - ts))::bigint AS duration_secs
FROM ordered
WHERE status IS NOT NULL;
