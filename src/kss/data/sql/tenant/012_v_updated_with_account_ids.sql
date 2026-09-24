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
),
recent_churn AS (
  SELECT m.issue_key,
         bool_or(
           (m.start_ts IS NOT NULL AND m.start_ts >= s.start_date AND m.start_ts >= now() - interval '3 days')
           OR
           (m.end_ts   IS NOT NULL AND m.end_ts   >= s.start_date AND m.end_ts   >= now() - interval '3 days')
         ) AS is_scope_churn_recent
  FROM {schema_name}.v_issue_sprint_membership_final m
  JOIN {schema_name}.sprints s ON s.sprint_id = m.sprint_id
  WHERE now() BETWEEN COALESCE(m.start_ts, s.start_date)
                  AND COALESCE(m.end_ts, COALESCE(s.complete_date, s.end_date))
  GROUP BY m.issue_key
)
SELECT
  i.issue_key, i.issue_id, i.issue_type, i.status, i.status_category,
  i.assignee_display_name, i.priority, i.summary, i.description, i.story_points,
  (i.assignee_display_name IS NOT NULL) AS has_assignee,
  CASE WHEN COALESCE(i.issue_type,'') ILIKE 'story%' THEN (i.story_points IS NOT NULL) ELSE TRUE END AS has_story_points,
  (NULLIF(TRIM(COALESCE(i.summary,'')), ''))       IS NOT NULL AS has_summary,
  (NULLIF(TRIM(COALESCE(i.description,'')), ''))   IS NOT NULL AS has_description,
  ls.last_status_change_ts,
  CASE WHEN ls.last_status_change_ts IS NULL THEN NULL
       ELSE FLOOR(EXTRACT(EPOCH FROM (now() - ls.last_status_change_ts))/86400)::int END AS last_status_change_days,
  lc.last_comment_ts,
  CASE WHEN lc.last_comment_ts IS NULL THEN NULL
       ELSE FLOOR(EXTRACT(EPOCH FROM (now() - lc.last_comment_ts))/86400)::int END AS last_comment_days,
  CASE WHEN ls.last_status_change_ts IS NULL THEN NULL
       ELSE FLOOR(EXTRACT(EPOCH FROM (now() - ls.last_status_change_ts))/86400)::int END AS current_status_days,
  COALESCE(ac.assignee_changes,0) AS assignee_changes,
  COALESCE(sc.sprint_changes,0)   AS sprint_changes,
  COALESCE(ma.in_any_sprint,false) AS in_any_sprint,
  COALESCE(ins.in_scope_now,false) AS in_scope_now,
  7 AS stale_threshold_days,
  (COALESCE(FLOOR(EXTRACT(EPOCH FROM (now() - COALESCE(ls.last_status_change_ts,'epoch')))/86400)::int, 9999) >= 7
   AND COALESCE(FLOOR(EXTRACT(EPOCH FROM (now() - COALESCE(lc.last_comment_ts,'epoch')))/86400)::int, 9999) >= 7
   AND i.status_category <> 'Done') AS stale,
  COALESCE(rc.is_scope_churn_recent,false) AS is_scope_churn_recent,
  i.assignee_account_id AS assignee_account_id  -- appended
FROM {schema_name}.issues i
LEFT JOIN last_status      ls  USING (issue_key)
LEFT JOIN last_comment     lc  USING (issue_key)
LEFT JOIN assignee_changes ac  USING (issue_key)
LEFT JOIN sprint_changes   sc  USING (issue_key)
LEFT JOIN mem_any          ma  USING (issue_key)
LEFT JOIN in_scope         ins USING (issue_key)
LEFT JOIN recent_churn     rc  USING (issue_key);

CREATE OR REPLACE VIEW {schema_name}.v_issue_assignee_spans AS
WITH first_assignee AS (
  SELECT
    i.issue_key,
    COALESCE((
      SELECT cl.from_display_value
      FROM {schema_name}.changelogs cl
      WHERE cl.issue_key = i.issue_key AND cl.field_name = 'assignee'
      ORDER BY cl.created_date
      LIMIT 1
    ), i.assignee_display_name) AS assignee_name,
    COALESCE((
      SELECT cl.from_value            -- Jira accountId for the prior assignee
      FROM {schema_name}.changelogs cl
      WHERE cl.issue_key = i.issue_key AND cl.field_name = 'assignee'
      ORDER BY cl.created_date
      LIMIT 1
    ), i.assignee_account_id)   AS assignee_account_id
  FROM {schema_name}.issues i
),
events AS (
  -- seed at creation
  SELECT i.issue_key, i.created_date AS ts,
         fa.assignee_name, fa.assignee_account_id
  FROM {schema_name}.issues i
  LEFT JOIN first_assignee fa ON fa.issue_key = i.issue_key

  UNION ALL

  -- subsequent changes (to_value is the assignee accountId)
  SELECT cl.issue_key, cl.created_date,
         cl.to_display_value AS assignee_name,
         cl.to_value         AS assignee_account_id
  FROM {schema_name}.changelogs cl
  WHERE cl.field_name = 'assignee'
),
ordered AS (
  SELECT e.issue_key, e.assignee_name, e.assignee_account_id, e.ts,
         lead(e.ts) OVER (PARTITION BY e.issue_key ORDER BY e.ts) AS next_ts
  FROM events e
)
SELECT
  issue_key,
  assignee_name,
  ts AS from_ts,
  next_ts AS to_ts,
  assignee_account_id   -- appended
FROM ordered
WHERE assignee_name IS NOT NULL;


CREATE OR REPLACE VIEW {schema_name}.v_issue_blockers AS
SELECT
  il.source_issue_key  AS issue_key,
  'outgoing'::text     AS direction,
  il.link_type,
  il.linked_issue_key  AS other_key,
  i2.status            AS other_status,
  i2.status_category   AS other_status_category,
  i2.assignee_display_name AS other_assignee,
  i2.assignee_account_id   AS other_assignee_account_id  -- appended
FROM {schema_name}.issue_links il
LEFT JOIN {schema_name}.issues i2 ON i2.issue_key = il.linked_issue_key
WHERE il.link_type ILIKE '%block%'

UNION ALL

SELECT
  il.linked_issue_key  AS issue_key,
  'incoming'::text     AS direction,
  il.link_type,
  il.source_issue_key  AS other_key,
  i2.status            AS other_status,
  i2.status_category   AS other_status_category,
  i2.assignee_display_name AS other_assignee,
  i2.assignee_account_id   AS other_assignee_account_id  -- appended
FROM {schema_name}.issue_links il
LEFT JOIN {schema_name}.issues i2 ON i2.issue_key = il.source_issue_key
WHERE il.link_type ILIKE '%block%';

CREATE OR REPLACE VIEW {schema_name}.v_issue_contributors AS
WITH u AS (
  -- reporter
  SELECT i.issue_key,
         i.reporter_display_name AS name,
         i.reporter_account_id   AS account_id,
         'reporter'::text        AS role,
         i.created_date          AS ts
  FROM {schema_name}.issues i

  UNION ALL

  -- current assignee row (for last-activity weighting)
  SELECT i.issue_key,
         i.assignee_display_name,
         i.assignee_account_id,
         'assignee'::text,
         i.updated_date
  FROM {schema_name}.issues i
  WHERE i.assignee_display_name IS NOT NULL

  UNION ALL

  -- commenter (now with author account_id)
  SELECT c.issue_key,
         c.author_display_name,
         c.account_id,                  -- NEW
         'commenter'::text,
         c.created_date
  FROM {schema_name}.comments c

  UNION ALL

  -- status change author (now with account_id)
  SELECT cl.issue_key,
         cl.author_display_name,
         cl.account_id,                 -- NEW
         'status_changer'::text,
         cl.created_date
  FROM {schema_name}.changelogs cl
  WHERE cl.field_name = 'status'
)
SELECT
  issue_key,
  name,
  array_agg(DISTINCT role) AS roles,
  MAX(ts)                  AS last_activity,
  COUNT(*) FILTER (WHERE role = 'commenter')       AS comments_count,
  COUNT(*) FILTER (WHERE role = 'status_changer')  AS status_changes_count,
  MAX(account_id)                                   AS account_id   -- appended (same person/name -> one id)
FROM u
GROUP BY issue_key, name;

CREATE OR REPLACE VIEW {schema_name}.v_issue_status_transitions AS
WITH t AS (
  SELECT s.issue_key,
         s.status AS from_status,
         lead(s.status) OVER (PARTITION BY s.issue_key ORDER BY s.from_ts) AS to_status,
         s.from_ts,
         lead(s.from_ts) OVER (PARTITION BY s.issue_key ORDER BY s.from_ts) AS next_from_ts,
         s.to_ts
  FROM {schema_name}.v_issue_status_spans s
),
trans AS (
  SELECT t.issue_key,
         t.from_status,
         t.to_status,
         t.from_ts,
         COALESCE(t.next_from_ts, t.to_ts) AS transition_ts,
         EXTRACT(EPOCH FROM COALESCE(t.next_from_ts, t.to_ts, now()) - t.from_ts)::bigint AS duration_secs
  FROM t
  WHERE t.to_status IS NOT NULL
)
SELECT
  tr.issue_key,
  tr.from_status,
  tr.to_status,
  tr.transition_ts,
  tr.duration_secs,
  a.assignee_name        AS person,
  m.sprint_id,
  a.assignee_account_id  AS person_account_id   -- appended
FROM trans tr
LEFT JOIN {schema_name}.v_issue_assignee_spans a
       ON a.issue_key = tr.issue_key
      AND a.from_ts  <= tr.transition_ts
      AND (a.to_ts IS NULL OR a.to_ts > tr.transition_ts)
LEFT JOIN {schema_name}.v_issue_sprint_membership_final m
       ON m.issue_key = tr.issue_key
      AND m.start_ts <= tr.transition_ts
      AND (m.end_ts IS NULL OR m.end_ts > tr.transition_ts);

CREATE OR REPLACE VIEW {schema_name}.v_person_status_pair_stats AS
SELECT
  x.sprint_id,
  x.person,
  x.from_status,
  x.to_status,
  COUNT(*)                                    AS transitions,
  AVG(x.duration_secs)                        AS avg_secs,
  percentile_disc(0.5) WITHIN GROUP (ORDER BY x.duration_secs)::numeric AS p50_secs,
  percentile_disc(0.9) WITHIN GROUP (ORDER BY x.duration_secs)::numeric AS p90_secs,
  x.person_account_id                         AS account_id   -- appended
FROM {schema_name}.v_issue_status_transitions x
WHERE x.person IS NOT NULL
GROUP BY x.sprint_id, x.person, x.from_status, x.to_status, x.person_account_id;

CREATE OR REPLACE VIEW {schema_name}.v_sprint_blockers_open AS
WITH issue_now AS (
  SELECT sis.sprint_id, sis.issue_key
  FROM {schema_name}.v_sprint_issue_set sis
  WHERE sis.in_scope_now
),
open_blockers AS (
  SELECT b.issue_key, b.direction, b.other_key,
         b.other_status, b.other_status_category,
         b.other_assignee, b.other_assignee_account_id
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
  ob.other_assignee,
  ob.other_assignee_account_id   -- appended
FROM issue_now inow
JOIN open_blockers ob ON ob.issue_key = inow.issue_key;

CREATE OR REPLACE VIEW {schema_name}.v_sprint_people_rollup AS
WITH issue_now AS (
  SELECT sis.sprint_id, sis.issue_key
  FROM {schema_name}.v_sprint_issue_set sis
  WHERE sis.in_scope_now
),
assignee_now AS (
  SELECT i.issue_key,
         i.assignee_display_name AS person,
         i.assignee_account_id   AS account_id,
         COALESCE(i.story_points, 0)::numeric AS sp
  FROM {schema_name}.issues i
),
done AS (
  SELECT d.issue_key, d.done_at
  FROM {schema_name}.v_issue_done_at d
),
contrib AS (
  -- use upgraded contributors view (now includes account_id)
  SELECT c.issue_key, c.name AS person, c.account_id,
         c.comments_count, c.status_changes_count, c.last_activity
  FROM {schema_name}.v_issue_contributors c
)
SELECT
  iss.sprint_id,
  a.person,
  COUNT(*) FILTER (WHERE a.person IS NOT NULL)                         AS issues_assigned_now,
  SUM(a.sp) FILTER   (WHERE a.person IS NOT NULL)                      AS points_assigned_now,
  COUNT(*) FILTER (WHERE d.done_at IS NOT NULL)                        AS issues_done_total,
  SUM(a.sp) FILTER   (WHERE d.done_at IS NOT NULL)                     AS points_done_total,
  COALESCE(SUM(c.comments_count), 0)::numeric                          AS comments_count_total,
  COALESCE(SUM(c.status_changes_count), 0)::numeric                    AS status_changes_count_total,
  MAX(c.last_activity)                                                 AS last_activity,
  a.account_id                                                         AS account_id  -- appended
FROM issue_now iss
LEFT JOIN assignee_now a ON a.issue_key = iss.issue_key
LEFT JOIN done d         ON d.issue_key = iss.issue_key
LEFT JOIN contrib c      ON c.issue_key = iss.issue_key
                        AND (
                             c.account_id = a.account_id
                             OR (c.account_id IS NULL AND a.account_id IS NULL AND lower(c.person)=lower(a.person))
                           )
GROUP BY iss.sprint_id, a.person, a.account_id
HAVING a.person IS NOT NULL;

CREATE OR REPLACE VIEW {schema_name}.v_issue_insights_grid AS
WITH
-- when each issue first reached Done
done AS (
  SELECT issue_key, done_at
  FROM {schema_name}.v_issue_done_at
),

-- last status change timestamp
ls AS (
  SELECT issue_key, MAX(created_date) AS last_status_change_ts
  FROM {schema_name}.changelogs
  WHERE field_name = 'status'
  GROUP BY issue_key
),

-- last comment + counts
lc AS (
  SELECT issue_key, MAX(created_date) AS last_comment_ts,
         COUNT(*) AS comments_count
  FROM {schema_name}.comments
  GROUP BY issue_key
),

-- # of status changes
status_cnt AS (
  SELECT issue_key, COUNT(*) AS status_changes_count
  FROM {schema_name}.changelogs
  WHERE field_name = 'status'
  GROUP BY issue_key
),

-- dependency degree across both directions
deps AS (
  SELECT issue_key, COUNT(*) AS dependencies_count
  FROM (
    SELECT il.source_issue_key AS issue_key FROM {schema_name}.issue_links il
    UNION ALL
    SELECT il.linked_issue_key           FROM {schema_name}.issue_links il
  ) u
  GROUP BY issue_key
),

-- open blockers count (other issue not done)
blockers AS (
  SELECT b.issue_key, COUNT(*) AS blockers_open_count
  FROM {schema_name}.v_issue_blockers b
  LEFT JOIN {schema_name}.v_issue_done_at d ON d.issue_key = b.other_key
  WHERE d.done_at IS NULL
  GROUP BY b.issue_key
),

-- sprint membership rollup
mem_all AS (
  SELECT
    m.issue_key,
    COUNT(DISTINCT m.sprint_id) AS sprint_drag_count,
    COALESCE((
      SELECT jsonb_agg(x.name ORDER BY x.start_date)
      FROM (
        SELECT DISTINCT s.name, s.start_date
        FROM {schema_name}.v_issue_sprint_membership_final m2
        JOIN {schema_name}.sprints s ON s.sprint_id = m2.sprint_id
        WHERE m2.issue_key = m.issue_key
      ) x
    ), '[]'::jsonb) AS sprints_names
  FROM {schema_name}.v_issue_sprint_membership_final m
  GROUP BY m.issue_key
),

-- currently active sprint (if any)
mem_now AS (
  SELECT m.issue_key, s.name AS sprint_current_name
  FROM {schema_name}.v_issue_sprint_membership_final m
  JOIN {schema_name}.sprints s ON s.sprint_id = m.sprint_id
  WHERE now() BETWEEN COALESCE(m.start_ts, s.start_date)
                  AND COALESCE(m.end_ts, COALESCE(s.complete_date, s.end_date))
),

-- first time issue left backlog-ish states
started AS (
  SELECT x.issue_key, MIN(x.transition_ts) AS started_at
  FROM {schema_name}.v_issue_status_transitions x
  WHERE x.to_status IS NOT NULL
    AND NOT (
      x.to_status ILIKE 'to do%' OR
      x.to_status ILIKE 'open%'  OR
      x.to_status ILIKE 'backlog%' OR
      x.to_status ILIKE 'selected for%' OR
      x.to_status ILIKE 'ready%'
    )
  GROUP BY x.issue_key
),

-- hygiene flags (includes assignee_changes & scope_churn)
hf AS (
  SELECT * FROM {schema_name}.v_issue_hygiene_flags
),

-- fix versions seen in changelog
fixv AS (
  SELECT c.issue_key,
         COALESCE(
           jsonb_agg(DISTINCT c.to_display_value)
           FILTER (WHERE c.to_display_value IS NOT NULL),
           '[]'::jsonb
         ) AS fix_versions
  FROM {schema_name}.changelogs c
  WHERE c.field_name IN ('Fix Version','Fix Versions')
  GROUP BY c.issue_key
),

-- distinct assignee accounts across time
assignees_dist AS (
  SELECT issue_key,
         COUNT(DISTINCT COALESCE(assignee_account_id, md5(lower(COALESCE(assignee_name,''))))) AS assignees_distinct
  FROM {schema_name}.v_issue_assignee_spans
  GROUP BY issue_key
),

-- participants from contributors (dedupe by account_id if present, else by lower(name))
contributors_rollup AS (
  SELECT
    c.issue_key,
    COUNT(DISTINCT COALESCE(c.account_id, md5(lower(COALESCE(c.name,''))))) AS participants_count,
    jsonb_agg(
      jsonb_build_object(
        'name',          c.name,
        'account_id',    c.account_id,
        'roles',         c.roles,
        'comments',      c.comments_count,
        'status_changes',c.status_changes_count,
        'last_activity', c.last_activity
      )
      ORDER BY c.last_activity DESC NULLS LAST
    ) AS participants_details
  FROM {schema_name}.v_issue_contributors c
  GROUP BY c.issue_key
)

SELECT
  -- identity / hierarchy
  i.issue_key                                AS issue,
  i.summary,
  i.issue_type                               AS type,
  i.parent_issue_key                         AS epic_parent,

  -- status / ownership (with IDs)
  i.status,
  i.status_category,
  i.assignee_display_name                    AS assignee,
  i.assignee_account_id                      AS assignee_account_id,
  i.story_points,

  -- timing
  CASE WHEN ls.last_status_change_ts IS NULL THEN NULL
       ELSE FLOOR(EXTRACT(EPOCH FROM (now() - ls.last_status_change_ts))/86400)::int END
                                            AS current_status_age_days,
  CASE WHEN d.done_at IS NULL THEN NULL
       ELSE FLOOR(EXTRACT(EPOCH FROM (d.done_at - i.created_date))/86400)::int END
                                            AS cycle_time_days,
  mn.sprint_current_name                    AS sprint_current,

  -- risk / blockers / hygiene
  COALESCE(b.blockers_open_count,0) > 0     AS blocked,
  COALESCE(b.blockers_open_count,0)         AS blockers_count,
  ARRAY_REMOVE(ARRAY[
      CASE WHEN hf.stale THEN 'stale' ELSE NULL END,
      CASE WHEN NOT hf.has_story_points AND i.issue_type ILIKE 'story%' THEN 'no_sp' ELSE NULL END,
      CASE WHEN NOT hf.has_assignee THEN 'unassigned' ELSE NULL END,
      CASE WHEN hf.is_scope_churn_recent THEN 'scope_churn' ELSE NULL END
  ], NULL)                                   AS hygiene_badges,

  -- power columns
  i.priority,
  FLOOR(EXTRACT(EPOCH FROM (now() - i.created_date))/86400)::int
                                            AS issue_age_days,
  s.started_at,
  COALESCE(i.resolution_date, d.done_at)    AS resolved_at,
  COALESCE(ma.sprint_drag_count, 0)         AS sprint_drag,
  COALESCE(lc.comments_count,0)             AS comments_count,
  COALESCE(sc.status_changes_count,0)       AS status_changes_count,
  COALESCE(deps.dependencies_count,0)       AS dependencies_count,
  GREATEST(
    COALESCE(i.updated_date, 'epoch'),
    COALESCE(lc.last_comment_ts, 'epoch'),
    COALESCE(ls.last_status_change_ts, 'epoch')
  )                                         AS last_activity_at,
  COALESCE(fixv.fix_versions, '[]'::jsonb)  AS fix_versions,
  i.components                              AS components,
  COALESCE(ma.sprints_names,'[]'::jsonb)    AS sprints,

  -- helpers
  i.created_date                             AS created_ts,
  i.updated_date                             AS updated_ts,

  -- hygiene flags (raw)
  hf.stale, hf.has_assignee, hf.has_story_points, hf.is_scope_churn_recent,

  -- participation & ownership churn (now driven by IDs)
  COALESCE(cr.participants_count, 0)         AS participants_count,
  COALESCE(ad.assignees_distinct, 0)         AS assignees_distinct,
  COALESCE(hf.assignee_changes, 0)           AS assignee_handoffs,
  COALESCE(cr.participants_details, '[]'::jsonb) AS participants
FROM {schema_name}.issues i
LEFT JOIN done                d   ON d.issue_key  = i.issue_key
LEFT JOIN ls                  ls  ON ls.issue_key = i.issue_key
LEFT JOIN lc                  lc  ON lc.issue_key = i.issue_key
LEFT JOIN status_cnt          sc  ON sc.issue_key = i.issue_key
LEFT JOIN deps                deps ON deps.issue_key = i.issue_key
LEFT JOIN blockers            b   ON b.issue_key  = i.issue_key
LEFT JOIN mem_all             ma  ON ma.issue_key = i.issue_key
LEFT JOIN mem_now             mn  ON mn.issue_key = i.issue_key
LEFT JOIN started             s   ON s.issue_key  = i.issue_key
LEFT JOIN hf                  hf  ON hf.issue_key = i.issue_key
LEFT JOIN fixv                fixv ON fixv.issue_key = i.issue_key
LEFT JOIN assignees_dist      ad  ON ad.issue_key = i.issue_key
LEFT JOIN contributors_rollup cr  ON cr.issue_key = i.issue_key;
