---------------------------------------------------------------
------------- Issue Sprint Membership------------------------
---------------------------------------------------------------
CREATE OR REPLACE VIEW tenant_1001.v_sprint_scope_events AS
WITH raw AS (
  SELECT issue_key, created_date,
         ARRAY(SELECT trim(x)::int FROM regexp_split_to_table(coalesce(from_value,''), E'\\s*,\\s*') x WHERE x ~ '^[0-9]+$') AS from_arr,
         ARRAY(SELECT trim(x)::int FROM regexp_split_to_table(coalesce(to_value,''),   E'\\s*,\\s*') x WHERE x ~ '^[0-9]+$') AS to_arr
  FROM tenant_1001.changelogs
  WHERE field_name = 'Sprint'
),
added AS (
  SELECT r.issue_key, r.created_date, unnest(r.to_arr) AS sprint_id
  FROM raw r
),
removed AS (
  SELECT r.issue_key, r.created_date, unnest(r.from_arr) AS sprint_id
  FROM raw r
)
SELECT a.issue_key, a.sprint_id, a.created_date, 'added'::text AS event_type
FROM added a
LEFT JOIN raw r ON r.issue_key=a.issue_key AND r.created_date=a.created_date
WHERE r.from_arr IS NULL OR NOT (a.sprint_id = ANY(r.from_arr))
UNION ALL
SELECT r2.issue_key, r2.sprint_id, r2.created_date, 'removed'::text AS event_type
FROM removed r2
LEFT JOIN raw rr ON rr.issue_key=r2.issue_key AND rr.created_date=r2.created_date
WHERE rr.to_arr IS NULL OR NOT (r2.sprint_id = ANY(rr.to_arr));

CREATE OR REPLACE VIEW tenant_1001.v_issue_sprint_membership AS
WITH a AS (
  SELECT issue_key, sprint_id, MIN(created_date) AS start_ts
  FROM tenant_1001.v_sprint_scope_events
  WHERE event_type='added'
  GROUP BY issue_key, sprint_id
),
r AS (
  SELECT e.issue_key, e.sprint_id, MIN(e.created_date) AS end_ts
  FROM tenant_1001.v_sprint_scope_events e
  JOIN a ON a.issue_key=e.issue_key AND a.sprint_id=e.sprint_id
  WHERE e.event_type='removed' AND e.created_date > a.start_ts
  GROUP BY e.issue_key, e.sprint_id
)
SELECT a.issue_key, a.sprint_id, a.start_ts, r.end_ts
FROM a LEFT JOIN r
ON r.issue_key=a.issue_key AND r.sprint_id=a.sprint_id;


CREATE OR REPLACE VIEW tenant_1001.v_issue_sprint_membership_final AS
SELECT m.issue_key, m.sprint_id, m.start_ts, m.end_ts
FROM tenant_1001.v_issue_sprint_membership m
UNION ALL
SELECT si.issue_key, si.sprint_id,
       s.start_date AS start_ts,
       COALESCE(s.complete_date, s.end_date) AS end_ts
FROM tenant_1001.sprint_issues si
JOIN tenant_1001.sprints s ON s.sprint_id = si.sprint_id
LEFT JOIN tenant_1001.v_issue_sprint_membership m
  ON m.issue_key=si.issue_key AND m.sprint_id=si.sprint_id
WHERE m.issue_key IS NULL;

---------------------------------------------------------------
--------------- Issue Assignee Spans---------------------------
---------------------------------------------------------------

CREATE OR REPLACE VIEW tenant_1001.v_issue_assignee_spans AS
WITH first_assignee AS (
  SELECT i.issue_key,
         COALESCE(
           (SELECT cl.from_display_value
            FROM tenant_1001.changelogs cl
            WHERE cl.issue_key=i.issue_key AND cl.field_name='assignee'
            ORDER BY cl.created_date
            LIMIT 1),
           i.assignee_display_name
         ) AS assignee_name
  FROM tenant_1001.issues i
),
events AS (
  SELECT i.issue_key, i.created_date AS ts, fa.assignee_name
  FROM tenant_1001.issues i
  LEFT JOIN first_assignee fa ON fa.issue_key=i.issue_key
  UNION ALL
  SELECT cl.issue_key, cl.created_date, cl.to_display_value
  FROM tenant_1001.changelogs cl
  WHERE cl.field_name='assignee'
),
ordered AS (
  SELECT issue_key, assignee_name, ts,
         LEAD(ts) OVER (PARTITION BY issue_key ORDER BY ts) AS next_ts
  FROM events
)
SELECT issue_key,
       assignee_name,
       ts  AS from_ts,
       next_ts AS to_ts
FROM ordered
WHERE assignee_name IS NOT NULL;


---------------------------------------------------------------
------------- Status Time in Each issue-----------------------
---------------------------------------------------------------

CREATE OR REPLACE VIEW tenant_1001.v_issue_status_spans AS
WITH init AS (
  SELECT i.issue_key,
         i.created_date AS ts,
         COALESCE(
            (SELECT cl.from_display_value
             FROM tenant_1001.changelogs cl
             WHERE cl.issue_key=i.issue_key AND cl.field_name='status'
             ORDER BY cl.created_date
             LIMIT 1),
            i.status
         ) AS status
  FROM tenant_1001.issues i
),
events AS (
  SELECT issue_key, ts, status FROM init
  UNION ALL
  SELECT cl.issue_key, cl.created_date, cl.to_display_value
  FROM tenant_1001.changelogs cl
  WHERE cl.field_name='status'
),
ordered AS (
  SELECT issue_key, status, ts,
         LEAD(ts) OVER (PARTITION BY issue_key ORDER BY ts) AS next_ts
  FROM events
)
SELECT issue_key,
       status,
       ts AS from_ts,
       next_ts AS to_ts,
       EXTRACT(EPOCH FROM (COALESCE(next_ts, now()) - ts))::bigint AS duration_secs
FROM ordered
WHERE status IS NOT NULL;

---------------------------------------------------------------
-------------- ISSUES Done At----------------------------------
---------------------------------------------------------------

CREATE OR REPLACE VIEW tenant_1001.v_issue_done_at AS
SELECT i.issue_key,
       CASE WHEN i.status_category = 'Done' THEN
         COALESCE(
           (SELECT MIN(cl.created_date)
            FROM tenant_1001.changelogs cl
            WHERE cl.issue_key = i.issue_key
              AND cl.field_name = 'status'
              AND cl.to_display_value = i.status),
           i.status_category_change_date,
           i.resolution_date
         )
       ELSE NULL END AS done_at
FROM tenant_1001.issues i;


---------------------------------------------------------------
-------------- Children edges (single source of truth)---------
---------------------------------------------------------------

CREATE OR REPLACE VIEW tenant_1001.v_issue_children AS
SELECT parent_issue_key AS parent_key,
       issue_key        AS child_key
FROM tenant_1001.issues
WHERE parent_issue_key IS NOT NULL;

---------------------------------------------------------------
-------------- Blocker links (normalized directions)-----------
---------------------------------------------------------------

CREATE OR REPLACE VIEW tenant_1001.v_issue_blockers AS
-- outgoing: this issue blocks another
SELECT il.source_issue_key AS issue_key,
       'outgoing'::text    AS direction,
       il.link_type,
       il.linked_issue_key AS other_key,
       i2.status           AS other_status,
       i2.status_category  AS other_status_category,
       i2.assignee_display_name AS other_assignee
FROM tenant_1001.issue_links il
LEFT JOIN tenant_1001.issues i2 ON i2.issue_key = il.linked_issue_key
WHERE il.link_type ILIKE '%block%'
UNION ALL
-- incoming: this issue is blocked by another
SELECT il.linked_issue_key AS issue_key,
       'incoming'::text    AS direction,
       il.link_type,
       il.source_issue_key AS other_key,
       i2.status, i2.status_category, i2.assignee_display_name
FROM tenant_1001.issue_links il
LEFT JOIN tenant_1001.issues i2 ON i2.issue_key = il.source_issue_key
WHERE il.link_type ILIKE '%block%';

---------------------------------------------------------------
----------Contributors (facts-only rollup per issue)-----------
---------------------------------------------------------------

CREATE OR REPLACE VIEW tenant_1001.v_issue_contributors AS
WITH u AS (
  SELECT issue_key, reporter_display_name AS name, 'reporter' AS role, created_date AS ts
  FROM tenant_1001.issues
  UNION ALL
  SELECT issue_key, assignee_display_name, 'assignee', updated_date
  FROM tenant_1001.issues
  WHERE assignee_display_name IS NOT NULL
  UNION ALL
  SELECT issue_key, author_display_name, 'commenter', created_date
  FROM tenant_1001.comments
  UNION ALL
  SELECT issue_key, author_display_name, 'status_changer', created_date
  FROM tenant_1001.changelogs
  WHERE field_name='status'
)
SELECT issue_key, name,
       array_agg(DISTINCT role) AS roles,
       MAX(ts)                  AS last_activity,
       COUNT(*) FILTER (WHERE role='commenter')       AS comments_count,
       COUNT(*) FILTER (WHERE role='status_changer')  AS status_changes_count
FROM u
GROUP BY issue_key, name;


---------------------------------------------------------------
---------- Descendants helper (parametrized depth, flat)-------
---------------------------------------------------------------

CREATE OR REPLACE FUNCTION tenant_1001.fn_issue_descendants(
  root_key text,
  max_depth int DEFAULT 3
)
RETURNS TABLE(issue_key text, parent_key text, depth int)
LANGUAGE sql STABLE AS $$
WITH RECURSIVE rel AS (
  SELECT i.issue_key, i.parent_issue_key AS parent_key, 1 AS depth
  FROM tenant_1001.issues i
  WHERE i.parent_issue_key = root_key
  UNION ALL
  SELECT c.issue_key, c.parent_issue_key, rel.depth + 1
  FROM rel
  JOIN tenant_1001.issues c ON c.parent_issue_key = rel.issue_key
  WHERE rel.depth < max_depth
)
SELECT * FROM rel;
$$;

---------------------------------------------------------------
---------- Base facts for a single issue (no nesting)----------
---------------------------------------------------------------

CREATE OR REPLACE FUNCTION tenant_1001.fn_issue_facts_base(p_issue_key text)
RETURNS jsonb
LANGUAGE sql STABLE AS $$
WITH i AS (
  SELECT * FROM tenant_1001.issues WHERE issue_key = p_issue_key
),
done AS (
  SELECT issue_key, done_at FROM tenant_1001.v_issue_done_at WHERE issue_key = p_issue_key
),
last_status_change AS (
  SELECT MAX(created_date) AS last_status_change
  FROM tenant_1001.changelogs
  WHERE issue_key = p_issue_key AND field_name='status'
),
status_events AS (
  SELECT cl.created_date AS ts, cl.author_display_name AS author,
         cl.from_display_value AS "from", cl.to_display_value AS "to"
  FROM tenant_1001.changelogs cl
  WHERE cl.issue_key = p_issue_key AND cl.field_name='status'
  ORDER BY cl.created_date
),
status_spans AS (
  SELECT status, from_ts, to_ts,
         EXTRACT(EPOCH FROM (COALESCE(to_ts, now()) - from_ts))::bigint AS duration_secs
  FROM tenant_1001.v_issue_status_spans
  WHERE issue_key = p_issue_key
  ORDER BY from_ts
),
assignee_spans AS (
  SELECT assignee_name AS name, from_ts, to_ts
  FROM tenant_1001.v_issue_assignee_spans
  WHERE issue_key = p_issue_key
  ORDER BY from_ts
),
sprints AS (
  SELECT m.sprint_id, s.name, s.state, s.start_date, s.end_date, s.complete_date,
         m.start_ts AS membership_start, m.end_ts AS membership_end
  FROM tenant_1001.v_issue_sprint_membership_final m
  JOIN tenant_1001.sprints s ON s.sprint_id = m.sprint_id
  WHERE m.issue_key = p_issue_key
  ORDER BY s.start_date
),
comments AS (
  SELECT comment_id, author_display_name AS author, created_date, updated_date, comment_body AS body
  FROM tenant_1001.comments
  WHERE issue_key = p_issue_key
  ORDER BY created_date
),
contributors AS (
  SELECT jsonb_agg(jsonb_build_object(
           'name', c.name,
           'roles', c.roles,
           'last_activity', c.last_activity,
           'counts', jsonb_build_object('comments', c.comments_count, 'status_changes', c.status_changes_count)
         ) ORDER BY c.last_activity DESC) AS arr
  FROM tenant_1001.v_issue_contributors c
  WHERE c.issue_key = p_issue_key
),
blockers AS (
  SELECT jsonb_agg(to_jsonb(b.*)) AS open
  FROM tenant_1001.v_issue_blockers b
  LEFT JOIN tenant_1001.v_issue_done_at d ON d.issue_key = b.other_key
  WHERE b.issue_key = p_issue_key AND d.done_at IS NULL
), 
hygiene AS (
  SELECT h.*
  FROM tenant_1001.v_issue_hygiene_flags h
  WHERE h.issue_key = p_issue_key
)
SELECT jsonb_build_object(
  'meta', jsonb_build_object(
     'issue_key', i.issue_key,'parent_key', i.parent_issue_key,
     'issue_id', i.issue_id, 'summary', i.summary,
     'issue_type', i.issue_type, 'priority', i.priority, 'story_points', i.story_points,
     'labels', i.labels, 'components', i.components
  ),
  'state', jsonb_build_object(
     'status', i.status, 'status_category', i.status_category,
     'assignee', jsonb_build_object('id', i.assignee_account_id, 'name', i.assignee_display_name),
     'reporter', jsonb_build_object('id', i.reporter_account_id, 'name', i.reporter_display_name),
     'created', i.created_date, 'updated', i.updated_date,
     'resolution_date', i.resolution_date, 'done_at', (SELECT done_at FROM done),
     'last_status_change', (SELECT last_status_change FROM last_status_change),
     'current_status_duration_secs',
       (SELECT CASE WHEN s.status = i.status THEN s.duration_secs END
        FROM status_spans s ORDER BY s.from_ts DESC LIMIT 1)
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
  'blockers', jsonb_build_object('open', COALESCE((SELECT open FROM blockers), '[]'::jsonb)),
  'hygiene', COALESCE((SELECT to_jsonb(h) - 'issue_id' FROM hygiene h), '{}'::jsonb)
)
FROM i;
$$;

---------------------------------------------------------------
---------- FLAT ISSUE FACTS. all issues at same level----------
---------------------------------------------------------------
CREATE OR REPLACE FUNCTION tenant_1001.fn_issue_facts_flat(
  root_key  text,
  max_depth int DEFAULT 3
)
RETURNS jsonb
LANGUAGE sql STABLE AS $$
SELECT jsonb_build_object(
  'root', tenant_1001.fn_issue_facts_base(root_key),
  'descendants',
    COALESCE(
      (SELECT jsonb_agg(tenant_1001.fn_issue_facts_base(d.issue_key)
                        ORDER BY d.depth, ii.created_date)
       FROM tenant_1001.fn_issue_descendants(root_key, max_depth) d
       JOIN tenant_1001.issues ii ON ii.issue_key = d.issue_key),
      '[]'::jsonb)
);
$$;

---------------------------------------------------------------
---------- what’s in this sprint (ever & now)------------------
---------------------------------------------------------------

CREATE OR REPLACE VIEW tenant_1001.v_sprint_issue_set AS
WITH base AS (
  SELECT m.sprint_id,
         m.issue_key,
         m.start_ts        AS first_seen,
         m.end_ts          AS last_seen
  FROM tenant_1001.v_issue_sprint_membership_final m
),
bounds AS (
  SELECT s.sprint_id,
         s.name,
         s.start_date::timestamp AS start_at,
         COALESCE(s.complete_date, s.end_date)::timestamp AS end_at
  FROM tenant_1001.sprints s
)
SELECT
  b.sprint_id,
  bo.name AS sprint_name,
  b.issue_key,
  b.first_seen,
  b.last_seen,
  -- in scope "now" (between sprint bounds and membership bounds)
  (now() BETWEEN GREATEST(b.first_seen, bo.start_at) AND COALESCE(b.last_seen, bo.end_at)) AS in_scope_now
FROM base b
JOIN bounds bo USING (sprint_id);


---------------------------------------------------------------
------- BurnDown: daily scope/done/remaining (materialized)----
---------------------------------------------------------------
  -- If you already created it partially, drop first
DROP MATERIALIZED VIEW IF EXISTS tenant_1001.mv_sprint_burndown_daily;

CREATE MATERIALIZED VIEW tenant_1001.mv_sprint_burndown_daily AS
WITH bounds AS (
  SELECT s.sprint_id,
         s.start_date::date AS start_d,
         COALESCE(s.complete_date, s.end_date)::date AS end_d
  FROM tenant_1001.sprints s
  WHERE s.start_date IS NOT NULL
),
days AS (
  SELECT b.sprint_id, d::date AS day
  FROM bounds b
  CROSS JOIN LATERAL generate_series(b.start_d, b.end_d, '1 day') AS d
),
mem AS (
  SELECT m.sprint_id, m.issue_key, m.start_ts, m.end_ts
  FROM tenant_1001.v_issue_sprint_membership_final m
),
issue_points AS (
  SELECT i.issue_key, COALESCE(i.story_points,0)::numeric AS sp
  FROM tenant_1001.issues i
),
done AS (
  SELECT d.issue_key, d.done_at
  FROM tenant_1001.v_issue_done_at d
),
base AS (
  SELECT
    d.sprint_id,
    d.day,
    SUM(COALESCE(ip.sp,0))::numeric AS scope_points,
    SUM(
      CASE
        WHEN dn.done_at IS NOT NULL
         AND dn.done_at <= (d.day + INTERVAL '1 day' - INTERVAL '1 second')
        THEN COALESCE(ip.sp,0) ELSE 0
      END
    )::numeric AS done_points
  FROM days d
  JOIN mem m
    ON m.sprint_id = d.sprint_id
   AND d.day >= m.start_ts::date
   AND d.day <= COALESCE(m.end_ts::date, d.day)
  LEFT JOIN issue_points ip ON ip.issue_key = m.issue_key
  LEFT JOIN done dn         ON dn.issue_key = m.issue_key
  GROUP BY d.sprint_id, d.day
)
SELECT
  sprint_id,
  day,
  scope_points,
  done_points,
  GREATEST(scope_points - done_points, 0)::numeric AS remaining_points,
  GREATEST(scope_points - LAG(scope_points) OVER (PARTITION BY sprint_id ORDER BY day), 0)::numeric AS added_points_day,
  GREATEST(LAG(scope_points) OVER (PARTITION BY sprint_id ORDER BY day) - scope_points, 0)::numeric AS removed_points_day
FROM base
ORDER BY sprint_id, day;

-- helpful index for queries
CREATE INDEX IF NOT EXISTS idx_mv_burndown_sprint_day
  ON tenant_1001.mv_sprint_burndown_daily (sprint_id, day);

---------------------------------------------------------------
------------- per-sprint, per-person activity KPIs. -----------
---------------------------------------------------------------
CREATE OR REPLACE VIEW tenant_1001.v_sprint_people_rollup AS
WITH issue_now AS (
  SELECT sis.sprint_id, sis.issue_key
  FROM tenant_1001.v_sprint_issue_set sis
  WHERE sis.in_scope_now
),
assignee_now AS (
  SELECT i.issue_key, i.assignee_display_name AS person, COALESCE(i.story_points,0)::numeric AS sp
  FROM tenant_1001.issues i
),
done AS (
  SELECT d.issue_key, d.done_at
  FROM tenant_1001.v_issue_done_at d
),
contrib AS (
  SELECT c.issue_key, c.name AS person,
         c.comments_count, c.status_changes_count, c.last_activity
  FROM tenant_1001.v_issue_contributors c
)
SELECT
  iss.sprint_id,
  a.person,
  COUNT(*) FILTER (WHERE a.person IS NOT NULL)                       AS issues_assigned_now,
  SUM(a.sp)    FILTER (WHERE a.person IS NOT NULL)                   AS points_assigned_now,
  COUNT(*)     FILTER (WHERE d.done_at IS NOT NULL)                  AS issues_done_total,
  SUM(a.sp)    FILTER (WHERE d.done_at IS NOT NULL)                  AS points_done_total,
  COALESCE(SUM(c.comments_count),0)                                  AS comments_count_total,
  COALESCE(SUM(c.status_changes_count),0)                            AS status_changes_count_total,
  MAX(c.last_activity)                                               AS last_activity
FROM issue_now iss
LEFT JOIN assignee_now a ON a.issue_key = iss.issue_key
LEFT JOIN done d         ON d.issue_key = iss.issue_key
LEFT JOIN contrib c      ON c.issue_key = iss.issue_key AND c.person = a.person
GROUP BY iss.sprint_id, a.person
HAVING a.person IS NOT NULL;


---------------------------------------------------------------
------------- Sprint blockers (Open Only) ---------------------
---------------------------------------------------------------

CREATE OR REPLACE VIEW tenant_1001.v_sprint_blockers_open AS
WITH issue_now AS (
  SELECT sis.sprint_id, sis.issue_key
  FROM tenant_1001.v_sprint_issue_set sis
  WHERE sis.in_scope_now
),
open_blockers AS (
  SELECT b.issue_key, b.direction, b.other_key, b.other_status, b.other_status_category, b.other_assignee
  FROM tenant_1001.v_issue_blockers b
  LEFT JOIN tenant_1001.v_issue_done_at d ON d.issue_key = b.other_key
  WHERE d.done_at IS NULL
)
SELECT DISTINCT
  inow.sprint_id,
  ob.issue_key,
  ob.direction,
  ob.other_key,
  ob.other_status,
  ob.other_status_category,
  ob.other_assignee
FROM issue_now inow
JOIN open_blockers ob ON ob.issue_key = inow.issue_key;


---------------------------------------------------------------
------------- Sprint Burnd Down --------- ---------------------
---------------------------------------------------------------

CREATE OR REPLACE FUNCTION tenant_1001.fn_sprint_burndown(p_sprint_id int)
RETURNS TABLE(
  sprint_id int,
  day date,
  scope_points numeric,
  done_points numeric,
  remaining_points numeric,
  added_points_day numeric,
  removed_points_day numeric
)
LANGUAGE sql STABLE AS $$
  SELECT sprint_id, day, scope_points, done_points, remaining_points, added_points_day, removed_points_day
  FROM tenant_1001.mv_sprint_burndown_daily
  WHERE sprint_id = p_sprint_id
  ORDER BY day;
$$;

---------------------------------------------------------------
------------- ISSUE STATUS TRANSITIONS ------------------------
---------------------------------------------------------------
-- Base: transitions with assignee + sprint at transition time
CREATE OR REPLACE VIEW tenant_1001.v_issue_status_transitions AS
WITH t AS (
  SELECT
    s.issue_key,
    s.status AS from_status,
    LEAD(s.status) OVER (PARTITION BY s.issue_key ORDER BY s.from_ts) AS to_status,
    s.from_ts,
    LEAD(s.from_ts) OVER (PARTITION BY s.issue_key ORDER BY s.from_ts) AS next_from_ts,
    s.to_ts
  FROM tenant_1001.v_issue_status_spans s
),
trans AS (
  SELECT
    issue_key,
    from_status,
    to_status,
    from_ts,
    COALESCE(next_from_ts, to_ts) AS transition_ts,
    EXTRACT(EPOCH FROM (COALESCE(next_from_ts, to_ts, now()) - from_ts))::bigint AS duration_secs
  FROM t
  WHERE to_status IS NOT NULL
)
SELECT
  tr.issue_key,
  tr.from_status,
  tr.to_status,
  tr.transition_ts,
  tr.duration_secs,
  a.assignee_name                      AS person,
  m.sprint_id
FROM trans tr
LEFT JOIN tenant_1001.v_issue_assignee_spans a
       ON a.issue_key = tr.issue_key
      AND a.from_ts <= tr.transition_ts
      AND (a.to_ts IS NULL OR a.to_ts > tr.transition_ts)
LEFT JOIN tenant_1001.v_issue_sprint_membership_final m
       ON m.issue_key = tr.issue_key
      AND m.start_ts <= tr.transition_ts
      AND (m.end_ts IS NULL OR m.end_ts > tr.transition_ts);


---------------------------------------------------------------------------------
--Sprint coaching: “Who’s slow/fast on In Progress → Code Review this sprint?”--
--Personal coaching: filter by person = '...' across sprints.--
---------------------------------------------------------------------------------

-- Aggregated: per sprint, per person, per status pair
CREATE OR REPLACE VIEW tenant_1001.v_person_status_pair_stats AS
SELECT
  x.sprint_id,
  x.person,
  x.from_status,
  x.to_status,
  COUNT(*)                                                   AS transitions,
  AVG(x.duration_secs)::numeric                              AS avg_secs,
  PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY x.duration_secs)::numeric AS p50_secs,
  PERCENTILE_DISC(0.9) WITHIN GROUP (ORDER BY x.duration_secs)::numeric AS p90_secs
FROM tenant_1001.v_issue_status_transitions x
WHERE x.person IS NOT NULL
GROUP BY x.sprint_id, x.person, x.from_status, x.to_status;

---------------------------------------------------------------------------------
--------- Person work profile (global, all time) --------------------------------
--------- What it does: one row per person with: issues touched, ----------------
--------- Issues/points done as owner at Done time, active load now, ------------
--------- Cycle-time stats, contribution counts, and issue-type mix.-------------
---------------------------------------------------------------------------------
CREATE OR REPLACE VIEW tenant_1001.v_person_work_profile AS
WITH touched AS (
  SELECT assignee_name AS person,
         COUNT(DISTINCT issue_key) AS issues_touched_total
  FROM tenant_1001.v_issue_assignee_spans
  GROUP BY assignee_name
),
owner_at_done AS (
  SELECT a.assignee_name AS person, a.issue_key
  FROM tenant_1001.v_issue_assignee_spans a
  JOIN tenant_1001.v_issue_done_at d
    ON d.issue_key = a.issue_key
   AND a.from_ts <= d.done_at
   AND (a.to_ts IS NULL OR a.to_ts > d.done_at)  -- owner at completion
),
done_points AS (
  SELECT
    o.person,
    COUNT(*) AS issues_done_as_owner,
    SUM(COALESCE(i.story_points,0))::numeric AS points_done_as_owner,
    AVG(EXTRACT(EPOCH FROM (d.done_at - i.created_date)))::numeric AS avg_cycle_time_done_secs,
    PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (d.done_at - i.created_date)))::numeric AS p50_cycle_secs,
    PERCENTILE_DISC(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (d.done_at - i.created_date)))::numeric AS p90_cycle_secs
  FROM owner_at_done o
  JOIN tenant_1001.issues i ON i.issue_key = o.issue_key
  JOIN tenant_1001.v_issue_done_at d ON d.issue_key = o.issue_key
  GROUP BY o.person
),
now_active AS (
  SELECT i.assignee_display_name AS person,
         COUNT(*) AS issues_active_now,
         SUM(COALESCE(i.story_points,0))::numeric AS points_active_now
  FROM tenant_1001.issues i
  WHERE i.assignee_display_name IS NOT NULL
    AND i.status_category <> 'Done'
  GROUP BY i.assignee_display_name
),
contributors AS (
  SELECT c.name AS person,
         SUM(c.comments_count) AS comments_count_total,
         SUM(c.status_changes_count) AS status_changes_count_total,
         MAX(c.last_activity) AS last_activity
  FROM tenant_1001.v_issue_contributors c
  GROUP BY c.name
),
mix AS (
  SELECT a.assignee_name AS person, i.issue_type, COUNT(*) AS cnt
  FROM tenant_1001.v_issue_assignee_spans a
  JOIN tenant_1001.issues i ON i.issue_key = a.issue_key
  GROUP BY a.assignee_name, i.issue_type
),
mix_json AS (
  SELECT person,
         jsonb_agg(jsonb_build_object('issue_type', issue_type, 'count', cnt)
                   ORDER BY cnt DESC) AS issue_type_mix
  FROM mix
  GROUP BY person
)
SELECT
  COALESCE(t.person, d.person, n.person, c.person, m.person) AS person,
  COALESCE(t.issues_touched_total, 0) AS issues_touched_total,
  COALESCE(d.issues_done_as_owner, 0) AS issues_done_as_owner,
  COALESCE(d.points_done_as_owner, 0)::numeric AS points_done_as_owner,
  COALESCE(n.issues_active_now, 0) AS issues_active_now,
  COALESCE(n.points_active_now, 0)::numeric AS points_active_now,
  d.avg_cycle_time_done_secs,
  d.p50_cycle_secs,
  d.p90_cycle_secs,
  COALESCE(c.comments_count_total,0) AS comments_count_total,
  COALESCE(c.status_changes_count_total,0) AS status_changes_count_total,
  c.last_activity,
  COALESCE(m.issue_type_mix, '[]'::jsonb) AS issue_type_mix
FROM touched t
FULL OUTER JOIN done_points d ON d.person = t.person
FULL OUTER JOIN now_active n  ON n.person = COALESCE(t.person, d.person)
FULL OUTER JOIN contributors c ON c.person = COALESCE(t.person, d.person, n.person)
FULL OUTER JOIN mix_json m    ON m.person = COALESCE(t.person, d.person, n.person, c.person);


-------------------------------------------------------
-------------COMPLETE SPRINT FACTS---------------------
-------------------------------------------------------
CREATE OR REPLACE FUNCTION tenant_1001.fn_sprint_facts(p_sprint_id int)
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
WITH s AS (
  SELECT sprint_id, name,
         s.start_date::timestamp AS start_at,
         COALESCE(s.complete_date, s.end_date)::timestamp AS end_at
  FROM tenant_1001.sprints s
  WHERE sprint_id = p_sprint_id
),
now_row AS (
  SELECT b.*
  FROM tenant_1001.fn_sprint_burndown(p_sprint_id) b
  WHERE b.day = LEAST(current_date, (SELECT end_at::date FROM s))
  LIMIT 1
),
first_row AS (
  SELECT b.* FROM tenant_1001.fn_sprint_burndown(p_sprint_id) b
  ORDER BY b.day ASC LIMIT 1
),
tail AS (
  SELECT jsonb_agg(to_jsonb(b) ORDER BY b.day DESC) FILTER (WHERE true) AS last3
  FROM (SELECT * FROM tenant_1001.fn_sprint_burndown(p_sprint_id) ORDER BY day DESC LIMIT 3) b
),
in_scope_now AS (
  SELECT sis.issue_key
  FROM tenant_1001.v_sprint_issue_set sis
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
  JOIN tenant_1001.issues i ON i.issue_key = x.issue_key
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
  JOIN tenant_1001.issues i ON i.issue_key = x.issue_key
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
  FROM tenant_1001.v_sprint_people_rollup pr
  WHERE pr.sprint_id = p_sprint_id
),
blockers AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(b) ORDER BY b.issue_key), '[]'::jsonb) AS open
  FROM tenant_1001.v_sprint_blockers_open b
  WHERE b.sprint_id = p_sprint_id
), 
hyg AS (
  SELECT h.*
  FROM tenant_1001.v_issue_hygiene_flags h
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
  SELECT jsonb_agg(
           jsonb_build_object(
             'issue_key', h.issue_key,
             'summary',   i.summary,
             'assignee',  i.assignee_display_name,
             'current_status_days', h.current_status_days
           )
           ORDER BY h.current_status_days DESC NULLS LAST
         ) AS arr
  FROM (
    SELECT h.issue_key, h.current_status_days
    FROM hyg h
    ORDER BY h.current_status_days DESC NULLS LAST
    LIMIT 10
  ) h
  JOIN tenant_1001.issues i ON i.issue_key = h.issue_key
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

-------------------------------------------------------
-------------ISSUE TICKET HYGIENE----------------------
-------------------------------------------------------
CREATE OR REPLACE VIEW tenant_1001.v_issue_hygiene_flags AS
WITH last_status AS (
  SELECT issue_key, MAX(created_date) AS last_status_change_ts
  FROM tenant_1001.changelogs
  WHERE field_name = 'status'
  GROUP BY issue_key
),
last_comment AS (
  SELECT issue_key, MAX(created_date) AS last_comment_ts
  FROM tenant_1001.comments
  GROUP BY issue_key
),
assignee_changes AS (
  SELECT issue_key, COUNT(*)::int AS assignee_changes
  FROM tenant_1001.changelogs
  WHERE field_name = 'assignee'
  GROUP BY issue_key
),
sprint_changes AS (
  SELECT issue_key, COUNT(*)::int AS sprint_changes
  FROM tenant_1001.changelogs
  WHERE field_name = 'Sprint'
  GROUP BY issue_key
),
mem_any AS (
  SELECT issue_key, BOOL_OR(TRUE) AS in_any_sprint
  FROM tenant_1001.v_issue_sprint_membership_final
  GROUP BY issue_key
),
in_scope AS (
  SELECT DISTINCT m.issue_key, TRUE AS in_scope_now
  FROM tenant_1001.v_issue_sprint_membership_final m
  JOIN tenant_1001.sprints s ON s.sprint_id = m.sprint_id
  WHERE now() BETWEEN COALESCE(m.start_ts, s.start_date)
                  AND COALESCE(m.end_ts, COALESCE(s.complete_date, s.end_date))
)
SELECT
  i.issue_key,
  i.issue_id,
  i.issue_type,
  i.status,
  i.status_category,
  i.assignee_display_name,
  i.priority,
  i.summary,
  i.description,
  i.story_points,
  (i.assignee_display_name IS NOT NULL)                           AS has_assignee,
  CASE WHEN COALESCE(i.issue_type,'') ILIKE 'story%'              -- only enforce for Stories
       THEN (i.story_points IS NOT NULL) ELSE TRUE END            AS has_story_points,
  (NULLIF(TRIM(COALESCE(i.summary,'')), '') IS NOT NULL)          AS has_summary,
  (NULLIF(TRIM(COALESCE(i.description,'')), '') IS NOT NULL)      AS has_description,
  ls.last_status_change_ts,
  CASE WHEN ls.last_status_change_ts IS NULL THEN NULL
       ELSE FLOOR(EXTRACT(EPOCH FROM (now() - ls.last_status_change_ts))/86400)::int END
       AS last_status_change_days,
  lc.last_comment_ts,
  CASE WHEN lc.last_comment_ts IS NULL THEN NULL
       ELSE FLOOR(EXTRACT(EPOCH FROM (now() - lc.last_comment_ts))/86400)::int END
       AS last_comment_days,
  -- time in current status == time since last status change
  CASE WHEN ls.last_status_change_ts IS NULL THEN NULL
       ELSE FLOOR(EXTRACT(EPOCH FROM (now() - ls.last_status_change_ts))/86400)::int END
       AS current_status_days,
  COALESCE(ac.assignee_changes,0)                                 AS assignee_changes,
  COALESCE(sc.sprint_changes,0)                                   AS sprint_changes,
  COALESCE(ma.in_any_sprint,false)                                AS in_any_sprint,
  COALESCE(ins.in_scope_now,false)                                AS in_scope_now,
  7                                                               AS stale_threshold_days,
  (COALESCE(FLOOR(EXTRACT(EPOCH FROM (now() - COALESCE(ls.last_status_change_ts,'epoch')))/86400)::int, 9999) >= 7
   AND COALESCE(FLOOR(EXTRACT(EPOCH FROM (now() - COALESCE(lc.last_comment_ts,'epoch')))/86400)::int, 9999) >= 7
   AND i.status_category <> 'Done')                               AS stale
FROM tenant_1001.issues i
LEFT JOIN last_status      ls  USING (issue_key)
LEFT JOIN last_comment     lc  USING (issue_key)
LEFT JOIN assignee_changes ac  USING (issue_key)
LEFT JOIN sprint_changes   sc  USING (issue_key)
LEFT JOIN mem_any          ma  USING (issue_key)
LEFT JOIN in_scope         ins USING (issue_key);

-------------------------------------------------------
-------------SPRINT AI PAYLOAD-------------------------
-------------------------------------------------------
CREATE OR REPLACE FUNCTION tenant_1001.fn_sprint_ai_payload(p_sprint_id int)
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
WITH people AS (
  SELECT COALESCE(
           jsonb_agg(to_jsonb(pr) ORDER BY pr.points_assigned_now DESC NULLS LAST),
           '[]'::jsonb
         ) AS arr
  FROM tenant_1001.v_sprint_people_rollup pr
  WHERE pr.sprint_id = p_sprint_id
),
flow AS (
  SELECT COALESCE(
           jsonb_agg(to_jsonb(s) ORDER BY s.person, s.from_status, s.to_status),
           '[]'::jsonb
         ) AS arr
  FROM tenant_1001.v_person_status_pair_stats s
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
  FROM tenant_1001.v_sprint_issue_set sis
  JOIN tenant_1001.issues c ON c.issue_key = sis.issue_key
  LEFT JOIN tenant_1001.issues e ON e.issue_key = c.parent_issue_key
  WHERE sis.sprint_id = p_sprint_id
    AND sis.in_scope_now
    AND c.parent_issue_key IS NOT NULL
  GROUP BY e.issue_key, e.summary
),
epics AS (
  SELECT COALESCE(
           jsonb_agg(
             jsonb_build_object(
               'epic_key',         epic_key,
               'epic_summary',     epic_summary,
               'stories',          stories,
               'points_total',     points_total,
               'points_done',      points_done,
               'points_remaining', points_remaining
             )
             ORDER BY points_remaining DESC
           ),
           '[]'::jsonb
         ) AS arr
  FROM epic_rows
),
-- At-risk now: stale/missing fields/blocked
at_risk AS (
  SELECT COALESCE(
           jsonb_agg(
             jsonb_build_object(
               'issue_key',    i.issue_key,
               'summary',      i.summary,
               'assignee',     i.assignee_display_name,
               'status',       i.status,
               'story_points', i.story_points,
               'hygiene',      to_jsonb(h) - 'issue_id' - 'summary' - 'description',
               'blocked',      EXISTS (
                                 SELECT 1
                                 FROM tenant_1001.v_sprint_blockers_open b
                                 WHERE b.sprint_id = p_sprint_id
                                   AND b.issue_key = i.issue_key
                               )
             )
             ORDER BY h.stale DESC,
                      (h.has_assignee = false) DESC,
                      (h.has_story_points = false) DESC
           ),
           '[]'::jsonb
         ) AS arr
  FROM tenant_1001.v_sprint_issue_set sis
  JOIN tenant_1001.v_issue_hygiene_flags h ON h.issue_key = sis.issue_key
  JOIN tenant_1001.issues i               ON i.issue_key = sis.issue_key
  WHERE sis.sprint_id = p_sprint_id
    AND sis.in_scope_now
    AND (
      h.stale
      OR NOT h.has_assignee
      OR (COALESCE(i.issue_type,'') ILIKE 'story%' AND NOT h.has_story_points)
      OR EXISTS (
           SELECT 1
           FROM tenant_1001.v_sprint_blockers_open b
           WHERE b.sprint_id = p_sprint_id
             AND b.issue_key = i.issue_key
         )
    )
)
SELECT jsonb_build_object(
  'sprint_id',     p_sprint_id,
  'facts',         tenant_1001.fn_sprint_facts(p_sprint_id),
  'people_rollup', (SELECT arr FROM people),
  'flow_stats',    (SELECT arr FROM flow),
  'epic_progress', (SELECT arr FROM epics),
  'at_risk',       (SELECT arr FROM at_risk)
);
$$;