CREATE OR REPLACE VIEW tenant_1005.v_person_insights_by_sprint AS
WITH s AS (
  SELECT sprint_id, name, start_date,
         COALESCE(complete_date, end_date, now()) AS until
  FROM tenant_1005.sprints
),
m AS (  -- sprint membership windows
  SELECT sprint_id, issue_key, start_ts, end_ts
  FROM tenant_1005.v_issue_sprint_membership_final
),
-- Any assignee who owned the issue during the sprint window
touch AS (
  SELECT DISTINCT s.sprint_id,
         a.assignee_name AS person,
         m.issue_key,
         COALESCE(i.story_points,0) AS sp
  FROM s
  JOIN m ON m.sprint_id=s.sprint_id
  JOIN tenant_1005.v_issue_assignee_spans a ON a.issue_key=m.issue_key
  JOIN tenant_1005.issues i ON i.issue_key=m.issue_key
  WHERE a.from_ts <= s.until
    AND (a.to_ts IS NULL OR a.to_ts >= s.start_date)
    AND m.start_ts <= s.until
    AND (m.end_ts IS NULL OR m.end_ts >= s.start_date)
),
d AS (SELECT * FROM tenant_1005.v_issue_done_at),
-- “Owner comments” = commenter was the assignee at comment time
owner_comments AS (
  SELECT s.sprint_id,
         a.assignee_name AS person,
         c.issue_key,
         COUNT(*) AS comment_count,
         MAX(c.created_date) AS last_comment_ts
  FROM s
  JOIN tenant_1005.comments c ON c.created_date BETWEEN s.start_date AND s.until
  JOIN tenant_1005.v_issue_assignee_spans a
    ON a.issue_key=c.issue_key
   AND c.created_date >= a.from_ts
   AND (a.to_ts IS NULL OR c.created_date < a.to_ts)
  JOIN m ON m.sprint_id=s.sprint_id AND m.issue_key=c.issue_key
  GROUP BY s.sprint_id, a.assignee_name, c.issue_key
),
owner_comment_rollup AS (
  SELECT sprint_id,
         person,
         COUNT(*)                    AS owner_comment_issues,
         SUM(comment_count)          AS owner_comment_count,
         MAX(last_comment_ts)        AS last_owner_comment_ts,
         AVG(EXTRACT(EPOCH FROM (now() - last_comment_ts))/86400.0) AS avg_days_since_owner_comment
  FROM owner_comments
  GROUP BY sprint_id, person
),
-- Status spans attributed to assignee at span start
trans AS (
  SELECT s.sprint_id,
         asg.assignee_name AS person,
         st.issue_key,
         st.status  AS from_status,
         LEAD(st.status) OVER (PARTITION BY st.issue_key ORDER BY st.from_ts) AS to_status,
         st.from_ts,
         st.to_ts,
         EXTRACT(EPOCH FROM (COALESCE(st.to_ts, s.until) - st.from_ts))::bigint AS duration_secs
  FROM tenant_1005.v_issue_status_spans st
  JOIN m ON m.issue_key=st.issue_key
  JOIN s ON s.sprint_id=m.sprint_id
  LEFT JOIN tenant_1005.v_issue_assignee_spans asg
    ON asg.issue_key=st.issue_key
   AND st.from_ts >= asg.from_ts
   AND (asg.to_ts IS NULL OR st.from_ts < asg.to_ts)
  WHERE st.to_ts IS NOT NULL
    AND st.to_ts   >= s.start_date
    AND st.from_ts <= s.until
),
-- Aggregates across all transitions per person
trans_agg AS (
  SELECT sprint_id, person,
         COUNT(*) AS transitions,
         AVG(duration_secs)::bigint AS avg_transition_secs,
         PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY duration_secs)::bigint AS p50_transition_secs,
         PERCENTILE_DISC(0.9) WITHIN GROUP (ORDER BY duration_secs)::bigint AS p90_transition_secs
  FROM trans
  WHERE person IS NOT NULL
  GROUP BY sprint_id, person
),
-- Per (from_status -> to_status) breakdown with p50/p90
trans_pairs AS (
  SELECT sprint_id, person, from_status, to_status,
         COUNT(*) AS transitions,
         AVG(duration_secs)::bigint AS avg_secs,
         PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY duration_secs)::bigint AS p50_secs,
         PERCENTILE_DISC(0.9) WITHIN GROUP (ORDER BY duration_secs)::bigint AS p90_secs
  FROM trans
  WHERE person IS NOT NULL
  GROUP BY sprint_id, person, from_status, to_status
),
trans_pair_json AS (
  SELECT sprint_id, person,
         jsonb_agg(
           jsonb_build_object(
             'from', from_status,
             'to', to_status,
             'count', transitions,
             'avg_secs', avg_secs,
             'p50_secs', p50_secs,
             'p90_secs', p90_secs
           )
           ORDER BY from_status, to_status
         ) AS status_pair_stats
  FROM trans_pairs
  GROUP BY sprint_id, person
),
-- Who authored status changes (workflow pushers)
pushers AS (
  SELECT s.sprint_id,
         cl.author_display_name AS person,
         COUNT(*) AS status_changes_authored
  FROM s
  JOIN tenant_1005.changelogs cl
    ON cl.field_name='status'
   AND cl.created_date BETWEEN s.start_date AND s.until
  JOIN m ON m.sprint_id=s.sprint_id AND m.issue_key=cl.issue_key
  GROUP BY s.sprint_id, cl.author_display_name
),
-- Per-person scope & completion
scope_done AS (
  SELECT t.sprint_id, t.person,
         COUNT(DISTINCT t.issue_key) AS issues_touched,
         SUM(t.sp)::numeric(10,2) AS points_touched,
         COUNT(DISTINCT t.issue_key) FILTER (WHERE d.done_at IS NOT NULL AND d.done_at <= s.until) AS issues_done,
         SUM(t.sp) FILTER (WHERE d.done_at IS NOT NULL AND d.done_at <= s.until)::numeric(10,2) AS points_done
  FROM touch t
  JOIN s ON s.sprint_id=t.sprint_id
  LEFT JOIN d ON d.issue_key=t.issue_key
  GROUP BY t.sprint_id, t.person
)
SELECT
  sd.sprint_id,
  (SELECT name FROM s WHERE s.sprint_id=sd.sprint_id LIMIT 1) AS sprint_name,
  sd.person,
  sd.issues_touched,
  sd.points_touched,
  sd.issues_done,
  sd.points_done,
  COALESCE(oc.owner_comment_issues,0)           AS owner_comment_issues,
  COALESCE(oc.owner_comment_count,0)            AS owner_comment_count,
  oc.last_owner_comment_ts,
  COALESCE(oc.avg_days_since_owner_comment,0)::numeric(10,2) AS avg_days_since_owner_comment,
  COALESCE(tr.transitions,0)                    AS transitions,
  COALESCE(tr.avg_transition_secs,0)            AS avg_transition_secs,
  COALESCE(tr.p50_transition_secs,0)            AS p50_transition_secs,
  COALESCE(tr.p90_transition_secs,0)            AS p90_transition_secs,
  COALESCE(ps.status_changes_authored,0)        AS status_changes_authored,
  COALESCE(tp.status_pair_stats, '[]'::jsonb)   AS status_pair_stats
FROM scope_done sd
LEFT JOIN owner_comment_rollup oc ON oc.sprint_id=sd.sprint_id AND oc.person=sd.person
LEFT JOIN trans_agg           tr ON tr.sprint_id=sd.sprint_id AND tr.person=sd.person
LEFT JOIN pushers             ps ON ps.sprint_id=sd.sprint_id AND ps.person=sd.person
LEFT JOIN trans_pair_json     tp ON tp.sprint_id=sd.sprint_id AND tp.person=sd.person
ORDER BY sd.sprint_id, sd.person;
