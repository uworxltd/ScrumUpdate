CREATE OR REPLACE VIEW tenant_1005.v_sprint_scope_events AS
WITH raw AS (
  SELECT issue_key, created_date,
         ARRAY(SELECT trim(x)::int FROM regexp_split_to_table(coalesce(from_value,''), E'\\s*,\\s*') x WHERE x ~ '^[0-9]+$') AS from_arr,
         ARRAY(SELECT trim(x)::int FROM regexp_split_to_table(coalesce(to_value,''),   E'\\s*,\\s*') x WHERE x ~ '^[0-9]+$') AS to_arr
  FROM tenant_1005.changelogs
  WHERE field_name = 'Sprint'
),
added AS (
  SELECT r.issue_key, r.created_date, unnest(r.to_arr) AS sprint_id
  FROM raw r
),
removed AS (
  SELECT r.issue_key, r.created_date, unnest(r.from_arr) AS sprint_id
  FROM raw r
)
SELECT a.issue_key, a.sprint_id, a.created_date, 'added'::text AS event_type
FROM added a
LEFT JOIN raw r ON r.issue_key=a.issue_key AND r.created_date=a.created_date
WHERE r.from_arr IS NULL OR NOT (a.sprint_id = ANY(r.from_arr))
UNION ALL
SELECT r2.issue_key, r2.sprint_id, r2.created_date, 'removed'::text AS event_type
FROM removed r2
LEFT JOIN raw rr ON rr.issue_key=r2.issue_key AND rr.created_date=r2.created_date
WHERE rr.to_arr IS NULL OR NOT (r2.sprint_id = ANY(rr.to_arr));