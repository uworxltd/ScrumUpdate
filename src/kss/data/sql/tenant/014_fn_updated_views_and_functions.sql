

DROP VIEW IF EXISTS {schema_name}.v_sprint_blockers_open;
DROP VIEW IF EXISTS {schema_name}.v_issue_insights_grid;
DROP VIEW IF EXISTS {schema_name}.v_issue_blockers;

------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

CREATE OR REPLACE VIEW {schema_name}.v_issue_blockers AS
WITH raw AS (
  SELECT
    il.source_issue_key AS src,
    il.linked_issue_key AS dst,
    CASE
      WHEN il.link_type ILIKE '%is blocked by%' THEN 'is_blocked_by'
      WHEN il.link_type ILIKE '%blocks%'        THEN 'blocks'
      ELSE NULL
    END rel
  FROM {schema_name}.issue_links il
  WHERE il.link_type ILIKE '%block%'
),
norm AS (
  SELECT DISTINCT
    CASE WHEN rel = 'blocks' THEN src ELSE dst END AS blocker,
    CASE WHEN rel = 'blocks' THEN dst ELSE src END AS blocked
  FROM raw
  WHERE rel IS NOT NULL
)
SELECT blocker AS issue_key, CAST('BLOCKS'     AS varchar(20)) AS relation, blocked AS other_key
FROM norm
UNION ALL
SELECT blocked AS issue_key, CAST('BLOCKED BY' AS varchar(20)) AS relation, blocker AS other_key
FROM norm;


------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


CREATE OR REPLACE VIEW {schema_name}.v_sprint_blockers_open AS
WITH issue_now AS (
  SELECT sis.sprint_id, sis.issue_key
  FROM {schema_name}.v_sprint_issue_set sis
  WHERE sis.in_scope_now
)
SELECT DISTINCT
  inow.sprint_id,
  b.issue_key,        -- in-sprint issue
  b.other_key         -- the blocker
FROM issue_now inow
JOIN {schema_name}.v_issue_blockers b
  ON b.issue_key = inow.issue_key
 AND b.relation  = 'BLOCKED BY'
LEFT JOIN {schema_name}.v_issue_done_at d
  ON d.issue_key = b.other_key
WHERE d.done_at IS NULL;

------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------



CREATE OR REPLACE VIEW {schema_name}.v_issue_insights_grid AS
WITH
-- base issue row
i AS (
  SELECT
    iss.issue_key                               AS issue,
    iss.issue_type                              AS type,
    iss.parent_issue_key                        AS epic_parent,
    iss.summary,
    iss.assignee_display_name                   AS assignee,
    iss.assignee_account_id                     AS assignee_account_id,
    iss.priority,
    iss.status,
    iss.status_category,
    iss.story_points,
    CASE WHEN COALESCE(iss.issue_type,'') ILIKE 'story%' THEN (iss.story_points IS NOT NULL) END
                                                 AS has_story_points,
    iss.created_date                            AS created_ts,
    iss.updated_date                            AS updated_ts,
    iss.resolution_date                         AS resolved_at
  FROM {schema_name}.issues iss
),
-- hygiene (stale, days in current state, etc.)
h AS (
  SELECT
    issue_key,
    stale,
    current_status_days                         AS current_status_age_days,
    has_assignee,
    has_story_points                            AS hyg_has_story_points,
    has_summary,
    has_description,
    is_scope_churn_recent
  FROM {schema_name}.v_issue_hygiene_flags
),
-- first status-change time (as a proxy for "started")
first_status AS (
  SELECT issue_key, MIN(created_date) AS started_at
  FROM {schema_name}.changelogs
  WHERE field_name = 'status'
  GROUP BY issue_key
),
-- done_at for cycle time
done_at AS (
  SELECT issue_key, done_at
  FROM {schema_name}.v_issue_done_at
),
-- participants (contributors view already rolls up comments/status change counts)
participants AS (
  SELECT
    c.issue_key,
    COUNT(DISTINCT COALESCE(c.account_id, 'name:'||c.name))::int AS participants_count,
    jsonb_agg(
      jsonb_build_object(
        'name',           c.name,
        'account_id',     c.account_id,
        'roles',          c.roles,
        'comments',       c.comments_count,
        'status_changes', c.status_changes_count,
        'last_activity',  c.last_activity
      )
      ORDER BY c.last_activity DESC NULLS LAST
    ) AS participants_json
  FROM {schema_name}.v_issue_contributors c
  GROUP BY c.issue_key
),
-- assignee spans: distinct owners + handoffs
assignee_stats AS (
  SELECT
    a.issue_key,
    COUNT(DISTINCT COALESCE(a.assignee_account_id, 'name:'||a.assignee_name))::int AS assignees_distinct,
    GREATEST(COUNT(*) FILTER (WHERE a.assignee_name IS NOT NULL) - 1, 0)::int      AS assignee_handoffs
  FROM {schema_name}.v_issue_assignee_spans a
  GROUP BY a.issue_key
),
-- comments
comments_rollup AS (
  SELECT
    c.issue_key,
    COUNT(*)::int                                                AS comments_count,
    jsonb_agg(
      jsonb_build_object(
        'comment_id',   c.comment_id,
        'author',       c.author_display_name,
        'account_id',   c.account_id,
        'created_date', c.created_date,
        'body',         c.comment_body
      )
      ORDER BY c.created_date
    ) AS comments_json
  FROM {schema_name}.comments c
  GROUP BY c.issue_key
),
-- blockers (symmetric view → split into incoming/outgoing)
blockers_in AS (
  SELECT issue_key, COUNT(*)::int AS cnt,
         jsonb_agg(other_key ORDER BY other_key) AS arr
  FROM {schema_name}.v_issue_blockers b
  WHERE b.relation = 'BLOCKED BY'
  GROUP BY issue_key
),
blockers_out AS (
  SELECT issue_key, COUNT(*)::int AS cnt,
         jsonb_agg(other_key ORDER BY other_key) AS arr
  FROM {schema_name}.v_issue_blockers b
  WHERE b.relation = 'BLOCKS'
  GROUP BY issue_key
),
-- "currently blocked" = has an incoming blocker whose other issue isn't done
blocked_now AS (
  SELECT b.issue_key, TRUE AS blocked
  FROM {schema_name}.v_issue_blockers b
  LEFT JOIN {schema_name}.v_issue_done_at d ON d.issue_key = b.other_key
  WHERE b.relation = 'BLOCKED BY' AND d.done_at IS NULL
  GROUP BY b.issue_key
),
-- transitions for the timeline
transitions AS (
  SELECT
    x.issue_key,
    jsonb_agg(
      jsonb_build_object(
        'at',            x.transition_ts,
        'assignee',      x.person,
        'assignee_id',   x.person_account_id,
        'status',        x.to_status,
        'days_in_state', ROUND(x.duration_secs/86400.0,2)
      )
      ORDER BY x.transition_ts
    ) AS transitions_json,
    COUNT(*)::int AS status_changes_count
  FROM {schema_name}.v_issue_status_transitions x
  GROUP BY x.issue_key
),
-- current sprint & drag
curr_sprint AS (
  SELECT
    m.issue_key,
    s.name AS sprint_current
  FROM {schema_name}.v_issue_sprint_membership_final m
  JOIN {schema_name}.sprints s ON s.sprint_id = m.sprint_id
  WHERE now() BETWEEN COALESCE(m.start_ts, s.start_date)
                  AND COALESCE(m.end_ts, COALESCE(s.complete_date, s.end_date))
),
sprint_drag AS (
  SELECT issue_key, COUNT(DISTINCT sprint_id)::int AS sprint_drag
  FROM {schema_name}.v_issue_sprint_membership_final
  GROUP BY issue_key
),
-- fix versions (from changelog events)
fix_versions AS (
  SELECT
    cl.issue_key,
    jsonb_agg(DISTINCT COALESCE(cl.to_display_value, cl.from_display_value))
      FILTER (WHERE COALESCE(cl.to_display_value, cl.from_display_value) IS NOT NULL) AS fix_versions
  FROM {schema_name}.changelogs cl
  WHERE cl.field_name IN ('Fix Version','Fix Versions','Affects Version','Affects Versions')
  GROUP BY cl.issue_key
)
SELECT
  i.issue,
  i.type,
  i.epic_parent,
  i.summary,
  i.assignee,
  i.assignee_account_id,
  i.priority,

  i.status,
  i.status_category,

  i.story_points,
  i.has_story_points,

  i.created_ts,
  fs.started_at,
  COALESCE(da.done_at, i.resolved_at) AS resolved_at,
  i.updated_ts,

  -- ages
  ROUND(EXTRACT(EPOCH FROM (now() - i.created_ts))/86400.0, 2)               AS issue_age_days,
  CASE WHEN da.done_at IS NOT NULL
       THEN ROUND(EXTRACT(EPOCH FROM (da.done_at - i.created_ts))/86400.0, 2)
  END                                                                        AS cycle_time_days,
  h.current_status_age_days,

  -- hygiene & badges
  COALESCE(h.stale, false)                                                   AS stale,
  COALESCE(bn.blocked, false)                                                AS blocked,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN NOT COALESCE(h.has_assignee, true)          THEN 'no_assignee'    END,
    CASE WHEN i.has_story_points = false                  THEN 'no_sp'          END,
    CASE WHEN NOT COALESCE(h.has_summary, true)           THEN 'no_summary'     END,
    CASE WHEN NOT COALESCE(h.has_description, true)       THEN 'no_description' END,
    CASE WHEN COALESCE(h.stale, false)                    THEN 'stale'          END,
    CASE WHEN COALESCE(h.is_scope_churn_recent, false)    THEN 'scope_churn'    END
  ]::text[], NULL)                                                            AS hygiene_badges,

  -- people
  COALESCE(p.participants_count, 0)                                          AS participants_count,
  COALESCE(a.assignee_handoffs, 0)                                           AS assignee_handoffs,
  COALESCE(a.assignees_distinct, 0)                                          AS assignees_distinct,

  -- activity
  COALESCE(t.status_changes_count, 0)                                        AS status_changes_count,

  -- comments
  COALESCE(cr.comments_count, 0)                                             AS comments_count,

  -- blockers/deps
  COALESCE(bi.cnt, 0)                                                        AS blockers_in_count,
  COALESCE(bo.cnt, 0)                                                        AS blockers_out_count,

  -- simple fields
  cs.sprint_current,
  sd.sprint_drag,

  -- json payloads
  COALESCE(p.participants_json, '[]'::jsonb)                                  AS participants,
  COALESCE(cr.comments_json,     '[]'::jsonb)                                  AS comments,
  COALESCE(bi.arr,               '[]'::jsonb)                                  AS blockers_in,
  COALESCE(bo.arr,               '[]'::jsonb)                                  AS blockers_out,
  COALESCE(fv.fix_versions,      '[]'::jsonb)                                  AS fix_versions,
  COALESCE(t.transitions_json,   '[]'::jsonb)                                  AS transitions
FROM i
LEFT JOIN h               ON h.issue_key = i.issue
LEFT JOIN first_status fs ON fs.issue_key = i.issue
LEFT JOIN done_at     da  ON da.issue_key = i.issue
LEFT JOIN participants p  ON p.issue_key = i.issue
LEFT JOIN assignee_stats a ON a.issue_key = i.issue
LEFT JOIN comments_rollup cr ON cr.issue_key = i.issue
LEFT JOIN blockers_in  bi  ON bi.issue_key = i.issue
LEFT JOIN blockers_out bo  ON bo.issue_key = i.issue
LEFT JOIN blocked_now  bn  ON bn.issue_key = i.issue
LEFT JOIN curr_sprint  cs  ON cs.issue_key = i.issue
LEFT JOIN sprint_drag  sd  ON sd.issue_key = i.issue
LEFT JOIN fix_versions fv  ON fv.issue_key = i.issue
LEFT JOIN transitions  t   ON t.issue_key = i.issue;

------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION {schema_name}.fn_issue_insights_grid(
  p_issue_keys   text[] DEFAULT NULL,
  p_sprint_id    integer DEFAULT NULL,
  p_max_comments integer DEFAULT 200
)
RETURNS jsonb
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

-- transitions timeline (dedup by ts+status, prefer the row that has an account_id)
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
                   'at',            transition_ts,
                   'assignee',      person,
                   'status',        to_status,
                   'days_in_state', ROUND(duration_secs/86400.0, 2)
                 )
                 ORDER BY transition_ts
               )
        FROM t_dedup
      ),
      jsonb_build_array(
        jsonb_build_object(
          'at',       b.created_ts,
          'assignee', b.assignee,
          'status',   b.status,
          'days_in_state', NULL
        )
      )
    ) AS transitions_json
  FROM base b
),

-- full comments (author id included)
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
            c.account_id          AS author_id,
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

-- blockers with enrichment (status/assignee from issues), using symmetric v_issue_blockers
blk_lateral AS (
  SELECT
    b.issue,
    COALESCE(
      (
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'other_key',             vb.other_key,
                   'link_type',             'BLOCKED BY',
                   'other_assignee',        oi.assignee_display_name,
                   'other_status',          oi.status,
                   'other_status_category', oi.status_category
                 )
                 ORDER BY vb.other_key
               )
        FROM {schema_name}.v_issue_blockers vb
        LEFT JOIN {schema_name}.issues oi ON oi.issue_key = vb.other_key
        WHERE vb.issue_key = b.issue AND vb.relation = 'BLOCKED BY'
      ),
      '[]'::jsonb
    ) AS blockers_in_json,
    COALESCE(
      (
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'other_key',             vb.other_key,
                   'link_type',             'BLOCKS',
                   'other_assignee',        oi.assignee_display_name,
                   'other_status',          oi.status,
                   'other_status_category', oi.status_category
                 )
                 ORDER BY vb.other_key
               )
        FROM {schema_name}.v_issue_blockers vb
        LEFT JOIN {schema_name}.issues oi ON oi.issue_key = vb.other_key
        WHERE vb.issue_key = b.issue AND vb.relation = 'BLOCKS'
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

      -- derive counts from the new view’s split counts
      'dependencies_count',      COALESCE(b.blockers_out_count, 0),
      'blockers_count',          COALESCE(b.blockers_in_count,  0),

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


------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

-- CTEs inside fn_issue_facts_base
-- Drop-safe
DROP FUNCTION IF EXISTS {schema_name}.fn_issue_facts_base(text);

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
  WHERE issue_key = p_issue_key AND field_name = 'status'
),
status_events AS (
  SELECT
    cl.created_date AS ts,
    cl.author_display_name AS author,
    cl.account_id          AS author_id,
    cl.from_display_value  AS "from",
    cl.to_display_value    AS "to"
  FROM {schema_name}.changelogs cl
  WHERE cl.issue_key = p_issue_key AND cl.field_name = 'status'
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
  SELECT assignee_name AS name,
         assignee_account_id AS account_id,
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
    c.comment_id,
    c.author_display_name AS author,
    c.account_id          AS author_id,
    c.created_date,
    c.updated_date,
    c.comment_body        AS body
  FROM {schema_name}.comments c
  WHERE c.issue_key = p_issue_key
  ORDER BY c.created_date
),
contributors AS (
  SELECT jsonb_agg(
           jsonb_build_object(
             'name',          c.name,
             'account_id',    c.account_id,
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
-- symmetric blockers (OPEN only: other issue not Done)
blocks_open AS (
  SELECT jsonb_agg(
           jsonb_build_object(
             'other_key',             vb.other_key,
             'other_assignee',        oi.assignee_display_name,
             'other_assignee_id',     oi.assignee_account_id,
             'other_status',          oi.status,
             'other_status_category', oi.status_category
           )
           ORDER BY vb.other_key
         ) AS arr
  FROM {schema_name}.v_issue_blockers vb
  LEFT JOIN {schema_name}.issues oi ON oi.issue_key = vb.other_key
  LEFT JOIN {schema_name}.v_issue_done_at d ON d.issue_key = vb.other_key
  WHERE vb.issue_key = p_issue_key
    AND vb.relation = 'BLOCKS'
    AND d.done_at IS NULL
),
blocked_by_open AS (
  SELECT jsonb_agg(
           jsonb_build_object(
             'other_key',             vb.other_key,
             'other_assignee',        oi.assignee_display_name,
             'other_assignee_id',     oi.assignee_account_id,
             'other_status',          oi.status,
             'other_status_category', oi.status_category
           )
           ORDER BY vb.other_key
         ) AS arr
  FROM {schema_name}.v_issue_blockers vb
  LEFT JOIN {schema_name}.issues oi ON oi.issue_key = vb.other_key
  LEFT JOIN {schema_name}.v_issue_done_at d ON d.issue_key = vb.other_key
  WHERE vb.issue_key = p_issue_key
    AND vb.relation = 'BLOCKED BY'
    AND d.done_at IS NULL
),
hygiene AS (
  SELECT h.* FROM {schema_name}.v_issue_hygiene_flags h
  WHERE h.issue_key = p_issue_key
)
SELECT jsonb_build_object(
  'meta', jsonb_build_object(
    'issue_key',   i.issue_key,
    'parent_key',  i.parent_issue_key,
    'issue_id',    i.issue_id,
    'summary',     i.summary,
    'issue_type',  i.issue_type,
    'priority',    i.priority,
    'story_points',i.story_points,
    'labels',      i.labels,
    'components',  i.components
  ),
  'state', jsonb_build_object(
    'status',            i.status,
    'status_category',   i.status_category,
    'assignee', jsonb_build_object('id', i.assignee_account_id, 'name', i.assignee_display_name),
    'reporter', jsonb_build_object('id', i.reporter_account_id, 'name', i.reporter_display_name),
    'created',           i.created_date,
    'updated',           i.updated_date,
    'resolution_date',   i.resolution_date,
    'done_at',          (SELECT done_at FROM done),
    'last_status_change', (SELECT last_status_change FROM last_status_change),
    'current_status_duration_secs',
      (SELECT CASE WHEN s.status = i.status THEN s.duration_secs END
         FROM status_spans s
         ORDER BY s.from_ts DESC
         LIMIT 1)
  ),
  'timelines', jsonb_build_object(
    'status_transitions', COALESCE((SELECT jsonb_agg(to_jsonb(se.*)) FROM status_events se), '[]'::jsonb),
    'status_spans',       COALESCE((SELECT jsonb_agg(to_jsonb(s.*))  FROM status_spans s),   '[]'::jsonb),
    'assignee_spans',     COALESCE((SELECT jsonb_agg(to_jsonb(a.*))  FROM assignee_spans a), '[]'::jsonb)
  ),
  'sprints',   COALESCE((SELECT jsonb_agg(to_jsonb(s.*)) FROM sprints s), '[]'::jsonb),
  'comments',  jsonb_build_object(
                 'total',           (SELECT COUNT(*) FROM comments),
                 'last_comment_ts', (SELECT MAX(created_date) FROM comments),
                 'items',           COALESCE((SELECT jsonb_agg(to_jsonb(c.*)) FROM comments c), '[]'::jsonb)
               ),
  'contributors', COALESCE((SELECT arr FROM contributors), '[]'::jsonb),
  'blockers', jsonb_build_object(
                 'blocks',     COALESCE((SELECT arr FROM blocks_open),     '[]'::jsonb),
                 'blocked_by', COALESCE((SELECT arr FROM blocked_by_open), '[]'::jsonb)
              ),
  'hygiene',   COALESCE((SELECT to_jsonb(h) - 'issue_id' FROM hygiene h), '{}'::jsonb)
)
FROM i;
$$;

-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
