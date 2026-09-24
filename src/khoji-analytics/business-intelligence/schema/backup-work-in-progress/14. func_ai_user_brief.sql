CREATE OR REPLACE FUNCTION tenant_1005.fn_ai_user_brief(
  p_sprint_id integer,
  p_person text,           -- assignee display name
  p_top integer DEFAULT 5  -- top-N lists
) RETURNS jsonb
LANGUAGE sql AS $$
WITH s AS (
  SELECT sprint_id, name, start_date, COALESCE(complete_date, end_date, now()) AS until
  FROM tenant_1005.sprints WHERE sprint_id = p_sprint_id
),
-- membership
m AS (
  SELECT * FROM tenant_1005.v_issue_sprint_membership_final WHERE sprint_id = p_sprint_id
),
-- issues this person owned during the sprint (any ownership overlap)
owned AS (
  SELECT DISTINCT m.issue_key
  FROM m
  JOIN tenant_1005.v_issue_assignee_spans a ON a.issue_key = m.issue_key
  JOIN s ON TRUE
  WHERE a.assignee_name = p_person
    AND a.from_ts <= s.until
    AND (a.to_ts IS NULL OR a.to_ts >= s.start_date)
),
i_scoped AS (
  SELECT i.*, COALESCE(i.story_points,0) AS sp
  FROM tenant_1005.issues i
  JOIN owned o ON o.issue_key = i.issue_key
),
done AS (SELECT * FROM tenant_1005.v_issue_done_at),
kpis AS (
  SELECT
    COUNT(*)                              AS issues_touched,
    SUM(sp)::numeric(10,2)                AS points_touched,
    COUNT(*) FILTER (WHERE d.done_at IS NOT NULL AND d.done_at <= s.until) AS issues_done,
    SUM(sp) FILTER (WHERE d.done_at IS NOT NULL AND d.done_at <= s.until)::numeric(10,2) AS points_done
  FROM i_scoped
  JOIN s ON TRUE
  LEFT JOIN done d USING (issue_key)
),
-- owner comments (person commented while owning)
owner_comments AS (
  SELECT c.issue_key,
         COUNT(*) AS comment_count,
         MAX(c.created_date) AS last_comment_ts
  FROM tenant_1005.comments c
  JOIN s ON c.created_date BETWEEN s.start_date AND s.until
  JOIN tenant_1005.v_issue_assignee_spans a
    ON a.issue_key=c.issue_key
   AND a.assignee_name = p_person
   AND c.created_date >= a.from_ts
   AND (a.to_ts IS NULL OR c.created_date < a.to_ts)
  WHERE c.issue_key IN (SELECT issue_key FROM owned)
  GROUP BY c.issue_key
),
owner_rollup AS (
  SELECT
    COUNT(*) AS owner_comment_issues,
    COALESCE(SUM(comment_count),0) AS owner_comment_count,
    MAX(last_comment_ts) AS last_owner_comment_ts,
    AVG(EXTRACT(EPOCH FROM (now() - last_comment_ts))/86400.0) AS avg_days_since_owner_comment
  FROM owner_comments
),
-- transition speeds attributed to this person
trans AS (
  SELECT
    st.issue_key,
    st.status  AS from_status,
    LEAD(st.status) OVER (PARTITION BY st.issue_key ORDER BY st.from_ts) AS to_status,
    st.from_ts, st.to_ts,
    EXTRACT(EPOCH FROM (COALESCE(st.to_ts, s.until) - st.from_ts))::bigint AS duration_secs
  FROM tenant_1005.v_issue_status_spans st
  JOIN owned o ON o.issue_key = st.issue_key
  JOIN s ON TRUE
  JOIN tenant_1005.v_issue_assignee_spans asg
    ON asg.issue_key = st.issue_key
   AND asg.assignee_name = p_person
   AND st.from_ts >= asg.from_ts
   AND (asg.to_ts IS NULL OR st.from_ts < asg.to_ts)
  WHERE st.to_ts IS NOT NULL
),
trans_summary AS (
  SELECT
    COUNT(*) AS transitions,
    AVG(duration_secs)::bigint AS avg_transition_secs,
    PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY duration_secs)::bigint AS p50_transition_secs,
    PERCENTILE_DISC(0.9) WITHIN GROUP (ORDER BY duration_secs)::bigint AS p90_transition_secs
  FROM trans
),
trans_pairs AS (
  SELECT from_status, to_status,
         COUNT(*) AS transitions,
         AVG(duration_secs)::bigint AS avg_secs,
         PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY duration_secs)::bigint AS p50_secs,
         PERCENTILE_DISC(0.9) WITHIN GROUP (ORDER BY duration_secs)::bigint AS p90_secs
  FROM trans
  GROUP BY from_status, to_status
),
trans_pairs_json AS (
  SELECT jsonb_agg(
           jsonb_build_object(
             'from', from_status, 'to', to_status,
             'count', transitions,
             'avg_secs', avg_secs, 'p50_secs', p50_secs, 'p90_secs', p90_secs
           )
           ORDER BY from_status, to_status
         ) AS arr
  FROM trans_pairs
),
-- stale WIP currently assigned to this person in sprint scope
stale AS (
  SELECT i.issue_key, i.summary, i.status, i.sp,
         COALESCE( (SELECT MAX(created_date) FROM tenant_1005.changelogs cl
                    WHERE cl.issue_key=i.issue_key AND cl.field_name='status')
                , i.created_date) AS last_status_change
  FROM i_scoped i
  JOIN s ON TRUE
  WHERE i.status_category <> 'Done'
),
stale_top AS (
  SELECT issue_key, summary, status, sp,
         (now() - last_status_change) AS age_interval
  FROM stale
  ORDER BY age_interval DESC
  LIMIT p_top
),
-- blockers (their issues blocked by others)
blocked_by AS (
  SELECT i.issue_key, i.summary, COUNT(*) AS blocked_by_cnt
  FROM i_scoped i
  JOIN tenant_1005.issue_links il ON il.source_issue_key = i.issue_key
  WHERE il.link_type ILIKE '%blocked%'
  GROUP BY i.issue_key, i.summary
  ORDER BY blocked_by_cnt DESC
  LIMIT p_top
),
-- people-level record from v_person_insights_by_sprint (for consistency)
person_row AS (
  SELECT *
  FROM tenant_1005.v_person_insights_by_sprint
  WHERE sprint_id = p_sprint_id AND person = p_person
  LIMIT 1
)
SELECT jsonb_build_object(
  'sprint', (SELECT to_jsonb(s.*) FROM s),
  'person', p_person,
  'kpis',   (SELECT to_jsonb(kpis.*) FROM kpis),
  'comments', jsonb_build_object(
     'owner_comment_issues', COALESCE((SELECT owner_comment_issues FROM person_row),0),
     'owner_comment_count',  COALESCE((SELECT owner_comment_count  FROM person_row),0),
     'avg_days_since_owner_comment', COALESCE((SELECT avg_days_since_owner_comment FROM person_row),0)
  ),
  'transitions', jsonb_build_object(
     'total', COALESCE((SELECT transitions FROM trans_summary),0),
     'avg_secs', COALESCE((SELECT avg_transition_secs FROM trans_summary),0),
     'p50_secs', COALESCE((SELECT p50_transition_secs FROM trans_summary),0),
     'p90_secs', COALESCE((SELECT p90_transition_secs FROM trans_summary),0),
     'pairs', COALESCE((SELECT arr FROM trans_pairs_json), '[]'::jsonb)
  ),
  'stale_top', (SELECT jsonb_agg(to_jsonb(s.*)) FROM stale_top s),
  'blocked_by', (SELECT jsonb_agg(to_jsonb(b.*)) FROM blocked_by b)
);
$$;
