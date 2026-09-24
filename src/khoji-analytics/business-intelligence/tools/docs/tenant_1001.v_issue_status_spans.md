# tenant_1001.v_issue_status_spans

_view_ — Status residence windows per issue (inclusive start, exclusive end) with duration_secs.
Starts at issue.created (or first status change) and emits one row per status change.

## Columns
- `issue_key` **character varying(50)**
- `status` **text**
- `from_ts` **timestamp without time zone**
- `to_ts` **timestamp without time zone**
- `duration_secs` **bigint**
  Seconds spent in the status window. If current, measured up to now().

## Definition
```sql
 WITH init AS (
         SELECT i.issue_key,
            i.created_date AS ts,
            COALESCE(( SELECT cl.from_display_value
                   FROM tenant_1001.changelogs cl
                  WHERE cl.issue_key::text = i.issue_key::text AND cl.field_name::text = 'status'::text
                  ORDER BY cl.created_date
                 LIMIT 1), i.status::text) AS status
           FROM tenant_1001.issues i
        ), events AS (
         SELECT init.issue_key,
            init.ts,
            init.status
           FROM init
        UNION ALL
         SELECT cl.issue_key,
            cl.created_date,
            cl.to_display_value
           FROM tenant_1001.changelogs cl
          WHERE cl.field_name::text = 'status'::text
        ), ordered AS (
         SELECT events.issue_key,
            events.status,
            events.ts,
            lead(events.ts) OVER (PARTITION BY events.issue_key ORDER BY events.ts) AS next_ts
           FROM events
        )
 SELECT issue_key,
    status,
    ts AS from_ts,
    next_ts AS to_ts,
    EXTRACT(epoch FROM COALESCE(next_ts::timestamp with time zone, now()) - ts::timestamp with time zone)::bigint AS duration_secs
   FROM ordered
  WHERE status IS NOT NULL;
```