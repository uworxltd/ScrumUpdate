##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Sync Job Repository for managing job records and status tracking.

This repository handles all database operations for the sync_jobs table,
providing comprehensive job lifecycle management and querying capabilities.
"""

import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from psycopg2.extras import RealDictCursor

from jobs.base import JobStatus
from repositories.base_repository import BaseRepository


class SyncJobRepository(BaseRepository):
    """Repository for managing sync job records."""

    def __init__(self, tenant_id: str):
        """
        Initialize the sync job repository.

        Args:
            tenant_id: Tenant identifier for database operations
        """
        super().__init__(tenant_id)

    def create_job_record(
        self,
        job_id: str,
        job_type: str,
        parameters: Dict[str, Any],
        created_by: str = "system",
        priority: int = 5,
    ) -> bool:
        """
        Create initial job record in database.

        Args:
            job_id: Unique job identifier
            job_type: Type of sync job
            parameters: Job parameters as dictionary
            created_by: User or system that created the job
            priority: Job priority (1-10)

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO sync_jobs 
                        (job_id, job_type, status, parameters, created_at, created_by, retry_count)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (job_id) DO NOTHING;
                        """,
                        (
                            job_id,
                            job_type,
                            JobStatus.PENDING.value,
                            json.dumps(parameters),
                            datetime.now(),
                            created_by,
                            0,
                        ),
                    )
                    conn.commit()
                    self._log_success(f"Created job record for {job_id}")
                    return True

        except Exception as e:
            self._log_error(f"Error creating job record for {job_id}", e)
            return False

    def update_job_status(
        self,
        job_id: str,
        status: JobStatus,
        results: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> bool:
        """
        Update job status and related fields.

        Args:
            job_id: Job identifier
            status: New job status
            results: Optional job results data
            error_message: Optional error message

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    update_fields = ["status = %s", "updated_at = %s"]
                    values = [status.value, datetime.now()]

                    # Set started_at when job starts running
                    if status == JobStatus.RUNNING:
                        update_fields.append("started_at = %s")
                        values.append(datetime.now())

                    # Set completed_at when job finishes
                    if status in [JobStatus.SUCCESS, JobStatus.FAILED]:
                        update_fields.append("completed_at = %s")
                        values.append(datetime.now())

                    # Add results if provided
                    if results:
                        update_fields.append("results = %s")
                        values.append(json.dumps(results))

                    # Add error message if provided
                    if error_message:
                        update_fields.append("error_message = %s")
                        values.append(error_message)

                    values.append(job_id)  # For WHERE clause

                    query = f"""
                        UPDATE sync_jobs 
                        SET {', '.join(update_fields)}
                        WHERE job_id = %s;
                    """

                    cur.execute(query, values)
                    conn.commit()
                    self._log_success(f"Updated job {job_id} status to {status.value}")
                    return True

        except Exception as e:
            self._log_error(f"Error updating job status for {job_id}", e)
            return False

    def increment_retry_count(self, job_id: str) -> bool:
        """
        Increment retry count for a job.

        Args:
            job_id: Job identifier

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE sync_jobs 
                        SET retry_count = retry_count + 1, updated_at = %s
                        WHERE job_id = %s;
                        """,
                        (datetime.now(), job_id),
                    )
                    conn.commit()
                    self._log_success(f"Incremented retry count for job {job_id}")
                    return True

        except Exception as e:
            self._log_error(f"Error incrementing retry count for {job_id}", e)
            return False

    def get_job_by_id(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Get job record by ID.

        Args:
            job_id: Job identifier

        Returns:
            Job record dictionary or None if not found
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT job_id, job_type, status, parameters, results, error_message,
                               created_at, updated_at, started_at, completed_at, created_by, retry_count
                        FROM sync_jobs
                        WHERE job_id = %s;
                        """,
                        (job_id,),
                    )
                    result = cur.fetchone()
                    return dict(result) if result else None

        except Exception as e:
            self._log_error(f"Error getting job {job_id}", e)
            return None

    def get_jobs_by_status(
        self, status: JobStatus, limit: int = 100, offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get jobs by status with pagination.

        Args:
            status: Job status to filter by
            limit: Maximum number of records to return
            offset: Number of records to skip

        Returns:
            List of job record dictionaries
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT job_id, job_type, status, parameters, results, error_message,
                               created_at, updated_at, started_at, completed_at, created_by, retry_count
                        FROM sync_jobs
                        WHERE status = %s
                        ORDER BY created_at DESC
                        LIMIT %s OFFSET %s;
                        """,
                        (status.value, limit, offset),
                    )
                    return [dict(row) for row in cur.fetchall()]

        except Exception as e:
            self._log_error(f"Error getting jobs by status {status.value}", e)
            return []

    def get_jobs_by_type(
        self, job_type: str, limit: int = 100, offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get jobs by type with pagination.

        Args:
            job_type: Job type to filter by
            limit: Maximum number of records to return
            offset: Number of records to skip

        Returns:
            List of job record dictionaries
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT job_id, job_type, status, parameters, results, error_message,
                               created_at, updated_at, started_at, completed_at, created_by, retry_count
                        FROM sync_jobs
                        WHERE job_type = %s
                        ORDER BY created_at DESC
                        LIMIT %s OFFSET %s;
                        """,
                        (job_type, limit, offset),
                    )
                    return [dict(row) for row in cur.fetchall()]

        except Exception as e:
            self._log_error(f"Error getting jobs by type {job_type}", e)
            return []

    def get_filtered_jobs(
        self,
        status: Optional[str] = None,
        job_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get jobs with optional status and job_type filters.

        Args:
            status: Optional job status to filter by
            job_type: Optional job type to filter by
            limit: Maximum number of records to return
            offset: Number of records to skip

        Returns:
            List of job record dictionaries
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    query = """
                        SELECT job_id, job_type, status, parameters, results, error_message,
                               created_at, updated_at, started_at, completed_at, created_by, retry_count
                        FROM sync_jobs
                        WHERE 1=1
                    """
                    params = []
                    
                    if status:
                        query += " AND status = %s"
                        params.append(status)
                    
                    if job_type:
                        query += " AND job_type = %s"
                        params.append(job_type)
                    
                    query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
                    params.extend([limit, offset])
                    
                    cur.execute(query, params)
                    return [dict(row) for row in cur.fetchall()]
        
        except Exception as e:
            self._log_error("Error getting filtered jobs", e)
            return []

    def get_recent_jobs(
        self, limit: int = 50, hours_back: int = 24
    ) -> List[Dict[str, Any]]:
        """
        Get recent jobs within specified time window.

        Args:
            limit: Maximum number of records to return
            hours_back: Number of hours to look back

        Returns:
            List of job record dictionaries
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT job_id, job_type, status, parameters, results, error_message,
                               created_at, updated_at, started_at, completed_at, created_by, retry_count
                        FROM sync_jobs
                        WHERE created_at >= NOW() - INTERVAL '%s hours'
                        ORDER BY created_at DESC
                        LIMIT %s;
                        """,
                        (hours_back, limit),
                    )
                    return [dict(row) for row in cur.fetchall()]

        except Exception as e:
            self._log_error(f"Error getting recent jobs", e)
            return []

    def get_failed_jobs_for_retry(self, max_retries: int = 3) -> List[Dict[str, Any]]:
        """
        Get failed jobs that are eligible for retry.

        Args:
            max_retries: Maximum number of retries allowed

        Returns:
            List of job record dictionaries eligible for retry
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT job_id, job_type, status, parameters, results, error_message,
                               created_at, updated_at, started_at, completed_at, created_by, retry_count
                        FROM sync_jobs
                        WHERE status = %s AND retry_count < %s
                        ORDER BY created_at ASC;
                        """,
                        (JobStatus.FAILED.value, max_retries),
                    )
                    return [dict(row) for row in cur.fetchall()]

        except Exception as e:
            self._log_error("Error getting failed jobs for retry", e)
            return []

    def get_job_statistics(self) -> Dict[str, Any]:
        """
        Get comprehensive job statistics.

        Returns:
            Dictionary with job statistics
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    # Get status breakdown
                    cur.execute(
                        """
                        SELECT status, COUNT(*) as count
                        FROM sync_jobs
                        GROUP BY status;
                        """
                    )
                    status_breakdown = {row[0]: row[1] for row in cur.fetchall()}

                    # Get job type breakdown
                    cur.execute(
                        """
                        SELECT job_type, COUNT(*) as count
                        FROM sync_jobs
                        GROUP BY job_type
                        ORDER BY count DESC;
                        """
                    )
                    type_breakdown = {row[0]: row[1] for row in cur.fetchall()}

                    # Get recent activity (last 24 hours)
                    cur.execute(
                        """
                        SELECT COUNT(*) as count
                        FROM sync_jobs
                        WHERE created_at >= NOW() - INTERVAL '24 hours';
                        """
                    )
                    recent_jobs = cur.fetchone()[0]

                    # Get average execution time for completed jobs
                    cur.execute(
                        """
                        SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration
                        FROM sync_jobs
                        WHERE started_at IS NOT NULL AND completed_at IS NOT NULL;
                        """
                    )
                    avg_duration_result = cur.fetchone()
                    avg_duration = (
                        float(avg_duration_result[0]) if avg_duration_result[0] else 0
                    )

                    # Get total job count
                    cur.execute("SELECT COUNT(*) FROM sync_jobs;")
                    total_jobs = cur.fetchone()[0]

                    return {
                        "total_jobs": total_jobs,
                        "recent_jobs_24h": recent_jobs,
                        "average_duration_seconds": round(avg_duration, 2),
                        "status_breakdown": status_breakdown,
                        "job_type_breakdown": type_breakdown,
                    }

        except Exception as e:
            self._log_error("Error getting job statistics", e)
            return {
                "total_jobs": 0,
                "recent_jobs_24h": 0,
                "average_duration_seconds": 0,
                "status_breakdown": {},
                "job_type_breakdown": {},
            }

    def delete_old_jobs(self, days_old: int = 30) -> int:
        """
        Delete job records older than specified days.

        Args:
            days_old: Number of days to keep jobs

        Returns:
            Number of jobs deleted
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        DELETE FROM sync_jobs
                        WHERE created_at < NOW() - INTERVAL '%s days';
                        """,
                        (days_old,),
                    )
                    deleted_count = cur.rowcount
                    conn.commit()
                    self._log_success(f"Deleted {deleted_count} old job records")
                    return deleted_count

        except Exception as e:
            self._log_error(f"Error deleting old jobs", e)
            return 0

    def get_job_count(self) -> int:
        """
        Get total count of job records.

        Returns:
            Total number of job records
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) FROM sync_jobs;")
                    return cur.fetchone()[0]

        except Exception as e:
            self._log_error("Error getting job count", e)
            return 0

    def search_jobs(self, search_term: str, limit: int, offset: int) -> List[Dict[str, Any]]:
        """
        Search sync jobs with smart JSON detection.
        """
        search_pattern = f"%{search_term}%"

        try:
            # Try to parse as JSON first
            search_json = json.loads(search_term)
            json_search = True
        except json.JSONDecodeError:
            json_search = False

        with self.db_manager.get_connection(self.tenant_id) as conn:
            with conn.cursor() as cur:
                if json_search:
                    # Use JSONB containment for valid JSON
                    cur.execute(
                        """
                        SELECT job_id, job_type, status, parameters, results, error_message,
                               created_at, updated_at, started_at, completed_at, created_by, retry_count
                        FROM sync_jobs
                        WHERE parameters @> %s
                        ORDER BY created_at DESC
                        LIMIT %s OFFSET %s;
                        """,
                        (json.dumps(search_json), limit, offset),
                    )
                else:
                    # Fall back to text search for non-JSON terms
                    cur.execute(
                        """
                        SELECT job_id, job_type, status, parameters, results, error_message,
                               created_at, updated_at, started_at, completed_at, created_by, retry_count
                        FROM sync_jobs
                        WHERE job_id ILIKE %s 
                           OR job_type ILIKE %s 
                           OR created_by ILIKE %s
                           OR parameters::text ILIKE %s
                        ORDER BY created_at DESC
                        LIMIT %s OFFSET %s;
                        """,
                        (search_pattern, search_pattern, search_pattern, search_pattern, limit, offset),
                    )
                    
                columns = [desc[0] for desc in cur.description]

                return [dict(zip(columns, row)) for row in cur.fetchall()]

        # except Exception as e:
        #     self._log_error(f"Error searching jobs with term '{search_term}'", e)
        #     return []