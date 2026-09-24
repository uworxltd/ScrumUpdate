-- =============================================================================
-- Create function for sprint hygiene summary
-- =============================================================================
-- Template variables: {schema_name}

CREATE OR REPLACE FUNCTION {schema_name}.fn_sprint_hygiene_summary(p_sprint_id int)
RETURNS jsonb
LANGUAGE sql STABLE AS $$
SELECT jsonb_build_object(
  'sprint_id', p_sprint_id,

  -- totals
  'total_issues_now', (
    SELECT COUNT(*)
    FROM {schema_name}.sprint_issues si
    JOIN {schema_name}.issues i ON si.issue_key = i.issue_key
    WHERE si.sprint_id = p_sprint_id
  ),

  -- missing/at-risk counts + ids
  'no_assignee', (
    SELECT COUNT(*)
    FROM {schema_name}.sprint_issues si
    JOIN {schema_name}.issues i ON si.issue_key = i.issue_key
    WHERE si.sprint_id = p_sprint_id
      AND (i.assignee_display_name IS NULL OR i.assignee_display_name = '')
  ),
  'no_assignee_ids', (
    SELECT COALESCE(jsonb_agg(i.issue_key ORDER BY i.issue_key), '[]'::jsonb)
    FROM {schema_name}.sprint_issues si
    JOIN {schema_name}.issues i ON si.issue_key = i.issue_key
    WHERE si.sprint_id = p_sprint_id
      AND (i.assignee_display_name IS NULL OR i.assignee_display_name = '')
  ),

  'missing_story_points', (
    SELECT COUNT(*)
    FROM {schema_name}.sprint_issues si
    JOIN {schema_name}.issues i ON si.issue_key = i.issue_key
    WHERE si.sprint_id = p_sprint_id
      AND i.story_points IS NULL
  ),
  'missing_story_point_ids', (
    SELECT COALESCE(jsonb_agg(i.issue_key ORDER BY i.issue_key), '[]'::jsonb)
    FROM {schema_name}.sprint_issues si
    JOIN {schema_name}.issues i ON si.issue_key = i.issue_key
    WHERE si.sprint_id = p_sprint_id
      AND i.story_points IS NULL
  ),

  'missing_description', (
    SELECT COUNT(*)
    FROM {schema_name}.sprint_issues si
    JOIN {schema_name}.issues i ON si.issue_key = i.issue_key
    WHERE si.sprint_id = p_sprint_id
      AND (i.description IS NULL OR i.description = '')
  ),
  'missing_description_ids', (
    SELECT COALESCE(jsonb_agg(i.issue_key ORDER BY i.issue_key), '[]'::jsonb)
    FROM {schema_name}.sprint_issues si
    JOIN {schema_name}.issues i ON si.issue_key = i.issue_key
    WHERE si.sprint_id = p_sprint_id
      AND (i.description IS NULL OR i.description = '')
  ),

  'missing_priority', (
    SELECT COUNT(*)
    FROM {schema_name}.sprint_issues si
    JOIN {schema_name}.issues i ON si.issue_key = i.issue_key
    WHERE si.sprint_id = p_sprint_id
      AND (i.priority IS NULL OR i.priority = '')
  ),
  'missing_priority_ids', (
    SELECT COALESCE(jsonb_agg(i.issue_key ORDER BY i.issue_key), '[]'::jsonb)
    FROM {schema_name}.sprint_issues si
    JOIN {schema_name}.issues i ON si.issue_key = i.issue_key
    WHERE si.sprint_id = p_sprint_id
      AND (i.priority IS NULL OR i.priority = '')
  )
);
$$;
