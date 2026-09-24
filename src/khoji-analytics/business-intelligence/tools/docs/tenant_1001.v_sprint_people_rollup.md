# tenant_1001.v_sprint_people_rollup

_view_ — Per-sprint, per-person activity snapshot (NOW):
- issues_assigned_now / points_assigned_now
- issues/points_done_total (historical)
- comments_count_total, status_changes_count_total, last_activity
Use for team pulse, WIP limits, load balancing.

## Columns
- `sprint_id` **integer**
- `person` **character varying(255)**
- `issues_assigned_now` **bigint**
- `points_assigned_now` **numeric**
- `issues_done_total` **bigint**
- `points_done_total` **numeric**
- `comments_count_total` **numeric**
- `status_changes_count_total` **numeric**
- `last_activity` **timestamp without time zone**

## Definition
```sql
 WITH issue_now AS (
         SELECT sis.sprint_id,
            sis.issue_key
           FROM tenant_1001.v_sprint_issue_set sis
          WHERE sis.in_scope_now
        ), assignee_now AS (
         SELECT i.issue_key,
            i.assignee_display_name AS person,
            COALESCE(i.story_points, 0::numeric) AS sp
           FROM tenant_1001.issues i
        ), done AS (
         SELECT d_1.issue_key,
            d_1.done_at
           FROM tenant_1001.v_issue_done_at d_1
        ), contrib AS (
         SELECT c_1.issue_key,
            c_1.name AS person,
            c_1.comments_count,
            c_1.status_changes_count,
            c_1.last_activity
           FROM tenant_1001.v_issue_contributors c_1
        )
 SELECT iss.sprint_id,
    a.person,
    count(*) FILTER (WHERE a.person IS NOT NULL) AS issues_assigned_now,
    sum(a.sp) FILTER (WHERE a.person IS NOT NULL) AS points_assigned_now,
    count(*) FILTER (WHERE d.done_at IS NOT NULL) AS issues_done_total,
    sum(a.sp) FILTER (WHERE d.done_at IS NOT NULL) AS points_done_total,
    COALESCE(sum(c.comments_count), 0::numeric) AS comments_count_total,
    COALESCE(sum(c.status_changes_count), 0::numeric) AS status_changes_count_total,
    max(c.last_activity) AS last_activity
   FROM issue_now iss
     LEFT JOIN assignee_now a ON a.issue_key::text = iss.issue_key::text
     LEFT JOIN done d ON d.issue_key::text = iss.issue_key::text
     LEFT JOIN contrib c ON c.issue_key::text = iss.issue_key::text AND c.person::text = a.person::text
  GROUP BY iss.sprint_id, a.person
 HAVING a.person IS NOT NULL;
```