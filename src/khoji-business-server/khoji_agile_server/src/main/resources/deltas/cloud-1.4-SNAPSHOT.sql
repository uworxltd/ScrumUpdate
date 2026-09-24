-- KFA-26269
INSERT INTO khoji.feature (id, feature_name) VALUES
(3, 'Work Log Categorization');


-- KFA-26307
ALTER TABLE khoji.work_log_audit
ADD COLUMN user_name TEXT DEFAULT null,
ADD COLUMN instance_user_id BIGINT DEFAULT null,
ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();