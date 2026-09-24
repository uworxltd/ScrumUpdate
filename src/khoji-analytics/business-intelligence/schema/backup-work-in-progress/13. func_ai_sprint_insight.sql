--That JSON is perfect to feed your AI for: executive summary, predictability, scope creep, stale items, blockers, and person-by-person health.

CREATE OR REPLACE FUNCTION tenant_1005.fn_ai_sprint_brief(p_sprint_id integer, p_fresh_days integer DEFAULT 3)
RETURNS jsonb
LANGUAGE sql
AS $$
WITH s AS (
  SELECT sprint_id, name, start_date,
         COALESCE(complete_date, end_date, now()) AS until
  FROM tenant_1005.sprints WHERE sprint_id = p_sprint_id
),
-- First and last rows of burndown for this sprint
first_row AS (
  SELECT sprint_id, day, scope_points
  FROM tenant_1005.v_sprint_burndown_daily
  WHERE sprint_id=p_sprint_id
  ORDER BY day ASC
  LIMIT 1
),
last_row AS (
  SELECT sprint_id, day, done_points, added_points_cum, removed_points_cum
  FROM tenant_1005.v_sprint_burndown_daily
  WHERE sprint_id=p_sprint_id
  ORDER BY day DESC
  LIMIT 1
),
predict AS (
  SELECT f.sprint_id,
         f.scope_points AS committed_points,
         l.done_points  AS completed_points,
         (l.done_points / NULLIF(f.scope_points,0))::numeric(10,2) AS predictability_ratio,
         (l.added_points_cum - l.removed_points_cum) AS net_scope_change_points
  FROM first_row f
  JOIN last_row  l USING (sprint_id)
),
m AS (  -- sprint membership
  SELECT * FROM tenant_1005.v_issue_sprint_membership_final WHERE sprint_id=p_sprint_id
),
aging AS (  -- top 10 aging WIP within sprint scope
  SELECT i.issue_key, i.summary, i.status, i.assignee_display_name,
         COALESCE( (SELECT MAX(created_date)
                    FROM tenant_1005.changelogs cl
                    WHERE cl.issue_key=i.issue_key AND cl.field_name='status')
                , i.created_date) AS last_status_change
  FROM tenant_1005.issues i
  JOIN m ON m.issue_key=i.issue_key
  WHERE i.status_category <> 'Done'
),
aging_top AS (
  SELECT issue_key, summary, status, assignee_display_name,
         (now() - last_status_change) AS age_interval
  FROM aging
  ORDER BY age_interval DESC
  LIMIT 10
),
blockers AS (  -- top 10 by number of “blocked” links
  SELECT i.issue_key, i.summary, i.assignee_display_name,
         COUNT(*) AS blocked_by_cnt
  FROM tenant_1005.issues i
  JOIN m ON m.issue_key=i.issue_key
  JOIN tenant_1005.issue_links il ON il.source_issue_key=i.issue_key
  WHERE il.link_type ILIKE '%blocked%'
  GROUP BY i.issue_key, i.summary, i.assignee_display_name
  ORDER BY blocked_by_cnt DESC
  LIMIT 10
),
people AS (
  SELECT jsonb_agg(
           jsonb_build_object(
             'person', person,
             'issues_touched', issues_touched,
             'points_touched', points_touched,
             'issues_done', issues_done,
             'points_done', points_done,
             'owner_comment_issues', owner_comment_issues,
             'owner_comment_count', owner_comment_count,
             'avg_days_since_owner_comment', avg_days_since_owner_comment,
             'transitions', transitions,
             'avg_transition_secs', avg_transition_secs,
             'p50_transition_secs', p50_transition_secs,
             'p90_transition_secs', p90_transition_secs,
             'status_changes_authored', status_changes_authored,
             'status_pair_stats', status_pair_stats
           )
           ORDER BY (points_done) DESC NULLS LAST
         ) AS arr
  FROM tenant_1005.v_person_insights_by_sprint
  WHERE sprint_id=p_sprint_id
),
summary_now AS (
  SELECT to_jsonb(ssn.*) AS obj
  FROM tenant_1005.v_sprint_summary_now ssn
  WHERE ssn.sprint_id=p_sprint_id
  LIMIT 1
),
burndown AS (
  SELECT jsonb_agg(
           jsonb_build_object(
             'day', day,
             'scope_points', scope_points,
             'done_points', done_points,
             'remaining_points', remaining_points,
             'added_points_day', added_points_day,
             'removed_points_day', removed_points_day
           )
           ORDER BY day
         ) AS arr
  FROM tenant_1005.v_sprint_burndown_daily WHERE sprint_id=p_sprint_id
)
SELECT
  jsonb_build_object(
    'sprint',       (SELECT to_jsonb(s.*) FROM s),
    'predict',      (SELECT to_jsonb(predict.*) FROM predict),
    'summary_now',  (SELECT obj FROM summary_now),
    'people',       (SELECT arr FROM people),
    'aging_wip',    (SELECT jsonb_agg(to_jsonb(a.*)) FROM aging_top a),
    'blockers',     (SELECT jsonb_agg(to_jsonb(b.*)) FROM blockers b),
    'burndown',     (SELECT arr FROM burndown)
  );
$$;
