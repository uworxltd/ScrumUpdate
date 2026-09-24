-- Create tenant views
-- Extracted from kss_system.create_tenant_views() function
-- Template variables: {tenant_id}, {schema_name}

-- Create sprint scope events view
CREATE OR REPLACE VIEW {schema_name}.v_sprint_scope_events AS
WITH raw AS (
  SELECT issue_key, created_date,
         ARRAY(SELECT trim(x)::int FROM regexp_split_to_table(coalesce(from_value,''), E'\\s*,\\s*') x WHERE x ~ '^[0-9]+$') AS from_arr,
         ARRAY(SELECT trim(x)::int FROM regexp_split_to_table(coalesce(to_value,''),   E'\\s*,\\s*') x WHERE x ~ '^[0-9]+$') AS to_arr
  FROM {schema_name}.changelogs
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

-- Create issue sprint membership view
CREATE OR REPLACE VIEW {schema_name}.v_issue_sprint_membership AS
WITH a AS (
  SELECT issue_key, sprint_id, MIN(created_date) AS start_ts
  FROM {schema_name}.v_sprint_scope_events
  WHERE event_type='added'
  GROUP BY issue_key, sprint_id
),
r AS (
  SELECT e.issue_key, e.sprint_id, MIN(e.created_date) AS end_ts
  FROM {schema_name}.v_sprint_scope_events e
  JOIN a ON a.issue_key=e.issue_key AND a.sprint_id=e.sprint_id
  WHERE e.event_type='removed' AND e.created_date > a.start_ts
  GROUP BY e.issue_key, e.sprint_id
)
SELECT a.issue_key, a.sprint_id, a.start_ts, r.end_ts
FROM a LEFT JOIN r
ON r.issue_key=a.issue_key AND r.sprint_id=a.sprint_id;

-- Create final issue sprint membership view
CREATE OR REPLACE VIEW {schema_name}.v_issue_sprint_membership_final AS
WITH membership_spans AS (
    SELECT
        a.issue_key,
        a.sprint_id,
        a.created_date AS start_ts,
        MIN(r.created_date) AS end_ts
    FROM {schema_name}.v_sprint_scope_events a
    LEFT JOIN {schema_name}.v_sprint_scope_events r
      ON r.issue_key = a.issue_key
     AND r.sprint_id = a.sprint_id
     AND r.event_type = 'removed'
     AND r.created_date > a.created_date
    WHERE a.event_type = 'added'
    GROUP BY a.issue_key, a.sprint_id, a.created_date
)
SELECT 
    m.issue_key,
    m.sprint_id,
    m.start_ts,
    CASE 
        -- respect real removal events
        WHEN m.end_ts IS NOT NULL THEN m.end_ts
        -- otherwise keep active until sprint end/complete date
        ELSE COALESCE(s.complete_date, s.end_date)
    END AS end_ts
FROM membership_spans m
JOIN {schema_name}.sprints s 
  ON s.sprint_id = m.sprint_id

UNION ALL

-- fallback: if issue was in sprint_issues but has no changelog
SELECT 
    si.issue_key,
    si.sprint_id,
    s.start_date AS start_ts,
    COALESCE(s.complete_date, s.end_date) AS end_ts
FROM {schema_name}.sprint_issues si
JOIN {schema_name}.sprints s 
  ON s.sprint_id = si.sprint_id
LEFT JOIN membership_spans m
  ON m.issue_key = si.issue_key 
 AND m.sprint_id = si.sprint_id
WHERE m.issue_key IS NULL;


-- Create issue assignee spans view
CREATE OR REPLACE VIEW {schema_name}.v_issue_assignee_spans AS
WITH first_assignee AS (
  SELECT i.issue_key,
         COALESCE(
           (SELECT cl.from_display_value
            FROM {schema_name}.changelogs cl
            WHERE cl.issue_key=i.issue_key AND cl.field_name='assignee'
            ORDER BY cl.created_date
            LIMIT 1),
           i.assignee_display_name
         ) AS assignee_name
  FROM {schema_name}.issues i
),
events AS (
  SELECT i.issue_key, i.created_date AS ts, fa.assignee_name
  FROM {schema_name}.issues i
  LEFT JOIN first_assignee fa ON fa.issue_key=i.issue_key
  UNION ALL
  SELECT cl.issue_key, cl.created_date, cl.to_display_value
  FROM {schema_name}.changelogs cl
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

-- Create issue status spans view
CREATE OR REPLACE VIEW {schema_name}.v_issue_status_spans AS
WITH init AS (
  SELECT i.issue_key,
         i.created_date AS ts,
         COALESCE(
            (SELECT cl.from_display_value
             FROM {schema_name}.changelogs cl
             WHERE cl.issue_key=i.issue_key AND cl.field_name='status'
             ORDER BY cl.created_date
             LIMIT 1),
            i.status
         ) AS status
  FROM {schema_name}.issues i
),
events AS (
  SELECT issue_key, ts, status FROM init
  UNION ALL
  SELECT cl.issue_key, cl.created_date, cl.to_display_value
  FROM {schema_name}.changelogs cl
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

-- Create issue done at view
CREATE OR REPLACE VIEW {schema_name}.v_issue_done_at AS
SELECT i.issue_key,
       CASE WHEN i.status_category = 'Done' THEN
         COALESCE(
           (SELECT MIN(cl.created_date)
            FROM {schema_name}.changelogs cl
            WHERE cl.issue_key = i.issue_key
              AND cl.field_name = 'status'
              AND cl.to_display_value = i.status),
           i.status_category_change_date,
           i.resolution_date
         )
       ELSE NULL END AS done_at
FROM {schema_name}.issues i;

-- Create issue hygiene flags view
CREATE OR REPLACE VIEW {schema_name}.v_issue_hygiene_flags AS
WITH last_status AS (
  SELECT issue_key, MAX(created_date) AS last_status_change_ts
  FROM {schema_name}.changelogs
  WHERE field_name = 'status'
  GROUP BY issue_key
),
last_comment AS (
  SELECT issue_key, MAX(created_date) AS last_comment_ts
  FROM {schema_name}.comments
  GROUP BY issue_key
),
assignee_changes AS (
  SELECT issue_key, COUNT(*)::int AS assignee_changes
  FROM {schema_name}.changelogs
  WHERE field_name = 'assignee'
  GROUP BY issue_key
),
sprint_changes AS (
  SELECT issue_key, COUNT(*)::int AS sprint_changes
  FROM {schema_name}.changelogs
  WHERE field_name = 'Sprint'
  GROUP BY issue_key
),
mem_any AS (
  SELECT issue_key, BOOL_OR(TRUE) AS in_any_sprint
  FROM {schema_name}.v_issue_sprint_membership_final
  GROUP BY issue_key
),
in_scope AS (
  SELECT DISTINCT m.issue_key, TRUE AS in_scope_now
  FROM {schema_name}.v_issue_sprint_membership_final m
  JOIN {schema_name}.sprints s ON s.sprint_id = m.sprint_id
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
FROM {schema_name}.issues i
LEFT JOIN last_status      ls  USING (issue_key)
LEFT JOIN last_comment     lc  USING (issue_key)
LEFT JOIN assignee_changes ac  USING (issue_key)
LEFT JOIN sprint_changes   sc  USING (issue_key)
LEFT JOIN mem_any          ma  USING (issue_key)
LEFT JOIN in_scope         ins USING (issue_key);

-- Create issue children view (single source of truth)
CREATE OR REPLACE VIEW {schema_name}.v_issue_children AS
SELECT parent_issue_key AS parent_key,
       issue_key        AS child_key
FROM {schema_name}.issues
WHERE parent_issue_key IS NOT NULL;

-- Create issue blockers view (normalized directions)
CREATE OR REPLACE VIEW {schema_name}.v_issue_blockers AS
-- outgoing: this issue blocks another
SELECT il.source_issue_key AS issue_key,
       'outgoing'::text    AS direction,
       il.link_type,
       il.linked_issue_key AS other_key,
       i2.status           AS other_status,
       i2.status_category  AS other_status_category,
       i2.assignee_display_name AS other_assignee
FROM {schema_name}.issue_links il
LEFT JOIN {schema_name}.issues i2 ON i2.issue_key = il.linked_issue_key
WHERE il.link_type ILIKE '%block%'
UNION ALL
-- incoming: this issue is blocked by another
SELECT il.linked_issue_key AS issue_key,
       'incoming'::text    AS direction,
       il.link_type,
       il.source_issue_key AS other_key,
       i2.status, i2.status_category, i2.assignee_display_name
FROM {schema_name}.issue_links il
LEFT JOIN {schema_name}.issues i2 ON i2.issue_key = il.source_issue_key
WHERE il.link_type ILIKE '%block%';

-- Create issue contributors view (facts-only rollup per issue)
CREATE OR REPLACE VIEW {schema_name}.v_issue_contributors AS
WITH u AS (
  SELECT issue_key, reporter_display_name AS name, 'reporter' AS role, created_date AS ts
  FROM {schema_name}.issues
  UNION ALL
  SELECT issue_key, assignee_display_name, 'assignee', updated_date
  FROM {schema_name}.issues
  WHERE assignee_display_name IS NOT NULL
  UNION ALL
  SELECT issue_key, author_display_name, 'commenter', created_date
  FROM {schema_name}.comments
  UNION ALL
  SELECT issue_key, author_display_name, 'status_changer', created_date
  FROM {schema_name}.changelogs
  WHERE field_name='status'
)
SELECT issue_key, name,
       array_agg(DISTINCT role) AS roles,
       MAX(ts)                  AS last_activity,
       COUNT(*) FILTER (WHERE role='commenter')       AS comments_count,
       COUNT(*) FILTER (WHERE role='status_changer')  AS status_changes_count
FROM u
GROUP BY issue_key, name;

-- Create sprint issue set view (what's in this sprint - ever & now)
CREATE OR REPLACE VIEW {schema_name}.v_sprint_issue_set AS
WITH base AS (
  SELECT m.sprint_id,
         m.issue_key,
         m.start_ts        AS first_seen,
         m.end_ts          AS last_seen
  FROM {schema_name}.v_issue_sprint_membership_final m
),
bounds AS (
  SELECT s.sprint_id,
         s.name,
         s.start_date::timestamp AS start_at,
         COALESCE(s.complete_date, s.end_date)::timestamp AS end_at
  FROM {schema_name}.sprints s
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

-- Create sprint people rollup view (per-sprint, per-person activity KPIs)
CREATE OR REPLACE VIEW {schema_name}.v_sprint_people_rollup AS
WITH issue_now AS (
  SELECT sis.sprint_id, sis.issue_key
  FROM {schema_name}.v_sprint_issue_set sis
  WHERE sis.in_scope_now
),
assignee_now AS (
  SELECT i.issue_key, i.assignee_display_name AS person, COALESCE(i.story_points,0)::numeric AS sp
  FROM {schema_name}.issues i
),
done AS (
  SELECT d.issue_key, d.done_at
  FROM {schema_name}.v_issue_done_at d
),
contrib AS (
  SELECT c.issue_key, c.name AS person,
         c.comments_count, c.status_changes_count, c.last_activity
  FROM {schema_name}.v_issue_contributors c
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

-- Create sprint blockers open view (Sprint blockers - Open Only)
CREATE OR REPLACE VIEW {schema_name}.v_sprint_blockers_open AS
WITH issue_now AS (
  SELECT sis.sprint_id, sis.issue_key
  FROM {schema_name}.v_sprint_issue_set sis
  WHERE sis.in_scope_now
),
open_blockers AS (
  SELECT b.issue_key, b.direction, b.other_key, b.other_status, b.other_status_category, b.other_assignee
  FROM {schema_name}.v_issue_blockers b
  LEFT JOIN {schema_name}.v_issue_done_at d ON d.issue_key = b.other_key
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