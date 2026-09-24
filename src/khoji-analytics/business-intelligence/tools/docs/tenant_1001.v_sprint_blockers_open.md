# tenant_1001.v_sprint_blockers_open

_view_ — Open blockers affecting any in-scope issue for a sprint (incoming/outgoing + other issue’s status/assignee).
Ideal for daily standup triage.

## Columns
- `sprint_id` **integer**
- `issue_key` **character varying(50)**
- `direction` **text**
- `other_key` **character varying(50)**
- `other_status` **character varying(100)**
- `other_status_category` **character varying(100)**
- `other_assignee` **character varying(255)**

## Definition
```sql
 WITH issue_now AS (
         SELECT sis.sprint_id,
            sis.issue_key
           FROM tenant_1001.v_sprint_issue_set sis
          WHERE sis.in_scope_now
        ), open_blockers AS (
         SELECT b.issue_key,
            b.direction,
            b.other_key,
            b.other_status,
            b.other_status_category,
            b.other_assignee
           FROM tenant_1001.v_issue_blockers b
             LEFT JOIN tenant_1001.v_issue_done_at d ON d.issue_key::text = b.other_key::text
          WHERE d.done_at IS NULL
        )
 SELECT DISTINCT inow.sprint_id,
    ob.issue_key,
    ob.direction,
    ob.other_key,
    ob.other_status,
    ob.other_status_category,
    ob.other_assignee
   FROM issue_now inow
     JOIN open_blockers ob ON ob.issue_key::text = inow.issue_key::text;
```