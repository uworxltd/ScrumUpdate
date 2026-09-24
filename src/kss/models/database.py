##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Database models for the Jira Sync Platform.
Defines models that represent database entities and data structures.
"""

from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from datetime import datetime


class BoardEntity(BaseModel):
    """Database representation of a Jira board"""
    
    board_id: int = Field(..., description="Jira board ID")
    name: str = Field(..., description="Board name")
    type: str = Field(..., description="Board type (scrum, kanban, etc.)")
    project_key: Optional[str] = Field(None, description="Associated project key")
    project_name: Optional[str] = Field(None, description="Associated project name")
    location: Optional[Dict[str, Any]] = Field(None, description="Board location metadata")
    last_synced_at: Optional[datetime] = Field(None, description="Last synchronization timestamp")


class SprintEntity(BaseModel):
    """Database representation of a Jira sprint"""
    
    sprint_id: int = Field(..., description="Jira sprint ID")
    board_id: int = Field(..., description="Associated board ID")
    name: str = Field(..., description="Sprint name")
    state: str = Field(..., description="Sprint state (active, closed, future)")
    start_date: Optional[datetime] = Field(None, description="Sprint start date")
    end_date: Optional[datetime] = Field(None, description="Sprint end date")
    complete_date: Optional[datetime] = Field(None, description="Sprint completion date")
    goal: Optional[str] = Field(None, description="Sprint goal")
    last_synced_at: Optional[datetime] = Field(None, description="Last synchronization timestamp")


class IssueEntity(BaseModel):
    """Database representation of a Jira issue"""
    
    issue_id: str = Field(..., description="Jira issue ID")
    issue_key: str = Field(..., description="Jira issue key")
    sprint_id: Optional[str] = Field(None, description="Associated sprint ID")
    summary: str = Field(..., description="Issue summary")
    description: Optional[str] = Field(None, description="Issue description")
    issue_type: Optional[str] = Field(None, description="Issue type")
    status: Optional[str] = Field(None, description="Issue status")
    priority: Optional[str] = Field(None, description="Issue priority")
    assignee: Optional[str] = Field(None, description="Assigned user")
    reporter: Optional[str] = Field(None, description="Reporter user")
    created_date: Optional[datetime] = Field(None, description="Issue creation date")
    updated_date: Optional[datetime] = Field(None, description="Issue last update date")
    resolution_date: Optional[datetime] = Field(None, description="Issue resolution date")
    story_points: Optional[float] = Field(None, description="Story points estimate")
    labels: List[str] = Field(default_factory=list, description="Issue labels")
    components: List[str] = Field(default_factory=list, description="Issue components")
    parent_issue_key: Optional[str] = Field(None, description="Parent issue key for subtasks")
    last_synced_at: Optional[datetime] = Field(None, description="Last synchronization timestamp")


class WorklogEntity(BaseModel):
    """Database representation of a Jira worklog"""
    
    worklog_id: str = Field(..., description="Jira worklog ID")
    issue_key: str = Field(..., description="Associated issue key")
    author_name: Optional[str] = Field(None, description="Worklog author username")
    author_email: Optional[str] = Field(None, description="Worklog author email")
    author_display_name: Optional[str] = Field(None, description="Worklog author display name")
    time_spent_seconds: int = Field(0, description="Time spent in seconds")
    comment: Optional[str] = Field(None, description="Worklog comment")
    created_date: Optional[datetime] = Field(None, description="Worklog creation date")
    updated_date: Optional[datetime] = Field(None, description="Worklog last update date")
    started_date: Optional[datetime] = Field(None, description="Work start date")
    last_synced_at: Optional[datetime] = Field(None, description="Last synchronization timestamp")


class CommentEntity(BaseModel):
    """Database representation of a Jira comment"""
    
    comment_id: str = Field(..., description="Jira comment ID")
    issue_key: str = Field(..., description="Associated issue key")
    author_display_name: Optional[str] = Field(None, description="Comment author display name")
    comment_body: Optional[str] = Field(None, description="Comment text content")
    created_date: Optional[datetime] = Field(None, description="Comment creation date")
    updated_date: Optional[datetime] = Field(None, description="Comment last update date")
    last_synced_at: Optional[datetime] = Field(None, description="Last synchronization timestamp")


class ChangelogEntity(BaseModel):
    """Database representation of a Jira changelog entry"""
    
    changelog_id: str = Field(..., description="Unique changelog entry ID")
    issue_key: str = Field(..., description="Associated issue key")
    author_display_name: Optional[str] = Field(None, description="Author of the change")
    created_date: Optional[datetime] = Field(None, description="When the change occurred")
    field_name: str = Field(..., description="Name of the field that changed")
    field_type: Optional[str] = Field(None, description="Type of field (system, custom, etc.)")
    from_value: Optional[str] = Field(None, description="Original field value")
    to_value: Optional[str] = Field(None, description="New field value")
    from_display_value: Optional[str] = Field(None, description="Original display value")
    to_display_value: Optional[str] = Field(None, description="New display value")
    last_synced_at: Optional[datetime] = Field(None, description="Last synchronization timestamp")


class IssueRelationshipEntity(BaseModel):
    """Database representation of issue relationships"""
    
    parent_issue_key: str = Field(..., description="Parent issue key")
    child_issue_key: str = Field(..., description="Child issue key")
    relationship_type: str = Field(..., description="Type of relationship (subtask, epic_child, etc.)")
    last_synced_at: Optional[datetime] = Field(None, description="Last synchronization timestamp")


class SyncJobEntity(BaseModel):
    """Database representation of a sync job"""
    
    job_id: str = Field(..., description="Unique job identifier")
    job_type: str = Field(..., description="Type of sync job")
    status: str = Field(..., description="Current job status")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Job parameters")
    results: Optional[Dict[str, Any]] = Field(None, description="Job results")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    created_at: datetime = Field(..., description="Job creation timestamp")
    updated_at: datetime = Field(..., description="Job last update timestamp")
    started_at: Optional[datetime] = Field(None, description="Job start timestamp")
    completed_at: Optional[datetime] = Field(None, description="Job completion timestamp")
    created_by: Optional[str] = Field(None, description="Job creator")
    retry_count: int = Field(0, description="Number of retry attempts")