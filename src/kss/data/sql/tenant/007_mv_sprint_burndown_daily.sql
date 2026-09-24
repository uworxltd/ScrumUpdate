-- Create materialized views and index for storing pre-calculated burndown stats
-- Template variables: {schema_name}

-- Drop existing materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS {schema_name}.mv_sprint_burndown_daily;

-- Create sprint burndown daily materialized view
CREATE MATERIALIZED VIEW {schema_name}.mv_sprint_burndown_daily AS
WITH bounds AS (
  SELECT s.sprint_id,
         s.start_date::date AS start_d,
         COALESCE(s.complete_date, s.end_date)::date AS end_d
  FROM {schema_name}.sprints s
  WHERE s.start_date IS NOT NULL
),
days AS (
  SELECT b.sprint_id, d::date AS day
  FROM bounds b
  CROSS JOIN LATERAL generate_series(b.start_d, b.end_d, '1 day') AS d
),
mem AS (
  SELECT m.sprint_id, m.issue_key, m.start_ts, m.end_ts
  FROM {schema_name}.v_issue_sprint_membership_final m
),
issue_points AS (
  SELECT i.issue_key, COALESCE(i.story_points,0)::numeric AS sp
  FROM {schema_name}.issues i
),
done AS (
  SELECT d.issue_key, d.done_at
  FROM {schema_name}.v_issue_done_at d
),
base AS (
  SELECT
    d.sprint_id,
    d.day,
    SUM(COALESCE(ip.sp,0))::numeric AS scope_points,
    SUM(CASE
      WHEN dn.done_at IS NOT NULL
        AND dn.done_at <= (d.day + INTERVAL '1 day' - INTERVAL '1 second')
      THEN COALESCE(ip.sp,0) ELSE 0
    END)::numeric AS done_points
  FROM days d
  JOIN mem m
    ON m.sprint_id = d.sprint_id
    AND d.day >= m.start_ts::date
    AND d.day <= COALESCE(m.end_ts::date, d.day)
  LEFT JOIN issue_points ip ON ip.issue_key = m.issue_key
  LEFT JOIN done dn         ON dn.issue_key = m.issue_key
  GROUP BY d.sprint_id, d.day
)
SELECT
  sprint_id,
  day,
  scope_points,
  done_points,
  GREATEST(scope_points - done_points, 0)::numeric AS remaining_points,
  GREATEST(scope_points - LAG(scope_points) OVER (PARTITION BY sprint_id ORDER BY day), 0)::numeric AS added_points_day,
  GREATEST(LAG(scope_points) OVER (PARTITION BY sprint_id ORDER BY day) - scope_points, 0)::numeric AS removed_points_day
FROM base
ORDER BY sprint_id, day;

COMMENT ON MATERIALIZED VIEW {schema_name}.mv_sprint_burndown_daily IS
'Daily burndown per sprint: scope_points, done_points, remaining_points, added/removed deltas.
- scope_points: sum of SP for issues whose membership covers that day
- done_points: of those, SP counted as done by end of that day (23:59:59)
Refresh after each Jira sync.';

COMMENT ON COLUMN {schema_name}.mv_sprint_burndown_daily.added_points_day IS
'Positive scope change vs previous day (membership-based churn; independent of completion).';

COMMENT ON COLUMN {schema_name}.mv_sprint_burndown_daily.removed_points_day IS
'Negative scope change vs previous day (de-scoping).';

-- Create index for the materialized view
CREATE INDEX IF NOT EXISTS idx_mv_burndown_sprint_day
ON {schema_name}.mv_sprint_burndown_daily (sprint_id, day);