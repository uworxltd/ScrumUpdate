# tenant_1001.v_person_work_profile

_view_ — Global person profile:
- issues_touched_total
- issues/points_done_as_owner + cycle time (avg/p50/p90)
- current load (issues_active_now/points_active_now)
- contributions (comments/status changes)
- issue_type_mix
Use for strengths, coaching, and staffing.

## Columns
- `person` **text**
- `issues_touched_total` **bigint**
- `issues_done_as_owner` **bigint**
- `points_done_as_owner` **numeric**
- `issues_active_now` **bigint**
- `points_active_now` **numeric**
- `avg_cycle_time_done_secs` **numeric**
- `p50_cycle_secs` **numeric**
- `p90_cycle_secs` **numeric**
- `comments_count_total` **numeric**
- `status_changes_count_total` **numeric**
- `last_activity` **timestamp without time zone**
- `issue_type_mix` **jsonb**

## Definition
```sql
 WITH touched AS (
         SELECT v_issue_assignee_spans.assignee_name AS person,
            count(DISTINCT v_issue_assignee_spans.issue_key) AS issues_touched_total
           FROM tenant_1001.v_issue_assignee_spans
          GROUP BY v_issue_assignee_spans.assignee_name
        ), owner_at_done AS (
         SELECT a.assignee_name AS person,
            a.issue_key
           FROM tenant_1001.v_issue_assignee_spans a
             JOIN tenant_1001.v_issue_done_at d_1 ON d_1.issue_key::text = a.issue_key::text AND a.from_ts <= d_1.done_at AND (a.to_ts IS NULL OR a.to_ts > d_1.done_at)
        ), done_points AS (
         SELECT o.person,
            count(*) AS issues_done_as_owner,
            sum(COALESCE(i.story_points, 0::numeric)) AS points_done_as_owner,
            avg(EXTRACT(epoch FROM d_1.done_at - i.created_date)) AS avg_cycle_time_done_secs,
            percentile_disc(0.5::double precision) WITHIN GROUP (ORDER BY (EXTRACT(epoch FROM d_1.done_at - i.created_date))) AS p50_cycle_secs,
            percentile_disc(0.9::double precision) WITHIN GROUP (ORDER BY (EXTRACT(epoch FROM d_1.done_at - i.created_date))) AS p90_cycle_secs
           FROM owner_at_done o
             JOIN tenant_1001.issues i ON i.issue_key::text = o.issue_key::text
             JOIN tenant_1001.v_issue_done_at d_1 ON d_1.issue_key::text = o.issue_key::text
          GROUP BY o.person
        ), now_active AS (
         SELECT i.assignee_display_name AS person,
            count(*) AS issues_active_now,
            sum(COALESCE(i.story_points, 0::numeric)) AS points_active_now
           FROM tenant_1001.issues i
          WHERE i.assignee_display_name IS NOT NULL AND i.status_category::text <> 'Done'::text
          GROUP BY i.assignee_display_name
        ), contributors AS (
         SELECT c_1.name AS person,
            sum(c_1.comments_count) AS comments_count_total,
            sum(c_1.status_changes_count) AS status_changes_count_total,
            max(c_1.last_activity) AS last_activity
           FROM tenant_1001.v_issue_contributors c_1
          GROUP BY c_1.name
        ), mix AS (
         SELECT a.assignee_name AS person,
            i.issue_type,
            count(*) AS cnt
           FROM tenant_1001.v_issue_assignee_spans a
             JOIN tenant_1001.issues i ON i.issue_key::text = a.issue_key::text
          GROUP BY a.assignee_name, i.issue_type
        ), mix_json AS (
         SELECT mix.person,
            jsonb_agg(jsonb_build_object('issue_type', mix.issue_type, 'count', mix.cnt) ORDER BY mix.cnt DESC) AS issue_type_mix
           FROM mix
          GROUP BY mix.person
        )
 SELECT COALESCE(t.person, d.person, n.person::text, c.person::text, m.person) AS person,
    COALESCE(t.issues_touched_total, 0::bigint) AS issues_touched_total,
    COALESCE(d.issues_done_as_owner, 0::bigint) AS issues_done_as_owner,
    COALESCE(d.points_done_as_owner, 0::numeric) AS points_done_as_owner,
    COALESCE(n.issues_active_now, 0::bigint) AS issues_active_now,
    COALESCE(n.points_active_now, 0::numeric) AS points_active_now,
    d.avg_cycle_time_done_secs,
    d.p50_cycle_secs,
    d.p90_cycle_secs,
    COALESCE(c.comments_count_total, 0::numeric) AS comments_count_total,
    COALESCE(c.status_changes_count_total, 0::numeric) AS status_changes_count_total,
    c.last_activity,
    COALESCE(m.issue_type_mix, '[]'::jsonb) AS issue_type_mix
   FROM touched t
     FULL JOIN done_points d ON d.person = t.person
     FULL JOIN now_active n ON n.person::text = COALESCE(t.person, d.person)
     FULL JOIN contributors c ON c.person::text = COALESCE(t.person, d.person, n.person::text)
     FULL JOIN mix_json m ON m.person = COALESCE(t.person, d.person, n.person::text, c.person::text);
```