# tenant_1001.sprints

_table_

## Columns
- `sprint_id` **integer** (NOT NULL)
- `board_id` **integer**
- `name` **character varying(255)** (NOT NULL)
- `state` **character varying(50)**
- `start_date` **timestamp without time zone**
- `end_date` **timestamp without time zone**
- `complete_date` **timestamp without time zone**
- `goal` **text**
- `created_at` **timestamp without time zone**
  _default:_ `CURRENT_TIMESTAMP`
- `updated_at` **timestamp without time zone**
  _default:_ `CURRENT_TIMESTAMP`
- `last_synced_at` **timestamp without time zone**

## Indexes
* sprints_pkey
  CREATE UNIQUE INDEX sprints_pkey ON tenant_1001.sprints USING btree (sprint_id)

## Constraints
* PRIMARY KEY sprints_pkey
  PRIMARY KEY (sprint_id)