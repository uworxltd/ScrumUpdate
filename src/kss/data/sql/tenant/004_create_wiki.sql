-- Create tenant schema documentation
-- Extracted from kss_system.create_tenant_schema_wiki() function
-- Template variables: {tenant_id}, {schema_name}

-- TOP-LEVEL: quick pointers (optional but handy)
COMMENT ON SCHEMA {schema_name} IS
'
Tenant schema for Jira analytics.
Core contracts:
- fn_issue_facts_base(issue_key): facts for ONE issue (incl. hygiene)
- fn_issue_facts_flat(root_key, max_depth): root + flat descendants
- fn_sprint_burndown(sprint_id): daily scope/done/remaining rows
- fn_sprint_facts(sprint_id): single JSON for sprint dashboard (incl. hygiene rollup)
';

-- SCOPE + MEMBERSHIP
COMMENT ON VIEW {schema_name}.v_sprint_scope_events IS
'
Parsed Sprint field changes from changelogs -> normalized membership events.
One row per (issue_key, sprint_id, created_date, event_type), where event_type in {added, removed}.
Use to reconstruct historical scope and churn.
';

COMMENT ON COLUMN {schema_name}.v_sprint_scope_events.event_type IS
'
"added" if sprint_id appears in to_value but not from_value; "removed" if it leaves from_value. Handles multi-sprint edits.
';

COMMENT ON VIEW {schema_name}.v_issue_sprint_membership IS
'
First-added → next-removed window per (issue,sprint). Does NOT backfill board assignments.
Use the *_final* view for union with sprint_issues table membership.
';

COMMENT ON VIEW {schema_name}.v_issue_sprint_membership_final IS
'
Canonical membership windows per (issue,sprint).
UNION of changelog-derived membership and static sprint_issues membership.
Use this everywhere for scope, burndown, carryover, etc.
';

-- ASSIGNEE + STATUS SPANS
COMMENT ON VIEW {schema_name}.v_issue_assignee_spans IS
'Assignee ownership windows per issue (inclusive start, exclusive end).
Starts at issue.created (or first assignee change), then one row per assignee change.
';

COMMENT ON COLUMN {schema_name}.v_issue_assignee_spans.from_ts IS
'Timestamp when the assignee became owner (inclusive).';

COMMENT ON COLUMN {schema_name}.v_issue_assignee_spans.to_ts IS
'Timestamp when ownership ended (exclusive). NULL = still owner.';

COMMENT ON VIEW {schema_name}.v_issue_status_spans IS
'Status residence windows per issue (inclusive start, exclusive end) with duration_secs.
Starts at issue.created (or first status change) and emits one row per status change.
';

COMMENT ON COLUMN {schema_name}.v_issue_status_spans.duration_secs IS
'Seconds spent in the status window. If current, measured up to now().';

COMMENT ON VIEW {schema_name}.v_issue_done_at IS
'
Earliest known "Done" moment for issues whose status_category = Done.
Prefers first changelog that equals terminal status; falls back to status_category_change_date or resolution_date.
';

-- HIERARCHY + LINKS + CONTRIBUTORS
COMMENT ON VIEW {schema_name}.v_issue_children IS
'Hierarchy edges from issues.parent_issue_key (single source of truth). Use to walk Epic→Story→Subtask.';

COMMENT ON VIEW {schema_name}.v_issue_blockers IS
'
Normalized blocker links.
Returns both directions:
- outgoing: this issue blocks other_key
- incoming: this issue is blocked by other_key
Joins other issue''s status and assignee for quick triage.
';

COMMENT ON VIEW {schema_name}.v_issue_contributors IS
'
People who touched an issue: reporter, assignee, commenters, status updaters.
Includes last_activity and counts per role. Great for credit and accountability.
';

-- ISSUE FACTS + DESCENDANTS (AI-friendly contracts)
COMMENT ON FUNCTION {schema_name}.fn_issue_descendants(root_key text, max_depth int) IS
'
Recursive helper returning flat (issue_key, parent_key, depth) under root_key up to max_depth.
Use to join, filter, or aggregate without JSON.
';

COMMENT ON FUNCTION {schema_name}.fn_issue_facts_base(text) IS
'
Facts-only JSON for ONE issue (no nesting): meta, state, full timelines, comments, contributors, blockers(open), and hygiene.
Inputs: issue_key.
Contract is stable for AI prompts (no opinions).
';

COMMENT ON FUNCTION {schema_name}.fn_issue_facts_flat(root_key text, max_depth int) IS
'
Packaged JSON: {root: <facts_base(root)>, descendants: [facts_base(child1..N)]} ordered by depth,created_date.
AI can choose to nest or summarize; DB stays facts-only.
';

-- SPRINT SET + BURNDOWN
COMMENT ON VIEW {schema_name}.v_sprint_issue_set IS
'
What''s in a sprint: (sprint_id, issue_key, first_seen, last_seen, in_scope_now).
in_scope_now = intersection of sprint window and membership window at the current time.
';

COMMENT ON COLUMN {schema_name}.v_sprint_issue_set.in_scope_now IS
'TRUE if now() lies within both the sprint bounds and the issue''s membership window.';

-- PEOPLE + FLOW
COMMENT ON VIEW {schema_name}.v_sprint_people_rollup IS
'
Per-sprint, per-person activity snapshot (NOW):
- issues_assigned_now / points_assigned_now
- issues/points_done_total (historical)
- comments_count_total, status_changes_count_total, last_activity
Use for team pulse, WIP limits, load balancing.
';

COMMENT ON VIEW {schema_name}.v_sprint_blockers_open IS
'
Open blockers affecting any in-scope issue for a sprint (incoming/outgoing + other issue''s status/assignee).
Ideal for daily standup triage.
';

-- HYGIENE
COMMENT ON VIEW {schema_name}.v_issue_hygiene_flags IS
'
Issue hygiene facts: presence of key fields, recency, change counts, stale flag.
Notes:
- has_story_points enforced only for issue_type LIKE ''story%''
- stale = no status change AND no comment for ≥ stale_threshold_days (default 7) AND not Done
- in_scope_now computed from active sprint + membership.
';

COMMENT ON COLUMN {schema_name}.v_issue_hygiene_flags.stale IS
'TRUE if both status and comments have been idle ≥ stale_threshold_days and issue is not in Done.';

COMMENT ON COLUMN {schema_name}.v_issue_hygiene_flags.last_status_change_days IS
'Days since the last status change (NULL if none).';

COMMENT ON COLUMN {schema_name}.v_issue_hygiene_flags.last_comment_days IS
'Days since the last comment (NULL if none).';

-- Create schema wiki function
CREATE OR REPLACE FUNCTION {schema_name}.fn_schema_wiki_md(p_schema text)
RETURNS TABLE(file_name text, md text)
LANGUAGE sql STABLE AS $func$
WITH objs AS (
  SELECT c.oid,
         n.nspname AS schema,
         c.relname AS name,
         c.relkind,
         COALESCE(obj_desc.description, '') AS descr
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_description obj_desc ON obj_desc.objoid = c.oid AND obj_desc.objsubid = 0
  WHERE n.nspname = p_schema AND c.relkind IN ('r','v','m') -- table, view, matview
),
cols AS (
  SELECT c.oid,
         a.attnum,
         a.attname AS col,
         format_type(a.atttypid, a.atttypmod) AS typ,
         NOT a.attnotnull AS is_nullable,
         pg_get_expr(ad.adbin, ad.adrelid) AS def,
         COALESCE(d.description,'') AS descr
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
  LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
  LEFT JOIN pg_description d ON d.objoid = a.attrelid AND d.objsubid = a.attnum
  WHERE n.nspname = p_schema AND c.relkind IN ('r','v','m')
),
col_md AS (
  SELECT o.oid,
         CASE WHEN COUNT(*) = 0
              THEN '*No columns found*'
              ELSE string_agg('- `' || c.col || '` **' || c.typ || '**'
                              || CASE WHEN c.is_nullable THEN '' ELSE ' (NOT NULL)' END
                              || CASE WHEN c.def IS NOT NULL THEN E'\n  _default:_ `' || replace(c.def, E'\n', ' ') || '`' ELSE '' END
                              || CASE WHEN c.descr <> '' THEN E'\n  ' || replace(c.descr, E'\n', E'\n  ') ELSE '' END, E'\n')
         END AS md
  FROM objs o
  LEFT JOIN cols c ON c.oid = o.oid
  GROUP BY o.oid
),
view_defs AS (
  SELECT o.oid,
         CASE WHEN o.relkind IN ('v','m')
              THEN pg_get_viewdef(o.oid, true)
              ELSE NULL END AS def
  FROM objs o
),
idx AS (
  SELECT (quote_ident(schemaname) || '.' || quote_ident(tablename)) AS rel,
         indexname,
         indexdef
  FROM pg_indexes
  WHERE schemaname = p_schema
),
obj_idx AS (
  SELECT o.oid,
         CASE WHEN COUNT(*) = 0
              THEN NULL
              ELSE string_agg('* ' || i.indexname || E'\n  ' || replace(i.indexdef, E'\n', ' '), E'\n')
         END AS md
  FROM objs o
  LEFT JOIN idx i
    ON i.rel = (quote_ident(o.schema) || '.' || quote_ident(o.name))
  GROUP BY o.oid
),
cons AS (
  SELECT con.oid,
         con.conname,
         con.contype,
         con.conrelid,
         pg_get_constraintdef(con.oid, true) AS def
  FROM pg_constraint con
),
obj_cons AS (
  SELECT o.oid,
         CASE WHEN COUNT(*) = 0
              THEN NULL
              ELSE string_agg('* ' ||
                              CASE c.contype
                                WHEN 'p' THEN 'PRIMARY KEY'
                                WHEN 'u' THEN 'UNIQUE'
                                WHEN 'f' THEN 'FOREIGN KEY'
                                WHEN 'c' THEN 'CHECK'
                                ELSE c.contype::text
                              END
                              || ' ' || c.conname || E'\n  ' || replace(c.def, E'\n', ' '), E'\n')
         END AS md
  FROM objs o
  LEFT JOIN cons c ON c.conrelid = o.oid
  GROUP BY o.oid
),
obj_md AS (
  SELECT (o.schema || '.' || o.name || '.md') AS file_name,
         -- header
         '# ' || o.schema || '.' || o.name || E'\n\n'
         || CASE o.relkind WHEN 'r' THEN '_table_'
                           WHEN 'v' THEN '_view_'
                           WHEN 'm' THEN '_materialized view_' END
         || CASE WHEN o.descr <> '' THEN E' — ' || o.descr ELSE '' END
         || E'\n\n## Columns\n' || cm.md
         || CASE WHEN vd.def IS NOT NULL THEN E'\n\n## Definition\n```sql\n' || vd.def || E'\n```' ELSE '' END
         || CASE WHEN oi.md IS NOT NULL THEN E'\n\n## Indexes\n' || oi.md ELSE '' END
         || CASE WHEN oc.md IS NOT NULL THEN E'\n\n## Constraints\n' || oc.md ELSE '' END
         AS md
  FROM objs o
  LEFT JOIN col_md   cm ON cm.oid = o.oid
  LEFT JOIN view_defs vd ON vd.oid = o.oid
  LEFT JOIN obj_idx  oi ON oi.oid = o.oid
  LEFT JOIN obj_cons oc ON oc.oid = o.oid
)
SELECT file_name, md
FROM obj_md
ORDER BY file_name;
$func$;