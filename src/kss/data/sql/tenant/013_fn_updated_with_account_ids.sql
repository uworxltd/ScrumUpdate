-- Issue → facts (base)
DROP FUNCTION IF EXISTS {schema_name}.fn_issue_facts_base(text);

-- Issue → descendants (table-returning)
DROP FUNCTION IF EXISTS {schema_name}.fn_issue_descendants(text, integer);

-- Issue → facts (flat bundle)
DROP FUNCTION IF EXISTS {schema_name}.fn_issue_facts_flat(text, integer);

-- Sprint burndown (table-returning)
DROP FUNCTION IF EXISTS {schema_name}.fn_sprint_burndown(integer);

-- Sprint facts (JSON)
DROP FUNCTION IF EXISTS {schema_name}.fn_sprint_facts(integer);

-- Sprint AI payload (JSON)
DROP FUNCTION IF EXISTS {schema_name}.fn_sprint_ai_payload(integer);

-- Issue insights grid (JSON)
-- Include a few historical signatures just in case:
DROP FUNCTION IF EXISTS {schema_name}.fn_issue_insights_grid_json();
DROP FUNCTION IF EXISTS {schema_name}.fn_issue_insights_grid_json(integer);
DROP FUNCTION IF EXISTS {schema_name}.fn_issue_insights_grid_json(integer, text[]);
DROP FUNCTION IF EXISTS {schema_name}.fn_issue_insights_grid_json(integer, text[], integer);

CREATE OR REPLACE FUNCTION {schema_name}.fn_issue_descendants(root_key text, max_depth integer)
RETURNS TABLE(issue_key text, parent_key text, depth int)
LANGUAGE sql
STABLE
AS $$
WITH RECURSIVE rel AS (
  SELECT i.issue_key, i.parent_issue_key AS parent_key, 1 AS depth
  FROM {schema_name}.issues i
  WHERE i.parent_issue_key = root_key
  UNION ALL
  SELECT c.issue_key, c.parent_issue_key, rel.depth + 1
  FROM rel
  JOIN {schema_name}.issues c ON c.parent_issue_key = rel.issue_key
  WHERE rel.depth < max_depth
)
SELECT * FROM rel;
$$;


CREATE OR REPLACE FUNCTION {schema_name}.fn_issue_facts_base(p_issue_key text)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
WITH i AS (
  SELECT * FROM {schema_name}.issues WHERE issue_key = p_issue_key
),
done AS (
  SELECT issue_key, done_at FROM {schema_name}.v_issue_done_at WHERE issue_key = p_issue_key
),
last_status_change AS (
  SELECT MAX(created_date) AS last_status_change
  FROM {schema_name}.changelogs
  WHERE issue_key = p_issue_key AND field_name='status'
),
status_events AS (
  SELECT
    cl.created_date AS ts,
    cl.author_display_name AS author,
    cl.account_id          AS author_id,     -- NEW
    cl.from_display_value  AS "from",
    cl.to_display_value    AS "to"
  FROM {schema_name}.changelogs cl
  WHERE cl.issue_key = p_issue_key AND cl.field_name='status'
  ORDER BY cl.created_date
),
status_spans AS (
  SELECT status, from_ts, to_ts,
         EXTRACT(EPOCH FROM (COALESCE(to_ts, now()) - from_ts))::bigint AS duration_secs
  FROM {schema_name}.v_issue_status_spans
  WHERE issue_key = p_issue_key
  ORDER BY from_ts
),
assignee_spans AS (
  SELECT
    assignee_name      AS name,
    assignee_account_id AS account_id,       -- NEW
    from_ts, to_ts
  FROM {schema_name}.v_issue_assignee_spans
  WHERE issue_key = p_issue_key
  ORDER BY from_ts
),
sprints AS (
  SELECT m.sprint_id, s.name, s.state, s.start_date, s.end_date, s.complete_date,
         m.start_ts AS membership_start, m.end_ts AS membership_end
  FROM {schema_name}.v_issue_sprint_membership_final m
  JOIN {schema_name}.sprints s ON s.sprint_id = m.sprint_id
  WHERE m.issue_key = p_issue_key
  ORDER BY s.start_date
),
comments AS (
  SELECT
    comment_id,
    author_display_name AS author,
    account_id          AS author_id,        -- NEW
    created_date,
    updated_date,
    comment_body        AS body
  FROM {schema_name}.comments
  WHERE issue_key = p_issue_key
  ORDER BY created_date
),
contributors AS (
  SELECT jsonb_agg(
           jsonb_build_object(
             'name',          c.name,
             'account_id',    c.account_id,         -- NEW
             'roles',         c.roles,
             'last_activity', c.last_activity,
             'counts', jsonb_build_object(
               'comments',       c.comments_count,
               'status_changes', c.status_changes_count
             )
           )
           ORDER BY c.last_activity DESC
         ) AS arr
  FROM {schema_name}.v_issue_contributors c
  WHERE c.issue_key = p_issue_key
),
blockers AS (
  -- v_issue_blockers already includes other_assignee_account_id
  SELECT jsonb_agg(to_jsonb(b.*)) AS open
  FROM {schema_name}.v_issue_blockers b
  LEFT JOIN {schema_name}.v_issue_done_at d ON d.issue_key = b.other_key
  WHERE b.issue_key = p_issue_key AND d.done_at IS NULL
),
hygiene AS (
  SELECT h.* FROM {schema_name}.v_issue_hygiene_flags h
  WHERE h.issue_key = p_issue_key
)
SELECT jsonb_build_object(
  'meta', jsonb_build_object(
    'issue_key',  i.issue_key,
    'parent_key', i.parent_issue_key,
    'issue_id',   i.issue_id,
    'summary',    i.summary,
    'issue_type', i.issue_type,
    'priority',   i.priority,
    'story_points', i.story_points,
    'labels',     i.labels,
    'components', i.components
  ),
  'state', jsonb_build_object(
    'status', i.status,
    'status_category', i.status_category,
    'assignee', jsonb_build_object('id', i.assignee_account_id, 'name', i.assignee_display_name),
    'reporter', jsonb_build_object('id', i.reporter_account_id, 'name', i.reporter_display_name),
    'created',  i.created_date,
    'updated',  i.updated_date,
    'resolution_date', i.resolution_date,
    'done_at', (SELECT done_at FROM done),
    'last_status_change', (SELECT last_status_change FROM last_status_change),
    'current_status_duration_secs',
      (SELECT CASE WHEN s.status = i.status THEN s.duration_secs END
         FROM status_spans s ORDER BY s.from_ts DESC LIMIT 1)
  ),
  'timelines', jsonb_build_object(
    'status_transitions', COALESCE((SELECT jsonb_agg(to_jsonb(se.*)) FROM status_events se), '[]'::jsonb),
    'status_spans',       COALESCE((SELECT jsonb_agg(to_jsonb(s.*))  FROM status_spans  s),  '[]'::jsonb),
    'assignee_spans',     COALESCE((SELECT jsonb_agg(to_jsonb(a.*))  FROM assignee_spans a), '[]'::jsonb)
  ),
  'sprints',    COALESCE((SELECT jsonb_agg(to_jsonb(s.*)) FROM sprints s), '[]'::jsonb),
  'comments',   jsonb_build_object(
                  'total', (SELECT COUNT(*) FROM comments),
                  'last_comment_ts', (SELECT MAX(created_date) FROM comments),
                  'items', COALESCE((SELECT jsonb_agg(to_jsonb(c.*)) FROM comments c), '[]'::jsonb)
                ),
  'contributors', COALESCE((SELECT arr FROM contributors), '[]'::jsonb),
  'blockers',     jsonb_build_object('open', COALESCE((SELECT open FROM blockers), '[]'::jsonb)),
  'hygiene',      COALESCE((SELECT to_jsonb(h) - 'issue_id' FROM hygiene h), '{}'::jsonb)
)
FROM i;
$$;


CREATE OR REPLACE FUNCTION {schema_name}.fn_issue_facts_flat(root_key text, max_depth integer)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
SELECT jsonb_build_object(
  'root', {schema_name}.fn_issue_facts_base(root_key),
  'descendants',
  COALESCE((
    SELECT jsonb_agg({schema_name}.fn_issue_facts_base(d.issue_key)
                     ORDER BY d.depth, ii.created_date)
    FROM {schema_name}.fn_issue_descendants(root_key, max_depth) d
    JOIN {schema_name}.issues ii ON ii.issue_key = d.issue_key
  ), '[]'::jsonb)
);
$$;


CREATE OR REPLACE FUNCTION {schema_name}.fn_sprint_burndown(p_sprint_id integer)
RETURNS TABLE(
  sprint_id int, day date,
  scope_points numeric, done_points numeric, remaining_points numeric,
  added_points_day numeric, removed_points_day numeric
)
LANGUAGE sql
STABLE
AS $$
SELECT sprint_id, day, scope_points, done_points, remaining_points, added_points_day, removed_points_day
FROM {schema_name}.mv_sprint_burndown_daily
WHERE sprint_id = p_sprint_id
ORDER BY day;
$$;


CREATE OR REPLACE FUNCTION {schema_name}.fn_sprint_facts(p_sprint_id integer)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
WITH s AS (
  SELECT sprint_id, name,
         s.start_date::timestamp AS start_at,
         COALESCE(s.complete_date, s.end_date)::timestamp AS end_at
  FROM {schema_name}.sprints s
  WHERE sprint_id = p_sprint_id
),
now_row AS (
  SELECT b.* FROM {schema_name}.fn_sprint_burndown(p_sprint_id) b
  WHERE b.day = LEAST(current_date, (SELECT end_at::date FROM s)) LIMIT 1
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
  FROM {schema_name}.sprint_issues sis
  WHERE sis.sprint_id = p_sprint_id
),
counts AS (
  SELECT
    COUNT(*) AS total_issues_now,
    COUNT(*) FILTER (WHERE i.status_category = 'To Do')       AS todo_cnt,
    COUNT(*) FILTER (WHERE i.status_category = 'In Progress') AS wip_cnt,
    COUNT(*) FILTER (WHERE i.status_category = 'Done')        AS done_cnt,
    SUM(COALESCE(i.story_points,0))::numeric                                  AS points_now,
    SUM(COALESCE(i.story_points,0)) FILTER (WHERE i.status_category = 'Done')  AS points_done_now,
    SUM(COALESCE(i.story_points,0)) FILTER (WHERE i.status_category <> 'Done') AS points_remaining_now,
    COUNT(*) FILTER (WHERE i.assignee_display_name IS NULL) AS unassigned_cnt
  FROM in_scope_now x
  JOIN {schema_name}.issues i ON i.issue_key = x.issue_key
),
lists AS (
  SELECT
    jsonb_agg(jsonb_build_object('issue_key', i.issue_key, 'summary', i.summary))
      FILTER (WHERE i.assignee_display_name IS NULL)                                    AS unassigned,
    jsonb_agg(jsonb_build_object('issue_key', i.issue_key, 'summary', i.summary,
                                 'assignee', i.assignee_display_name,
                                 'assignee_id', i.assignee_account_id))
      FILTER (WHERE i.status_category = 'In Progress')                                  AS wip,
    jsonb_agg(jsonb_build_object('issue_key', i.issue_key, 'summary', i.summary,
                                 'assignee', i.assignee_display_name,
                                 'assignee_id', i.assignee_account_id))
      FILTER (WHERE i.status_category = 'Done')                                         AS done
  FROM in_scope_now x
  JOIN {schema_name}.issues i ON i.issue_key = x.issue_key
),
contributors AS (
  SELECT jsonb_agg(jsonb_build_object(
           'person',   pr.person,
           'account_id', pr.account_id,                 -- NEW
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
  SELECT h.* FROM {schema_name}.v_issue_hygiene_flags h
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
           'assignee_id', i.assignee_account_id,        -- NEW
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


CREATE OR REPLACE FUNCTION {schema_name}.fn_sprint_ai_payload(p_sprint_id integer)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
WITH people AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(pr)
          ORDER BY pr.points_assigned_now DESC NULLS LAST),'[]'::jsonb) AS arr
  FROM {schema_name}.v_sprint_people_rollup pr
  WHERE pr.sprint_id = p_sprint_id
),
flow AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(s)
          ORDER BY s.person, s.from_status, s.to_status),'[]'::jsonb) AS arr
  FROM {schema_name}.v_person_status_pair_stats s
  WHERE s.sprint_id = p_sprint_id
),
epic_rows AS (
  SELECT
    e.issue_key                              AS epic_key,
    e.summary                                AS epic_summary,
    COUNT(*)                                 AS stories,
    SUM(COALESCE(c.story_points,0))::numeric AS points_total,
    SUM(CASE WHEN c.status_category='Done'  THEN COALESCE(c.story_points,0) ELSE 0 END)::numeric AS points_done,
    SUM(CASE WHEN c.status_category<>'Done' THEN COALESCE(c.story_points,0) ELSE 0 END)::numeric AS points_remaining
  FROM {schema_name}.v_sprint_issue_set sis
  JOIN {schema_name}.issues c ON c.issue_key = sis.issue_key
  LEFT JOIN {schema_name}.issues e ON e.issue_key = c.parent_issue_key
  WHERE sis.sprint_id = p_sprint_id
    AND sis.in_scope_now
    AND c.parent_issue_key IS NOT NULL
  GROUP BY e.issue_key, e.summary
),
epics AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'epic_key',         epic_key,
    'epic_summary',     epic_summary,
    'stories',          stories,
    'points_total',     points_total,
    'points_done',      points_done,
    'points_remaining', points_remaining
  ) ORDER BY points_remaining DESC),'[]'::jsonb) AS arr
  FROM epic_rows
),
at_risk AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'issue_key',    i.issue_key,
    'summary',      i.summary,
    'assignee',     i.assignee_display_name,
    'assignee_id',  i.assignee_account_id,      -- NEW
    'status',       i.status,
    'story_points', i.story_points,
    'hygiene',      to_jsonb(h) - 'issue_id' - 'summary' - 'description',
    'blocked',
    EXISTS (
      SELECT 1
      FROM {schema_name}.v_sprint_blockers_open b
      WHERE b.sprint_id = p_sprint_id
        AND b.issue_key = i.issue_key
    )
  ) ORDER BY h.stale DESC,
            (h.has_assignee = false) DESC,
            (h.has_story_points = false) DESC),'[]'::jsonb) AS arr
  FROM {schema_name}.v_sprint_issue_set sis
  JOIN {schema_name}.v_issue_hygiene_flags h ON h.issue_key = sis.issue_key
  JOIN {schema_name}.issues i               ON i.issue_key = sis.issue_key
  WHERE sis.sprint_id = p_sprint_id
    AND sis.in_scope_now
    AND (h.stale
        OR NOT h.has_assignee
        OR (COALESCE(i.issue_type,'') ILIKE 'story%' AND NOT h.has_story_points)
        OR EXISTS (
          SELECT 1
          FROM {schema_name}.v_sprint_blockers_open b
          WHERE b.sprint_id = p_sprint_id
            AND b.issue_key = i.issue_key
        ))
)
SELECT jsonb_build_object(
  'sprint_id',     p_sprint_id,
  'facts',         {schema_name}.fn_sprint_facts(p_sprint_id),
  'people_rollup', (SELECT arr FROM people),
  'flow_stats',    (SELECT arr FROM flow),
  'epic_progress', (SELECT arr FROM epics),
  'at_risk',       (SELECT arr FROM at_risk)
);
$$;


CREATE OR REPLACE FUNCTION {schema_name}.fn_issue_insights_grid_json(
  p_sprint_id    int    DEFAULT NULL,
  p_issue_keys   text[] DEFAULT NULL,
  p_max_comments int    DEFAULT 50
) RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
WITH base AS (
  SELECT *
  FROM {schema_name}.v_issue_insights_grid v
  WHERE (p_issue_keys IS NULL OR v.issue = ANY(p_issue_keys))
    AND (
      p_sprint_id IS NULL
      OR EXISTS (
           SELECT 1
           FROM {schema_name}.v_issue_sprint_membership_final m
           JOIN {schema_name}.sprints s ON s.sprint_id = m.sprint_id
           WHERE m.issue_key = v.issue
             AND m.sprint_id = p_sprint_id
             AND now() BETWEEN COALESCE(m.start_ts, s.start_date)
                           AND COALESCE(m.end_ts, COALESCE(s.complete_date, s.end_date))
         )
    )
),
t_lateral AS (
  SELECT
    b.issue,
    COALESCE(
      (
        WITH t_raw AS (
          SELECT
            t.transition_ts,
            t.to_status,
            t.person,
            t.person_account_id,
            t.duration_secs
          FROM {schema_name}.v_issue_status_transitions t
          WHERE t.issue_key = b.issue
        ),
        t_dedup AS (
          SELECT
            transition_ts,
            to_status,
            (ARRAY_AGG(person ORDER BY (person_account_id IS NULL), person NULLS LAST))[1] AS person,
            MAX(duration_secs) AS duration_secs
          FROM t_raw
          GROUP BY transition_ts, to_status
        )
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'at', transition_ts,
                   'assignee', person,
                   'status', to_status,
                   'days_in_state', ROUND(duration_secs/86400.0, 2)
                 )
                 ORDER BY transition_ts
               )
        FROM t_dedup
      ),
      jsonb_build_array(
        jsonb_build_object(
          'at', b.created_ts,
          'assignee', b.assignee,
          'status', b.status,
          'days_in_state', NULL
        )
      )
    ) AS transitions_json
  FROM base b
),
c_lateral AS (
  SELECT
    b.issue,
    COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_date)
        FROM (
          SELECT
            c.comment_id,
            c.author_display_name AS author,
            c.account_id          AS author_id,   -- ID included
            c.created_date,
            c.comment_body        AS body
          FROM {schema_name}.comments c
          WHERE c.issue_key = b.issue
          ORDER BY c.created_date
          LIMIT COALESCE(p_max_comments, 1000000000)
        ) x
      ),
      '[]'::jsonb
    ) AS comments_json
  FROM base b
),
blk_lateral AS (
  SELECT
    b.issue,
    COALESCE(
      (
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'other_key',             vb.other_key,
                   'link_type',             vb.link_type,
                   'other_assignee',        vb.other_assignee,
                   'other_status',          vb.other_status,
                   'other_status_category', vb.other_status_category
                 )
               )
        FROM {schema_name}.v_issue_blockers vb
        WHERE vb.issue_key = b.issue AND vb.direction = 'incoming'
      ),
      '[]'::jsonb
    ) AS blockers_in_json,
    COALESCE(
      (
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'other_key',             vb.other_key,
                   'link_type',             vb.link_type,
                   'other_assignee',        vb.other_assignee,
                   'other_status',          vb.other_status,
                   'other_status_category', vb.other_status_category
                 )
               )
        FROM {schema_name}.v_issue_blockers vb
        WHERE vb.issue_key = b.issue AND vb.direction = 'outgoing'
      ),
      '[]'::jsonb
    ) AS blockers_out_json
  FROM base b
),
rows AS (
  SELECT
    jsonb_build_object(
      'issue',                   b.issue,
      'type',                    b.type,
      'epic_parent',             b.epic_parent,
      'summary',                 b.summary,
      'assignee',                b.assignee,
      'priority',                b.priority,

      'status',                  b.status,
      'status_category',         b.status_category,

      'story_points',            b.story_points,
      'has_story_points',        b.has_story_points,

      'created_ts',              b.created_ts,
      'started_at',              b.started_at,
      'resolved_at',             b.resolved_at,
      'updated_ts',              b.updated_ts,

      'issue_age_days',          b.issue_age_days,
      'cycle_time_days',         b.cycle_time_days,
      'current_status_age_days', b.current_status_age_days,

      'stale',                   b.stale,
      'blocked',                 b.blocked,
      'hygiene_badges',          b.hygiene_badges,

      'participants_count',      b.participants_count,
      'assignee_handoffs',       b.assignee_handoffs,
      'assignees_distinct',      b.assignees_distinct,
      'status_changes_count',    b.status_changes_count,

      'participants',            b.participants,

      'comments_count',          b.comments_count,
      'comments',                c.comments_json,

      'dependencies_count',      b.dependencies_count,
      'blockers_count',          b.blockers_count,
      'blockers_in',             blk.blockers_in_json,
      'blockers_out',            blk.blockers_out_json,

      'sprint_current',          b.sprint_current,
      'sprint_drag',             b.sprint_drag,
      'fix_versions',            b.fix_versions,

      'transitions',             t.transitions_json
    ) AS obj
  FROM base b
  JOIN t_lateral   t   ON t.issue = b.issue
  JOIN c_lateral   c   ON c.issue = b.issue
  JOIN blk_lateral blk ON blk.issue = b.issue
)
SELECT jsonb_build_object(
  'issues',
  COALESCE(
    jsonb_agg(
      obj
      ORDER BY
        ((obj->>'status_category') <> 'Done') DESC,
        ((obj->>'blockers_count')::int) DESC,
        ((obj->>'current_status_age_days')::int) DESC NULLS LAST
    ),
    '[]'::jsonb
  )
)
FROM rows;
$$;
