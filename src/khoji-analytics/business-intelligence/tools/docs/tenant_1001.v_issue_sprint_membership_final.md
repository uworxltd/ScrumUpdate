# tenant_1001.v_issue_sprint_membership_final

_view_ — Canonical membership windows per (issue,sprint).
UNION of changelog-derived membership and static sprint_issues membership.
Use this everywhere for scope, burndown, carryover, etc.

## Columns
- `issue_key` **character varying(50)**
- `sprint_id` **integer**
- `start_ts` **timestamp without time zone**
- `end_ts` **timestamp without time zone**

## Definition
```sql
 SELECT m.issue_key,
    m.sprint_id,
    m.start_ts,
    m.end_ts
   FROM tenant_1001.v_issue_sprint_membership m
UNION ALL
 SELECT si.issue_key,
    si.sprint_id,
    s.start_date AS start_ts,
    COALESCE(s.complete_date, s.end_date) AS end_ts
   FROM tenant_1001.sprint_issues si
     JOIN tenant_1001.sprints s ON s.sprint_id = si.sprint_id
     LEFT JOIN tenant_1001.v_issue_sprint_membership m ON m.issue_key::text = si.issue_key::text AND m.sprint_id = si.sprint_id
  WHERE m.issue_key IS NULL;
```