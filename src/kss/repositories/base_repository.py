##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Base repository class providing common database operations.
All specific repositories inherit from this base class.
"""

import logging
from typing import Any

logger = logging.getLogger(__name__)


class BaseRepository:
    """
    Base repository class with common database operations.
    Provides tenant-aware database access and connection management.
    """

    def __init__(self, tenant_id: str):
        """
        Initialize repository with tenant context.

        Args:
            tenant_id: Tenant identifier for schema isolation
        """
        self.tenant_id = tenant_id
        # Import here to avoid circular imports
        from database import DatabaseManager

        self.db_manager = DatabaseManager()
        self.schema_name = self.db_manager.get_schema_for_tenant(tenant_id)

    def _log_success(self, operation: str, count: int = None):
        """Log successful database operation."""
        if count is not None:
            logger.info(f"✅ {operation}: {count} records")
        else:
            logger.info(f"✅ {operation}")

    def _log_error(self, operation: str, error: Exception):
        """Log database operation error."""
        logger.error(f"❌ {operation}: {error}")