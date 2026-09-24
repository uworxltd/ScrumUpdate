-- =============================================================================
-- Create function for calculating AI payload for a sprint
-- =============================================================================
-- Template variables: {schema_name}

CREATE OR REPLACE FUNCTION {schema_name}.fn_sprint_ai_payload(p_sprint_id int)
RETURNS jsonb
LANGUAGE sql STABLE AS $$
WITH people AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(pr) ORDER BY pr.points_assigned_now DESC NULLS LAST),'[]'::jsonb) AS arr
  FROM {schema_name}.v_sprint_people_rollup pr
  WHERE pr.sprint_id = p_sprint_id
),
flow AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.person, s.from_status, s.to_status),'[]'::jsonb) AS arr
  FROM {schema_name}.v_person_status_pair_stats s
  WHERE s.sprint_id = p_sprint_id
),
-- Pre-aggregate epic progress, then pack
epic_rows AS (
  SELECT
    e.issue_key                                AS epic_key,
    e.summary                                  AS epic_summary,
    COUNT(*)                                   AS stories,
    SUM(COALESCE(c.story_points,0))::numeric   AS points_total,
    SUM(CASE WHEN c.status_category='Done'
        THEN COALESCE(c.story_points,0) ELSE 0 END)::numeric AS points_done,
    SUM(CASE WHEN c.status_category<>'Done'
        THEN COALESCE(c.story_points,0) ELSE 0 END)::numeric AS points_remaining
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
-- At-risk now: stale/missing fields/blocked
at_risk AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'issue_key',    i.issue_key,
    'summary',      i.summary,
    'assignee',     i.assignee_display_name,
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