------------------------------------------------------------
-- TOP-LEVEL: quick pointers (optional but handy)
------------------------------------------------------------
COMMENT ON SCHEMA tenant_1001 IS
'Tenant schema for Jira analytics.
Core contracts:
- fn_issue_facts_base(issue_key): facts for ONE issue (incl. hygiene)
- fn_issue_facts_flat(root_key, max_depth): root + flat descendants
- fn_sprint_burndown(sprint_id): daily scope/done/remaining rows
- fn_sprint_facts(sprint_id): single JSON for sprint dashboard (incl. hygiene rollup)';

------------------------------------------------------------
-- SCOPE + MEMBERSHIP
------------------------------------------------------------
COMMENT ON VIEW tenant_1001.v_sprint_scope_events IS
'Parsed Sprint field changes from changelogs -> normalized membership events.
One row per (issue_key, sprint_id, created_date, event_type), where event_type in {added, removed}.
Use to reconstruct historical scope and churn.';

COMMENT ON COLUMN tenant_1001.v_sprint_scope_events.event_type IS
'"added" if sprint_id appears in to_value but not from_value; "removed" if it leaves from_value. Handles multi-sprint edits.';

COMMENT ON VIEW tenant_1001.v_issue_sprint_membership IS
'First-added → next-removed window per (issue,sprint). Does NOT backfill board assignments.
Use the *_final* view for union with sprint_issues table membership.';

COMMENT ON VIEW tenant_1001.v_issue_sprint_membership_final IS
'Canonical membership windows per (issue,sprint).
UNION of changelog-derived membership and static sprint_issues membership.
Use this everywhere for scope, burndown, carryover, etc.';

------------------------------------------------------------
-- ASSIGNEE + STATUS SPANS
------------------------------------------------------------
COMMENT ON VIEW tenant_1001.v_issue_assignee_spans IS
'Assignee ownership windows per issue (inclusive start, exclusive end).
Starts at issue.created (or first assignee change), then one row per assignee change.';

COMMENT ON COLUMN tenant_1001.v_issue_assignee_spans.from_ts IS
'Timestamp when the assignee became owner (inclusive).';

COMMENT ON COLUMN tenant_1001.v_issue_assignee_spans.to_ts IS
'Timestamp when ownership ended (exclusive). NULL = still owner.';

COMMENT ON VIEW tenant_1001.v_issue_status_spans IS
'Status residence windows per issue (inclusive start, exclusive end) with duration_secs.
Starts at issue.created (or first status change) and emits one row per status change.';

COMMENT ON COLUMN tenant_1001.v_issue_status_spans.duration_secs IS
'Seconds spent in the status window. If current, measured up to now().';

COMMENT ON VIEW tenant_1001.v_issue_done_at IS
'Earliest known "Done" moment for issues whose status_category = Done.
Prefers first changelog that equals terminal status; falls back to status_category_change_date or resolution_date.';

------------------------------------------------------------
-- HIERARCHY + LINKS + CONTRIBUTORS
------------------------------------------------------------
COMMENT ON VIEW tenant_1001.v_issue_children IS
'Hierarchy edges from issues.parent_issue_key (single source of truth). Use to walk Epic→Story→Subtask.';

COMMENT ON VIEW tenant_1001.v_issue_blockers IS
'Normalized blocker links.
Returns both directions:
- outgoing: this issue blocks other_key
- incoming: this issue is blocked by other_key
Joins other issue’s status and assignee for quick triage.';

COMMENT ON VIEW tenant_1001.v_issue_contributors IS
'People who touched an issue: reporter, assignee, commenters, status updaters.
Includes last_activity and counts per role. Great for credit and accountability.';

------------------------------------------------------------
-- ISSUE FACTS + DESCENDANTS (AI-friendly contracts)
------------------------------------------------------------
COMMENT ON FUNCTION tenant_1001.fn_issue_descendants(root_key text, max_depth int) IS
'Recursive helper returning flat (issue_key, parent_key, depth) under root_key up to max_depth.
Use to join, filter, or aggregate without JSON.';

COMMENT ON FUNCTION tenant_1001.fn_issue_facts_base(text) IS
'Facts-only JSON for ONE issue (no nesting): meta, state, full timelines, comments, contributors, blockers(open), and hygiene.
Inputs: issue_key.
Contract is stable for AI prompts (no opinions).';

COMMENT ON FUNCTION tenant_1001.fn_issue_facts_flat(root_key text, max_depth int) IS
'Packaged JSON: {root: <facts_base(root)>, descendants: [facts_base(child1..N)]} ordered by depth,created_date.
AI can choose to nest or summarize; DB stays facts-only.';

------------------------------------------------------------
-- SPRINT SET + BURNDOWN
------------------------------------------------------------
COMMENT ON VIEW tenant_1001.v_sprint_issue_set IS
'What''s in a sprint: (sprint_id, issue_key, first_seen, last_seen, in_scope_now).
in_scope_now = intersection of sprint window and membership window at the current time.';

COMMENT ON COLUMN tenant_1001.v_sprint_issue_set.in_scope_now IS
'TRUE if now() lies within both the sprint bounds and the issue’s membership window.';

COMMENT ON MATERIALIZED VIEW tenant_1001.mv_sprint_burndown_daily IS
'Daily burndown per sprint: scope_points, done_points, remaining_points, added/removed deltas.
- scope_points: sum of SP for issues whose membership covers that day
- done_points: of those, SP counted as done by end of that day (23:59:59)
Refresh after each Jira sync.';

COMMENT ON COLUMN tenant_1001.mv_sprint_burndown_daily.added_points_day IS
'Positive scope change vs previous day (membership-based churn; independent of completion).';

COMMENT ON COLUMN tenant_1001.mv_sprint_burndown_daily.removed_points_day IS
'Negative scope change vs previous day (de-scoping).';

COMMENT ON FUNCTION tenant_1001.fn_sprint_burndown(p_sprint_id int) IS
'Thin wrapper over mv_sprint_burndown_daily returning ordered daily rows for one sprint. Great for charts.';

------------------------------------------------------------
-- PEOPLE + FLOW
------------------------------------------------------------
COMMENT ON VIEW tenant_1001.v_sprint_people_rollup IS
'Per-sprint, per-person activity snapshot (NOW):
- issues_assigned_now / points_assigned_now
- issues/points_done_total (historical)
- comments_count_total, status_changes_count_total, last_activity
Use for team pulse, WIP limits, load balancing.';

COMMENT ON VIEW tenant_1001.v_sprint_blockers_open IS
'Open blockers affecting any in-scope issue for a sprint (incoming/outgoing + other issue’s status/assignee).
Ideal for daily standup triage.';

COMMENT ON VIEW tenant_1001.v_issue_status_transitions IS
'Atomic status transitions per issue with:
- transition_ts (from next_from_ts/to_ts)
- duration_secs spent in from_status
- assignee at transition time (owner), and sprint_id active at that moment.
Use to learn real flow and handoffs.';

COMMENT ON VIEW tenant_1001.v_person_status_pair_stats IS
'Per sprint, per person, per status-pair {from→to} stats:
count, avg_secs, p50_secs, p90_secs for time spent before transitioning.
Use for bottleneck analysis (e.g., In Progress→Code Review).';

COMMENT ON VIEW tenant_1001.v_person_work_profile IS
'Global person profile:
- issues_touched_total
- issues/points_done_as_owner + cycle time (avg/p50/p90)
- current load (issues_active_now/points_active_now)
- contributions (comments/status changes)
- issue_type_mix
Use for strengths, coaching, and staffing.';

------------------------------------------------------------
-- HYGIENE
------------------------------------------------------------
COMMENT ON VIEW tenant_1001.v_issue_hygiene_flags IS
'Issue hygiene facts: presence of key fields, recency, change counts, stale flag.
Notes:
- has_story_points enforced only for issue_type LIKE ''story%''
- stale = no status change AND no comment for ≥ stale_threshold_days (default 7) AND not Done
- in_scope_now computed from active sprint + membership.';

COMMENT ON COLUMN tenant_1001.v_issue_hygiene_flags.stale IS
'TRUE if both status and comments have been idle ≥ stale_threshold_days and issue is not in Done.';

COMMENT ON COLUMN tenant_1001.v_issue_hygiene_flags.last_status_change_days IS
'Days since the last status change (NULL if none).';

COMMENT ON COLUMN tenant_1001.v_issue_hygiene_flags.last_comment_days IS
'Days since the last comment (NULL if none).';

------------------------------------------------------------
-- SPRINT FACTS (AI JSON)
------------------------------------------------------------
COMMENT ON FUNCTION tenant_1001.fn_sprint_facts(p_sprint_id int) IS
'Single JSON blob for sprint dashboard:
- sprint: name, bounds, day_index, days_remaining
- predict: committed/completed/remaining points (from burndown)
- summary_now: issue/point counts by status, unassigned_cnt
- lists: unassigned[], wip[], done[]
- blockers_open: open blockers impacting the sprint
- contributors: per-person KPIs (from v_sprint_people_rollup)
- burndown_tail: last 3 days snapshot
- hygiene: counts (missing fields, stale) + top_stale (10)
Facts-only contract; no opinions.';

------------------------------------------------------------
-- EXAMPLES (attach to hot columns to help future readers)
------------------------------------------------------------
COMMENT ON COLUMN tenant_1001.v_issue_status_transitions.transition_ts IS
'Example query: 
  -- median time in In Progress before leaving, this sprint
  SELECT p.person, p.p50_secs
  FROM tenant_1001.v_person_status_pair_stats p
  WHERE p.sprint_id = 123 AND p.from_status = ''In Progress'';';

COMMENT ON COLUMN tenant_1001.v_sprint_issue_set.sprint_name IS
'Example query:
  -- WIP list for a sprint
  SELECT i.issue_key, i.summary, i.assignee_display_name
  FROM tenant_1001.v_sprint_issue_set s
  JOIN tenant_1001.issues i USING(issue_key)
  WHERE s.sprint_id = 123 AND s.in_scope_now AND i.status_category = ''In Progress'';';

COMMENT ON COLUMN tenant_1001.mv_sprint_burndown_daily.remaining_points IS
'Example query:
  -- Burn-down chart data
  SELECT day, remaining_points
  FROM tenant_1001.fn_sprint_burndown(123);';

COMMENT ON COLUMN tenant_1001.v_issue_hygiene_flags.in_scope_now IS
'Example query:
  -- Top 10 stale issues currently in sprint
  SELECT h.issue_key, i.summary, h.current_status_days
  FROM tenant_1001.v_issue_hygiene_flags h
  JOIN tenant_1001.issues i USING(issue_key)
  WHERE h.in_scope_now AND h.stale
  ORDER BY h.current_status_days DESC
  LIMIT 10;';


COMMENT ON FUNCTION tenant_1001.fn_sprint_ai_payload(int) IS
'AI-ready payload for a sprint: wraps fn_sprint_facts plus people rollup, flow p50/p90 by status pair, epic progress, and an at-risk list (stale/missing/blocked). Facts-only JSON.';


-- Objects (tables/views/mviews) -> one Markdown blob per object
CREATE OR REPLACE FUNCTION tenant_1001.fn_schema_wiki_md(p_schema text)
RETURNS TABLE(file_name text, md text)
LANGUAGE sql STABLE AS $$
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
  SELECT
    o.oid,
    CASE WHEN COUNT(*) = 0
         THEN '*No columns found*'
         ELSE string_agg(
           '- `' || c.col || '` **' || c.typ || '**'
           || CASE WHEN c.is_nullable THEN '' ELSE ' (NOT NULL)' END
           || CASE WHEN c.def IS NOT NULL THEN E'\n  _default:_ `' || replace(c.def, E'\n', ' ') || '`' ELSE '' END
           || CASE WHEN c.descr <> '' THEN E'\n  ' || replace(c.descr, E'\n', E'\n  ') ELSE '' END
         , E'\n')
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
  SELECT
    (quote_ident(schemaname) || '.' || quote_ident(tablename)) AS rel,
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
  SELECT
    con.oid,
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
              ELSE string_agg(
                     '* ' ||
                     CASE c.contype
                       WHEN 'p' THEN 'PRIMARY KEY'
                       WHEN 'u' THEN 'UNIQUE'
                       WHEN 'f' THEN 'FOREIGN KEY'
                       WHEN 'c' THEN 'CHECK'
                       ELSE c.contype::text
                     END
                     || ' ' || c.conname || E'\n  ' || replace(c.def, E'\n', ' ')
                   , E'\n')
         END AS md
  FROM objs o
  LEFT JOIN cons c ON c.conrelid = o.oid
  GROUP BY o.oid
),
obj_md AS (
  SELECT
    (o.schema || '.' || o.name || '.md') AS file_name,
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
$$;

