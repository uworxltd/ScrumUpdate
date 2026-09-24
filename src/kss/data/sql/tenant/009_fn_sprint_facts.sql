-- CREATE OR REPLACE VIEW {schema_name}.v_person_work_profile AS
-- WITH touched AS (
--   SELECT assignee_name AS person,
--          COUNT(DISTINCT issue_key) AS issues_touched_total
--   FROM {schema_name}.v_issue_assignee_spans
--   GROUP BY assignee_name
-- ),
-- owner_at_done AS (
--   SELECT a.assignee_name AS person, a.issue_key
--   FROM {schema_name}.v_issue_assignee_spans a
--   JOIN {schema_name}.v_issue_done_at d
--     ON d.issue_key = a.issue_key
--     AND a.from_ts <= d.done_at
--     AND (a.to_ts IS NULL OR a.to_ts > d.done_at)  -- owner at completion
-- ),
-- done_points AS (
--   SELECT
--     o.person,
--     COUNT(*) AS issues_done_as_owner,
--     SUM(COALESCE(i.story_points,0))::numeric AS points_done_as_owner,
--     AVG(EXTRACT(EPOCH FROM (d.done_at - i.created_date)))::numeric AS avg_cycle_time_done_secs,
--     PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (d.done_at - i.created_date)))::numeric AS p50_cycle_secs,
--     PERCENTILE_DISC(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (d.done_at - i.created_date)))::numeric AS p90_cycle_secs
--   FROM owner_at_done o
--   JOIN {schema_name}.issues i ON i.issue_key = o.issue_key
--   JOIN {schema_name}.v_issue_done_at d ON d.issue_key = o.issue_key
--   GROUP BY o.person
-- ),
-- now_active AS (
--   SELECT i.assignee_display_name AS person,
--          COUNT(*) AS issues_active_now,
--          SUM(COALESCE(i.story_points,0))::numeric AS points_active_now
--   FROM {schema_name}.issues i
--   WHERE i.assignee_display_name IS NOT NULL
--     AND i.status_category <> ''Done''
--   GROUP BY i.assignee_display_name
-- ),
-- contributors AS (
--   SELECT c.name AS person,
--          SUM(c.comments_count) AS comments_count_total,
--          SUM(c.status_changes_count) AS status_changes_count_total,
--          MAX(c.last_activity) AS last_activity
--   FROM {schema_name}.v_issue_contributors c
--   GROUP BY c.name
-- ),
-- mix AS (
--   SELECT a.assignee_name AS person, i.issue_type, COUNT(*) AS cnt
--   FROM {schema_name}.v_issue_assignee_spans a
--   JOIN {schema_name}.issues i ON i.issue_key = a.issue_key
--   GROUP BY a.assignee_name, i.issue_type
-- ),
-- mix_json AS (
--   SELECT person,
--          jsonb_agg(jsonb_build_object(''issue_type'', issue_type, ''count'', cnt)
--                   ORDER BY cnt DESC) AS issue_type_mix
--   FROM mix
--   GROUP BY person
-- )
-- SELECT
--   COALESCE(t.person, d.person, n.person, c.person, m.person) AS person,
--   COALESCE(t.issues_touched_total, 0) AS issues_touched_total,
--   COALESCE(d.issues_done_as_owner, 0) AS issues_done_as_owner,
--   COALESCE(d.points_done_as_owner, 0)::numeric AS points_done_as_owner,
--   COALESCE(n.issues_active_now, 0) AS issues_active_now,
--   COALESCE(n.points_active_now, 0)::numeric AS points_active_now,
--   d.avg_cycle_time_done_secs,
--   d.p50_cycle_secs,
--   d.p90_cycle_secs,
--   COALESCE(c.comments_count_total,0) AS comments_count_total,
--   COALESCE(c.status_changes_count_total,0) AS status_changes_count_total,
--   c.last_activity,
--           COALESCE(m.issue_type_mix, ''[]''::jsonb) AS issue_type_mix
--         FROM touched t
--         FULL OUTER JOIN done_points d ON d.person = t.person
--         FULL OUTER JOIN now_active n  ON n.person = COALESCE(t.person, d.person)
--         FULL OUTER JOIN contributors c ON c.person = COALESCE(t.person, d.person, n.person)
--         FULL OUTER JOIN mix_json m    ON m.person = COALESCE(t.person, d.person, n.person, c.person)';

-- COMPLETE SPRINT FACTS
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
  FROM (SELECT * FROM {schema_name}.fn_sprint_burndown(p_sprint_id) ORDER BY day DESC LIMIT 3) b
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