# tenant_1001.v_sprint_issue_set

_view_ — What's in a sprint: (sprint_id, issue_key, first_seen, last_seen, in_scope_now).
in_scope_now = intersection of sprint window and membership window at the current time.

## Columns
- `sprint_id` **integer**
- `sprint_name` **character varying(255)**
  Example query:
    -- WIP list for a sprint
    SELECT i.issue_key, i.summary, i.assignee_display_name
    FROM tenant_1001.v_sprint_issue_set s
    JOIN tenant_1001.issues i USING(issue_key)
    WHERE s.sprint_id = 123 AND s.in_scope_now AND i.status_category = 'In Progress';
- `issue_key` **character varying(50)**
- `first_seen` **timestamp without time zone**
- `last_seen` **timestamp without time zone**
- `in_scope_now` **boolean**
  TRUE if now() lies within both the sprint bounds and the issue’s membership window.

## Definition
```sql
 WITH base AS (
         SELECT m.sprint_id,
            m.issue_key,
            m.start_ts AS first_seen,
            m.end_ts AS last_seen
           FROM tenant_1001.v_issue_sprint_membership_final m
        ), bounds AS (
         SELECT s.sprint_id,
            s.name,
            s.start_date AS start_at,
            COALESCE(s.complete_date, s.end_date) AS end_at
           FROM tenant_1001.sprints s
        )
 SELECT b.sprint_id,
    bo.name AS sprint_name,
    b.issue_key,
    b.first_seen,
    b.last_seen,
    now() >= GREATEST(b.first_seen, bo.start_at) AND now() <= COALESCE(b.last_seen, bo.end_at) AS in_scope_now
   FROM base b
     JOIN bounds bo USING (sprint_id);
```