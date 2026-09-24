-- Single issue
SELECT * FROM tenant_1005.v_issue_360 WHERE issue_key = 'KFX-3';

-- Only issues with children
SELECT issue_key, summary, subtasks
FROM tenant_1005.v_issue_360
WHERE jsonb_array_length(subtasks) > 0;

-- Issues touched in last 48h
SELECT issue_key, summary, latest_status_change
FROM tenant_1005.v_issue_360
WHERE latest_status_change >= now() - interval '48 hours';


-- Daily burndown for sprint 299
SELECT * FROM tenant_1005.v_sprint_burndown_daily WHERE sprint_id=300;

-- Sprint summary + load now
SELECT * FROM tenant_1005.v_sprint_summary_now WHERE sprint_id=300;
SELECT * FROM tenant_1005.v_sprint_load_per_person_now WHERE sprint_id=300;


-- __________________________________________________________
-- High value sprint queries
-- __________________________________________________________

-- Predictability per sprint (Committed vs Completed + Net Scope Change)
-- Sprint predictability & scope-churn (points)
-- “How good are we at keeping promises?”

WITH first_day AS (
  SELECT sprint_id, MIN(day) AS d0
  FROM tenant_1005.v_sprint_burndown_daily GROUP BY sprint_id
),
base AS (
  SELECT b.sprint_id,
         bd.scope_points AS committed_points
  FROM first_day b
  JOIN tenant_1005.v_sprint_burndown_daily bd
    ON bd.sprint_id=b.sprint_id AND bd.day=b.d0
),
final AS (
  SELECT s.sprint_id,
         LAST_VALUE(done_points)  OVER (PARTITION BY sprint_id ORDER BY day
           ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS completed_points,
         LAST_VALUE(added_points_cum)   OVER (PARTITION BY sprint_id ORDER BY day
           ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS added_points_cum,
         LAST_VALUE(removed_points_cum) OVER (PARTITION BY sprint_id ORDER BY day
           ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS removed_points_cum
  FROM tenant_1005.v_sprint_burndown_daily s
)
SELECT b.sprint_id,
       b.committed_points::numeric(10,2),
       f.completed_points::numeric(10,2),
       (f.completed_points / NULLIF(b.committed_points,0))::numeric(10,2) AS predictability_ratio,
       (f.added_points_cum - f.removed_points_cum)::numeric(10,2) AS net_scope_change_points
FROM base b
JOIN final f USING (sprint_id)
GROUP BY b.sprint_id, b.committed_points, f.completed_points, f.added_points_cum, f.removed_points_cum
ORDER BY sprint_id;

-- Aging WIP / stale tickets
-- “What’s quietly rotting?”
-- Issues not Done, no status change in N days (default 5)
WITH latest_move AS (
  SELECT issue_key, MAX(created_date) AS last_status_change
  FROM tenant_1005.changelogs
  WHERE field_name='status'
  GROUP BY issue_key
)
SELECT i.issue_key, i.summary, i.status, i.assignee_display_name,
       COALESCE(l.last_status_change, i.created_date) AS last_status_change,
       now() - COALESCE(l.last_status_change, i.created_date) AS age
FROM tenant_1005.issues i
LEFT JOIN latest_move l USING (issue_key)
WHERE i.status_category <> 'Done'
  AND COALESCE(l.last_status_change, i.created_date) <= now() - interval '5 days'
ORDER BY age DESC;


-- Estimate accuracy (time tracking without worklogs)
-- “Do our estimates mean anything?”
-- wont work as we dont give estimates based on original estimate.
SELECT issue_key, summary,
       time_original_estimate AS est_sec,
       aggregate_time_spent   AS spent_sec,
       (aggregate_time_spent - time_original_estimate) AS variance_sec,
       CASE WHEN time_original_estimate > 0
            THEN (aggregate_time_spent::numeric / time_original_estimate)
       END AS ratio
FROM tenant_1005.issues
WHERE time_original_estimate IS NOT NULL
ORDER BY ratio DESC NULLS LAST;


--“Who’s blocked by whom?”
-- Tweak link_type to whatever we uses ('is blocked by', 'blocks', etc.)
SELECT i.issue_key, i.summary, i.assignee_display_name,
       COUNT(*) FILTER (WHERE il.link_type ILIKE '%blocked%') AS blocked_by_cnt
FROM tenant_1005.issues i
LEFT JOIN tenant_1005.issue_links il
  ON il.source_issue_key = i.issue_key
GROUP BY i.issue_key, i.summary, i.assignee_display_name
HAVING COUNT(*) FILTER (WHERE il.link_type ILIKE '%blocked%') > 0
ORDER BY blocked_by_cnt DESC;


-- Throughput trend (Done per week)
-- Are we shipping more, less, or just vibes?
SELECT date_trunc('week', done_at)::date AS week_start,
       COUNT(*) AS issues_done,
       SUM(COALESCE(i.story_points,0))::numeric(10,2) AS points_done
FROM tenant_1005.v_issue_done_at d
JOIN tenant_1005.issues i USING (issue_key)
WHERE done_at IS NOT NULL
GROUP BY 1
ORDER BY 1;

-- Scope churn audit (adds/removes by day)
-- “Who slipped what into the sprint?”
SELECT s.sprint_id, s.day,
       added_points_day, removed_points_day,
       added_issues_day, removed_issues_day
FROM tenant_1005.v_sprint_burndown_daily s
WHERE (added_issues_day > 0 OR removed_issues_day > 0)
ORDER BY sprint_id, day;

-- __________________________________________________________
-- High value individual queries
-- __________________________________________________________

-- Person insights view (filter by sprint)
SELECT * FROM tenant_1005.v_person_insights_by_sprint WHERE sprint_id = 300 ORDER BY points_done DESC;

-- AI brief JSON
SELECT tenant_1005.fn_ai_sprint_brief(300);
SELECT tenant_1005.fn_ai_user_brief(300, 'Ali', 5);
SELECT tenant_1005.fn_ai_issue_brief('KFX-3');

