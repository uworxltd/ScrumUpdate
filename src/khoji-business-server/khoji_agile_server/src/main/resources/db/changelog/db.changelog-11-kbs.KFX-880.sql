--liquibase formatted sql

--changeset khoji:11-implement-granular-feature-unlock-system-with-child-features labels:KFX-880

INSERT INTO feature (id, feature_name)
SELECT * FROM (VALUES
    (4, 'My WorkLogs'),
    (5, 'Team Pulse'),
    (6, 'Standup Board')
) AS vals(id, feature_name)
WHERE NOT EXISTS (
    SELECT 1 FROM feature WHERE feature.id = vals.id
);

--rollback DELETE FROM feature WHERE id IN (4, 5, 6);
