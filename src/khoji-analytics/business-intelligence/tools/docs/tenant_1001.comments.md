# tenant_1001.comments

_table_

## Columns
- `comment_id` **character varying(50)** (NOT NULL)
- `issue_key` **character varying(50)** (NOT NULL)
- `author_display_name` **character varying(255)**
- `comment_body` **text**
- `created_date` **timestamp without time zone**
- `updated_date` **timestamp without time zone**
- `last_synced_at` **timestamp without time zone**

## Indexes
* comments_pkey
  CREATE UNIQUE INDEX comments_pkey ON tenant_1001.comments USING btree (comment_id)

## Constraints
* PRIMARY KEY comments_pkey
  PRIMARY KEY (comment_id)