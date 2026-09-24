# tenant_1001.sprint_issues

_table_

## Columns
- `sprint_id` **integer** (NOT NULL)
- `issue_key` **character varying(50)** (NOT NULL)
- `last_synced_at` **timestamp without time zone**

## Indexes
* sprint_issues_pkey
  CREATE UNIQUE INDEX sprint_issues_pkey ON tenant_1001.sprint_issues USING btree (sprint_id, issue_key)

## Constraints
* PRIMARY KEY sprint_issues_pkey
  PRIMARY KEY (sprint_id, issue_key)