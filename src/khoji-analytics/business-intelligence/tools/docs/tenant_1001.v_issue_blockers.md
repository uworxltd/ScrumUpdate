# tenant_1001.v_issue_blockers

_view_ — Normalized blocker links.
Returns both directions:
- outgoing: this issue blocks other_key
- incoming: this issue is blocked by other_key
Joins other issue’s status and assignee for quick triage.

## Columns
- `issue_key` **character varying(50)**
- `direction` **text**
- `link_type` **character varying(100)**
- `other_key` **character varying(50)**
- `other_status` **character varying(100)**
- `other_status_category` **character varying(100)**
- `other_assignee` **character varying(255)**

## Definition
```sql
 SELECT il.source_issue_key AS issue_key,
    'outgoing'::text AS direction,
    il.link_type,
    il.linked_issue_key AS other_key,
    i2.status AS other_status,
    i2.status_category AS other_status_category,
    i2.assignee_display_name AS other_assignee
   FROM tenant_1001.issue_links il
     LEFT JOIN tenant_1001.issues i2 ON i2.issue_key::text = il.linked_issue_key::text
  WHERE il.link_type::text ~~* '%block%'::text
UNION ALL
 SELECT il.linked_issue_key AS issue_key,
    'incoming'::text AS direction,
    il.link_type,
    il.source_issue_key AS other_key,
    i2.status AS other_status,
    i2.status_category AS other_status_category,
    i2.assignee_display_name AS other_assignee
   FROM tenant_1001.issue_links il
     LEFT JOIN tenant_1001.issues i2 ON i2.issue_key::text = il.source_issue_key::text
  WHERE il.link_type::text ~~* '%block%'::text;
```