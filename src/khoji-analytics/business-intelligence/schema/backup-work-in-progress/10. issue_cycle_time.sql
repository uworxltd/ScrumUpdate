CREATE OR REPLACE VIEW tenant_1005.v_issue_cycle_time AS
SELECT i.issue_key,
       i.created_date,
       d.done_at,
       EXTRACT(EPOCH FROM (COALESCE(d.done_at, now()) - i.created_date))::bigint AS cycle_time_secs
FROM tenant_1005.issues i
LEFT JOIN tenant_1005.v_issue_done_at d ON d.issue_key = i.issue_key;
