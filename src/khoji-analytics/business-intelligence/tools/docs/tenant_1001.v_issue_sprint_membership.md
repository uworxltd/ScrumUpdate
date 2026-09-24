# tenant_1001.v_issue_sprint_membership

_view_ — First-added → next-removed window per (issue,sprint). Does NOT backfill board assignments.
Use the *_final* view for union with sprint_issues table membership.

## Columns
- `issue_key` **character varying(50)**
- `sprint_id` **integer**
- `start_ts` **timestamp without time zone**
- `end_ts` **timestamp without time zone**

## Definition
```sql
 WITH a AS (
         SELECT v_sprint_scope_events.issue_key,
            v_sprint_scope_events.sprint_id,
            min(v_sprint_scope_events.created_date) AS start_ts
           FROM tenant_1001.v_sprint_scope_events
          WHERE v_sprint_scope_events.event_type = 'added'::text
          GROUP BY v_sprint_scope_events.issue_key, v_sprint_scope_events.sprint_id
        ), r AS (
         SELECT e.issue_key,
            e.sprint_id,
            min(e.created_date) AS end_ts
           FROM tenant_1001.v_sprint_scope_events e
             JOIN a a_1 ON a_1.issue_key::text = e.issue_key::text AND a_1.sprint_id = e.sprint_id
          WHERE e.event_type = 'removed'::text AND e.created_date > a_1.start_ts
          GROUP BY e.issue_key, e.sprint_id
        )
 SELECT a.issue_key,
    a.sprint_id,
    a.start_ts,
    r.end_ts
   FROM a
     LEFT JOIN r ON r.issue_key::text = a.issue_key::text AND r.sprint_id = a.sprint_id;
```