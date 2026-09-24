-- Self-hosted Unleash (KFX-931).
-- Runs only on the first initialization of a fresh Postgres volume
-- (mounted to /docker-entrypoint-initdb.d on the postgres service).
-- Unleash creates and manages its own schema/tables inside this database.
CREATE DATABASE unleash;
