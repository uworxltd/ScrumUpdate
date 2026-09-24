# tenant_1001.issue_relationships

_table_

## Columns
- `parent_issue_key` **character varying(50)** (NOT NULL)
- `child_issue_key` **character varying(50)** (NOT NULL)
- `relationship_type` **character varying(50)** (NOT NULL)
- `last_synced_at` **timestamp without time zone**

## Indexes
* issue_relationships_pkey
  CREATE UNIQUE INDEX issue_relationships_pkey ON tenant_1001.issue_relationships USING btree (parent_issue_key, child_issue_key, relationship_type)

## Constraints
* PRIMARY KEY issue_relationships_pkey
  PRIMARY KEY (parent_issue_key, child_issue_key, relationship_type)