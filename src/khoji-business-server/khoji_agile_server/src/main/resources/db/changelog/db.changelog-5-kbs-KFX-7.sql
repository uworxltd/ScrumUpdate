--liquibase formatted sql

--changeset muhammad.ahmad:3 labels:KFX-7
ALTER TABLE khoji_user ADD COLUMN IF NOT EXISTS msft_teams_aad_object_id TEXT;

--rollback ALTER TABLE khoji_user DROP COLUMN msft_teams_aad_object_id;
