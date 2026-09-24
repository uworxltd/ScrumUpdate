##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Pydantic models for the Jira Sync Platform.
Provides clean separation between different model types.
"""

# Import all models for backward compatibility
from .requests import *
from .responses import *
from .database import *
from .enums import *

# Maintain backward compatibility by re-exporting everything
__all__ = [
    # Request models
    "JobSubmissionRequest",
    "BaseJobRequest",
    "BoardSyncRequest",
    "SprintSyncRequest",
    "SprintIssuesSyncRequest",
    "WorklogSyncRequest",
    "JiraCredentials",
    "OAuthJiraCredentials",
    # Response models
    "JobSubmissionResponse",
    "ImmediateJobSubmissionResponse",
    "JobStatusResponse",
    "SystemHealthResponse",
    "SystemStatsResponse",
    "JobSummaryResponse"
    # Database models
    "BoardEntity",
    "SprintEntity",
    "IssueEntity",
    "WorklogEntity",
    "CommentEntity",
    "ChangelogEntity",
    "IssueRelationshipEntity",
    "SyncJobEntity",
    # Enums
    "BoardType",
    "SprintState",
    "JobStatus",
]