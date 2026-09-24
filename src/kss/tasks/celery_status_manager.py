##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Celery-native job status management.
This module provides status retrieval using Celery's native AsyncResult functionality.
"""

import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from celery.result import AsyncResult
from celery.exceptions import WorkerLostError, Retry

from .celery_app import app

logger = logging.getLogger(__name__)


class CeleryJobStatusManager:
    """
    Manages job status retrieval using Celery's native AsyncResult.

    This class provides a unified interface for querying job status directly
    from Celery's result backend, eliminating the need for custom database
    tracking while maintaining comprehensive status information.
    """

    # Celery status to business status mapping
    STATUS_MAPPING = {
        "PENDING": "pending",
        "STARTED": "running",
        "SUCCESS": "success",
        "FAILURE": "failed",
        "RETRY": "running",
        "REVOKED": "cancelled",
    }

    def __init__(self):
        """Initialize the status manager with Celery app reference."""
        self.app = app

    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """
        Get job status using simplified logic.

        Args:
            job_id: Celery task_id to query

        Returns:
            Dict containing minimal job status information:
            - job_id: The task ID
            - name: Task name
            - type: Task type (simple/workflow)
            - status: Business-friendly status

        Raises:
            ValueError: If job_id is invalid
            RuntimeError: If Celery backend is unavailable
        """
        try:
            # Validate job_id format
            if not job_id or not isinstance(job_id, str):
                raise ValueError(f"Invalid job_id format: {job_id}")

            # Get AsyncResult for the task
            result = AsyncResult(job_id, app=self.app)

            # Check if this is a simple task (no children and no parent)
            has_children = hasattr(result, "children") and result.children
            has_parent = hasattr(result, "parent") and result.parent

            if not has_children:
                # Simple task - return its direct status
                return self._build_simple_status(result)
            else:
                # Workflow task - check all children and parent
                return self._build_workflow_status(result)

        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Error retrieving status for job {job_id}: {e}")
            raise RuntimeError(f"Celery backend unavailable or error: {str(e)}")

    def _build_simple_status(self, result: AsyncResult) -> Dict[str, Any]:
        """Build status response for simple tasks."""
        celery_status = result.status
        business_status = self.STATUS_MAPPING.get(celery_status, "unknown")

        return {
            "job_id": result.id,
            "name": getattr(result, "name", "unknown"),
            "type": "simple",
            "status": business_status,
        }

    def _build_workflow_status(self, result: AsyncResult) -> Dict[str, Any]:
        """Build status response for workflow tasks."""
        # Check if all children's children are SUCCESS
        all_success = True

        # Check children's children
        if hasattr(result, "children") and result.children:
            for child in result.children:
                if hasattr(child, "children") and child.children:
                    for grandchild in child.children:
                        grandchild_result = AsyncResult(grandchild.id, app=self.app)
                        if grandchild_result.status != "SUCCESS":
                            all_success = False
                            break
                    if not all_success:
                        break

        # Return success only if everything is SUCCESS, otherwise pending
        status = "success" if all_success else "pending"
        
        date_done_str = None
        if hasattr(result, "date_done") and result.date_done:
            date_done_str = result.date_done.isoformat()
            
        # last_synced_at = result.date_done.isoformat() if result.ready() and result.date_done else result.date_start.isoformat()

        return {
            "job_id": result.id,
            "name": getattr(result, "name", "unknown"),
            "type": "workflow",
            "status": status,
            "date_done": date_done_str
        }

    def _task_exists(self, result: AsyncResult) -> bool:
        """
        Check if task exists in Celery backend.

        Note: This is a best-effort check. Celery's AsyncResult returns PENDING
        for both waiting tasks and non-existent task IDs, making it difficult
        to distinguish between them reliably across different backends.

        Args:
            result: AsyncResult instance

        Returns:
            bool: True if task likely exists, False otherwise
        """
        try:
            # Tasks with non-PENDING status definitely exist
            if result.state != "PENDING":
                return True

            # For PENDING tasks, we can't reliably determine existence
            # without backend-specific logic, so we assume they exist
            return True

        except Exception as e:
            logger.debug(f"Error checking task existence for {result.id}: {e}")
            return False

    def validate_job_id(self, job_id: str) -> bool:
        """
        Validate job_id format.

        Args:
            job_id: Job ID to validate

        Returns:
            bool: True if valid, False otherwise
        """
        if not job_id or not isinstance(job_id, str):
            return False

        # Basic UUID format validation (Celery uses UUIDs for task IDs)
        import re

        uuid_pattern = re.compile(
            r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
            re.IGNORECASE,
        )

        return bool(uuid_pattern.match(job_id))


# Global instance for use throughout the application
celery_status_manager = CeleryJobStatusManager()