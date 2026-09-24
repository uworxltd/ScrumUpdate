# tenant_1001.worklogs

_table_

## Columns
- `worklog_id` **character varying(50)** (NOT NULL)
- `issue_key` **character varying(50)** (NOT NULL)
- `author_name` **character varying(255)**
- `author_email` **character varying(255)**
- `author_display_name` **character varying(255)**
- `update_author_name` **character varying(255)**
- `update_author_email` **character varying(255)**
- `update_author_display_name` **character varying(255)**
- `time_spent_seconds` **integer** (NOT NULL)
  _default:_ `0`
- `comment` **text**
- `created_date` **timestamp without time zone**
- `updated_date` **timestamp without time zone**
- `started_date` **timestamp without time zone**
- `created_at` **timestamp without time zone**
  _default:_ `CURRENT_TIMESTAMP`
- `updated_at` **timestamp without time zone**
  _default:_ `CURRENT_TIMESTAMP`
- `last_synced_at` **timestamp without time zone**

## Indexes
* worklogs_pkey
  CREATE UNIQUE INDEX worklogs_pkey ON tenant_1001.worklogs USING btree (worklog_id)

## Constraints
* PRIMARY KEY worklogs_pkey
  PRIMARY KEY (worklog_id)