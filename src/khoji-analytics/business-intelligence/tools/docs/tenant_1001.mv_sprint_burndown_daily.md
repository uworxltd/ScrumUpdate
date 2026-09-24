# tenant_1001.mv_sprint_burndown_daily

_materialized view_ — Daily burndown per sprint: scope_points, done_points, remaining_points, added/removed deltas.
- scope_points: sum of SP for issues whose membership covers that day
- done_points: of those, SP counted as done by end of that day (23:59:59)
Refresh after each Jira sync.

## Columns
- `sprint_id` **integer**
- `day` **date**
- `scope_points` **numeric**
- `done_points` **numeric**
- `remaining_points` **numeric**
  Example query:
    -- Burn-down chart data
    SELECT day, remaining_points
    FROM tenant_1001.fn_sprint_burndown(123);
- `added_points_day` **numeric**
  Positive scope change vs previous day (membership-based churn; independent of completion).
- `removed_points_day` **numeric**
  Negative scope change vs previous day (de-scoping).

## Definition
```sql
 WITH bounds AS (
         SELECT s.sprint_id,
            s.start_date::date AS start_d,
            COALESCE(s.complete_date, s.end_date)::date AS end_d
           FROM tenant_1001.sprints s
          WHERE s.start_date IS NOT NULL
        ), days AS (
         SELECT b.sprint_id,
            d.d::date AS day
           FROM bounds b
             CROSS JOIN LATERAL generate_series(b.start_d::timestamp with time zone, b.end_d::timestamp with time zone, '1 day'::interval) d(d)
        ), mem AS (
         SELECT m.sprint_id,
            m.issue_key,
            m.start_ts,
            m.end_ts
           FROM tenant_1001.v_issue_sprint_membership_final m
        ), issue_points AS (
         SELECT i.issue_key,
            COALESCE(i.story_points, 0::numeric) AS sp
           FROM tenant_1001.issues i
        ), done AS (
         SELECT d.issue_key,
            d.done_at
           FROM tenant_1001.v_issue_done_at d
        ), base AS (
         SELECT d.sprint_id,
            d.day,
            sum(COALESCE(ip.sp, 0::numeric)) AS scope_points,
            sum(
                CASE
                    WHEN dn.done_at IS NOT NULL AND dn.done_at <= (d.day + '1 day'::interval - '00:00:01'::interval) THEN COALESCE(ip.sp, 0::numeric)
                    ELSE 0::numeric
                END) AS done_points
           FROM days d
             JOIN mem m ON m.sprint_id = d.sprint_id AND d.day >= m.start_ts::date AND d.day <= COALESCE(m.end_ts::date, d.day)
             LEFT JOIN issue_points ip ON ip.issue_key::text = m.issue_key::text
             LEFT JOIN done dn ON dn.issue_key::text = m.issue_key::text
          GROUP BY d.sprint_id, d.day
        )
 SELECT sprint_id,
    day,
    scope_points,
    done_points,
    GREATEST(scope_points - done_points, 0::numeric) AS remaining_points,
    GREATEST(scope_points - lag(scope_points) OVER (PARTITION BY sprint_id ORDER BY day), 0::numeric) AS added_points_day,
    GREATEST(lag(scope_points) OVER (PARTITION BY sprint_id ORDER BY day) - scope_points, 0::numeric) AS removed_points_day
   FROM base
  ORDER BY sprint_id, day;
```

## Indexes
* idx_mv_burndown_sprint_day
  CREATE INDEX idx_mv_burndown_sprint_day ON tenant_1001.mv_sprint_burndown_daily USING btree (sprint_id, day)