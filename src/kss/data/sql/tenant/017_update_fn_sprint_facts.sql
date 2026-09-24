-- Migration: Update fn_sprint_facts function
-- This migration updates the sprint facts function with the latest version
-- Applied to existing tenants as part of schema upgrade

CREATE OR REPLACE FUNCTION {schema_name}.fn_sprint_facts(p_sprint_id int)
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
WITH s AS (
  SELECT sprint_id, name,
         s.start_date::timestamp AS start_at,
         COALESCE(s.complete_date, s.end_date)::timestamp AS end_at
  FROM {schema_name}.sprints s
  WHERE sprint_id = p_sprint_id
),
now_row AS (
  SELECT b.*
  FROM {schema_name}.fn_sprint_burndown(p_sprint_id) b
  WHERE b.day = LEAST(current_date, (SELECT end_at::date FROM s))
  LIMIT 1
),
first_row AS (
  SELECT b.* FROM {schema_name}.fn_sprint_burndown(p_sprint_id) b
  ORDER BY b.day ASC LIMIT 1
),
tail AS (
  SELECT jsonb_agg(to_jsonb(b) ORDER BY b.day DESC) FILTER (WHERE true) AS last3
  FROM (SELECT * FROM {schema_name}.fn_sprint_burndown(p_sprint_id) WHERE day <= current_date ORDER BY day DESC LIMIT 3) b
),
in_scope_now AS (
  SELECT sis.issue_key
  FROM {schema_name}.v_sprint_issue_set sis
  WHERE sis.sprint_id = p_sprint_id AND sis.in_scope_now
),
counts AS (
  SELECT
    COUNT(*) AS total_issues_now,
    COUNT(*) FILTER (WHERE i.status_category = 'To Do')       AS todo_cnt,
    COUNT(*) FILTER (WHERE i.status_category = 'In Progress') AS wip_cnt,
    COUNT(*) FILTER (WHERE i.status_category = 'Done')        AS done_cnt,
    SUM(COALESCE(i.story_points,0))::numeric                                 AS points_now,
    SUM(COALESCE(i.story_points,0)) FILTER (WHERE i.status_category = 'Done') AS points_done_now,
    SUM(COALESCE(i.story_points,0)) FILTER (WHERE i.status_category <> 'Done') AS points_remaining_now,
    COUNT(*) FILTER (WHERE i.assignee_display_name IS NULL) AS unassigned_cnt
  FROM in_scope_now x
  JOIN {schema_name}.issues i ON i.issue_key = x.issue_key
),
lists AS (
  SELECT
    jsonb_agg(jsonb_build_object('issue_key', i.issue_key, 'summary', i.summary))
    FILTER (WHERE i.assignee_display_name IS NULL)                   AS unassigned,
    jsonb_agg(jsonb_build_object('issue_key', i.issue_key, 'summary', i.summary, 'assignee', i.assignee_display_name))
    FILTER (WHERE i.status_category = 'In Progress')                 AS wip,
    jsonb_agg(jsonb_build_object('issue_key', i.issue_key, 'summary', i.summary, 'assignee', i.assignee_display_name))
    FILTER (WHERE i.status_category = 'Done')                        AS done
      FROM in_scope_now x
      JOIN {schema_name}.issues i ON i.issue_key = x.issue_key
    ),
    contributors AS (
      SELECT jsonb_agg(jsonb_build_object(
        'person', pr.person,
        'issues_assigned_now', pr.issues_assigned_now,
        'points_assigned_now', pr.points_assigned_now,
        'issues_done_total',   pr.issues_done_total,
        'points_done_total',   pr.points_done_total,
        'comments_count_total', pr.comments_count_total,
        'status_changes_count_total', pr.status_changes_count_total,
        'last_activity', pr.last_activity
      ) ORDER BY pr.points_assigned_now DESC NULLS LAST) AS arr
      FROM {schema_name}.v_sprint_people_rollup pr
      WHERE pr.sprint_id = p_sprint_id
    ),
    blockers AS (
      SELECT COALESCE(jsonb_agg(to_jsonb(b) ORDER BY b.issue_key), '[]'::jsonb) AS open
      FROM {schema_name}.v_sprint_blockers_open b
      WHERE b.sprint_id = p_sprint_id
    ), 
    hyg AS (
      SELECT h.*
      FROM {schema_name}.v_issue_hygiene_flags h
      JOIN in_scope_now x ON x.issue_key = h.issue_key
    ), 
    hyg_counts AS (
      SELECT
        COUNT(*)                                   AS total_issues_now,
        COUNT(*) FILTER (WHERE NOT has_assignee)   AS no_assignee,
        COUNT(*) FILTER (WHERE NOT has_story_points) AS missing_story_points,
        COUNT(*) FILTER (WHERE NOT has_summary)    AS missing_summary,
        COUNT(*) FILTER (WHERE NOT has_description) AS missing_description,
        COUNT(*) FILTER (WHERE stale)              AS stale_count,
        AVG(last_status_change_days)::numeric      AS avg_days_since_status_change,
        AVG(last_comment_days)::numeric            AS avg_days_since_last_comment
      FROM hyg
    ),
    hyg_top_stale AS (
      SELECT jsonb_agg(jsonb_build_object(
        'issue_key', h.issue_key,
        'summary',   i.summary,
        'assignee',  i.assignee_display_name,
        'current_status_days', h.current_status_days
      ) ORDER BY h.current_status_days DESC NULLS LAST) AS arr
      FROM (
        SELECT h.issue_key, h.current_status_days
        FROM hyg h
        ORDER BY h.current_status_days DESC NULLS LAST
        LIMIT 10
      ) h
      JOIN {schema_name}.issues i ON i.issue_key = h.issue_key
    )
    SELECT jsonb_build_object(
    'sprint', jsonb_build_object(
      'sprint_id', (SELECT sprint_id FROM s),
      'name',      (SELECT name FROM s),
      'start_at',  (SELECT start_at FROM s),
      'end_at',    (SELECT end_at FROM s),
      'today',     current_date,
      'day_index', GREATEST(1, 1 + (current_date - (SELECT start_at::date FROM s))),
      'days_total', ((SELECT end_at::date FROM s) - (SELECT start_at::date FROM s)) + 1,
      'days_remaining', GREATEST(0, (SELECT (end_at::date - current_date) FROM s))
    ),
    'predict', jsonb_build_object(
    'committed_points', (SELECT scope_points FROM first_row),
    'completed_points', (SELECT done_points  FROM now_row),
        'remaining_points', (SELECT remaining_points FROM now_row)
      ),
      'summary_now', (SELECT to_jsonb(c) FROM counts c),
      'lists',       (SELECT to_jsonb(l) FROM lists l),
        'blockers_open', (SELECT open FROM blockers),
        'contributors',  (SELECT COALESCE(arr,'[]'::jsonb) FROM contributors),
        'burndown_tail', (SELECT COALESCE(last3,'[]'::jsonb) FROM tail), 
        'hygiene', jsonb_build_object(
          'counts', (SELECT to_jsonb(hc) FROM hyg_counts hc),
          'top_stale', COALESCE((SELECT arr FROM hyg_top_stale), '[]'::jsonb)
        )
);
$$;
