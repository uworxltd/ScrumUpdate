# tenant_1001.v_issue_assignee_spans

_view_ — Assignee ownership windows per issue (inclusive start, exclusive end).
Starts at issue.created (or first assignee change), then one row per assignee change.

## Columns
- `issue_key` **character varying(50)**
- `assignee_name` **text**
- `from_ts` **timestamp without time zone**
  Timestamp when the assignee became owner (inclusive).
- `to_ts` **timestamp without time zone**
  Timestamp when ownership ended (exclusive). NULL = still owner.

## Definition
```sql
 WITH first_assignee AS (
         SELECT i.issue_key,
            COALESCE(( SELECT cl.from_display_value
                   FROM tenant_1001.changelogs cl
                  WHERE cl.issue_key::text = i.issue_key::text AND cl.field_name::text = 'assignee'::text
                  ORDER BY cl.created_date
                 LIMIT 1), i.assignee_display_name::text) AS assignee_name
           FROM tenant_1001.issues i
        ), events AS (
         SELECT i.issue_key,
            i.created_date AS ts,
            fa.assignee_name
           FROM tenant_1001.issues i
             LEFT JOIN first_assignee fa ON fa.issue_key::text = i.issue_key::text
        UNION ALL
         SELECT cl.issue_key,
            cl.created_date,
            cl.to_display_value
           FROM tenant_1001.changelogs cl
          WHERE cl.field_name::text = 'assignee'::text
        ), ordered AS (
         SELECT events.issue_key,
            events.assignee_name,
            events.ts,
            lead(events.ts) OVER (PARTITION BY events.issue_key ORDER BY events.ts) AS next_ts
           FROM events
        )
 SELECT issue_key,
    assignee_name,
    ts AS from_ts,
    next_ts AS to_ts
   FROM ordered
  WHERE assignee_name IS NOT NULL;
```