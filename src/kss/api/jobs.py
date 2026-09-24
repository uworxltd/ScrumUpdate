##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Job management endpoints.
Handles job submission, status tracking, and management operations.
"""

import logging
from datetime import datetime
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Query, Request

from jobs.sync_jobs import submit_sync_job as submit_job_to_queue, get_available_job_types
from models import (
    JobSubmissionRequest,
    JobSubmissionResponse,
    JobStatusResponse,
    JobSummaryResponse,
)
from models.errors import TenantMigrationError
from services.job_management_service import JobManagementService
from .dependencies import (
    resolve_tenant_from_request,
    extract_jira_credentials_from_request,
)

logger = logging.getLogger(__name__)
jobs_router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@jobs_router.post("/submit", response_model=JobSubmissionResponse)
async def submit_sync_job(job_request: JobSubmissionRequest, request: Request):
    """
    Submit a new synchronization job.

    This endpoint validates the job configuration and submits it to the Celery queue.
    The job will be executed asynchronously by available workers.

    Required headers:
    - X-Tenant-ID: Tenant identifier for multi-tenant isolation
    - X-Tenant-Source-Tenant-ID: Jira tenant Id
    - X-Tenant-Username: Jira username or email
    - X-Tenant-Api-Token: Jira API token
    - X-Tenant-Source-Account-ID: Jira accountId
    """
    try:
        print("KSS Version 1.0 /submit")
        # Resolve tenant from request headers
        tenant_id = resolve_tenant_from_request(request)

        # Extract Jira credentials from request headers
        jira_credentials = extract_jira_credentials_from_request(request)

        # Validate job type
        available_types = get_available_job_types()
        if job_request.job_type not in available_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid job type: {job_request.job_type}. Available types: {available_types}",
            )

        # Pre-generate job_id to create database record before Celery submission
        import uuid
        job_id = str(uuid.uuid4())

        # Create job record IMMEDIATELY with status="pending"
        # This ensures the record exists before returning to the client
        service = JobManagementService(tenant_id)
        success = service.create_job_record(
            job_id=job_id,
            job_type=job_request.job_type,
            parameters=job_request.parameters,
            created_by=job_request.created_by,
            priority=job_request.priority
        )

        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to create job record in database"
            )

        # Create job configuration with pre-generated job_id
        job_config = {
            "job_id": job_id,
            "job_type": job_request.job_type,
            "tenant_id": tenant_id,
            "parameters": job_request.parameters,
            "priority": job_request.priority,
            "created_by": job_request.created_by,
            "jira_credentials": jira_credentials.dict() if jira_credentials else None,
        }

        # Submit job to Celery with pre-generated job_id
        try:
            returned_job_id = submit_job_to_queue(job_request.job_type, job_config)
            # For workflows, returned_job_id might be different (workflow_id)
            # For simple jobs, it should match our pre-generated job_id
            if returned_job_id != job_id:
                # This is a workflow - update the job_id we return
                job_id = returned_job_id
        except Exception as e:
            # If Celery submission fails, mark job as failed in database
            from jobs.base import JobStatus
            service.update_job_status(
                job_id, 
                JobStatus.FAILED, 
                error_message=f"Failed to submit to Celery: {str(e)}"
            )
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to submit job to queue: {str(e)}"
            )

        return JobSubmissionResponse(
            job_id=job_id,
            status="pending",
            message=f"Job {job_id} submitted successfully",
            submitted_at=datetime.now(),
        )

    except HTTPException as e:
        logging.exception(e)
        raise
    except Exception as e:
        logging.exception(e)
        raise HTTPException(status_code=500, detail=f"Failed to submit job: {str(e)}")


@jobs_router.get("/", response_model=List[JobSummaryResponse])
async def list_jobs(
    request: Request,
    status: Optional[str] = Query(None, description="Filter by status"),
    job_type: Optional[str] = Query(None, description="Filter by job type"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page")
):
    """
    List jobs with optional filtering and pagination.
    
    Examples:
    - GET /api/jobs
    - GET /api/jobs?status=running
    - GET /api/jobs?job_type=boards
    - GET /api/jobs?status=running&job_type=boards
    - GET /api/jobs?page=2&page_size=20
    
    Required headers:
    - X-Tenant-ID: Tenant identifier for multi-tenant isolation
    """
    try:
        tenant_id = resolve_tenant_from_request(request)
        service = JobManagementService(tenant_id)
        
        jobs = service.get_filtered_jobs(
            status=status,
            job_type=job_type,
            page=page,
            page_size=page_size
        )
        
        return [_job_dict_to_summary(job) for job in jobs]

    except TenantMigrationError as e:
        raise
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing jobs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list jobs: {str(e)}")


@jobs_router.get("/search", response_model=List[JobSummaryResponse])
async def search_jobs(
    request: Request,
    search_term: str = Query(..., description="Search Term to search against"),
    job_type: Optional[str] = Query(None, description="Filter by job type"),
):
    try:
        tenant_id = resolve_tenant_from_request(request)
        service = JobManagementService(tenant_id)

        jobs = service.search_jobs(search_term)

        # Convert to response models
        job_summaries = [_job_dict_to_summary(job) for job in jobs]

        if len(job_summaries) > 0 and job_type:
            return [obj for obj in job_summaries if obj.job_type == job_type]

        return job_summaries

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error Searching jobs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search jobs: {str(e)}")


# TODO: Move to an apprpriate place - Waqas
def _job_dict_to_summary(job_dict: Dict[str, Any]) -> JobSummaryResponse:
    """Convert job dictionary to JobSummaryResponse."""
    return JobSummaryResponse(
        job_id=job_dict["job_id"],
        job_type=job_dict["job_type"],
        status=job_dict["status"],
        parameters=job_dict["parameters"],
        created_at=job_dict["created_at"],
        started_at=job_dict.get("started_at"),
        completed_at=job_dict.get("completed_at"),
        created_by=job_dict["created_by"],
        retry_count=job_dict.get("retry_count", 0),
        duration_seconds=job_dict.get("duration_seconds"),
        is_running=job_dict.get("is_running", False),
        can_retry=job_dict.get("can_retry", False),
    )


@jobs_router.get("/{job_id}/status", response_model=JobStatusResponse)
async def get_job_status(job_id: str, request: Request):
    """
    Get status and details for a specific job.

    Returns comprehensive job information including:
    - Current status (pending, running, success, failed)
    - Execution timestamps
    - Results and error messages
    - Retry information
    - Duration and performance metrics

    Required headers:
    - X-Tenant-ID: Tenant identifier for multi-tenant isolation
    """
    try:
        tenant_id = resolve_tenant_from_request(request)
        service = JobManagementService(tenant_id)

        job_details = service.get_job_details(job_id)
        if not job_details:
            raise HTTPException(
                status_code=404, detail=f"Job {job_id} not found for tenant {tenant_id}"
            )

        # Convert to JobStatusResponse format
        return JobStatusResponse(
            jobId=job_details["job_id"],
            status=job_details["status"],
            jobType=job_details["job_type"],
            progress=job_details.get("progress"),
            # Extended fields
            createdAt=job_details["created_at"],
            startedAt=job_details.get("started_at"),
            completedAt=job_details.get("completed_at")
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job status for {job_id}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get job status: {str(e)}"
        )

# TODO: Below wndpoint uses the global status manager instance, verify is that even works
@jobs_router.delete("/{job_id}")
async def cancel_job(job_id: str):
    """
    Cancel a pending or running job.

    This will attempt to revoke the job from the Celery queue.
    Already completed jobs cannot be cancelled.
    """
    try:
        from tasks.celery_status_manager import celery_status_manager
        from celery import current_app

        # Validate job_id format
        if not celery_status_manager.validate_job_id(job_id):
            raise HTTPException(
                status_code=404, detail=f"Invalid job_id format: {job_id}"
            )

        # Check if job exists and get its status
        try:
            job_info = celery_status_manager.get_job_status(job_id)
        except ValueError as e:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        except RuntimeError as e:
            raise HTTPException(
                status_code=500, detail=f"Backend unavailable: {str(e)}"
            )

        if job_info["status"] in ["success", "failed", "cancelled"]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel job {job_id} with status {job_info['status']}",
            )

        # Attempt to revoke the job using Celery's native revoke
        current_app.control.revoke(job_id, terminate=True)

        return {"message": f"Job {job_id} cancellation requested"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error cancelling job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to cancel job: {str(e)}")


# @jobs_router.get("/types")
# async def get_available_job_types():
#     """
#     Get list of available job types and their documentation.

#     Returns information about all supported job types including:
#     - Job type names
#     - Required parameters
#     - Optional parameters
#     - Example configurations
#     """
#     try:
#         job_types = get_available_job_types()
#         return {
#             "job_types": job_types,
#             "count": len(job_types),
#             "documentation_url": "/api/jobs/types/{job_type}",
#         }

#     except Exception as e:
#         raise HTTPException(
#             status_code=500, detail=f"Failed to get job types: {str(e)}"
#         )


# @jobs_router.get("/types/{job_type}")
# async def get_job_type_documentation(job_type: str):
#     """
#     Get detailed documentation for a specific job type.

#     Returns comprehensive information about the job type including:
#     - Parameter schema
#     - Example configurations
#     - Validation rules
#     """
#     try:
#         available_types = job_factory.get_available_job_types()
#         if job_type not in available_types:
#             raise HTTPException(
#                 status_code=404,
#                 detail=f"Job type '{job_type}' not found. Available types: {available_types}",
#             )

#         documentation = job_factory.get_job_documentation(job_type)
#         return documentation

#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=500, detail=f"Failed to get job documentation: {str(e)}"
#         )