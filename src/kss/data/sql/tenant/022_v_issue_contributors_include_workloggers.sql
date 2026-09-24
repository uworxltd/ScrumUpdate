-- =============================================================================
-- Include worklog authors as issue contributors / participants
-- =============================================================================
-- Template variables: {schema_name}
--
-- v_issue_insights_grid.participants rolls up from v_issue_contributors.
-- Previously only reporter, assignee, commenters, and status changers were
-- included. People who only logged time were missing from participants.
-- =============================================================================

CREATE OR REPLACE VIEW {schema_name}.v_issue_contributors AS
WITH u AS (
  -- reporter
  SELECT i.issue_key,
         i.reporter_display_name AS name,
         i.reporter_account_id   AS account_id,
         'reporter'::text        AS role,
         i.created_date          AS ts
  FROM {schema_name}.issues i

  UNION ALL

  -- current assignee row (for last-activity weighting)
  SELECT i.issue_key,
         i.assignee_display_name,
         i.assignee_account_id,
         'assignee'::text,
         i.updated_date
  FROM {schema_name}.issues i
  WHERE i.assignee_display_name IS NOT NULL

  UNION ALL

  -- commenter (with author account_id)
  SELECT c.issue_key,
         c.author_display_name,
         c.account_id,
         'commenter'::text,
         c.created_date
  FROM {schema_name}.comments c

  UNION ALL

  -- status change author (with account_id)
  SELECT cl.issue_key,
         cl.author_display_name,
         cl.account_id,
         'status_changer'::text,
         cl.created_date
  FROM {schema_name}.changelogs cl
  WHERE cl.field_name = 'status'

  UNION ALL

  -- worklog author (time logged on the issue)
  SELECT w.issue_key,
         w.author_display_name,
         w.author_account_id,
         'worklogger'::text,
         COALESCE(w.updated_date, w.started_date, w.created_date)
  FROM {schema_name}.worklogs w
  WHERE w.author_display_name IS NOT NULL
    AND w.author_display_name <> ''
)
SELECT
  issue_key,
  name,
  array_agg(DISTINCT role) AS roles,
  MAX(ts)                  AS last_activity,
  COUNT(*) FILTER (WHERE role = 'commenter')       AS comments_count,
  COUNT(*) FILTER (WHERE role = 'status_changer')  AS status_changes_count,
  MAX(account_id)                                   AS account_id
FROM u
GROUP BY issue_key, name;

COMMENT ON VIEW {schema_name}.v_issue_contributors IS
'
People who touched an issue: reporter, assignee, commenters, status updaters, and worklog authors.
Includes last_activity and counts per role. Great for credit and accountability.
';
