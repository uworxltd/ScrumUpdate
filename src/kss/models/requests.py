##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Request models for the Jira Sync Platform.
Defines all Pydantic models for API request validation.
"""

from pydantic import BaseModel, Field, validator
from typing import Dict, Any, Optional, List, Union
from .enums import BoardType, SprintState


class JobSubmissionRequest(BaseModel):
    """Request model for job submission"""

    job_type: str = Field(..., description="Type of job to submit", example="boards")
    parameters: Dict[str, Any] = Field(
        default={}, description="Job-specific parameters"
    )
    priority: int = Field(
        default=5,
        ge=1,
        le=10,
        description="Job priority (1-10, higher = more priority)",
    )
    created_by: str = Field(
        default="api", description="User or system submitting the job"
    )

    class Config:
        schema_extra = {
            "example": {
                "job_type": "boards",
                "parameters": {
                    "project_keys": ["PROJ1", "PROJ2"],
                    "board_types": ["scrum"],
                },
                "priority": 7,
                "created_by": "user123",
            }
        }


class BaseJobRequest(BaseModel):
    """Base model for job-specific requests"""

    parameters: Dict[str, Any] = Field(
        default={}, description="Job-specific parameters"
    )
    priority: int = Field(
        default=5,
        ge=1,
        le=10,
        description="Job priority (1-10, higher = more priority)",
    )
    created_by: str = Field(
        default="api", description="User or system submitting the job"
    )


class BoardSyncRequest(BaseJobRequest):
    """Request model for board sync job"""

    class Parameters(BaseModel):
        project_keys: Optional[List[str]] = Field(
            None, description="Filter by project keys"
        )
        board_types: Optional[List[BoardType]] = Field(
            None, description="Filter by board types"
        )

    parameters: Parameters = Field(
        default_factory=Parameters, description="Board sync parameters"
    )


class SprintSyncRequest(BaseJobRequest):
    """Request model for sprint sync job"""

    class Parameters(BaseModel):
        board_ids: Optional[List[int]] = Field(
            None, description="Specific board IDs to sync"
        )
        sprint_ids: Optional[List[Union[int, str]]] = Field(
            None, description="Specific sprint IDs to sync directly"
        )
        sprint_states: Optional[List[SprintState]] = Field(
            [SprintState.active], description="Sprint states to include"
        )

    parameters: Parameters = Field(
        default_factory=Parameters, description="Sprint sync parameters"
    )

    class Config:
        schema_extra = {
            "example": {
                "parameters": {
                    "sprint_ids": [100, "200", 300],
                    "sprint_states": ["active"],
                },
                "priority": 7,
                "created_by": "api_user",
            }
        }


class SprintIssuesSyncRequest(BaseJobRequest):
    """Request model for sprint issues sync job"""

    class Parameters(BaseModel):
        sprint_ids: Optional[List[str]] = Field(
            ..., description="List of sprint IDs to sync"
        )
        include_comments: Optional[bool] = Field(
            False, description="Whether to fetch comments along with issues"
        )
        include_changelog: Optional[bool] = Field(
            False, description="Whether to fetch changelog along with issues"
        )
        include_subtasks: Optional[bool] = Field(
            True, description="Whether to fetch subtasks of sprint issues"
        )

    parameters: Parameters = Field(
        default_factory=Parameters, description="Sprint issues sync parameters"
    )


class WorklogSyncRequest(BaseJobRequest):
    """Request model for worklog sync job"""

    class Parameters(BaseModel):
        issue_keys: List[str] = Field(
            ...,
            description="List of issue keys to fetch worklogs for",
            example=["PROJ-123", "PROJ-124"],
        )
        batch_size: Optional[int] = Field(
            50, ge=1, le=100, description="Number of issues to process per batch"
        )
        date_from: Optional[str] = Field(
            None, description="Start date for worklog filtering (YYYY-MM-DD)"
        )
        date_to: Optional[str] = Field(
            None, description="End date for worklog filtering (YYYY-MM-DD)"
        )

    parameters: Parameters = Field(
        default_factory=Parameters, description="Worklog sync parameters"
    )


class RecentActivityIssueSyncRequest(BaseJobRequest):
    """Request model for recent activity issue sync job"""

    class Parameters(BaseModel):
        days_back: Optional[int] = Field(
            7,
            ge=1,
            le=365,
            description="Number of days to look back for recent activity",
            example=7,
        )
        include_comments: Optional[bool] = Field(
            False,
            description="Whether to include comments when syncing sprint issues",
        )
        include_changelog: Optional[bool] = Field(
            False,
            description="Whether to include changelog when syncing sprint issues",
        )
        include_subtasks: Optional[bool] = Field(
            True,
            description="Whether to include subtasks when syncing sprint issues",
        )
        sprint_status: Optional[SprintState] = Field(
            None,
            description="Filter sprints by status (active, future, closed)",
            example="active",
        )

    parameters: Parameters = Field(
        default_factory=Parameters, description="Recent activity issue sync parameters"
    )

    class Config:
        schema_extra = {
            "example": {
                "parameters": {
                    "days_back": 14,
                    "include_comments": True,
                    "include_changelog": False,
                    "include_subtasks": True,
                    "sprint_status": "active",
                },
                "priority": 7,
                "created_by": "user123",
            }
        }


class JiraCredentials(BaseModel):
    """
    Jira authentication credentials for multi-tenant requests.

    These credentials are extracted from HTTP headers and used to authenticate
    with the tenant's specific Jira instance.
    """

    server: str = Field(
        ..., description="Jira server URL (e.g., https://company.atlassian.net)"
    )
    username: str = Field(..., description="Jira username or email")
    api_token: str = Field(..., description="Jira API token")

    @validator("server")
    def validate_server_url(cls, v):
        if not v or not v.strip():
            raise ValueError("Server URL cannot be empty")
        return v.strip()

    @validator("username", "api_token")
    def validate_non_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Field cannot be empty")
        return v.strip()

    class Config:
        schema_extra = {
            "example": {
                "server": "https://company.atlassian.net",
                "username": "user@company.com",
                "api_token": "ATATT3xFfGF0...",
            }
        }


class SprintsListSyncRequest(BaseJobRequest):
    """Request model for sprints list sync job"""

    class Parameters(BaseModel):
        sprint_states: Optional[List[SprintState]] = Field(
            None, 
            description="Filter by sprint states (active, closed, future). If not provided, fetches all states."
        )

    parameters: Parameters = Field(
        default_factory=Parameters, 
        description="Sprints list sync parameters"
    )

    class Config:
        schema_extra = {
            "example": {
                "parameters": {
                    "sprint_states": ["active", "closed"]
                },
                "priority": 5,
                "created_by": "api_user",
            }
        }


class OAuthJiraCredentials(BaseModel):
    """
    OAuth credentials for Atlassian Cloud API access.

    These credentials are used to authenticate with the Atlassian Cloud REST API
    using OAuth Bearer token authentication.
    """

    access_token: str = Field(..., description="OAuth access token")
    cloud_id: str = Field(..., description="Atlassian Cloud ID")
    username: str = Field(..., description="Khoji User email/username")
    tenant_id: str = Field(..., description="Instance Id from Khoji")
    

    @validator("access_token", "cloud_id", "username", "tenant_id")
    def validate_non_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Field cannot be empty")
        return v.strip()

    class Config:
        schema_extra = {
            "example": {
                "refresh_token": "eyJraWQiOiJhdXRoLmF0bGFzc2lhbi5jb20tQUNDRVNTLTk0ZTcz...",
                "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6Ik...",
                "cloud_id": "35273b54-3f06-40d2-880f-dd28cf8daafa",
                "tenant_id": "1234"
            }
        }