# tenant_1001.v_issue_children

_view_ — Hierarchy edges from issues.parent_issue_key (single source of truth). Use to walk Epic→Story→Subtask.

## Columns
- `parent_key` **character varying(50)**
- `child_key` **character varying(50)**

## Definition
```sql
 SELECT parent_issue_key AS parent_key,
    issue_key AS child_key
   FROM tenant_1001.issues
  WHERE parent_issue_key IS NOT NULL;
```