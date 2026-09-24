# tenant_1001.boards

_table_

## Columns
- `board_id` **integer** (NOT NULL)
- `name` **character varying(255)** (NOT NULL)
- `type` **character varying(50)**
- `project_key` **character varying(50)**
- `project_name` **character varying(255)**
- `location` **jsonb**
- `created_at` **timestamp without time zone**
  _default:_ `CURRENT_TIMESTAMP`
- `updated_at` **timestamp without time zone**
  _default:_ `CURRENT_TIMESTAMP`
- `last_synced_at` **timestamp without time zone**

## Indexes
* boards_pkey
  CREATE UNIQUE INDEX boards_pkey ON tenant_1001.boards USING btree (board_id)

## Constraints
* PRIMARY KEY boards_pkey
  PRIMARY KEY (board_id)