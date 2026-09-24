--liquibase formatted sql

--changeset khoji:10-create-scrum-update-audit-table

CREATE TABLE IF NOT EXISTS scrum_update_audit (
  id BIGINT PRIMARY KEY,
  unique_identifier TEXT NOT NULL,
  yesterday_date TEXT,
  today_date TEXT,
  processed_input TEXT,
  generated_output TEXT,
  user_name TEXT,
  instance_user_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS scrum_update_audit_seq
    START 1000
    INCREMENT BY 50;

SELECT setval('scrum_update_audit_seq', 1000);

--rollback DROP TABLE scrum_update_audit;
--rollback DROP SEQUENCE IF EXISTS scrum_update_audit_seq;
