# tenant_1001.v_issue_hygiene_flags

_view_ — Issue hygiene facts: presence of key fields, recency, change counts, stale flag.
Notes:
- has_story_points enforced only for issue_type LIKE 'story%'
- stale = no status change AND no comment for ≥ stale_threshold_days (default 7) AND not Done
- in_scope_now computed from active sprint + membership.

## Columns
- `issue_key` **character varying(50)**
- `issue_id` **character varying(50)**
- `issue_type` **character varying(100)**
- `status` **character varying(100)**
- `status_category` **character varying(100)**
- `assignee_display_name` **character varying(255)**
- `priority` **character varying(50)**
- `summary` **character varying(500)**
- `description` **text**
- `story_points` **numeric(5,2)**
- `has_assignee` **boolean**
- `has_story_points` **boolean**
- `has_summary` **boolean**
- `has_description` **boolean**
- `last_status_change_ts` **timestamp without time zone**
- `last_status_change_days` **integer**
  Days since the last status change (NULL if none).
- `last_comment_ts` **timestamp without time zone**
- `last_comment_days` **integer**
  Days since the last comment (NULL if none).
- `current_status_days` **integer**
- `assignee_changes` **integer**
- `sprint_changes` **integer**
- `in_any_sprint` **boolean**
- `in_scope_now` **boolean**
  Example query:
    -- Top 10 stale issues currently in sprint
    SELECT h.issue_key, i.summary, h.current_status_days
    FROM tenant_1001.v_issue_hygiene_flags h
    JOIN tenant_1001.issues i USING(issue_key)
    WHERE h.in_scope_now AND h.stale
    ORDER BY h.current_status_days DESC
    LIMIT 10;
- `stale_threshold_days` **integer**
- `stale` **boolean**
  TRUE if both status and comments have been idle ≥ stale_threshold_days and issue is not in Done.

## Definition
```sql
 WITH last_status AS (
         SELECT changelogs.issue_key,
            max(changelogs.created_date) AS last_status_change_ts
           FROM tenant_1001.changelogs
          WHERE changelogs.field_name::text = 'status'::text
          GROUP BY changelogs.issue_key
        ), last_comment AS (
         SELECT comments.issue_key,
            max(comments.created_date) AS last_comment_ts
           FROM tenant_1001.comments
          GROUP BY comments.issue_key
        ), assignee_changes AS (
         SELECT changelogs.issue_key,
            count(*)::integer AS assignee_changes
           FROM tenant_1001.changelogs
          WHERE changelogs.field_name::text = 'assignee'::text
          GROUP BY changelogs.issue_key
        ), sprint_changes AS (
         SELECT changelogs.issue_key,
            count(*)::integer AS sprint_changes
           FROM tenant_1001.changelogs
          WHERE changelogs.field_name::text = 'Sprint'::text
          GROUP BY changelogs.issue_key
        ), mem_any AS (
         SELECT v_issue_sprint_membership_final.issue_key,
            bool_or(true) AS in_any_sprint
           FROM tenant_1001.v_issue_sprint_membership_final
          GROUP BY v_issue_sprint_membership_final.issue_key
        ), in_scope AS (
         SELECT DISTINCT m.issue_key,
            true AS in_scope_now
           FROM tenant_1001.v_issue_sprint_membership_final m
             JOIN tenant_1001.sprints s ON s.sprint_id = m.sprint_id
          WHERE now() >= COALESCE(m.start_ts, s.start_date) AND now() <= COALESCE(m.end_ts, COALESCE(s.complete_date, s.end_date))
        )
 SELECT i.issue_key,
    i.issue_id,
    i.issue_type,
    i.status,
    i.status_category,
    i.assignee_display_name,
    i.priority,
    i.summary,
    i.description,
    i.story_points,
    i.assignee_display_name IS NOT NULL AS has_assignee,
        CASE
            WHEN COALESCE(i.issue_type, ''::character varying)::text ~~* 'story%'::text THEN i.story_points IS NOT NULL
            ELSE true
        END AS has_story_points,
    NULLIF(TRIM(BOTH FROM COALESCE(i.summary, ''::character varying)), ''::text) IS NOT NULL AS has_summary,
    NULLIF(TRIM(BOTH FROM COALESCE(i.description, ''::text)), ''::text) IS NOT NULL AS has_description,
    ls.last_status_change_ts,
        CASE
            WHEN ls.last_status_change_ts IS NULL THEN NULL::integer
            ELSE floor(EXTRACT(epoch FROM now() - ls.last_status_change_ts::timestamp with time zone) / 86400::numeric)::integer
        END AS last_status_change_days,
    lc.last_comment_ts,
        CASE
            WHEN lc.last_comment_ts IS NULL THEN NULL::integer
            ELSE floor(EXTRACT(epoch FROM now() - lc.last_comment_ts::timestamp with time zone) / 86400::numeric)::integer
        END AS last_comment_days,
        CASE
            WHEN ls.last_status_change_ts IS NULL THEN NULL::integer
            ELSE floor(EXTRACT(epoch FROM now() - ls.last_status_change_ts::timestamp with time zone) / 86400::numeric)::integer
        END AS current_status_days,
    COALESCE(ac.assignee_changes, 0) AS assignee_changes,
    COALESCE(sc.sprint_changes, 0) AS sprint_changes,
    COALESCE(ma.in_any_sprint, false) AS in_any_sprint,
    COALESCE(ins.in_scope_now, false) AS in_scope_now,
    7 AS stale_threshold_days,
    COALESCE(floor(EXTRACT(epoch FROM now() - COALESCE(ls.last_status_change_ts, '1970-01-01 00:00:00'::timestamp without time zone)::timestamp with time zone) / 86400::numeric)::integer, 9999) >= 7 AND COALESCE(floor(EXTRACT(epoch FROM now() - COALESCE(lc.last_comment_ts, '1970-01-01 00:00:00'::timestamp without time zone)::timestamp with time zone) / 86400::numeric)::integer, 9999) >= 7 AND i.status_category::text <> 'Done'::text AS stale
   FROM tenant_1001.issues i
     LEFT JOIN last_status ls USING (issue_key)
     LEFT JOIN last_comment lc USING (issue_key)
     LEFT JOIN assignee_changes ac USING (issue_key)
     LEFT JOIN sprint_changes sc USING (issue_key)
     LEFT JOIN mem_any ma USING (issue_key)
     LEFT JOIN in_scope ins USING (issue_key);
```