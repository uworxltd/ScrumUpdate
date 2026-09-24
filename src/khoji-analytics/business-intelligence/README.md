RAW JIRA TABLES
└─ issues, sprints, sprint_issues, comments, changelogs, issue_links
   │
   ├─ L1: Time windows & scope (how work moved)
   │   ├─ v_issue_status_spans           → per-issue status windows (+duration)
   │   ├─ v_issue_assignee_spans         → per-issue ownership windows
   │   ├─ v_sprint_scope_events          → add/remove events from Sprint field
   │   ├─ v_issue_sprint_membership      → membership windows from events
   │   └─ v_issue_sprint_membership_final→ + sprint_issues; canonical membership
   │
   ├─ L2: Issue helpers (facts for triage)
   │   ├─ v_issue_done_at                → first time an issue hit “Done”
   │   ├─ v_issue_children               → Epic→Story→Subtask edges (parent_key)
   │   ├─ v_issue_blockers               → incoming/outgoing blockers w/ status
   │   ├─ v_issue_contributors           → who touched (report/assign/comment/status/worklog)
   │   ├─ v_issue_hygiene_flags          → stale, missing fields, in-scope-now, etc.
   │   └─ v_sprint_issue_set             → what’s in a sprint now (first/last seen)
   │
   ├─ L3: People & team views (accountability/load/flow)
   │   ├─ v_sprint_people_rollup         → per person in this sprint: load now, done, activity
   │   ├─ v_person_status_pair_stats     → {from→to} transition p50/p90 by person (flow quality)
   │   └─ v_person_work_profile          → all-time strengths, cycle time, type mix
   │
   ├─ L4: Speed layer
   │   └─ mv_sprint_burndown_daily       → daily scope/done/remaining (+churn)
   │        └─ fn_sprint_burndown()      → thin reader for charts/series
   │
   └─ L5: AI/API endpoints (facts-only JSON)
       ├─ fn_issue_facts_base(issue)     → one issue: meta, timelines, comments, blockers, hygiene
       ├─ fn_issue_descendants(root,depth) & fn_issue_facts_flat(root,depth)
       │                                  → epic/story + its children facts (flat JSON list)
       ├─ fn_sprint_facts(sprint)         → sprint header, WIP/done/unassigned, blockers, hygiene rollup, tail burndown
       └─ fn_sprint_ai_payload(sprint)    → one JSON for AI (sprint_facts + people + flow + epic progress + at-risk)
