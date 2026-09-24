# tenant_1001.issues

_table_

## Columns
- `issue_id` **character varying(50)** (NOT NULL)
- `issue_key` **character varying(50)** (NOT NULL)
- `summary` **character varying(500)**
- `description` **text**
- `issue_type` **character varying(100)**
- `status` **character varying(100)**
- `status_category` **character varying(100)**
- `status_category_change_date` **timestamp without time zone**
- `priority` **character varying(50)**
- `assignee_display_name` **character varying(255)**
- `assignee_account_id` **character varying(255)**
- `reporter_display_name` **character varying(255)**
- `reporter_account_id` **character varying(255)**
- `created_date` **timestamp without time zone**
- `updated_date` **timestamp without time zone**
- `resolution_date` **timestamp without time zone**
- `story_points` **numeric(5,2)**
- `time_spent` **integer**
- `time_original_estimate` **integer**
- `aggregate_time_spent` **integer**
- `labels` **text[]**
- `components` **text[]**
- `parent_issue_key` **character varying(50)**
- `last_synced_at` **timestamp without time zone**

## Indexes
* issues_pkey
  CREATE UNIQUE INDEX issues_pkey ON tenant_1001.issues USING btree (issue_id)
* issues_issue_key_key
  CREATE UNIQUE INDEX issues_issue_key_key ON tenant_1001.issues USING btree (issue_key)

## Constraints
* PRIMARY KEY issues_pkey
  PRIMARY KEY (issue_id)
* UNIQUE issues_issue_key_key
  UNIQUE (issue_key)