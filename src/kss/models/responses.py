##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Response models for the Jira Sync Platform.
Defines all Pydantic models for API response serialization.
"""

from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from datetime import datetime


class JobSubmissionResponse(BaseModel):
    """Response model for job submission"""
    
    job_id: str = Field(..., description="Unique job identifier")
    status: str = Field(..., description="Initial job status")
    message: str = Field(..., description="Submission confirmation message")
    submitted_at: datetime = Field(..., description="Timestamp when job was submitted")


class ImmediateJobSubmissionResponse(BaseModel):
    """Response model for convenience endpoint job submission"""

    job_id: str = Field(..., description="Unique job identifier")
    status: str = Field(..., description="Job submission status message")
    status_url: str = Field(..., description="URL to check job status")


class JobStatusResponse(BaseModel):
    """Response model for job status"""

    jobId: str = Field(..., description="Unique job identifier")
    status: str = Field(..., description="Current job status")
    
    # Celery native fields
    successful: Optional[bool] = Field(None, description="Whether task completed successfully")
    failed: Optional[bool] = Field(None, description="Whether task failed")
    result: Optional[Dict[str, Any]] = Field(None, description="Task result from Celery")
    traceback: Optional[str] = Field(None, description="Error traceback if failed")
    dateDone: Optional[datetime] = Field(None, description="When task completed")
    
    # Workflow resolution fields
    isWorkflow: Optional[bool] = Field(None, description="Whether this is a workflow task")
    workflowResolution: Optional[str] = Field(None, description="How workflow status was resolved")
    childTaskStatuses: Optional[List[Dict[str, Any]]] = Field(None, description="Status of child tasks in workflow")
    childCount: Optional[int] = Field(None, description="Number of child tasks in workflow")
    
    # Maintain backward compatibility with existing fields
    jobType: Optional[str] = Field(None, description="Type of job")
    createdAt: Optional[datetime] = Field(None, description="When job was created")
    startedAt: Optional[datetime] = Field(None, description="When job started execution")
    completedAt: Optional[datetime] = Field(None, description="When job completed")
    createdBy: Optional[str] = Field(None, description="Who created the job")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Job parameters")
    results: Optional[Dict[str, Any]] = Field(None, description="Job results")
    errorMessage: Optional[str] = Field(None, description="Error message if job failed")
    retryCount: Optional[int] = Field(None, description="Number of retry attempts")
    progress: Optional[Dict[str, Any]] = Field(None, description="Job progress information")
    
class JobSummaryResponse(BaseModel):
    """Summary information for a job."""

    job_id: str
    job_type: str
    status: str
    parameters: dict[str, Any]
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_by: str
    retry_count: int = 0
    duration_seconds: Optional[float] = None
    is_running: bool = False
    can_retry: bool = False


class SystemHealthResponse(BaseModel):
    """Response model for system health"""

    status: str = Field(..., description="Overall system status")
    timestamp: datetime = Field(..., description="Health check timestamp")
    checks: Dict[str, str] = Field(..., description="Individual component health checks")
    queue_stats: Dict[str, Any] = Field(..., description="Queue statistics")


class SystemStatsResponse(BaseModel):
    """Response model for system statistics"""
    
    job_counts_by_status: Dict[str, int] = Field(..., description="Job counts grouped by status")
    job_counts_by_type: Dict[str, int] = Field(..., description="Job counts grouped by type")
    recent_jobs_24h: int = Field(..., description="Number of jobs created in last 24 hours")
    average_execution_time_seconds: Optional[float] = Field(None, description="Average job execution time")
    timestamp: str = Field(..., description="Statistics generation timestamp")


class JobTypeInfo(BaseModel):
    """Information about a job type"""
    
    name: str = Field(..., description="Job type name")
    description: str = Field(..., description="Job type description")
    parameters_schema: Dict[str, Any] = Field(..., description="JSON schema for parameters")
    example_parameters: Dict[str, Any] = Field(..., description="Example parameter values")


class JobTypesResponse(BaseModel):
    """Response model for available job types"""
    
    job_types: List[str] = Field(..., description="List of available job type names")
    count: int = Field(..., description="Number of available job types")
    documentation_url: str = Field(..., description="URL pattern for detailed documentation")


class PaginatedJobsResponse(BaseModel):
    """Paginated response for job listings"""
    
    jobs: List[JobStatusResponse] = Field(..., description="List of jobs")
    total: int = Field(..., description="Total number of jobs matching criteria")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Number of items per page")
    has_next: bool = Field(..., description="Whether there are more pages")
    has_previous: bool = Field(..., description="Whether there are previous pages")