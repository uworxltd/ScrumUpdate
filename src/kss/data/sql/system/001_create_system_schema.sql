-- System Schema Creation for Multi-Tenant Support
-- This script creates the core system schema and tenant registry table
-- Run once during application initialization

-- =============================================================================
-- SYSTEM SCHEMA CREATION
-- =============================================================================

-- Create system schema for tenant registry
CREATE SCHEMA IF NOT EXISTS kss_system;

-- =============================================================================
-- TENANT REGISTRY TABLE
-- =============================================================================

-- Minimal tenant registry table
CREATE TABLE IF NOT EXISTS kss_system.tenants (
    tenant_id VARCHAR(50) PRIMARY KEY,
    schema_name VARCHAR(63) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    schema_version INTEGER DEFAULT 1,
    last_applied_file VARCHAR(255)
);

-- Create index for faster tenant lookups
CREATE INDEX IF NOT EXISTS idx_tenants_schema_name ON kss_system.tenants(schema_name);

-- Add comments to document table columns
COMMENT ON COLUMN kss_system.tenants.last_applied_file IS 'Name of the last SQL file applied during tenant schema creation';