##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Multi-Tenant Manager
Handles all multi-tenant operations including system initialization and tenant provisioning.

This module provides:
- System schema initialization on application startup
- Dynamic tenant schema creation
- Tenant existence checking and management
- SQL file loading and execution
"""

import os
import re
import logging
from typing import List, Optional, Dict, Any
from pathlib import Path
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT, connection

from config import DB_CONFIG
from models.errors import TenantMigrationError

# Configure logging
logger = logging.getLogger(__name__)

class MultiTenantManager:
    """
    Manages multi-tenant database operations.

    Handles system schema initialization, tenant provisioning,
    and provides utilities for tenant management.
    """

    def __init__(self):
        """Initialize the multi-tenant manager."""
        self.db_config = DB_CONFIG
        self.sql_base_path = Path(__file__).parent / "data" / "sql"

    def apply_pending_migrations_if_any(self, tenant_id: str) -> dict[str, str]:

        # Get tenant information
        tenant_info = self.get_tenant_info(tenant_id)

        # Discover and filter pending migrations
        pending_files = self._get_pending_migrations(tenant_info)
        if not pending_files:
            logger.info(f"No pending migrations for tenant {tenant_id}")
            return {
                "tenant_id": tenant_id,
                "applied_files": [],
                "current_version": tenant_info['schema_version'],
                "status": "up_to_date"
            }

        logger.info(f"Found {len(pending_files)} pending migrations for tenant {tenant_id}")

        # Apply migrations with proper transaction management
        results = self._apply_migrations_in_sequence(tenant_id, pending_files)

        return results

    def _apply_migrations_in_sequence(self, tenant_id, pending_files: List[Path]) -> dict:
        """
        Apply migrations in sequence with proper transaction handling.

        Args:
            tenant_id (str): The tenant ID.
            pending_files (List[Path]): List of pending files to apply.

        Returns:
            Migration results
        """
        conn = psycopg2.connect(**self.db_config)
        applied_files = []
        errors = []

        try:
            # Disable autocommit to enable transaction control
            conn.set_isolation_level(
                psycopg2.extensions.ISOLATION_LEVEL_READ_COMMITTED
            )

            # Set search path to tenant schema
            schema_name = f"tenant_{tenant_id}"
            with conn.cursor() as cur:
                cur.execute(f"SET search_path TO {schema_name}")

            for file_path in pending_files:
                file_name = file_path.name
                logger.info(f"Applying migration: {file_name} for tenant {tenant_id}")

                try:
                    # Load and execute SQL
                    sql_content = self._load_sql_file(str(file_path))
                    sql_content = self._substitute_template_variables(sql_content, tenant_id)

                    with conn.cursor() as cur:
                        cur.execute(sql_content)

                    # Update tenant tracking information
                    self.update_tenant_schema_version(conn, tenant_id, file_name)

                    # Commit this migration
                    conn.commit()

                    applied_files.append(file_name)
                    logger.info(f"Successfully applied: {file_name}")

                except Exception as e:
                    # Rollback this migration
                    conn.rollback()
                    error_msg = f"Failed to apply {file_name}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)

                    # For data integrity, we stop on first error
                    raise TenantMigrationError(
                        message=f"Tenant schema migration failed at {file_name}",
                        details={
                            "original_error": str(e),
                            "initiator": file_name
                        },
                        tenant_id=tenant_id
                    ) from e

            return {
                "tenant_id": tenant_id,
                "applied_files": applied_files,
                "errors": errors,
                "success": len(errors) == 0
            }

        except Exception as e:
            # Rollback transaction on any failure
            logger.error(f"❌ Rolling back transaction due to error: {e}")
            conn.rollback()
            raise
        finally:
            conn.close()

    def update_tenant_schema_version(self, conn: connection, tenant_id: str, file_name: str) -> None:
        """
        Update tenant's migration tracking after each successful file.

        Args:
            tenant_id: Tenant ID
            file_name: Name of the applied migration file
        """
        file_version = self.extract_version_from_file_name(file_name)
        schema_name = "tenant_" + re.sub(r"[^a-zA-Z0-9]", "", tenant_id.lower())

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO kss_system.tenants 
                (tenant_id, schema_name, schema_version, last_applied_file, last_updated_at)
                VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (tenant_id) 
                DO UPDATE SET
                    schema_version = EXCLUDED.schema_version,
                    last_applied_file = EXCLUDED.last_applied_file,
                    last_updated_at = CURRENT_TIMESTAMP;
                """,
                (tenant_id, schema_name, file_version, file_name,),
            )

    @staticmethod
    def extract_version_from_file_name(file_name: str) -> int:
        """
        Extract version from file name.

        Args:
            file_name (str): File name.

        Returns:
            int: Version extracted from file name.
        """
        match = re.match(r'^(\d{3})_', file_name)
        if not match:
            raise ValueError(f"Cannot extract version from filename: {file_name}")

        file_version = int(match.group(1))

        return file_version

    def _get_pending_migrations(self, tenant_info: dict) -> list[Path]:
        all_files = self._discover_tenant_schema_files()

        current_version = tenant_info['schema_version']
        current_file = tenant_info.get('last_applied_file', '')

        # Filter and sort pending files
        pending_files = []

        for file_path in all_files:
            file_name = file_path.name

            # Extract version number from filename
            match = re.match(r'^(\d{3})_', file_name)
            if not match:
                logger.warning(f"Skipping file with invalid naming pattern: {file_name}")
                continue

            file_version = int(match.group(1))

            # Check if file needs to be applied
            if file_version > current_version:
                pending_files.append((file_version, file_path))

        # Sort by version number
        pending_files.sort(key=lambda x: x[0])

        # Return only the file paths in order
        return [file_path for _, file_path in pending_files]

    def initialize_system_schema(self) -> bool:
        """
        Initialize the system schema.

        This should be called once during application startup.
        Creates the kss_system schema, tenants table, and management functions.

        Returns:
            bool: True if successful, False otherwise
        """
        all_files = self._discover_system_schema_files()

        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:

                    for file_path in all_files:
                        file_name = file_path.name

                        sql_content = self._load_sql_file(str(file_path))
                        cur.execute(sql_content)
                        logger.info(f"✅ Successfully executed : {file_name}")

                    conn.commit()

            logger.info("🎉 Multi-tenant system initialization completed successfully")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to initialize multi-tenant system: {e}")
            return False

    def ensure_tenant_exists(self, tenant_id: str) -> bool:
        """
        Ensure a tenant schema exists, creating it if necessary.

        This method is called automatically when a tenant is accessed.
        It's safe to call multiple times for the same tenant.

        Args:
            tenant_id: The tenant identifier

        Returns:
            bool: True if tenant exists or was created successfully

        Raises:
            ValueError: If tenant_id is invalid
            Exception: If tenant creation fails
        """
        # Validate tenant ID format
        if not self._is_valid_tenant_id(tenant_id):
            raise ValueError(f"Invalid tenant ID format: {tenant_id}")

        try:
            # Check if tenant already exists
            if self.tenant_exists(tenant_id):
                self.apply_pending_migrations_if_any(tenant_id)
                return True

            # Create tenant schema
            logger.info(f"Creating new tenant schema for: {tenant_id}")
            return self.create_tenant_schema(tenant_id)

        except Exception as e:
            logger.error(f"Failed to ensure tenant '{tenant_id}' exists: {e}")
            raise

    def create_tenant_schema(self, tenant_id: str) -> bool:
        """
        Create a new tenant schema with all required tables.

        Args:
            tenant_id: The tenant identifier

        Returns:
            bool: True if successful, False otherwise

        Raises:
            ValueError: If tenant_id is invalid
            Exception: If creation fails
        """
        if not self._is_valid_tenant_id(tenant_id):
            raise ValueError(f"Invalid tenant ID format: {tenant_id}")

        try:
            # Use the new file-based approach to create tenant schema
            success = self._execute_schema_files(tenant_id)

            if success:
                # Generate schema name for logging (same logic as template substitution)
                schema_name = "tenant_" + re.sub(r"[^a-zA-Z0-9]", "", tenant_id.lower())

                # Get and log the final schema version
                try:
                    schema_version = self.get_tenant_schema_version(tenant_id)
                    logger.info(
                        f"✅ Created tenant schema '{schema_name}' for tenant '{tenant_id}' with schema version {schema_version}"
                    )
                except Exception as version_error:
                    logger.warning(
                        f"Could not retrieve schema version for tenant '{tenant_id}': {version_error}"
                    )
                    logger.info(
                        f"✅ Created tenant schema '{schema_name}' for tenant '{tenant_id}'"
                    )

                return True
            else:
                logger.error(f"❌ Failed to create tenant schema for '{tenant_id}'")
                return False

        except psycopg2.Error as e:
            # Handle case where tenant already exists (race condition)
            if "already exists" in str(e).lower():
                logger.info(
                    f"Tenant '{tenant_id}' schema already exists (created by another process)"
                )
                return True
            else:
                logger.error(f"❌ Database error creating tenant '{tenant_id}': {e}")
                raise
        except Exception as e:
            logger.error(f"❌ Failed to create tenant schema for '{tenant_id}': {e}")
            raise

    def tenant_exists(self, tenant_id: str) -> bool:
        """
        Check if a tenant exists in the system.

        Args:
            tenant_id: The tenant identifier

        Returns:
            bool: True if tenant exists, False otherwise
        """
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT kss_system.tenant_exists(%s)", (tenant_id,))
                    return cur.fetchone()[0]

        except Exception as e:
            logger.error(f"Error checking if tenant '{tenant_id}' exists: {e}")
            return False

    def get_schema_for_tenant(self, tenant_id: str) -> Optional[str]:
        """
        Get the schema name for a specific tenant.

        Args:
            tenant_id: The tenant identifier

        Returns:
            str: Schema name if tenant exists, None otherwise
        """
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT kss_system.get_schema_for_tenant(%s)", (tenant_id,)
                    )
                    return cur.fetchone()[0]

        except Exception as e:
            logger.debug(f"Tenant '{tenant_id}' not found: {e}")
            return None

    def list_tenants(self) -> List[str]:
        """
        Get a list of all registered tenants.

        Returns:
            List[str]: List of tenant IDs
        """
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT tenant_id FROM kss_system.tenants ORDER BY created_at"
                    )
                    return [row[0] for row in cur.fetchall()]

        except Exception as e:
            logger.error(f"Error listing tenants: {e}")
            return []

    def get_tenant_schema_version(self, tenant_id: str) -> Optional[int]:
        """
        Get the schema version for a specific tenant.

        Args:
            tenant_id: The tenant identifier

        Returns:
            int: Schema version if tenant exists, None otherwise
        """
        if not self._is_valid_tenant_id(tenant_id):
            raise ValueError(f"Invalid tenant ID format: {tenant_id}")

        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT kss_system.get_tenant_schema_version(%s)", (tenant_id,)
                    )
                    result = cur.fetchone()
                    return result[0] if result else None

        except psycopg2.Error as e:
            if "not found" in str(e).lower():
                logger.debug(
                    f"Tenant '{tenant_id}' not found when getting schema version"
                )
                return None
            else:
                logger.error(
                    f"Database error getting schema version for tenant '{tenant_id}': {e}"
                )
                raise
        except Exception as e:
            logger.error(f"Error getting schema version for tenant '{tenant_id}': {e}")
            raise

    def get_tenant_last_applied_file(self, tenant_id: str) -> Optional[str]:
        """
        Get the last applied SQL file name for a specific tenant.

        Args:
            tenant_id: The tenant identifier

        Returns:
            str: Last applied file name if tenant exists, None otherwise
        """
        if not self._is_valid_tenant_id(tenant_id):
            raise ValueError(f"Invalid tenant ID format: {tenant_id}")

        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT last_applied_file FROM kss_system.tenants WHERE tenant_id = %s",
                        (tenant_id,),
                    )
                    result = cur.fetchone()
                    return result[0] if result else None

        except psycopg2.Error as e:
            logger.error(
                f"Database error getting last applied file for tenant '{tenant_id}': {e}"
            )
            raise
        except Exception as e:
            logger.error(
                f"Error getting last applied file for tenant '{tenant_id}': {e}"
            )
            raise

    def get_tenant_info(self, tenant_id: str) -> Optional[Dict[str, Any]]:
        """
        Get comprehensive information about a tenant including schema version and last applied file.

        Args:
            tenant_id: The tenant identifier

        Returns:
            Dict containing tenant information if tenant exists, None otherwise
        """
        if not self._is_valid_tenant_id(tenant_id):
            raise ValueError(f"Invalid tenant ID format: {tenant_id}")

        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """SELECT tenant_id, schema_name, created_at, schema_version, last_applied_file 
                           FROM kss_system.tenants WHERE tenant_id = %s""",
                        (tenant_id,),
                    )
                    result = cur.fetchone()

                    if result:
                        return {
                            "tenant_id": result[0],
                            "schema_name": result[1],
                            "created_at": result[2],
                            "schema_version": result[3],
                            "last_applied_file": result[4],
                        }
                    return None

        except psycopg2.Error as e:
            logger.error(f"Database error getting tenant info for '{tenant_id}': {e}")
            raise
        except Exception as e:
            logger.error(f"Error getting tenant info for '{tenant_id}': {e}")
            raise

    def get_tenant_deletion_impact(self, tenant_id: str) -> Dict[str, Any]:
        """
        Get comprehensive impact analysis before tenant deletion.

        Args:
            tenant_id: The tenant identifier

        Returns:
            Dictionary containing deletion impact analysis
        """
        if not self._is_valid_tenant_id(tenant_id):
            raise ValueError(f"Invalid tenant ID format: {tenant_id}")

        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT * FROM kss_system.get_tenant_deletion_impact(%s)",
                        (tenant_id,),
                    )
                    result = cur.fetchone()

                    if result:
                        # Convert result to dictionary
                        columns = [desc[0] for desc in cur.description]
                        impact_data = dict(zip(columns, result))

                        logger.info(
                            f"Retrieved deletion impact for tenant '{tenant_id}': "
                            f"{impact_data['issues_count']} issues, "
                            f"{impact_data['active_jobs']} active jobs"
                        )

                        return impact_data
                    else:
                        return {
                            "tenant_exists": False,
                            "schema_exists": False,
                            "can_delete": False,
                            "blocking_reasons": ["Tenant not found"],
                        }

        except Exception as e:
            logger.error(f"Error getting deletion impact for tenant '{tenant_id}': {e}")
            raise

    def backup_tenant_data(
        self, tenant_id: str, backup_location: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create backup of tenant data before deletion.

        Args:
            tenant_id: The tenant identifier
            backup_location: Optional backup location path

        Returns:
            Dictionary containing backup information and success status
        """
        if not self._is_valid_tenant_id(tenant_id):
            raise ValueError(f"Invalid tenant ID format: {tenant_id}")

        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT * FROM kss_system.backup_tenant_data(%s, %s)",
                        (tenant_id, backup_location),
                    )
                    result = cur.fetchone()

                    if result:
                        success, backup_info, message = result

                        logger.info(
                            f"Backup operation for tenant '{tenant_id}': {message}"
                        )

                        return {
                            "success": success,
                            "backup_info": backup_info,
                            "message": message,
                        }
                    else:
                        return {
                            "success": False,
                            "backup_info": {},
                            "message": "No backup result returned",
                        }

        except Exception as e:
            logger.error(f"Error creating backup for tenant '{tenant_id}': {e}")
            raise

    def delete_tenant(
        self, tenant_id: str, force: bool = False, create_backup: bool = True
    ) -> Dict[str, Any]:
        """
        Safely delete tenant schema and record.

        Args:
            tenant_id: The tenant identifier
            force: Skip active job checks if True
            create_backup: Create backup before deletion if True

        Returns:
            Dictionary containing deletion result with success status and details
        """
        if not self._is_valid_tenant_id(tenant_id):
            raise ValueError(f"Invalid tenant ID format: {tenant_id}")

        logger.info(
            f"Starting tenant deletion process for '{tenant_id}' (force={force}, backup={create_backup})"
        )

        try:
            # Step 1: Get impact analysis
            impact = self.get_tenant_deletion_impact(tenant_id)

            if not impact["tenant_exists"]:
                logger.warning(f"Attempted to delete non-existent tenant '{tenant_id}'")
                return {
                    "success": False,
                    "message": f"Tenant '{tenant_id}' does not exist",
                    "impact": impact,
                }

            # Step 2: Check for blocking conditions (unless forced)
            if not force and not impact["can_delete"]:
                logger.warning(
                    f"Tenant deletion blocked for '{tenant_id}': {impact['blocking_reasons']}"
                )
                return {
                    "success": False,
                    "message": f"Cannot delete tenant '{tenant_id}': {', '.join(impact['blocking_reasons'])}",
                    "impact": impact,
                    "suggestion": "Use force=true to override active job protection",
                }

            # Step 3: Create backup if requested
            backup_result = None
            if create_backup and impact["schema_exists"]:
                logger.info(f"Creating backup for tenant '{tenant_id}' before deletion")
                backup_result = self.backup_tenant_data(tenant_id)

                if not backup_result["success"]:
                    logger.error(
                        f"Backup failed for tenant '{tenant_id}': {backup_result['message']}"
                    )
                    return {
                        "success": False,
                        "message": f"Backup failed for tenant '{tenant_id}': {backup_result['message']}",
                        "backup_result": backup_result,
                        "impact": impact,
                    }

            # Step 4: Execute deletion
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT * FROM kss_system.delete_tenant_schema(%s, %s)",
                        (tenant_id, force),
                    )
                    result = cur.fetchone()

                    if result:
                        (
                            success,
                            schema_dropped,
                            tenant_record_deleted,
                            message,
                            deleted_counts,
                        ) = result

                        if success:
                            logger.info(
                                f"✅ Successfully deleted tenant '{tenant_id}': {message}"
                            )
                        else:
                            logger.error(
                                f"❌ Failed to delete tenant '{tenant_id}': {message}"
                            )

                        return {
                            "success": success,
                            "message": message,
                            "schema_dropped": schema_dropped,
                            "tenant_record_deleted": tenant_record_deleted,
                            "deleted_counts": deleted_counts,
                            "backup_result": backup_result,
                            "impact": impact,
                            "force_used": force,
                        }
                    else:
                        logger.error(
                            f"No deletion result returned for tenant '{tenant_id}'"
                        )
                        return {
                            "success": False,
                            "message": "No deletion result returned from database",
                            "backup_result": backup_result,
                            "impact": impact,
                        }

        except Exception as e:
            logger.error(f"❌ Error during tenant deletion for '{tenant_id}': {e}")
            return {
                "success": False,
                "message": f"Deletion failed: {str(e)}",
                "error": str(e),
            }

    def _get_connection(self):
        """
        Get a database connection with autocommit enabled.

        Returns:
            Database connection
        """
        conn = psycopg2.connect(**self.db_config)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        return conn

    def _load_sql_file(self, relative_path: str) -> str:
        """
        Load SQL content from a file in the data/sql directory.

        Args:
            relative_path: Path relative to data/sql/ directory

        Returns:
            str: SQL content

        Raises:
            FileNotFoundError: If SQL file doesn't exist
            IOError: If file cannot be read
        """
        sql_file_path = self.sql_base_path / relative_path

        if not sql_file_path.exists():
            raise FileNotFoundError(f"SQL file not found: {sql_file_path}")

        try:
            with open(sql_file_path, "r", encoding="utf-8") as f:
                content = f.read()

            logger.debug(f"Loaded SQL file: {relative_path}")
            return content

        except IOError as e:
            logger.error(f"Error reading SQL file {relative_path}: {e}")
            raise

    def _discover_system_schema_files(self) -> List[Path]:
        schema_dir = self.sql_base_path / "system"
        logger.info(f"Looking for system schema files in '{schema_dir}'")

        try:
            sql_files = list(schema_dir.glob("*.sql"))

            # Sort files by numerical prefix
            def extract_numeric_prefix(file_path: Path) -> int:
                """Extract numerical prefix from filename for sorting."""
                filename = file_path.name
                match = re.match(r"^(\d+)", filename)
                if match:
                    return int(match.group(1))
                else:
                    # Files without numeric prefix go to the end
                    return 999999

            sorted_files = sorted(sql_files, key=extract_numeric_prefix)

            logger.info(f"Discovered {len(sorted_files)} schema files:")
            for file_path in sorted_files:
                logger.info(f"  - {file_path.name}")

            return sorted_files

        except Exception as e:
            logger.error(f"Error discovering schema files in {schema_dir}: {e}")
            raise


    def _discover_tenant_schema_files(self) -> List[Path]:
        """
        Discover and sort SQL schema files from the tenant schema directory.

        Scans the data/sql/schema/tenant/ directory for .sql files and sorts them
        by numerical prefix (001, 002, etc.) to ensure proper execution order.

        Returns:
            List[Path]: Sorted list of SQL file paths

        Raises:
            Exception: If there are issues accessing the directory
        """
        schema_dir = self.sql_base_path / "tenant"

        logger.debug(f"Discovering tenant schema files in directory: {schema_dir}")

        # Handle case where directory doesn't exist
        if not schema_dir.exists():
            logger.warning(f"Schema directory does not exist: {schema_dir}")
            return []

        if not schema_dir.is_dir():
            logger.warning(f"Schema path is not a directory: {schema_dir}")
            return []

        try:
            # Find all .sql files in the directory
            sql_files = list(schema_dir.glob("*.sql"))

            if not sql_files:
                logger.info(f"No SQL files found in schema directory: {schema_dir}")
                return []

            # Sort files by numerical prefix
            def extract_numeric_prefix(file_path: Path) -> int:
                """Extract numerical prefix from filename for sorting."""
                filename = file_path.name
                match = re.match(r"^(\d+)", filename)
                if match:
                    return int(match.group(1))
                else:
                    # Files without numeric prefix go to the end
                    return 999999

            sorted_files = sorted(sql_files, key=extract_numeric_prefix)

            logger.info(f"Discovered {len(sorted_files)} tenant schema files")

            return sorted_files

        except Exception as e:
            logger.error(f"Error discovering schema files in {schema_dir}: {e}")
            raise

    def _execute_schema_files(self, tenant_id: str) -> bool:
        """
        Execute SQL schema files for tenant creation in sequential order.

        Discovers SQL files in the tenant schema directory, sorts them by numerical
        prefix, and executes them sequentially within a single database transaction.
        All file executions are wrapped in a transaction with rollback on failure.

        Args:
            tenant_id: The tenant identifier

        Returns:
            bool: True if all files executed successfully, False otherwise

        Raises:
            ValueError: If tenant_id is invalid
            Exception: If file execution fails
        """
        if not self._is_valid_tenant_id(tenant_id):
            raise ValueError(f"Invalid tenant ID format: {tenant_id}")

        logger.info(f"Starting schema file execution for tenant '{tenant_id}'")

        try:
            # Discover and sort SQL files
            schema_files = self._discover_tenant_schema_files()

            if not schema_files:
                logger.info(
                    f"No schema files found for tenant '{tenant_id}' - schema creation complete"
                )
                return True

            # Execute files within a single transaction
            conn = psycopg2.connect(**self.db_config)
            try:
                # Disable autocommit to enable transaction control
                conn.set_isolation_level(
                    psycopg2.extensions.ISOLATION_LEVEL_READ_COMMITTED
                )

                with conn.cursor() as cur:
                    logger.info(f"Executing {len(schema_files)} schema files for tenant '{tenant_id}'")

                    for i, file_path in enumerate(schema_files, 1):
                        try:
                            logger.info(
                                f"[{i}/{len(schema_files)}] Executing file: {file_path.name}"
                            )

                            # Load SQL content from file
                            with open(file_path, "r", encoding="utf-8") as f:
                                sql_content = f.read()

                            if not sql_content.strip():
                                logger.warning(
                                    f"File {file_path.name} is empty, skipping"
                                )
                                continue

                            # Substitute template variables (using appropriate file name for last_applied_file)
                            processed_sql = self._substitute_template_variables(
                                sql_content, tenant_id, file_path.name
                            )

                            # Execute the SQL
                            cur.execute(processed_sql)

                            logger.info(f"✅ Successfully executed file: {file_path.name}")


                        except Exception as file_error:
                            logger.error(
                                f"❌ Failed to execute file {file_path.name}: {file_error}"
                            )
                            # Re-raise with file context for better error reporting
                            raise Exception(
                                f"SQL execution failed in file '{file_path.name}': {file_error}"
                            ) from file_error

                    # Commit the transaction and update tenant tracking information
                    self.update_tenant_schema_version(conn, tenant_id, file_path.name)
                    conn.commit()
                    logger.info(
                        f"✅ All schema files executed successfully for tenant '{tenant_id}' (last applied: {file_path.name}, last schema: {file_path.name})"
                    )
                    return True

            except Exception as e:
                # Rollback transaction on any failure
                logger.error(f"❌ Rolling back transaction due to error: {e}")
                conn.rollback()
                raise
            finally:
                conn.close()

        except Exception as e:
            logger.error(
                f"❌ Schema file execution failed for tenant '{tenant_id}': {e}"
            )
            raise

    def _substitute_template_variables(
        self, sql_content: str, tenant_id: str, current_file_name: str = None
    ) -> str:
        """
        Substitute template variables in SQL content with tenant-specific values.

        Replaces {tenant_id}, {schema_name}, and {last_applied_file} template variables
        with actual values using the same schema name generation logic as the existing functions.

        Args:
            sql_content: SQL content containing template variables
            tenant_id: The tenant identifier
            current_file_name: Name of the current file being processed (for last_applied_file)

        Returns:
            str: SQL content with template variables substituted

        Raises:
            ValueError: If tenant_id is invalid or required variables are missing
            Exception: If template substitution fails
        """
        if not self._is_valid_tenant_id(tenant_id):
            raise ValueError(f"Invalid tenant ID format: {tenant_id}")

        if not sql_content or not isinstance(sql_content, str):
            raise ValueError("SQL content must be a non-empty string")

        try:
            # Generate schema name using same logic as existing functions
            # Logic: 'tenant_' + lowercase alphanumeric characters only
            schema_name = "tenant_" + re.sub(r"[^a-zA-Z0-9]", "", tenant_id.lower())

            logger.debug(
                f"Generated schema name '{schema_name}' for tenant '{tenant_id}'"
            )

            # Perform template variable substitution
            substituted_content = sql_content
            substituted_content = substituted_content.replace("{tenant_id}", tenant_id)
            substituted_content = substituted_content.replace(
                "{schema_name}", schema_name
            )

            # Substitute last_applied_file if current_file_name is provided
            if current_file_name:
                substituted_content = substituted_content.replace(
                    "{last_applied_file}", current_file_name
                )

            # Validate that all required template variables have been substituted
            remaining_templates = re.findall(r"\{[^}]+\}", substituted_content)
            if remaining_templates:
                logger.warning(
                    f"Unsubstituted template variables found: {remaining_templates}"
                )
                # For now, we'll allow unknown template variables but log them
                # In the future, we might want to make this stricter

            logger.debug(f"Template substitution completed for tenant '{tenant_id}'")
            return substituted_content

        except Exception as e:
            logger.error(
                f"Error substituting template variables for tenant '{tenant_id}': {e}"
            )
            raise

    def _is_valid_tenant_id(self, tenant_id: str) -> bool:
        """
        Validate tenant ID format.

        Args:
            tenant_id: The tenant identifier to validate

        Returns:
            bool: True if valid, False otherwise
        """
        if not tenant_id or not isinstance(tenant_id, str):
            return False

        # Check length (1-50 characters)
        if len(tenant_id) < 1 or len(tenant_id) > 50:
            return False

        # Check format: alphanumeric, hyphens, underscores only
        if not re.match(r"^[a-zA-Z0-9_-]+$", tenant_id):
            return False

        # Ensure it doesn't start or end with special characters
        if tenant_id.startswith(("-", "_")) or tenant_id.endswith(("-", "_")):
            return False

        # Prevent SQL injection by checking for SQL keywords
        sql_keywords = [
            "select",
            "insert",
            "update",
            "delete",
            "drop",
            "create",
            "alter",
            "grant",
            "revoke",
        ]
        if tenant_id.lower() in sql_keywords:
            return False

        return True


# Global instance for use throughout the application
multi_tenant_manager = MultiTenantManager()