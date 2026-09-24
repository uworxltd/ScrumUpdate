##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Sync job repository for database operations.
Handles all sync job related database interactions.
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from psycopg2.extras import RealDictCursor

from .base_repository import BaseRepository


class SyncJobRepository(BaseRepository):
    """
    Repository for sync job data operations.
    Encapsulates all sync job related database operations with multi-tenant support.
    """

    def create_job(self, job_data: Dict[str, Any]) -> bool:
        """
        Create a new sync job record in the database.

        Args:
            job_data: Dictionary containing job information

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO sync_jobs 
                        (job_id, job_type, status, parameters, created_by, retry_count)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        """,
                        (
                            job_data["job_id"],
                            job_data["job_type"],
                            job_data["status"],
                            job_data.get("parameters"),
                            job_data.get("created_by"),
                            job_data.get("retry_count", 0),
                        ),
                    )
                    conn.commit()
                    self._log_success(f"Created sync job {job_data['job_id']}")
                    return True

        except Exception as e:
            self._log_error(f"Error creating sync job {job_data.get('job_id')}", e)
            return False

    def update_job_status(self, job_id: str, status: str, **kwargs) -> bool:
        """
        Update job status and optional fields.

        Args:
            job_id: Job identifier
            status: New status
            **kwargs: Optional fields to update (results, error_message, etc.)

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    # Build dynamic update query
                    update_fields = ["status = %s", "updated_at = %s"]
                    values = [status, datetime.now()]
                    
                    for field, value in kwargs.items():
                        if field in ["results", "error_message", "started_at", "completed_at", "retry_count"]:
                            update_fields.append(f"{field} = %s")
                            values.append(value)
                    
                    values.append(job_id)  # For WHERE clause
                    
                    query = f"""
                        UPDATE sync_jobs 
                        SET {', '.join(update_fields)}
                        WHERE job_id = %s
                    """
                    
                    cur.execute(query, values)
                    conn.commit()
                    self._log_success(f"Updated job {job_id} status to {status}")
                    return True

        except Exception as e:
            self._log_error(f"Error updating job {job_id} status", e)
            return False

    def get_job_by_id(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a specific job by ID.

        Args:
            job_id: Job identifier

        Returns:
            Job dictionary or None if not found
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT * FROM sync_jobs 
                        WHERE job_id = %s
                        """,
                        (job_id,),
                    )
                    result = cur.fetchone()
                    return dict(result) if result else None

        except Exception as e:
            self._log_error(f"Error retrieving job {job_id}", e)
            return None

    def get_jobs_by_status(self, status: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Retrieve jobs by status.

        Args:
            status: Job status to filter by
            limit: Maximum number of jobs to return

        Returns:
            List of job dictionaries
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT * FROM sync_jobs 
                        WHERE status = %s
                        ORDER BY created_at DESC
                        LIMIT %s
                        """,
                        (status, limit),
                    )
                    return [dict(row) for row in cur.fetchall()]

        except Exception as e:
            self._log_error(f"Error retrieving jobs with status {status}", e)
            return []