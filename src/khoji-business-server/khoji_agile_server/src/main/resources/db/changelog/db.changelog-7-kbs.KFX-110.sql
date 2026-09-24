--liquibase formatted sql

--changeset muhammad.ahmad:2 labels:KFX-110
INSERT INTO roles (id, code, name)
SELECT *
FROM (VALUES (23, 'DEVOPS', 'Dev Ops')) AS vals(id, code, name)
WHERE NOT EXISTS (
    SELECT 1 FROM roles WHERE roles.id = vals.id
);

--rollback DELETE FROM roles WHERE id = 23;