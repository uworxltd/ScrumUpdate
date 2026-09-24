# tenant_1001.sync_jobs

_table_

## Columns
- `job_id` **character varying(100)** (NOT NULL)
- `job_type` **character varying(50)** (NOT NULL)
- `status` **character varying(20)** (NOT NULL)
- `parameters` **jsonb**
- `results` **jsonb**
- `error_message` **text**
- `created_at` **timestamp without time zone**
  _default:_ `CURRENT_TIMESTAMP`
- `updated_at` **timestamp without time zone**
  _default:_ `CURRENT_TIMESTAMP`
- `started_at` **timestamp without time zone**
- `completed_at` **timestamp without time zone**
- `created_by` **character varying(100)**
- `retry_count` **integer**
  _default:_ `0`

## Indexes
* sync_jobs_pkey
  CREATE UNIQUE INDEX sync_jobs_pkey ON tenant_1001.sync_jobs USING btree (job_id)

## Constraints
* PRIMARY KEY sync_jobs_pkey
  PRIMARY KEY (job_id)