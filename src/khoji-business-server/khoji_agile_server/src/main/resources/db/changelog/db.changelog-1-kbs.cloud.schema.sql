--liquibase formatted sql

--changeset waqas.ahmed.rehmani:1 labels:KFA-26675
CREATE TABLE IF NOT EXISTS khoji_user (
    id BIGINT PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    password TEXT,
    image_url TEXT,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS khoji_user_seq
    START 1000
    INCREMENT BY 50;

SELECT setval('khoji_user_seq', 1000);

--------------------------------------------------------

CREATE TABLE IF NOT EXISTS identity_provider (
  id BIGINT PRIMARY KEY,
  user_id BIGINT,
  provider TEXT,
  provider_account_id VARCHAR(255),
  login_code VARCHAR(255),
  source_refresh_token TEXT,
  source_access_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES khoji_user (id) ON DELETE CASCADE
);

CREATE SEQUENCE IF NOT EXISTS identity_provider_seq
    START 1000
    INCREMENT BY 50;

SELECT setval('identity_provider_seq', 1000);

--------------------------------------------------------

CREATE TABLE IF NOT EXISTS workspace (
  id BIGINT PRIMARY KEY,
  workspace_name TEXT,
  owner_user_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (owner_user_id) REFERENCES khoji_user (id) ON DELETE CASCADE
);

CREATE SEQUENCE IF NOT EXISTS workspace_seq
    START 1000
    INCREMENT BY 50;

SELECT setval('workspace_seq', 1000);

--------------------------------------------------------

CREATE TABLE IF NOT EXISTS roles (
  id BIGINT PRIMARY KEY,
  code TEXT,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS roles_seq
    START 1000
    INCREMENT BY 50;

SELECT setval('roles_seq', 1000);

--------------------------------------------------------

CREATE TABLE IF NOT EXISTS access_level (
  id BIGINT PRIMARY KEY,
  level_code TEXT,
  description TEXT,
  parent_code TEXT
);

CREATE SEQUENCE IF NOT EXISTS access_level_seq
    START 1000
    INCREMENT BY 50;

SELECT setval('access_level_seq', 1000);

--------------------------------------------------------

CREATE TABLE IF NOT EXISTS instance (
  id BIGINT PRIMARY KEY,
  tenant_id TEXT,
  instance_image_url TEXT,
  instance_name TEXT,
  workspace_id BIGINT,
  platform TEXT,
  is_favorite BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (workspace_id) REFERENCES workspace (id) ON DELETE CASCADE
);

CREATE SEQUENCE IF NOT EXISTS instance_seq
    START 1000
    INCREMENT BY 50;

SELECT setval('instance_seq', 1000);

--------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_access_credentials (
  email VARCHAR(255) PRIMARY KEY,
  access_token TEXT,
  refresh_token TEXT
);

CREATE SEQUENCE IF NOT EXISTS user_access_credentials_seq
    START 1000
    INCREMENT BY 50;

SELECT setval('user_access_credentials_seq', 1000);

--------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_settings (
  id BIGINT PRIMARY KEY,
  worklog_email_enabled boolean,
  worklog_email_frequency TEXT
);

CREATE SEQUENCE IF NOT EXISTS user_settings_seq
    START 1000
    INCREMENT BY 50;

SELECT setval('user_settings_seq', 1000);

--------------------------------------------------------

CREATE TABLE IF NOT EXISTS instance_user (
  id BIGINT PRIMARY KEY,
  full_name TEXT,
  account_id TEXT,
  time_zone TEXT,
  status TEXT,
  email TEXT,
  avatar_url TEXT,
  role_id BIGINT,
  instance_id BIGINT,
  user_settings_id BIGINT,
  access_level_id BIGINT,
  last_seen TIMESTAMP,
  FOREIGN KEY (access_level_id) REFERENCES access_level (id),
  FOREIGN KEY (user_settings_id) REFERENCES user_settings (id),
  FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
  FOREIGN KEY (instance_id) REFERENCES instance (id) ON DELETE CASCADE
);

CREATE SEQUENCE IF NOT EXISTS instance_user_seq
    START 1000
    INCREMENT BY 50;

SELECT setval('instance_user_seq', 1000);

--------------------------------------------------------

CREATE TABLE IF NOT EXISTS instance_invite (
  id BIGINT PRIMARY KEY,
  email TEXT,
  instance_user_id BIGINT,
  code TEXT,
  FOREIGN KEY (instance_user_id) REFERENCES instance_user (id) ON DELETE CASCADE
);

CREATE SEQUENCE IF NOT EXISTS instance_invite_seq
    START 1000
    INCREMENT BY 50;

SELECT setval('instance_invite_seq', 1000);

--------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_access (
  id BIGINT PRIMARY KEY,
  user_id BIGINT,
  instance_id BIGINT,
  instance_email VARCHAR(255),
  instance_user_id BIGINT,
  FOREIGN KEY (user_id) REFERENCES khoji_user (id) ON DELETE CASCADE,
  FOREIGN KEY (instance_id) REFERENCES instance (id) ON DELETE CASCADE,
  FOREIGN KEY (instance_user_id) REFERENCES instance_user (id) ON DELETE CASCADE,
  FOREIGN KEY (instance_email) REFERENCES user_access_credentials (email)
);

CREATE SEQUENCE IF NOT EXISTS user_access_seq
    START 1000
    INCREMENT BY 50;

SELECT setval('user_access_seq', 1000);

--------------------------------------------------------

CREATE TABLE IF NOT EXISTS integrations (
  id BIGINT PRIMARY KEY,
  user_access_id BIGINT,
  type TEXT,
  access_token TEXT,
  refresh_token TEXT,
  refresh_token_created_at TIMESTAMP DEFAULT NOW(),
  link TEXT,
  FOREIGN KEY (user_access_id) REFERENCES user_access (id) ON DELETE CASCADE
);

CREATE SEQUENCE IF NOT EXISTS integrations_seq
    START 1000
    INCREMENT BY 50;

SELECT setval('integrations_seq', 1000);

--------------------------------------------------------

CREATE TABLE IF NOT EXISTS config (
  instance_id BIGINT,
  prop_key TEXT,
  prop_value TEXT,
  PRIMARY KEY (instance_id, prop_key),
  FOREIGN KEY (instance_id) REFERENCES instance (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teams (
  id BIGINT PRIMARY KEY,
  name TEXT,
  instance_id BIGINT REFERENCES instance (id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE SEQUENCE IF NOT EXISTS teams_seq
    START 1000
    INCREMENT BY 50;

SELECT setval('teams_seq', 1000);

--------------------------------------------------------

CREATE TABLE IF NOT EXISTS team_members (
  team_id BIGINT,
  user_id BIGINT,
  PRIMARY KEY (team_id, user_id),
  FOREIGN KEY (team_id)  REFERENCES teams (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES instance_user (id)
);

--------------------------------------------------------

CREATE TABLE IF NOT EXISTS feature (
  id BIGINT PRIMARY KEY,
  feature_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS feature_seq
    START 1000
    INCREMENT BY 50;

SELECT setval('feature_seq', 1000);

--------------------------------------------------------

CREATE TABLE IF NOT EXISTS instance_feature (
  id BIGINT PRIMARY KEY,
  instance_id BIGINT,
  feature_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (instance_id)  REFERENCES instance  ON DELETE CASCADE,
  FOREIGN KEY (feature_id) REFERENCES feature (id)
);

CREATE SEQUENCE IF NOT EXISTS instance_feature_seq
    START 1000
    INCREMENT BY 50;

SELECT setval('instance_feature_seq', 1000);

--------------------------------------------------------

CREATE TABLE IF NOT EXISTS team_supervisor (
  team_id BIGINT,
  user_id BIGINT,
  PRIMARY KEY (team_id, user_id),
  FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES instance_user (id)
);

----------------------------------------------------------

CREATE TABLE IF NOT EXISTS work_log_audit (
  id BIGINT PRIMARY KEY,
  unique_identifier TEXT,
  requested_date TEXT,
  processed_input TEXT,
  generated_output TEXT,
  submitted_request TEXT,
  user_name TEXT,
  instance_user_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS work_log_audit_seq
    START 1000
    INCREMENT BY 50;

SELECT setval('work_log_audit_seq', 1000);

----------------------------------------------------------

/* liquibase rollback
DROP TABLE work_log_audit;
DROP TABLE team_supervisor;
DROP TABLE instance_feature;
DROP TABLE feature;
DROP TABLE team_members;
DROP TABLE teams;
DROP TABLE config;
DROP TABLE integrations;
DROP TABLE user_access;
DROP TABLE instance_invite;
DROP TABLE instance_user;
DROP TABLE user_settings;
DROP TABLE user_access_credentials;
DROP TABLE instance;
DROP TABLE access_level;
DROP TABLE roles;
DROP TABLE workspace;
DROP TABLE identity_provider;
DROP TABLE khoji_user;
DROP SEQUENCE IF EXISTS work_log_audit_seq;
DROP SEQUENCE IF EXISTS instance_feature_seq;
DROP SEQUENCE IF EXISTS feature_seq;
DROP SEQUENCE IF EXISTS teams_seq;
DROP SEQUENCE IF EXISTS integrations_seq;
DROP SEQUENCE IF EXISTS user_access_seq;
DROP SEQUENCE IF EXISTS instance_invite_seq;
DROP SEQUENCE IF EXISTS instance_user_seq;
DROP SEQUENCE IF EXISTS user_settings_seq;
DROP SEQUENCE IF EXISTS user_access_credentials_seq;
DROP SEQUENCE IF EXISTS instance_seq;
DROP SEQUENCE IF EXISTS access_level_seq;
DROP SEQUENCE IF EXISTS roles_seq;
DROP SEQUENCE IF EXISTS workspace_seq;
DROP SEQUENCE IF EXISTS identity_provider_seq;
DROP SEQUENCE IF EXISTS khoji_user_seq;
*/