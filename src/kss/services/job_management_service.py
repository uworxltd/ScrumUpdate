##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Job Management Service for handling sync job operations.

This service provides a high-level interface for job management operations,
abstracting the repository layer and providing business logic.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from jobs.base import JobStatus
from repositories.sync_job_repository import SyncJobRepository
from tasks.job_tracker import get_job_progress_data


class JobManagementService:
    """
    Service class for managing sync jobs.
    
    Provides business logic layer on top of the SyncJobRepository,
    including job lifecycle management, monitoring, and maintenance operations.
    """

    def __init__(self, tenant_id: str):
        """
        Initialize job management service.

        Args:
            tenant_id: Tenant identifier for multi-tenant isolation
        """
        self.tenant_id = tenant_id
        self.repo = SyncJobRepository(tenant_id)

    def create_job_record(
        self,
        job_id: str,
        job_type: str,
        parameters: Dict[str, Any],
        created_by: str = "system",
        priority: int = 5,
    ) -> bool:
        """
        Create a new job record.

        Args:
            job_id: Unique job identifier
            job_type: Type of sync job
            parameters: Job parameters
            created_by: User or system creating the job
            priority: Job priority (1-10)

        Returns:
            bool: True if successful, False otherwise
        """
        return self.repo.create_job_record(job_id, job_type, parameters, created_by, priority)

    def update_job_status(
        self,
        job_id: str,
        status: JobStatus,
        results: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> bool:
        """
        Update job status and related information.

        Args:
            job_id: Job identifier
            status: New job status
            results: Optional job results
            error_message: Optional error message

        Returns:
            bool: True if successful, False otherwise
        """
        return self.repo.update_job_status(job_id, status, results, error_message)

    def get_job_details(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a specific job.

        Args:
            job_id: Job identifier

        Returns:
            Job details dictionary or None if not found
        """
        job = self.repo.get_job_by_id(job_id)
        if job:
            # Add computed fields
            job['duration_seconds'] = self._calculate_duration(job)
            job['is_running'] = job['status'] == JobStatus.RUNNING.value
            job['can_retry'] = (
                job['status'] == JobStatus.FAILED.value and 
                job['retry_count'] < 3
            )
        return job

    def get_active_jobs(self) -> List[Dict[str, Any]]:
        """
        Get all currently active (running) jobs.

        Returns:
            List of active job dictionaries
        """
        return self.repo.get_jobs_by_status(JobStatus.RUNNING)

    def get_failed_jobs(self, include_exhausted: bool = False) -> List[Dict[str, Any]]:
        """
        Get failed jobs, optionally including those that have exhausted retries.

        Args:
            include_exhausted: Whether to include jobs that have exhausted retries

        Returns:
            List of failed job dictionaries
        """
        failed_jobs = self.repo.get_jobs_by_status(JobStatus.FAILED)
        
        if not include_exhausted:
            # Filter out jobs that have exhausted retries
            failed_jobs = [job for job in failed_jobs if job['retry_count'] < 3]
        
        return failed_jobs

    def get_job_history(
        self, 
        job_type: Optional[str] = None,
        hours_back: int = 24,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get job history with optional filtering.

        Args:
            job_type: Optional job type filter
            hours_back: Number of hours to look back
            limit: Maximum number of jobs to return

        Returns:
            List of job dictionaries
        """
        if job_type:
            return self.repo.get_jobs_by_type(job_type, limit=limit)
        else:
            return self.repo.get_recent_jobs(limit=limit, hours_back=hours_back)

    def get_filtered_jobs(
        self,
        status: Optional[str] = None,
        job_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get jobs filtered by status and/or job type with pagination.

        Args:
            status: Optional job status filter
            job_type: Optional job type filter
            page: Page number (starts at 1)
            page_size: Number of items per page

        Returns:
            List of job dictionaries
        """
        offset = (page - 1) * page_size
        return self.repo.get_filtered_jobs(
            status=status,
            job_type=job_type,
            limit=page_size,
            offset=offset
        )

    def get_dashboard_summary(self) -> Dict[str, Any]:
        """
        Get comprehensive dashboard summary for monitoring.

        Returns:
            Dictionary with dashboard metrics and summaries
        """
        stats = self.repo.get_job_statistics()
        
        # Get additional real-time data
        active_jobs = self.get_active_jobs()
        failed_jobs = self.get_failed_jobs()
        recent_jobs = self.repo.get_recent_jobs(limit=10)
        
        # Calculate additional metrics
        success_rate = 0
        if stats['total_jobs'] > 0:
            successful_jobs = stats['status_breakdown'].get('success', 0)
            success_rate = round((successful_jobs / stats['total_jobs']) * 100, 2)
        
        return {
            'overview': {
                'total_jobs': stats['total_jobs'],
                'recent_jobs_24h': stats['recent_jobs_24h'],
                'active_jobs': len(active_jobs),
                'failed_jobs': len(failed_jobs),
                'success_rate_percent': success_rate,
                'average_duration_seconds': stats['average_duration_seconds'],
            },
            'status_breakdown': stats['status_breakdown'],
            'job_type_breakdown': stats['job_type_breakdown'],
            'active_jobs': active_jobs,
            'recent_failures': failed_jobs[:5],  # Last 5 failures
            'recent_jobs': recent_jobs,
        }

    def retry_failed_job(self, job_id: str) -> bool:
        """
        Retry a failed job by resetting its status and incrementing retry count.

        Args:
            job_id: Job identifier

        Returns:
            bool: True if job was queued for retry, False otherwise
        """
        job = self.repo.get_job_by_id(job_id)
        if not job:
            return False
        
        if job['status'] != JobStatus.FAILED.value:
            return False
        
        if job['retry_count'] >= 3:
            return False
        
        # Figure out a way to retry a job
        # Increment retry count and reset status
        if self.repo.increment_retry_count(job_id):
            return self.repo.update_job_status(job_id, JobStatus.PENDING)
        
        return False

    def cleanup_old_jobs(self, days_old: int = 30) -> Dict[str, Any]:
        """
        Clean up old job records to maintain database performance.

        Args:
            days_old: Number of days to keep jobs

        Returns:
            Dictionary with cleanup results
        """
        deleted_count = self.repo.delete_old_jobs(days_old)
        
        return {
            'deleted_count': deleted_count,
            'days_old': days_old,
            'cleanup_date': datetime.now().isoformat(),
        }

    def search_jobs(self, search_term: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Search jobs by various criteria.

        Args:
            search_term: Term to search for
            limit: Maximum number of results

        Returns:
            List of matching job dictionaries
        """
        return self.repo.search_jobs(search_term, limit=limit, offset=0)

    def get_job_performance_metrics(self, job_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Get performance metrics for jobs.

        Args:
            job_type: Optional job type filter

        Returns:
            Dictionary with performance metrics
        """
        # This would require additional queries or could be extended
        # For now, return basic statistics
        stats = self.repo.get_job_statistics()
        
        metrics = {
            'total_jobs': stats['total_jobs'],
            'average_duration': stats['average_duration_seconds'],
            'job_types': stats['job_type_breakdown'],
        }
        
        if job_type and job_type in stats['job_type_breakdown']:
            # Get specific metrics for the job type
            type_jobs = self.repo.get_jobs_by_type(job_type, limit=100)
            
            # Calculate type-specific metrics
            completed_jobs = [
                job for job in type_jobs 
                if job['status'] in ['success', 'failed'] and 
                job['started_at'] and job['completed_at']
            ]
            
            if completed_jobs:
                durations = [
                    self._calculate_duration(job) 
                    for job in completed_jobs
                ]
                durations = [d for d in durations if d is not None]
                
                if durations:
                    metrics[f'{job_type}_metrics'] = {
                        'count': len(completed_jobs),
                        'avg_duration': round(sum(durations) / len(durations), 2),
                        'min_duration': min(durations),
                        'max_duration': max(durations),
                    }
        
        return metrics

    def _calculate_duration(self, job: Dict[str, Any]) -> Optional[float]:
        """
        Calculate job duration in seconds.

        Args:
            job: Job dictionary

        Returns:
            Duration in seconds or None if cannot be calculated
        """
        if not job.get('started_at') or not job.get('completed_at'):
            return None
        
        try:
            started = job['started_at']
            completed = job['completed_at']
            
            if isinstance(started, str):
                started = datetime.fromisoformat(started.replace('Z', '+00:00'))
            if isinstance(completed, str):
                completed = datetime.fromisoformat(completed.replace('Z', '+00:00'))
            
            duration = (completed - started).total_seconds()
            return round(duration, 2)
        except Exception:
            return None

    def get_tenant_job_summary(self) -> Dict[str, Any]:
        """
        Get a summary of jobs for the current tenant.

        Returns:
            Dictionary with tenant-specific job summary
        """
        stats = self.repo.get_job_statistics()
        
        return {
            'tenant_id': self.tenant_id,
            'total_jobs': stats['total_jobs'],
            'recent_activity': stats['recent_jobs_24h'],
            'status_distribution': stats['status_breakdown'],
            'most_common_job_types': dict(
                sorted(
                    stats['job_type_breakdown'].items(), 
                    key=lambda x: x[1], 
                    reverse=True
                )[:5]
            ),
            'performance': {
                'average_duration_seconds': stats['average_duration_seconds'],
                'average_duration_minutes': round(stats['average_duration_seconds'] / 60, 2),
            }
        }

    def get_comprehensive_tenant_status(self) -> Dict[str, Any]:
        """
        Get comprehensive tenant status including existence, sync history, and current activity.
        
        Uses database functions to provide complete tenant lifecycle information:
        - Multi-source existence verification
        - Sync history analysis  
        - Current activity status
        - Tenant lifecycle state determination

        Returns:
            Dictionary with comprehensive tenant status information
        """
        try:
            # Use the comprehensive database function to get all status info
            with self.repo.db_manager.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT * FROM kss_system.get_tenant_comprehensive_status(%s);",
                        (self.tenant_id,)
                    )
                    result = cur.fetchone()
                    
                    if not result:
                        # Tenant doesn't exist at all
                        return self._create_nonexistent_tenant_status()
                    
                    # Unpack the result (now includes sync health data)
                    (tenant_id, tenant_record_exists, schema_exists, schema_name, 
                     created_at, total_jobs, first_job_date, last_job_date, active_job_count,
                     successful_jobs, failed_jobs, last_successful_job_date, consecutive_failures,
                     success_rate, has_data, needs_sync, proactive_sync_complete) = result
                    
                    # Get active jobs details if any exist
                    active_jobs = []
                    if active_job_count > 0:
                        cur.execute(
                            "SELECT job_id, job_type, started_at FROM kss_system.get_tenant_active_jobs(%s);",
                            (self.tenant_id,)
                        )
                        active_jobs = [
                            {
                                "job_id": row[0],
                                "job_type": row[1], 
                                "started_at": row[2].isoformat() if row[2] else None
                            }
                            for row in cur.fetchall()
                        ]
                    
                    # Determine tenant lifecycle state (now includes sync health)
                    tenant_state = self._determine_tenant_state(
                        tenant_record_exists, schema_exists, total_jobs, active_job_count, 
                        successful_jobs, has_data
                    )
                    
                    # Build comprehensive status response
                    return {
                        "tenant_id": tenant_id,
                        "exists": tenant_record_exists and schema_exists,
                        "existence_sources": {
                            "tenant_record_exists": tenant_record_exists,
                            "schema_exists": schema_exists,
                            "schema_name": schema_name
                        },
                        "sync_history": {
                            "has_ever_synced": total_jobs > 0,
                            "first_sync_date": first_job_date.isoformat() if first_job_date else None,
                            "last_sync_date": last_job_date.isoformat() if last_job_date else None,
                            "last_successful_sync_date": last_successful_job_date.isoformat() if last_successful_job_date else None,
                            "total_jobs": total_jobs,
                            "successful_jobs": successful_jobs,
                            "failed_jobs": failed_jobs,
                            "success_rate_percent": float(success_rate) if success_rate else 0.0,
                            "consecutive_failures": consecutive_failures
                        },
                        "current_activity": {
                            "has_active_jobs": active_job_count > 0,
                            "active_job_count": active_job_count,
                            "active_jobs": active_jobs,
                            "progress_message": get_job_progress_data(self.tenant_id)
                        },
                        "tenant_state": tenant_state,
                        "proactive_sync_complete": proactive_sync_complete,
                        "has_data": has_data,
                        "needs_sync": needs_sync,
                        "sync_recommendation": self._get_sync_recommendation(
                            needs_sync, has_data, consecutive_failures, success_rate, active_job_count, proactive_sync_complete
                        ),
                        "created_at": created_at.isoformat() if created_at else None
                    }
                    
        except Exception as e:
            # Log error and return error status
            print(f"Error getting comprehensive tenant status: {e}")
            return self._create_error_tenant_status(str(e))

    def _create_nonexistent_tenant_status(self) -> Dict[str, Any]:
        """Create status response for non-existent tenant."""
        return {
            "tenant_id": self.tenant_id,
            "exists": False,
            "existence_sources": {
                "tenant_record_exists": False,
                "schema_exists": False,
                "schema_name": None
            },
            "sync_history": {
                "has_ever_synced": False,
                "first_sync_date": None,
                "last_sync_date": None,
                "total_jobs": 0
            },
            "current_activity": {
                "has_active_jobs": False,
                "active_job_count": 0,
                "active_jobs": []
            },
            "tenant_state": "nonexistent",
            "onboarding_complete": False,
            "created_at": None
        }

    def _create_error_tenant_status(self, error_message: str) -> Dict[str, Any]:
        """Create status response for error cases."""
        return {
            "tenant_id": self.tenant_id,
            "exists": False,
            "error": error_message,
            "existence_sources": {
                "tenant_record_exists": False,
                "schema_exists": False,
                "schema_name": None
            },
            "sync_history": {
                "has_ever_synced": False,
                "first_sync_date": None,
                "last_sync_date": None,
                "total_jobs": 0
            },
            "current_activity": {
                "has_active_jobs": False,
                "active_job_count": 0,
                "active_jobs": []
            },
            "tenant_state": "error",
            "onboarding_complete": False,
            "created_at": None
        }

    def _determine_tenant_state(
        self, 
        tenant_record_exists: bool, 
        schema_exists: bool, 
        total_jobs: int, 
        active_job_count: int,
        successful_jobs: int,
        has_data: bool
    ) -> str:
        """
        Determine tenant lifecycle state based on existence, activity, and data presence.
        
        States:
        - nonexistent: No tenant record or schema
        - incomplete: Tenant record exists but schema missing
        - new: Schema exists but no jobs ever run
        - first_sync: First job currently running
        - syncing: Currently has active jobs
        - needs_data: Has jobs but no successful syncs/data
        - active: Has data and job history, no current activity
        - healthy: Has data, good success rate, no current issues
        """
        if not tenant_record_exists:
            return "nonexistent"
        
        if not schema_exists:
            return "incomplete"
        
        if total_jobs == 0:
            return "new"
        
        if active_job_count > 0:
            if total_jobs == active_job_count:
                return "first_sync"
            else:
                return "syncing"
        
        # Has job history but no active jobs
        if not has_data or successful_jobs == 0:
            return "needs_data"
        
        return "healthy"

    def _get_sync_recommendation(
        self, 
        needs_sync: bool, 
        has_data: bool, 
        consecutive_failures: int, 
        success_rate: float, 
        active_job_count: int,
        proactive_sync_complete: bool
    ) -> Dict[str, Any]:
        """
        Generate sync recommendation based on tenant status.
        
        Returns:
            Dictionary with recommendation details
        """
        if active_job_count > 0:
            return {
                "action": "wait",
                "reason": "Sync jobs are currently running",
                "priority": "low",
                "message": "Wait for current jobs to complete before starting new sync"
            }
            
        if not needs_sync and has_data:
            return {
                "action": "none",
                "reason": "Tenant has data and recent successful syncs",
                "priority": "low", 
                "message": "No immediate sync needed"
            }
            
        if proactive_sync_complete is True and needs_sync is True and has_data is False:
            return {
                "action": "select_target_sprint",
                "reason": "Pro active Sprints Syncing is done but User hasn't selected target sprint",
                "priority": "high",
                "message": "Select target sprint to perform Sprint Analytics"
            }
            
        if proactive_sync_complete is False and active_job_count == 0:
            return {
                "action": "proactive_sync",
                "reason": "Tenant hasn't performed Proactive Sprints Sync",
                "priority": "high",
                "message": "Perform Proactive Sprints Sync to select target active sprint"    
            }
        
        if not has_data:
            return {
                "action": "full_sync",
                "reason": "Tenant has no synced data",
                "priority": "high",
                "message": "Start with recent_activity_issues job to get initial data"
            }
        
        if consecutive_failures >= 3:
            return {
                "action": "investigate_and_sync",
                "reason": f"High consecutive failure rate ({consecutive_failures} failures)",
                "priority": "high",
                "message": "Check error logs and retry sync after resolving issues"
            }
        
        if success_rate < 50.0:
            return {
                "action": "investigate_and_sync", 
                "reason": f"Low success rate ({success_rate}%)",
                "priority": "medium",
                "message": "Review sync configuration and retry"
            }
        
        return {
            "action": "sync",
            "reason": "Data may be stale or incomplete",
            "priority": "medium",
            "message": "Run recent_activity_issues job to refresh data"
        }