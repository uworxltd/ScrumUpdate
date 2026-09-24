CREATE OR REPLACE FUNCTION tenant_1005.fn_ai_issue_brief(p_issue_key text)
RETURNS jsonb
LANGUAGE sql AS $$
WITH i AS (
  SELECT * FROM tenant_1005.v_issue_360 WHERE issue_key = p_issue_key
),
spans AS (
  SELECT status, from_ts, to_ts,
         EXTRACT(EPOCH FROM (COALESCE(to_ts, now()) - from_ts))::bigint AS duration_secs
  FROM tenant_1005.v_issue_status_spans
  WHERE issue_key = p_issue_key
  ORDER BY from_ts
),
time_by_status AS (
  SELECT status, SUM(duration_secs)::bigint AS total_secs
  FROM spans GROUP BY status ORDER BY total_secs DESC
),
done AS (
  SELECT done_at FROM tenant_1005.v_issue_done_at WHERE issue_key = p_issue_key
),
sprints AS (
  SELECT s.sprint_id, s.name, m.start_ts, m.end_ts
  FROM tenant_1005.v_issue_sprint_membership_final m
  JOIN tenant_1005.sprints s ON s.sprint_id = m.sprint_id
  WHERE m.issue_key = p_issue_key
  ORDER BY s.start_date
),
comments AS (
  SELECT comment_id, author_display_name AS author, created_date, updated_date, comment_body
  FROM tenant_1005.comments WHERE issue_key = p_issue_key
  ORDER BY created_date
),
links_out AS (
  SELECT link_type, linked_issue_key AS to_issue_key
  FROM tenant_1005.issue_links
  WHERE source_issue_key = p_issue_key
),
links_in AS (
  SELECT link_type, source_issue_key AS from_issue_key
  FROM tenant_1005.issue_links
  WHERE linked_issue_key = p_issue_key
)
SELECT jsonb_build_object(
  'issue', (SELECT to_jsonb(i.*) FROM i),
  'done_at', (SELECT done_at FROM done),
  'time_in_status', (SELECT jsonb_agg(jsonb_build_object('status',status,'secs',total_secs)) FROM time_by_status),
  'timeline', (SELECT jsonb_agg(to_jsonb(s.*)) FROM spans s),
  'sprints',  (SELECT jsonb_agg(to_jsonb(s.*)) FROM sprints s),
  'comments', (SELECT jsonb_agg(to_jsonb(c.*)) FROM comments c),
  'links',    jsonb_build_object(
                 'outgoing', (SELECT jsonb_agg(to_jsonb(l.*)) FROM links_out l),
                 'incoming', (SELECT jsonb_agg(to_jsonb(l.*)) FROM links_in  l)
              )
);
$$;
