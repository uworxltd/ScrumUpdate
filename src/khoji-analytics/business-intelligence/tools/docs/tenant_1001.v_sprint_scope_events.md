# tenant_1001.v_sprint_scope_events

_view_ — Parsed Sprint field changes from changelogs -> normalized membership events.
One row per (issue_key, sprint_id, created_date, event_type), where event_type in {added, removed}.
Use to reconstruct historical scope and churn.

## Columns
- `issue_key` **character varying(50)**
- `sprint_id` **integer**
- `created_date` **timestamp without time zone**
- `event_type` **text**
  "added" if sprint_id appears in to_value but not from_value; "removed" if it leaves from_value. Handles multi-sprint edits.

## Definition
```sql
 WITH raw AS (
         SELECT changelogs.issue_key,
            changelogs.created_date,
            ARRAY( SELECT TRIM(BOTH FROM x.x)::integer AS btrim
                   FROM regexp_split_to_table(COALESCE(changelogs.from_value, ''::text), '\s*,\s*'::text) x(x)
                  WHERE x.x ~ '^[0-9]+$'::text) AS from_arr,
            ARRAY( SELECT TRIM(BOTH FROM x.x)::integer AS btrim
                   FROM regexp_split_to_table(COALESCE(changelogs.to_value, ''::text), '\s*,\s*'::text) x(x)
                  WHERE x.x ~ '^[0-9]+$'::text) AS to_arr
           FROM tenant_1001.changelogs
          WHERE changelogs.field_name::text = 'Sprint'::text
        ), added AS (
         SELECT r.issue_key,
            r.created_date,
            unnest(r.to_arr) AS sprint_id
           FROM raw r
        ), removed AS (
         SELECT r.issue_key,
            r.created_date,
            unnest(r.from_arr) AS sprint_id
           FROM raw r
        )
 SELECT a.issue_key,
    a.sprint_id,
    a.created_date,
    'added'::text AS event_type
   FROM added a
     LEFT JOIN raw r ON r.issue_key::text = a.issue_key::text AND r.created_date = a.created_date
  WHERE r.from_arr IS NULL OR NOT (a.sprint_id = ANY (r.from_arr))
UNION ALL
 SELECT r2.issue_key,
    r2.sprint_id,
    r2.created_date,
    'removed'::text AS event_type
   FROM removed r2
     LEFT JOIN raw rr ON rr.issue_key::text = r2.issue_key::text AND rr.created_date = r2.created_date
  WHERE rr.to_arr IS NULL OR NOT (r2.sprint_id = ANY (rr.to_arr));
```