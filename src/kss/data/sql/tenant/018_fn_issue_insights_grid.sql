CREATE OR REPLACE FUNCTION {schema_name}.fn_issue_insights_grid(
    p_issue_keys text[] DEFAULT NULL::text[],
    p_sprint_id integer DEFAULT NULL::integer,
    p_max_comments integer DEFAULT 200
) RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
WITH base AS (
  SELECT v.*
  FROM {schema_name}.v_issue_insights_grid v
  WHERE (p_issue_keys IS NULL OR cardinality(p_issue_keys)=0 OR v.issue = ANY(p_issue_keys))
    AND (
      p_sprint_id IS NULL
      OR EXISTS (
           SELECT 1
           FROM {schema_name}.sprint_issues m
           WHERE m.issue_key = v.issue
             AND m.sprint_id = p_sprint_id
         )
    )
),

-- transitions timeline (dedup by ts+status, prefer row with account_id)
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

-- blockers with enrichment (status/assignee from issues)
blk_lateral AS (
  SELECT
    b.issue,
    COALESCE(
      (
        SELECT jsonb_agg(   
                 jsonb_build_object(
                   'other_key',             vb.other_key,
                   'other_issue_type',      oi.issue_type,
                   'link_type',             'BLOCKED BY',
                   'other_parent_key',      oi.parent_issue_key,
                   'other_summary',         oi.summary,
                   'other_story_points',    oi.story_points,
                   'other_assignee',        oi.assignee_display_name,
                   'other_status',          oi.status,
                   'other_status_category', oi.status_category
                 )
                 ORDER BY vb.other_key
               )
        FROM {schema_name}.v_issue_blockers vb                              -- issue_key, relation, other_key
        LEFT JOIN {schema_name}.issues oi ON oi.issue_key = vb.other_key    -- issue_key, summary, issue_type, status, status_category, priority, assignee_display_name, story_points, parent_issue_key
        WHERE vb.issue_key = b.issue AND vb.relation = 'BLOCKED BY'
      ),
      '[]'::jsonb
    ) AS blockers_in_json,
    COALESCE(
      (
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'other_key',             vb.other_key,
                   'other_issue_type',      oi.issue_type,
                   'link_type',             'BLOCKS',
                   'other_parent_key',      oi.parent_issue_key,
                   'other_summary',         oi.summary,
                   'other_story_points',    oi.story_points,
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
$function$
;
