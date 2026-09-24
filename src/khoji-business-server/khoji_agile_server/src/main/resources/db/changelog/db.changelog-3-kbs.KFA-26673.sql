--liquibase formatted sql

--changeset asadullah.shahid:3 labels:KFA-26673
CREATE TABLE IF NOT EXISTS properties (
    id BIGINT PRIMARY KEY,
    application VARCHAR(50) NOT NULL,
    profile VARCHAR(50) NOT NULL,
    label VARCHAR(50) DEFAULT NULL,
    key VARCHAR(100) NOT NULL,
    value TEXT NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS properties_seq
    START 1000
    INCREMENT BY 50;

SELECT setval('properties_seq', 1000);

--rollback DROP SEQUENCE IF EXISTS properties_seq;
--rollback DROP TABLE IF EXISTS properties;
