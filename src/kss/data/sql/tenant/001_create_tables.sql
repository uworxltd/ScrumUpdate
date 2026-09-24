-- Create tenant tables
-- Extracted from kss_system.create_tenant_schema() function
-- Template variables: {tenant_id}, {schema_name}

-- Create schema first
CREATE SCHEMA {schema_name};

-- Create sync_jobs table
CREATE TABLE {schema_name}.sync_jobs (
    job_id VARCHAR(100) PRIMARY KEY,
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    parameters JSONB,
    results JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_by VARCHAR(100),
    retry_count INTEGER DEFAULT 0
);

-- Create boards table
CREATE TABLE {schema_name}.boards (
    board_id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    project_key VARCHAR(50),
    project_name VARCHAR(255),
    location JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP
);

-- Create sprints table
CREATE TABLE {schema_name}.sprints (
    sprint_id INTEGER PRIMARY KEY,
    board_id INTEGER,
    name VARCHAR(255) NOT NULL,
    state VARCHAR(50),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    complete_date TIMESTAMP,
    goal TEXT,
    last_synced_at TIMESTAMP
);

-- Create issues table
CREATE TABLE {schema_name}.issues (
    issue_id VARCHAR(50) PRIMARY KEY,
    issue_key VARCHAR(50) UNIQUE NOT NULL,
    summary VARCHAR(500),
    description TEXT,
    issue_type VARCHAR(100),
    status VARCHAR(100),
    status_category VARCHAR(100),
    status_category_change_date TIMESTAMP,
    priority VARCHAR(50),
    assignee_display_name VARCHAR(255),
    assignee_account_id VARCHAR(255),
    reporter_display_name VARCHAR(255),
    reporter_account_id VARCHAR(255),
    created_date TIMESTAMP,
    updated_date TIMESTAMP,
    resolution_date TIMESTAMP,
    story_points DECIMAL(5,2),
    time_spent INTEGER,
    time_original_estimate INTEGER,
    aggregate_time_spent INTEGER,
    labels TEXT[],
    components TEXT[],
    parent_issue_key VARCHAR(50),
    last_synced_at TIMESTAMP
);

-- Create worklogs table
CREATE TABLE {schema_name}.worklogs (
    worklog_id VARCHAR(50) PRIMARY KEY,
    issue_key VARCHAR(50) NOT NULL,
    author_display_name VARCHAR(255),
    author_account_id TEXT,
    update_author_display_name VARCHAR(255),
    update_author_account_id TEXT,
    time_spent_seconds INTEGER NOT NULL DEFAULT 0,
    comment TEXT,
    created_date TIMESTAMP,
    updated_date TIMESTAMP,
    started_date TIMESTAMP,
    last_synced_at TIMESTAMP
);

-- Create comments table
CREATE TABLE {schema_name}.comments (
    comment_id VARCHAR(50) PRIMARY KEY,
    issue_key VARCHAR(50) NOT NULL,
    author_display_name VARCHAR(255),
    comment_body TEXT,
    created_date TIMESTAMP,
    updated_date TIMESTAMP,
    last_synced_at TIMESTAMP
);

-- Create changelogs table
CREATE TABLE {schema_name}.changelogs (
    changelog_id VARCHAR(50) PRIMARY KEY,
    issue_key VARCHAR(50) NOT NULL,
    author_display_name VARCHAR(255),
    created_date TIMESTAMP,
    field_name VARCHAR(100),
    field_type VARCHAR(50),
    from_value TEXT,
    to_value TEXT,
    from_display_value TEXT,
    to_display_value TEXT,
    last_synced_at TIMESTAMP
);

-- Create issue_relationships table
CREATE TABLE {schema_name}.issue_relationships (
    parent_issue_key VARCHAR(50) NOT NULL,
    child_issue_key VARCHAR(50) NOT NULL,
    relationship_type VARCHAR(50) NOT NULL,
    last_synced_at TIMESTAMP,
    PRIMARY KEY(parent_issue_key, child_issue_key, relationship_type)
);

-- Create sprint_issues table
CREATE TABLE {schema_name}.sprint_issues (
    sprint_id INTEGER NOT NULL,
    issue_key VARCHAR(50) NOT NULL,
    last_synced_at TIMESTAMP,
    PRIMARY KEY(sprint_id, issue_key)
);

-- Create issue_links table
CREATE TABLE {schema_name}.issue_links (
    source_issue_key VARCHAR(50) NOT NULL,
    linked_issue_key VARCHAR(50) NOT NULL,
    link_type VARCHAR(100) NOT NULL,
    last_synced_at TIMESTAMP,
    PRIMARY KEY(source_issue_key, linked_issue_key, link_type)
);

-- Create cache_meta table
CREATE TABLE {schema_name}.cache_meta (
    key VARCHAR(255) NOT NULL PRIMARY KEY,
    value TEXT,
    cached_at_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX index_issues_issue_key ON {schema_name}.issues(issue_key);
CREATE INDEX index_comments_issue_key ON {schema_name}.comments(issue_key);
CREATE INDEX index_changelogs_issue_key ON {schema_name}.changelogs(issue_key);
CREATE INDEX index_worklogs_issue_key ON {schema_name}.worklogs(issue_key);
