--liquibase formatted sql

--changeset asadullah.shahid:3 labels:KFA-26635
CREATE TABLE IF NOT EXISTS instance_user_config (
    id BIGINT PRIMARY KEY,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    instance_user_id BIGINT NOT NULL,
    FOREIGN KEY (instance_user_id) REFERENCES instance_user (id) ON DELETE CASCADE
);

CREATE SEQUENCE IF NOT EXISTS instance_user_config_seq
    START 1000
    INCREMENT BY 50;

SELECT setval('instance_user_config_seq', 1000);

--rollback DROP SEQUENCE IF EXISTS instance_user_config_seq;
--rollback DROP TABLE IF EXISTS instance_user_config;