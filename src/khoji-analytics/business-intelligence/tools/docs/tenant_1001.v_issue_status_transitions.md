# tenant_1001.v_issue_status_transitions

_view_ — Atomic status transitions per issue with:
- transition_ts (from next_from_ts/to_ts)
- duration_secs spent in from_status
- assignee at transition time (owner), and sprint_id active at that moment.
Use to learn real flow and handoffs.

## Columns
- `issue_key` **character varying(50)**
- `from_status` **text**
- `to_status` **text**
- `transition_ts` **timestamp without time zone**
  Example query: 
    -- median time in In Progress before leaving, this sprint
    SELECT p.person, p.p50_secs
    FROM tenant_1001.v_person_status_pair_stats p
    WHERE p.sprint_id = 123 AND p.from_status = 'In Progress';
- `duration_secs` **bigint**
- `person` **text**
- `sprint_id` **integer**

## Definition
```sql
 WITH t AS (
         SELECT s.issue_key,
            s.status AS from_status,
            lead(s.status) OVER (PARTITION BY s.issue_key ORDER BY s.from_ts) AS to_status,
            s.from_ts,
            lead(s.from_ts) OVER (PARTITION BY s.issue_key ORDER BY s.from_ts) AS next_from_ts,
            s.to_ts
           FROM tenant_1001.v_issue_status_spans s
        ), trans AS (
         SELECT t.issue_key,
            t.from_status,
            t.to_status,
            t.from_ts,
            COALESCE(t.next_from_ts, t.to_ts) AS transition_ts,
            EXTRACT(epoch FROM COALESCE(t.next_from_ts::timestamp with time zone, t.to_ts::timestamp with time zone, now()) - t.from_ts::timestamp with time zone)::bigint AS duration_secs
           FROM t
          WHERE t.to_status IS NOT NULL
        )
 SELECT tr.issue_key,
    tr.from_status,
    tr.to_status,
    tr.transition_ts,
    tr.duration_secs,
    a.assignee_name AS person,
    m.sprint_id
   FROM trans tr
     LEFT JOIN tenant_1001.v_issue_assignee_spans a ON a.issue_key::text = tr.issue_key::text AND a.from_ts <= tr.transition_ts AND (a.to_ts IS NULL OR a.to_ts > tr.transition_ts)
     LEFT JOIN tenant_1001.v_issue_sprint_membership_final m ON m.issue_key::text = tr.issue_key::text AND m.start_ts <= tr.transition_ts AND (m.end_ts IS NULL OR m.end_ts > tr.transition_ts);
```