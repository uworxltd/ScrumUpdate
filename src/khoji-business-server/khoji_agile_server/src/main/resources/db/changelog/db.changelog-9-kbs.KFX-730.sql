--liquibase formatted sql

--changeset waqas.ahmed.rehmani:9 labels:KFX-730
CREATE TABLE IF NOT EXISTS scrum_updates (
  id BIGINT PRIMARY KEY,
  unique_identifier TEXT,
  requested_date DATE,
  body TEXT,
  user_id BIGINT NOT NULL,
  user_name TEXT,
  instance_user_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS scrum_updates_seq
    START 1000
    INCREMENT BY 2;

SELECT setval('scrum_updates_seq', 1000);

--rollback DROP TABLE IF EXISTS scrum_updates;
--rollback DROP SEQUENCE IF EXISTS scrum_updates_seq;