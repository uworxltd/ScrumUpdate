# tenant_1001.issue_links

_table_

## Columns
- `source_issue_key` **character varying(50)** (NOT NULL)
- `linked_issue_key` **character varying(50)** (NOT NULL)
- `link_type` **character varying(100)** (NOT NULL)
- `last_synced_at` **timestamp without time zone**

## Indexes
* issue_links_pkey
  CREATE UNIQUE INDEX issue_links_pkey ON tenant_1001.issue_links USING btree (source_issue_key, linked_issue_key, link_type)

## Constraints
* PRIMARY KEY issue_links_pkey
  PRIMARY KEY (source_issue_key, linked_issue_key, link_type)