##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Sprint Issues Worklog Workflow implementation.

This workflow orchestrates sprint synchronization with parallel execution,
syncing sprints, issues, and worklogs efficiently with a final burndown refresh.
"""

from typing import List
from celery import chain, group

from jobs.base import JobResult, JobStatus
from tasks.job_tracker import JobStatusTracker
from .base import BaseWorkflow


class SprintIssuesWorklogWorkflow(BaseWorkflow):
    """
    Workflow that orchestrates sprint synchronization with parallel execution.
    
    This workflow (formerly RecentActivityWorkflow):
    1. Syncs sprints in parallel with:
       - Sprint issues sync followed by worklog sync (chained)
    2. Refreshes burndown data after parallel execution completes

     Workflow Pattern:
        ┌─────────────────────────────────────┐
        │         Sprint Issues Sync          │
        │         └─────────────────┘         │
        └─────────────────────────────────────┘
                          ↓
        ┌─────────────────────────────────────┐
        │  Parallel Group                     │
        │  ┌─────────────────────────────┐    │
        │  │ Sync Worklogs               │    │
        │  └─────────────────────────────┘    │
        │  ┌─────────────────────────────┐    │
        │  │ Sync Changelogs             │    │
        │  └─────────────────────────────┘    │
        │  ┌─────────────────────────────┐    │
        │  │ Sync Comments               │    │
        │  └─────────────────────────────┘    │
        └─────────────────────────────────────┘
                         ↓
        ┌─────────────────────────────────────┐
        │  Burndown Refresh                   │
        └─────────────────────────────────────┘
                         ↓
        ┌─────────────────────────────────────┐
        │  Sprints Sync                       │
        └─────────────────────────────────────┘
    
    Parameters:
    - sprint_ids (required): List of sprint IDs to sync
    - include_subtasks (optional): Fetch subtasks with issues (default: true)
    """
    
    def validate_parameters(self) -> tuple[bool, List[str]]:
        """Validate workflow parameters."""
        errors = []
        params = self.config.parameters
        
        # Validate sprint_ids parameter
        sprint_ids = params.get("sprint_ids")
        if not sprint_ids:
            errors.append("Required parameter 'sprint_ids' must be provided")
        elif not isinstance(sprint_ids, list):
            errors.append("Parameter 'sprint_ids' must be a list")
        elif not all(isinstance(sid, int) for sid in sprint_ids):
            errors.append("All sprint_ids must be integers")

        # Validate boolean parameters
        bool_params = ["include_subtasks"]
        for param in bool_params:
            if param in params and not isinstance(params[param], bool):
                errors.append(f"{param} must be a boolean value")

        return len(errors) == 0, errors
    
    def orchestrate(self) -> JobResult:
        """
        Orchestrate the Sprint Issues + Worklogs workflow with parallel execution.
        
        Returns:
            JobResult with workflow submission details
        """
        # Import tasks here to avoid circular imports
        from jobs.sync_jobs import (
            sync_sprints_task,
            sync_sprint_issues_task,
            sync_worklogs_task,
            sync_changelogs_task,
            sync_comments_task,
            refresh_burndown_task
        )
        
        print(f"🔄 Orchestrating Sprint Issues→Worklogs workflow for tenant: {self.config.tenant_id}")
        print(f"   Sprint IDs: {self.config.parameters.get('sprint_ids', [])}")
        
        # Get or generate workflow_id
        workflow_id = self.config.parameters.get('workflow_id')
        if not workflow_id:
            import uuid
            workflow_id = str(uuid.uuid4())
        
        # Create sprints step config
        sprints_step_config = self._create_step_config(
            job_type="sprints",
            parameters={"sprint_ids": self.config.parameters["sprint_ids"]},
            step_name="sprints_sync"
        )
        
        # Create sprint issues step config
        sprint_issues_step_config = self._create_step_config(
            job_type="sprint_issues",
            parameters={
                "sprint_ids": self.config.parameters["sprint_ids"],
                "include_subtasks": self.config.parameters.get("include_subtasks", True),
            },
            step_name="sprint_issues_sync"
        )
        
        # Create worklog step config (parameters will be populated by sprint_issues result)
        worklog_step_config = self._create_step_config(
            job_type="worklogs",
            parameters={},  # Will be populated with issue_keys from sprint_issues result
            step_name="worklog_sync"
        )

        # Create changelogs step config (parameters will be populated by parent)
        changelog_step_config = self._create_step_config(
            job_type="changelog",
            parameters={},
            step_name="changelog_sync"
        )

        # Create comments step config (parameters will be populated by parent)
        comment_step_config = self._create_step_config(
            job_type="comments",
            parameters={},
            step_name="comment_sync"
        )

        # Create burndown refresh step config
        burndown_step_config = self._create_step_config(
            job_type="burndown_refresh",
            parameters={"sprint_ids": self.config.parameters["sprint_ids"]},
            step_name="burndown_refresh"
        )
        
        # Create workflow chain WITHOUT callbacks first
        workflow_chain = chain(
            sync_sprint_issues_task.s(sprint_issues_step_config),
            group(
                sync_worklogs_task.s(worklog_step_config),
                sync_changelogs_task.s(changelog_step_config),
                sync_comments_task.s(comment_step_config),
            ),
            refresh_burndown_task.s(burndown_step_config),
            sync_sprints_task.s(sprints_step_config)
        )
        
        # Job record already created in /submit endpoint
        # Just update status to running
        tracker = JobStatusTracker(self.config.tenant_id)
        tracker.update_job_status(workflow_id, JobStatus.RUNNING)
        
        # Submit workflow with completion callback attached
        result = self._attach_completion_callback(
            workflow_chain,
            workflow_id,
            "sprint_issues_worklog"
        )
        
        print(f"📤 Submitted Sprint Issues→Worklogs workflow: {workflow_id}")
        
        return self._create_workflow_result(
            workflow_id=workflow_id,
            workflow_type="sprint_issues_worklog",
            message="Sprint Issues→Worklogs workflow submitted successfully"
        )