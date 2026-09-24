-- Add last_updated_at column in the kss_system.tenants table to record last time migration happened
-- Run once during application initialization

-- =============================================================================
-- MIGRATION: Add last_updated_at column to tenants table
-- =============================================================================

-- Add the last_updated_at column with a default value
ALTER TABLE kss_system.tenants
ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing records to set last_updated_at to created_at value
-- (Because existing records haven't been updated since creation)
UPDATE kss_system.tenants
SET last_updated_at = created_at
WHERE last_updated_at IS DISTINCT FROM created_at;