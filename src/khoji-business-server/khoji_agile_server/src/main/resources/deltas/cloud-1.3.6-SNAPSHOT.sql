-- KFA-26169
ALTER TABLE khoji.instance_user
ADD COLUMN last_seen TIMESTAMP DEFAULT NULL;

--KFA-26471
INSERT INTO khoji.config (instance_id, prop_key, prop_value)
SELECT DISTINCT instance_id, 'worklog.data.storage.permission', 'true'
FROM config
ON CONFLICT (instance_id, prop_key) DO NOTHING;