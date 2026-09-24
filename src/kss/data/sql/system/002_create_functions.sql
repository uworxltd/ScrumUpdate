-- Tenant Management Functions
-- This script creates the database functions for managing tenant schemas
-- Run once during application initialization

-- =============================================================================
-- TENANT LOOKUP FUNCTIONS
-- =============================================================================

-- Function to get schema name for a tenant
CREATE OR REPLACE FUNCTION kss_system.get_schema_for_tenant(p_tenant_id VARCHAR(50))
RETURNS VARCHAR(63) AS $$
DECLARE
    v_schema_name VARCHAR(63);
BEGIN
    SELECT schema_name INTO v_schema_name 
    FROM kss_system.tenants 
    WHERE tenant_id = p_tenant_id;
    
    IF v_schema_name IS NULL THEN
        RAISE EXCEPTION 'Tenant % not found', p_tenant_id;
    END IF;
    
    RETURN v_schema_name;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TENANT EXISTENCE CHECK FUNCTION
-- =============================================================================

-- Function to check if a tenant exists
CREATE OR REPLACE FUNCTION kss_system.tenant_exists(p_tenant_id VARCHAR(50))
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM kss_system.tenants 
    WHERE tenant_id = p_tenant_id;
    
    RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TENANT STATUS AND ANALYTICS FUNCTIONS
-- =============================================================================

-- Function to check if tenant schema actually exists in database
CREATE OR REPLACE FUNCTION kss_system.check_tenant_schema_exists(p_tenant_id VARCHAR(50))
RETURNS BOOLEAN AS $$
DECLARE
    v_schema_name VARCHAR(63);
    v_exists BOOLEAN;
BEGIN
    -- Get schema name for tenant
    SELECT schema_name INTO v_schema_name 
    FROM kss_system.tenants 
    WHERE tenant_id = p_tenant_id;
    
    IF v_schema_name IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if schema actually exists in database
    SELECT EXISTS(
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = v_schema_name
    ) INTO v_exists;
    
    RETURN v_exists;
END;
$$ LANGUAGE plpgsql;

-- Function to get tenant's first job date
CREATE OR REPLACE FUNCTION kss_system.get_tenant_first_job_date(p_tenant_id VARCHAR(50))
RETURNS TIMESTAMP AS $$
DECLARE
    v_schema_name VARCHAR(63);
    v_first_job_date TIMESTAMP;
BEGIN
    -- Get schema name (will raise exception if tenant doesn't exist)
    v_schema_name := kss_system.get_schema_for_tenant(p_tenant_id);
    
    -- Get first job date from tenant's sync_jobs table
    EXECUTE format('SELECT MIN(created_at) FROM %I.sync_jobs', v_schema_name)
    INTO v_first_job_date;
    
    RETURN v_first_job_date;
EXCEPTION
    WHEN OTHERS THEN
        -- Return NULL if schema doesn't exist or other error
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to get tenant's last job date
CREATE OR REPLACE FUNCTION kss_system.get_tenant_last_job_date(p_tenant_id VARCHAR(50))
RETURNS TIMESTAMP AS $$
DECLARE
    v_schema_name VARCHAR(63);
    v_last_job_date TIMESTAMP;
BEGIN
    -- Get schema name (will raise exception if tenant doesn't exist)
    v_schema_name := kss_system.get_schema_for_tenant(p_tenant_id);
    
    -- Get last job date from tenant's sync_jobs table
    EXECUTE format('SELECT MAX(created_at) FROM %I.sync_jobs', v_schema_name)
    INTO v_last_job_date;
    
    RETURN v_last_job_date;
EXCEPTION
    WHEN OTHERS THEN
        -- Return NULL if schema doesn't exist or other error
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to get tenant's total job count
CREATE OR REPLACE FUNCTION kss_system.get_tenant_job_count(p_tenant_id VARCHAR(50))
RETURNS INTEGER AS $$
DECLARE
    v_schema_name VARCHAR(63);
    v_job_count INTEGER;
BEGIN
    -- Get schema name (will raise exception if tenant doesn't exist)
    v_schema_name := kss_system.get_schema_for_tenant(p_tenant_id);
    
    -- Get total job count from tenant's sync_jobs table
    EXECUTE format('SELECT COUNT(*) FROM %I.sync_jobs', v_schema_name)
    INTO v_job_count;
    
    RETURN v_job_count;
EXCEPTION
    WHEN OTHERS THEN
        -- Return 0 if schema doesn't exist or other error
        RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get tenant's active jobs summary
CREATE OR REPLACE FUNCTION kss_system.get_tenant_active_jobs(p_tenant_id VARCHAR(50))
RETURNS TABLE(job_id VARCHAR(100), job_type VARCHAR(50), started_at TIMESTAMP) AS $$
DECLARE
    v_schema_name VARCHAR(63);
BEGIN
    -- Get schema name (will raise exception if tenant doesn't exist)
    v_schema_name := kss_system.get_schema_for_tenant(p_tenant_id);
    
    -- Return active jobs from tenant's sync_jobs table
    RETURN QUERY EXECUTE format('
        SELECT j.job_id, j.job_type, j.started_at 
        FROM %I.sync_jobs j 
        WHERE j.status = ''running''
        ORDER BY j.started_at DESC
    ', v_schema_name);
EXCEPTION
    WHEN OTHERS THEN
        -- Return empty result set if schema doesn't exist or other error
        RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to get tenant sync health and data status
CREATE OR REPLACE FUNCTION kss_system.get_tenant_sync_health(p_tenant_id VARCHAR(50))
RETURNS TABLE(
    successful_jobs INTEGER,
    failed_jobs INTEGER,
    last_successful_job_date TIMESTAMP,
    last_failed_job_date TIMESTAMP,
    consecutive_failures INTEGER,
    success_rate DECIMAL(5,2),
    has_data BOOLEAN,
    needs_sync BOOLEAN
) AS $$
DECLARE
    v_schema_name VARCHAR(63);
    v_successful_jobs INTEGER := 0;
    v_failed_jobs INTEGER := 0;
    v_last_successful_job_date TIMESTAMP;
    v_last_failed_job_date TIMESTAMP;
    v_consecutive_failures INTEGER := 0;
    v_success_rate DECIMAL(5,2) := 0.00;
    v_has_data BOOLEAN := FALSE;
    v_needs_sync BOOLEAN := TRUE;
    v_total_jobs INTEGER;
    v_issues_count INTEGER := 0;
    v_sprints_count INTEGER := 0;
    v_boards_count INTEGER := 0;
BEGIN
    -- Get schema name (will raise exception if tenant doesn't exist)
    v_schema_name := kss_system.get_schema_for_tenant(p_tenant_id);
    
    -- Get job success/failure counts
    EXECUTE format('SELECT COUNT(*) FROM %I.sync_jobs WHERE status = ''success''', v_schema_name)
    INTO v_successful_jobs;
    
    EXECUTE format('SELECT COUNT(*) FROM %I.sync_jobs WHERE status = ''failed''', v_schema_name)
    INTO v_failed_jobs;
    
    -- Get last successful job date
    EXECUTE format('SELECT MAX(completed_at) FROM %I.sync_jobs WHERE status = ''success''', v_schema_name)
    INTO v_last_successful_job_date;
    
    -- Get last failed job date
    EXECUTE format('SELECT MAX(completed_at) FROM %I.sync_jobs WHERE status = ''failed''', v_schema_name)
    INTO v_last_failed_job_date;
    
    -- Calculate consecutive failures (count failed jobs since last success)
    IF v_last_successful_job_date IS NOT NULL THEN
        EXECUTE format('
            SELECT COUNT(*) FROM %I.sync_jobs 
            WHERE status = ''failed'' 
            AND created_at > %L
        ', v_schema_name, v_last_successful_job_date)
        INTO v_consecutive_failures;
    ELSE
        -- No successful jobs, count all failed jobs
        v_consecutive_failures := v_failed_jobs;
    END IF;
    
    -- Calculate success rate
    v_total_jobs := v_successful_jobs + v_failed_jobs;
    IF v_total_jobs > 0 THEN
        v_success_rate := ROUND((v_successful_jobs::DECIMAL / v_total_jobs::DECIMAL) * 100, 2);
    END IF;
    
    -- Check if tenant has actual data (issues, sprints, boards)
    BEGIN
        EXECUTE format('SELECT COUNT(*) FROM %I.issues', v_schema_name) INTO v_issues_count;
        EXECUTE format('SELECT COUNT(*) FROM %I.sprints', v_schema_name) INTO v_sprints_count;
        EXECUTE format('SELECT COUNT(*) FROM %I.boards', v_schema_name) INTO v_boards_count;
        
        v_has_data := (v_issues_count > 0 OR v_boards_count > 0);
    EXCEPTION
        WHEN OTHERS THEN
            v_has_data := FALSE;
    END;
    
    -- Determine if sync is needed based on multiple factors
    v_needs_sync := (
        -- No data at all
        NOT v_has_data OR
        -- No successful jobs ever
        v_successful_jobs = 0 OR
        -- High consecutive failure rate (3+ failures)
        v_consecutive_failures >= 3 OR
        -- Very low success rate (less than 50%)
        (v_total_jobs >= 5 AND v_success_rate < 50.00) OR
        -- Last successful sync was more than 30 days ago
        (v_last_successful_job_date IS NOT NULL AND v_last_successful_job_date < NOW() - INTERVAL '30 days')
    );
    
    RETURN QUERY SELECT 
        v_successful_jobs,
        v_failed_jobs,
        v_last_successful_job_date,
        v_last_failed_job_date,
        v_consecutive_failures,
        v_success_rate,
        v_has_data,
        v_needs_sync;
        
EXCEPTION
    WHEN OTHERS THEN
        -- Return default values if schema doesn't exist or other error
        RETURN QUERY SELECT 0, 0, NULL::TIMESTAMP, NULL::TIMESTAMP, 0, 0.00::DECIMAL(5,2), FALSE, TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get comprehensive tenant status
DROP FUNCTION IF EXISTS kss_system.get_tenant_comprehensive_status(VARCHAR(50));
CREATE OR REPLACE FUNCTION kss_system.get_tenant_comprehensive_status(p_tenant_id VARCHAR(50))
RETURNS TABLE(
    tenant_id VARCHAR(50),
    tenant_record_exists BOOLEAN,
    schema_exists BOOLEAN,
    schema_name VARCHAR(63),
    created_at TIMESTAMP,
    total_jobs INTEGER,
    first_job_date TIMESTAMP,
    last_job_date TIMESTAMP,
    active_job_count INTEGER,
    successful_jobs INTEGER,
    failed_jobs INTEGER,
    last_successful_job_date TIMESTAMP,
    consecutive_failures INTEGER,
    success_rate DECIMAL(5,2),
    has_data BOOLEAN,
    needs_sync BOOLEAN,
    proactive_sync_complete BOOLEAN
) AS $$
DECLARE
    v_tenant_record_exists BOOLEAN;
    v_schema_exists BOOLEAN;
    v_schema_name VARCHAR(63);
    v_created_at TIMESTAMP;
    v_total_jobs INTEGER;
    v_first_job_date TIMESTAMP;
    v_last_job_date TIMESTAMP;
    v_active_job_count INTEGER;
    v_successful_jobs INTEGER;
    v_failed_jobs INTEGER;
    v_last_successful_job_date TIMESTAMP;
    v_consecutive_failures INTEGER;
    v_success_rate DECIMAL(5,2);
    v_has_data BOOLEAN;
    v_needs_sync BOOLEAN;
    v_proactive_sync_complete BOOLEAN;
BEGIN
    -- Check if tenant record exists
    v_tenant_record_exists := kss_system.tenant_exists(p_tenant_id);
    
    -- Get tenant details if record exists
    IF v_tenant_record_exists THEN
        SELECT t.schema_name, t.created_at 
        INTO v_schema_name, v_created_at
        FROM kss_system.tenants t 
        WHERE t.tenant_id = p_tenant_id;
        
        -- Check if schema actually exists
        v_schema_exists := kss_system.check_tenant_schema_exists(p_tenant_id);
        
        -- Get job statistics if schema exists
        IF v_schema_exists THEN
            v_total_jobs := kss_system.get_tenant_job_count(p_tenant_id);
            v_first_job_date := kss_system.get_tenant_first_job_date(p_tenant_id);
            v_last_job_date := kss_system.get_tenant_last_job_date(p_tenant_id);
            
            -- Count active jobs
            EXECUTE format('SELECT COUNT(*) FROM %I.sync_jobs WHERE status = ''running''', v_schema_name)
            INTO v_active_job_count;
        ELSE
            v_total_jobs := 0;
            v_first_job_date := NULL;
            v_last_job_date := NULL;
            v_active_job_count := 0;
        END IF;
    ELSE
        v_schema_exists := FALSE;
        v_schema_name := NULL;
        v_created_at := NULL;
        v_total_jobs := 0;
        v_first_job_date := NULL;
        v_last_job_date := NULL;
        v_active_job_count := 0;
    END IF;
    
    -- Get sync health data if schema exists
    IF v_schema_exists THEN
        -- Get sync health information
        EXECUTE format('
            SELECT successful_jobs, failed_jobs, last_successful_job_date, 
                   consecutive_failures, success_rate, has_data, needs_sync
            FROM kss_system.get_tenant_sync_health(%L)
        ', p_tenant_id)
        INTO v_successful_jobs, v_failed_jobs, v_last_successful_job_date, 
             v_consecutive_failures, v_success_rate, v_has_data, v_needs_sync;
        
        -- Check proactive sync completion status
        -- Verify both required job types exist and have succeeded (not necessarily the latest jobs)
        EXECUTE format('
            WITH job_status AS (
                SELECT 
                    COUNT(CASE WHEN job_type = ''sprints'' AND status = ''success'' THEN 1 END) as sprints_success_count,
                    COUNT(CASE WHEN job_type = ''proactive_sprints_sync'' AND status = ''success'' THEN 1 END) as proactive_sync_success_count
                FROM %I.sync_jobs
            )
            SELECT CASE 
                WHEN sprints_success_count > 0 AND proactive_sync_success_count > 0
                THEN TRUE 
                ELSE FALSE 
            END
            FROM job_status
        ', v_schema_name)
        INTO v_proactive_sync_complete;
    ELSE
        -- Default values for non-existent schema
        v_successful_jobs := 0;
        v_failed_jobs := 0;
        v_last_successful_job_date := NULL;
        v_consecutive_failures := 0;
        v_success_rate := 0.00;
        v_has_data := FALSE;
        v_needs_sync := TRUE;
        v_proactive_sync_complete := FALSE;
    END IF;
    
    -- Return comprehensive status
    RETURN QUERY SELECT 
        p_tenant_id,
        v_tenant_record_exists,
        v_schema_exists,
        v_schema_name,
        v_created_at,
        v_total_jobs,
        v_first_job_date,
        v_last_job_date,
        v_active_job_count,
        v_successful_jobs,
        v_failed_jobs,
        v_last_successful_job_date,
        v_consecutive_failures,
        v_success_rate,
        v_has_data,
        v_needs_sync,
        v_proactive_sync_complete;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TENANT DELETION FUNCTIONS
-- =============================================================================

-- Function to get tenant deletion impact analysis
CREATE OR REPLACE FUNCTION kss_system.get_tenant_deletion_impact(p_tenant_id VARCHAR(50))
RETURNS TABLE(
    tenant_exists BOOLEAN,
    schema_exists BOOLEAN,
    schema_name VARCHAR(63),
    active_jobs INTEGER,
    total_jobs INTEGER,
    issues_count INTEGER,
    sprints_count INTEGER,
    boards_count INTEGER,
    comments_count INTEGER,
    worklogs_count INTEGER,
    changelogs_count INTEGER,
    relationships_count INTEGER,
    sprint_issues_count INTEGER,
    issue_links_count INTEGER,
    can_delete BOOLEAN,
    blocking_reasons TEXT[]
) AS $$
DECLARE
    v_tenant_exists BOOLEAN := FALSE;
    v_schema_exists BOOLEAN := FALSE;
    v_schema_name VARCHAR(63);
    v_active_jobs INTEGER := 0;
    v_total_jobs INTEGER := 0;
    v_issues_count INTEGER := 0;
    v_sprints_count INTEGER := 0;
    v_boards_count INTEGER := 0;
    v_comments_count INTEGER := 0;
    v_worklogs_count INTEGER := 0;
    v_changelogs_count INTEGER := 0;
    v_relationships_count INTEGER := 0;
    v_sprint_issues_count INTEGER := 0;
    v_issue_links_count INTEGER := 0;
    v_can_delete BOOLEAN := FALSE;
    v_blocking_reasons TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if tenant record exists
    v_tenant_exists := kss_system.tenant_exists(p_tenant_id);
    
    IF NOT v_tenant_exists THEN
        v_blocking_reasons := array_append(v_blocking_reasons, 'Tenant does not exist');
    ELSE
        -- Get schema name
        SELECT t.schema_name INTO v_schema_name 
        FROM kss_system.tenants t 
        WHERE t.tenant_id = p_tenant_id;
        
        -- Check if schema actually exists
        v_schema_exists := kss_system.check_tenant_schema_exists(p_tenant_id);
        
        IF NOT v_schema_exists THEN
            v_blocking_reasons := array_append(v_blocking_reasons, 'Tenant schema does not exist');
        ELSE
            -- Count active jobs
            BEGIN
                EXECUTE format('SELECT COUNT(*) FROM %I.sync_jobs WHERE status = ''running''', v_schema_name)
                INTO v_active_jobs;
            EXCEPTION
                WHEN OTHERS THEN
                    v_active_jobs := 0;
            END;
            
            -- Count total jobs
            BEGIN
                EXECUTE format('SELECT COUNT(*) FROM %I.sync_jobs', v_schema_name)
                INTO v_total_jobs;
            EXCEPTION
                WHEN OTHERS THEN
                    v_total_jobs := 0;
            END;
            
            -- Count data in each table
            BEGIN
                EXECUTE format('SELECT COUNT(*) FROM %I.issues', v_schema_name) INTO v_issues_count;
            EXCEPTION WHEN OTHERS THEN v_issues_count := 0;
            END;
            
            BEGIN
                EXECUTE format('SELECT COUNT(*) FROM %I.sprints', v_schema_name) INTO v_sprints_count;
            EXCEPTION WHEN OTHERS THEN v_sprints_count := 0;
            END;
            
            BEGIN
                EXECUTE format('SELECT COUNT(*) FROM %I.boards', v_schema_name) INTO v_boards_count;
            EXCEPTION WHEN OTHERS THEN v_boards_count := 0;
            END;
            
            BEGIN
                EXECUTE format('SELECT COUNT(*) FROM %I.comments', v_schema_name) INTO v_comments_count;
            EXCEPTION WHEN OTHERS THEN v_comments_count := 0;
            END;
            
            BEGIN
                EXECUTE format('SELECT COUNT(*) FROM %I.worklogs', v_schema_name) INTO v_worklogs_count;
            EXCEPTION WHEN OTHERS THEN v_worklogs_count := 0;
            END;
            
            BEGIN
                EXECUTE format('SELECT COUNT(*) FROM %I.changelogs', v_schema_name) INTO v_changelogs_count;
            EXCEPTION WHEN OTHERS THEN v_changelogs_count := 0;
            END;
            
            BEGIN
                EXECUTE format('SELECT COUNT(*) FROM %I.issue_relationships', v_schema_name) INTO v_relationships_count;
            EXCEPTION WHEN OTHERS THEN v_relationships_count := 0;
            END;
            
            BEGIN
                EXECUTE format('SELECT COUNT(*) FROM %I.sprint_issues', v_schema_name) INTO v_sprint_issues_count;
            EXCEPTION WHEN OTHERS THEN v_sprint_issues_count := 0;
            END;
            
            BEGIN
                EXECUTE format('SELECT COUNT(*) FROM %I.issue_links', v_schema_name) INTO v_issue_links_count;
            EXCEPTION WHEN OTHERS THEN v_issue_links_count := 0;
            END;
            
            -- Check for blocking conditions
            IF v_active_jobs > 0 THEN
                v_blocking_reasons := array_append(v_blocking_reasons, 
                    format('%s active jobs are running', v_active_jobs));
            END IF;
        END IF;
    END IF;
    
    -- Determine if deletion can proceed (only blocked by active jobs, not by data existence)
    v_can_delete := v_tenant_exists AND v_schema_exists AND v_active_jobs = 0;
    
    -- Return impact analysis
    RETURN QUERY SELECT 
        v_tenant_exists,
        v_schema_exists,
        v_schema_name,
        v_active_jobs,
        v_total_jobs,
        v_issues_count,
        v_sprints_count,
        v_boards_count,
        v_comments_count,
        v_worklogs_count,
        v_changelogs_count,
        v_relationships_count,
        v_sprint_issues_count,
        v_issue_links_count,
        v_can_delete,
        v_blocking_reasons;
END;
$$ LANGUAGE plpgsql;

-- Function to safely delete a tenant schema and record
CREATE OR REPLACE FUNCTION kss_system.delete_tenant_schema(
    p_tenant_id VARCHAR(50),
    p_force BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
    success BOOLEAN,
    schema_dropped BOOLEAN,
    tenant_record_deleted BOOLEAN,
    message TEXT,
    deleted_counts JSONB
) AS $$
DECLARE
    v_tenant_exists BOOLEAN := FALSE;
    v_schema_exists BOOLEAN := FALSE;
    v_schema_name VARCHAR(63);
    v_active_jobs INTEGER := 0;
    v_success BOOLEAN := FALSE;
    v_schema_dropped BOOLEAN := FALSE;
    v_tenant_record_deleted BOOLEAN := FALSE;
    v_message TEXT := '';
    v_deleted_counts JSONB := '{}'::JSONB;
    v_impact_record RECORD;
BEGIN
    -- Get deletion impact first
    SELECT * INTO v_impact_record 
    FROM kss_system.get_tenant_deletion_impact(p_tenant_id);
    
    v_tenant_exists := v_impact_record.tenant_exists;
    v_schema_exists := v_impact_record.schema_exists;
    v_schema_name := v_impact_record.schema_name;
    v_active_jobs := v_impact_record.active_jobs;
    
    -- Build deleted counts JSON
    v_deleted_counts := jsonb_build_object(
        'issues', v_impact_record.issues_count,
        'sprints', v_impact_record.sprints_count,
        'boards', v_impact_record.boards_count,
        'comments', v_impact_record.comments_count,
        'worklogs', v_impact_record.worklogs_count,
        'changelogs', v_impact_record.changelogs_count,
        'relationships', v_impact_record.relationships_count,
        'sprint_issues', v_impact_record.sprint_issues_count,
        'issue_links', v_impact_record.issue_links_count,
        'total_jobs', v_impact_record.total_jobs,
        'active_jobs_terminated', CASE WHEN p_force THEN v_active_jobs ELSE 0 END
    );
    
    -- Validation checks
    IF NOT v_tenant_exists THEN
        v_message := format('Tenant ''%s'' does not exist', p_tenant_id);
        RETURN QUERY SELECT FALSE, FALSE, FALSE, v_message, v_deleted_counts;
        RETURN;
    END IF;
    
    -- Check for active jobs (unless forced)
    IF v_active_jobs > 0 AND NOT p_force THEN
        v_message := format('Cannot delete tenant ''%s'': %s active jobs are running. Use force=true to override.', 
                           p_tenant_id, v_active_jobs);
        RETURN QUERY SELECT FALSE, FALSE, FALSE, v_message, v_deleted_counts;
        RETURN;
    END IF;
    
    -- Begin deletion process
    BEGIN
        -- Drop schema if it exists
        IF v_schema_exists THEN
            EXECUTE format('DROP SCHEMA %I CASCADE', v_schema_name);
            v_schema_dropped := TRUE;
        END IF;
        
        -- Delete tenant record
        DELETE FROM kss_system.tenants WHERE tenant_id = p_tenant_id;
        v_tenant_record_deleted := (FOUND);
        
        -- Success
        v_success := TRUE;
        IF p_force AND v_active_jobs > 0 THEN
            v_message := format('Tenant ''%s'' deleted successfully (forced deletion with %s active jobs terminated)', 
                               p_tenant_id, v_active_jobs);
        ELSE
            v_message := format('Tenant ''%s'' deleted successfully', p_tenant_id);
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback will happen automatically
            v_success := FALSE;
            v_message := format('Failed to delete tenant ''%s'': %s', p_tenant_id, SQLERRM);
    END;
    
    -- Return result
    RETURN QUERY SELECT 
        v_success,
        v_schema_dropped,
        v_tenant_record_deleted,
        v_message,
        v_deleted_counts;
END;
$$ LANGUAGE plpgsql;

-- Function to backup tenant data (basic implementation)
CREATE OR REPLACE FUNCTION kss_system.backup_tenant_data(
    p_tenant_id VARCHAR(50),
    p_backup_location TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    backup_info JSONB,
    message TEXT
) AS $$
DECLARE
    v_tenant_exists BOOLEAN := FALSE;
    v_schema_exists BOOLEAN := FALSE;
    v_schema_name VARCHAR(63);
    v_success BOOLEAN := FALSE;
    v_backup_info JSONB := '{}'::JSONB;
    v_message TEXT := '';
    v_backup_timestamp TEXT;
    v_impact_record RECORD;
BEGIN
    -- Check if tenant exists
    v_tenant_exists := kss_system.tenant_exists(p_tenant_id);
    
    IF NOT v_tenant_exists THEN
        v_message := format('Tenant ''%s'' does not exist', p_tenant_id);
        RETURN QUERY SELECT FALSE, v_backup_info, v_message;
        RETURN;
    END IF;
    
    -- Get tenant details
    SELECT schema_name INTO v_schema_name 
    FROM kss_system.tenants 
    WHERE tenant_id = p_tenant_id;
    
    v_schema_exists := kss_system.check_tenant_schema_exists(p_tenant_id);
    
    IF NOT v_schema_exists THEN
        v_message := format('Tenant ''%s'' schema does not exist', p_tenant_id);
        RETURN QUERY SELECT FALSE, v_backup_info, v_message;
        RETURN;
    END IF;
    
    -- Get data counts for backup info
    SELECT * INTO v_impact_record 
    FROM kss_system.get_tenant_deletion_impact(p_tenant_id);
    
    -- Generate backup timestamp
    v_backup_timestamp := to_char(NOW(), 'YYYY-MM-DD_HH24-MI-SS');
    
    -- Build backup info (metadata only - actual backup would be implemented separately)
    v_backup_info := jsonb_build_object(
        'tenant_id', p_tenant_id,
        'schema_name', v_schema_name,
        'backup_timestamp', v_backup_timestamp,
        'backup_location', COALESCE(p_backup_location, format('/backups/tenant_%s_%s', p_tenant_id, v_backup_timestamp)),
        'data_counts', jsonb_build_object(
            'issues', v_impact_record.issues_count,
            'sprints', v_impact_record.sprints_count,
            'boards', v_impact_record.boards_count,
            'comments', v_impact_record.comments_count,
            'worklogs', v_impact_record.worklogs_count,
            'changelogs', v_impact_record.changelogs_count,
            'relationships', v_impact_record.relationships_count,
            'sprint_issues', v_impact_record.sprint_issues_count,
            'issue_links', v_impact_record.issue_links_count,
            'total_jobs', v_impact_record.total_jobs
        )
    );
    
    -- For now, just return metadata (actual backup implementation would go here)
    v_success := TRUE;
    v_message := format('Backup metadata prepared for tenant ''%s'' (actual backup implementation pending)', p_tenant_id);
    
    RETURN QUERY SELECT v_success, v_backup_info, v_message;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TENANT SCHEMA VERSION FUNCTION
-- =============================================================================

-- Function to get schema version for a tenant
CREATE OR REPLACE FUNCTION kss_system.get_tenant_schema_version(p_tenant_id VARCHAR(50))
RETURNS INTEGER AS $$
DECLARE
    v_schema_version INTEGER;
BEGIN
    SELECT schema_version INTO v_schema_version 
    FROM kss_system.tenants 
    WHERE tenant_id = p_tenant_id;
    
    IF v_schema_version IS NULL THEN
        RAISE EXCEPTION 'Tenant % not found', p_tenant_id;
    END IF;
    
    RETURN v_schema_version;
END;
$$ LANGUAGE plpgsql;