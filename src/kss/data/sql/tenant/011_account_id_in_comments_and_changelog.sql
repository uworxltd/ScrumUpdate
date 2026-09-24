-- Introduce a new column for storing accountId in comments and Changelogs
-- Template variables: {schema_name}

ALTER TABLE {schema_name}.comments
ADD COLUMN account_id TEXT;

ALTER TABLE {schema_name}.changelogs
ADD COLUMN account_id TEXT;