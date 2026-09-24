CREATE OR REPLACE VIEW tenant_1005.v_issue_done_at AS
SELECT i.issue_key,
       CASE WHEN i.status_category = 'Done' THEN
         COALESCE(
           (SELECT MIN(cl.created_date)
            FROM tenant_1005.changelogs cl
            WHERE cl.issue_key = i.issue_key
              AND cl.field_name = 'status'
              AND cl.to_display_value = i.status),
           i.status_category_change_date,
           i.resolution_date
         )
       ELSE NULL END AS done_at
FROM tenant_1005.issues i;
