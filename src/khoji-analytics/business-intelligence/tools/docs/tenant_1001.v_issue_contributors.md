# tenant_1001.v_issue_contributors

_view_ — People who touched an issue: reporter, assignee, commenters, status updaters, and worklog authors.
Includes last_activity and counts per role. Great for credit and accountability.

## Columns
- `issue_key` **character varying(50)**
- `name` **character varying(255)**
- `roles` **text[]**
- `last_activity` **timestamp without time zone**
- `comments_count` **bigint**
- `status_changes_count` **bigint**

## Definition
```sql
 WITH u AS (
         SELECT issues.issue_key,
            issues.reporter_display_name AS name,
            'reporter'::text AS role,
            issues.created_date AS ts
           FROM tenant_1001.issues
        UNION ALL
         SELECT issues.issue_key,
            issues.assignee_display_name,
            'assignee'::text,
            issues.updated_date
           FROM tenant_1001.issues
          WHERE issues.assignee_display_name IS NOT NULL
        UNION ALL
         SELECT comments.issue_key,
            comments.author_display_name,
            'commenter'::text,
            comments.created_date
           FROM tenant_1001.comments
        UNION ALL
         SELECT changelogs.issue_key,
            changelogs.author_display_name,
            'status_changer'::text,
            changelogs.created_date
           FROM tenant_1001.changelogs
          WHERE changelogs.field_name::text = 'status'::text
        )
 SELECT issue_key,
    name,
    array_agg(DISTINCT role) AS roles,
    max(ts) AS last_activity,
    count(*) FILTER (WHERE role = 'commenter'::text) AS comments_count,
    count(*) FILTER (WHERE role = 'status_changer'::text) AS status_changes_count
   FROM u
  GROUP BY issue_key, name;
```