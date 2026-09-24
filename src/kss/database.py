##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Database operations module.
Handles PostgreSQL database connections and provides access to repositories.
This separates data access logic from business logic using the Repository pattern.
"""

import psycopg2
import logging
from typing import Optional

from config import DB_CONFIG, APP_CONFIG
from multi_tenant_manager import multi_tenant_manager

# Configure logging
logger = logging.getLogger(__name__)


class DatabaseManager:
    """
    Manages database connections and operations.
    Uses context manager pattern for proper connection handling.
    Supports multi-tenant schema isolation.
    """

    def __init__(self):
        self.config = DB_CONFIG
        self.schema_name = APP_CONFIG["schema_name"]

    def get_connection(self, tenant_id: Optional[str] = None):
        """
        Create and return a database connection.

        Args:
            tenant_id: Optional tenant ID for multi-tenant schema isolation

        Returns:
            Database connection with appropriate search path set
        """
        connection = psycopg2.connect(**self.config)

        if tenant_id:
            # Set search path to tenant-specific schema
            schema_name = self.get_schema_for_tenant(tenant_id)
            with connection.cursor() as cur:
                cur.execute("SET search_path TO %s", (schema_name,))
            connection.commit()

        return connection

    def get_schema_for_tenant(self, tenant_id: str) -> str:
        """
        Get the schema name for a specific tenant.

        This method ensures the tenant exists (creating it if necessary)
        and returns the schema name for database operations.

        Args:
            tenant_id: The tenant identifier

        Returns:
            Schema name for the tenant

        Raises:
            Exception: If tenant creation or lookup fails
        """
        try:
            # Ensure tenant exists (creates if necessary)
            if not multi_tenant_manager.ensure_tenant_exists(tenant_id):
                raise Exception(f"Failed to ensure tenant '{tenant_id}' exists")

            # Get schema name for the tenant
            schema_name = multi_tenant_manager.get_schema_for_tenant(tenant_id)
            if not schema_name:
                raise Exception(f"Could not get schema name for tenant '{tenant_id}'")

            logger.debug(f"Using schema '{schema_name}' for tenant '{tenant_id}'")
            return schema_name

        except Exception as e:
            logger.error(f"Error getting schema for tenant '{tenant_id}': {str(e)}")
            raise Exception(f"Error getting schema for tenant '{tenant_id}': {str(e)}")