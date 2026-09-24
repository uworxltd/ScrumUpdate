# tenant_1001.v_issue_done_at

_view_ — Earliest known "Done" moment for issues whose status_category = Done.
Prefers first changelog that equals terminal status; falls back to status_category_change_date or resolution_date.

## Columns
- `issue_key` **character varying(50)**
- `done_at` **timestamp without time zone**

## Definition
```sql
 SELECT issue_key,
        CASE
            WHEN status_category::text = 'Done'::text THEN COALESCE(( SELECT min(cl.created_date) AS min
               FROM tenant_1001.changelogs cl
              WHERE cl.issue_key::text = i.issue_key::text AND cl.field_name::text = 'status'::text AND cl.to_display_value = i.status::text), status_category_change_date, resolution_date)
            ELSE NULL::timestamp without time zone
        END AS done_at
   FROM tenant_1001.issues i;
```