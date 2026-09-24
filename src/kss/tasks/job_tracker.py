##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Job status tracking and progress monitoring.
This module handles job status persistence and progress callbacks.
"""

import json
from datetime import datetime
from typing import Dict, Any, Optional

from jobs.base import JobStatus
from database import DatabaseManager


# =============================================================================
# JOB STATUS TRACKING
# =============================================================================

class JobStatusTracker:
    """
    Tracks job status in the database for monitoring and API access.
    This provides persistent job tracking across system restarts.
    
    Note: This class now serves as a facade/adapter for the SyncJobRepository.
    It maintains the same interface for backward compatibility while delegating
    to the proper repository layer.
    """
    
    def __init__(self, tenant_id: str = "default"):
        """
        Initialize job tracker with tenant context.
        
        Args:
            tenant_id: Tenant identifier for multi-tenant support
        """
        self.tenant_id = tenant_id
        self._repo = None
    
    def _get_repo(self):
        """Lazy initialization of repository to avoid circular imports."""
        if self._repo is None:
            from repositories.sync_job_repository import SyncJobRepository
            self._repo = SyncJobRepository(self.tenant_id)
        return self._repo
    
    def create_job_record(self, job_id: str, job_type: str, parameters: Dict[str, Any], 
                         created_by: str = "system") -> bool:
        """Create initial job record in database"""
        return self._get_repo().create_job_record(job_id, job_type, parameters, created_by)
    
    def update_job_status(self, job_id: str, status: JobStatus, 
                         results: Optional[Dict[str, Any]] = None,
                         error_message: Optional[str] = None) -> bool:
        """Update job status in database"""
        return self._get_repo().update_job_status(job_id, status, results, error_message)
    
    def increment_retry_count(self, job_id: str) -> bool:
        """Increment retry count for a job"""
        return self._get_repo().increment_retry_count(job_id)
    
    def get_job_by_id(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job record by ID"""
        return self._get_repo().get_job_by_id(job_id)
    
    def get_job_statistics(self) -> Dict[str, Any]:
        """Get comprehensive job statistics"""
        return self._get_repo().get_job_statistics()


# Global job status tracker
job_tracker = JobStatusTracker()


# =============================================================================
# PROGRESS CALLBACK SYSTEM
# =============================================================================

def create_progress_callback(tenant_id: str, job_type: str, job_id: str, task_id: str):
    """
    Create a progress callback function for job progress tracking.
    This allows real-time progress updates during job execution.
    """
    def progress_callback(current: int, total: int, message: str = ""):
        """Update job progress in real-time"""
        try:
            from .celery_app import app
            
            progress_data = {
                'job_id': job_id,
                'current': current,
                'total': total,
                'percentage': round((current / total) * 100, 2) if total > 0 else 0,
                'message': message,
                'updated_at': datetime.now().isoformat()
            }
            
            # Store progress in Redis with expiration
            redis_client = app.backend.client
            redis_key = f"progress:{tenant_id}"

            with redis_client.pipeline() as pipe:
                pipe.delete(redis_key)
                pipe.set(redis_key, json.dumps(progress_data), ex=3600)
                pipe.execute()
                
            redis_client.set(redis_key, json.dumps(progress_data), ex=3600)
            
            print(f"📊 Job [{job_type}] {job_id}: {progress_data['percentage']}% - {message}")
            
        except Exception as e:
            print(f"⚠️ Error updating progress for job {job_id}: {e}")
    
    return progress_callback

def get_job_progress_data(tenant_id: str):
    try:
        from .celery_app import app
        
        progress_json = app.backend.client.get(f'progress:{tenant_id}')
        
        if progress_json:
            # progress_data = json.loads(progress_json.decode('utf-8'))
            return progress_json
        else:
            print(f'No job progress data found for tenant {tenant_id}')
        
    except Exception as e:
        print(f'Error querying for job progress against tenant {tenant_id}: {e}')