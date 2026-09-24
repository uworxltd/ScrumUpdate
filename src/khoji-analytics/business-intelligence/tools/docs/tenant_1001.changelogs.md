# tenant_1001.changelogs

_table_

## Columns
- `changelog_id` **character varying(50)** (NOT NULL)
- `issue_key` **character varying(50)** (NOT NULL)
- `author_display_name` **character varying(255)**
- `created_date` **timestamp without time zone**
- `field_name` **character varying(100)**
- `field_type` **character varying(50)**
- `from_value` **text**
- `to_value` **text**
- `from_display_value` **text**
- `to_display_value` **text**
- `last_synced_at` **timestamp without time zone**

## Indexes
* changelogs_pkey
  CREATE UNIQUE INDEX changelogs_pkey ON tenant_1001.changelogs USING btree (changelog_id)

## Constraints
* PRIMARY KEY changelogs_pkey
  PRIMARY KEY (changelog_id)