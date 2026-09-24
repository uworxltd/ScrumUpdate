-- Create tenant functions
-- Template variables: {tenant_id}, {schema_name}

-- Create descendants helper function (parametrized depth, flat)
CREATE OR REPLACE FUNCTION {schema_name}.fn_issue_descendants(root_key text, max_depth int DEFAULT 3)
RETURNS TABLE(issue_key text, parent_key text, depth int)
LANGUAGE sql STABLE AS $func$
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
$func$;

-- Create issue facts base function (comprehensive issue data as JSON)
CREATE OR REPLACE FUNCTION {schema_name}.fn_issue_facts_base(p_issue_key text)
RETURNS jsonb
LANGUAGE sql STABLE AS $func$
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
  SELECT cl.created_date AS ts, cl.author_display_name AS author,
         cl.from_display_value AS "from", cl.to_display_value AS "to"
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
  SELECT assignee_name AS name, from_ts, to_ts
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
  SELECT comment_id, author_display_name AS author, created_date, updated_date, comment_body AS body
  FROM {schema_name}.comments
  WHERE issue_key = p_issue_key
  ORDER BY created_date
),
contributors AS (
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', c.name,
      'roles', c.roles,
      'last_activity', c.last_activity,
      'counts', jsonb_build_object(
        'comments', c.comments_count, 
        'status_changes', c.status_changes_count
      )
    ) ORDER BY c.last_activity DESC
  ) AS arr
  FROM {schema_name}.v_issue_contributors c
  WHERE c.issue_key = p_issue_key
),
blockers AS (
  SELECT jsonb_agg(to_jsonb(b.*)) AS open
  FROM {schema_name}.v_issue_blockers b
  LEFT JOIN {schema_name}.v_issue_done_at d ON d.issue_key = b.other_key
  WHERE b.issue_key = p_issue_key AND d.done_at IS NULL
), 
hygiene AS (
  SELECT h.*
  FROM {schema_name}.v_issue_hygiene_flags h
  WHERE h.issue_key = p_issue_key
)
SELECT jsonb_build_object(
  'meta', jsonb_build_object(
    'issue_key', i.issue_key,
    'parent_key', i.parent_issue_key,
    'issue_id', i.issue_id, 
    'summary', i.summary,
    'issue_type', i.issue_type, 
    'priority', i.priority, 
    'story_points', i.story_points,
    'labels', i.labels, 
    'components', i.components
  ),
  'state', jsonb_build_object(
    'status', i.status, 
    'status_category', i.status_category,
    'assignee', jsonb_build_object(
      'id', i.assignee_account_id, 
      'name', i.assignee_display_name
    ),
    'reporter', jsonb_build_object(
      'id', i.reporter_account_id, 
      'name', i.reporter_display_name
    ),
    'created', i.created_date, 
    'updated', i.updated_date,
    'resolution_date', i.resolution_date, 
    'done_at', (SELECT done_at FROM done),
    'last_status_change', (SELECT last_status_change FROM last_status_change),
    'current_status_duration_secs', (
      SELECT CASE WHEN s.status = i.status THEN s.duration_secs END
      FROM status_spans s ORDER BY s.from_ts DESC LIMIT 1
    )
  ),
  'timelines', jsonb_build_object(
    'status_transitions', COALESCE((SELECT jsonb_agg(to_jsonb(se.*)) FROM status_events se), '[]'::jsonb),
    'status_spans', COALESCE((SELECT jsonb_agg(to_jsonb(s.*)) FROM status_spans s), '[]'::jsonb),
    'assignee_spans', COALESCE((SELECT jsonb_agg(to_jsonb(a.*)) FROM assignee_spans a), '[]'::jsonb)
  ),
  'sprints', COALESCE((SELECT jsonb_agg(to_jsonb(s.*)) FROM sprints s), '[]'::jsonb),
  'comments', jsonb_build_object(
    'total', (SELECT COUNT(*) FROM comments),
    'last_comment_ts', (SELECT MAX(created_date) FROM comments),
    'items', COALESCE((SELECT jsonb_agg(to_jsonb(c.*)) FROM comments c), '[]'::jsonb)
  ),
  'contributors', COALESCE((SELECT arr FROM contributors), '[]'::jsonb),
  'blockers', jsonb_build_object(
    'open', COALESCE((SELECT open FROM blockers), '[]'::jsonb)
  ),
  'hygiene', COALESCE((SELECT to_jsonb(h) - 'issue_id' FROM hygiene h), '{}'::jsonb)
)
FROM i;
$func$;

-- Create flat issue facts function (root + descendants at same level)
CREATE OR REPLACE FUNCTION {schema_name}.fn_issue_facts_flat(root_key text, max_depth int DEFAULT 3)
RETURNS jsonb
LANGUAGE sql STABLE AS $func$
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
$func$;