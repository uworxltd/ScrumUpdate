##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
JQL Worklog Workflow implementation.

This workflow chains JQL issue discovery with worklog synchronization,
allowing users to sync worklogs for issues matching a JQL query.
"""

from typing import List
from celery import chain, group

from jobs.base import JobResult, JobStatus
from tasks.job_tracker import JobStatusTracker
from .base import BaseWorkflow


class JQLWorklogWorkflow(BaseWorkflow):
    """
    Workflow that chains JQL issue discovery with worklog synchronization.
    
    This workflow:
    1. Executes JQL query to discover issues
    2. Extracts issue keys from the result
    3. Syncs worklogs, changelogs, and comments for all discovered issues (Parallel)
    
    Workflow Pattern:
        ┌─────────────────────────────────────┐
        │           Sync JQL Issues           │
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
    
    Parameters:
    - jql (required): JQL query string
    """
    
    def validate_parameters(self) -> tuple[bool, List[str]]:
        """Validate workflow parameters."""
        errors = []
        params = self.config.parameters
        
        # Validate JQL parameter
        jql = params.get("jql")
        if not jql or not isinstance(jql, str) or not jql.strip():
            errors.append("Required parameter 'jql' must be a non-empty string")
            
        return len(errors) == 0, errors
    
    def orchestrate(self) -> JobResult:
        """
        Orchestrate the JQL → Worklog workflow.
        
        Returns:
            JobResult with workflow submission details
        """
        # Import tasks here to avoid circular imports
        from jobs.sync_jobs import sync_jql_issues_task, sync_worklogs_task, sync_changelogs_task, sync_comments_task
        
        print(f"🔄 Orchestrating JQL→Worklog workflow for tenant: {self.config.tenant_id}")
        
        # Get or generate workflow_id
        workflow_id = self.config.parameters.get('workflow_id')
        if not workflow_id:
            import uuid
            workflow_id = str(uuid.uuid4())
        
        # Create JQL issues step config
        jql_step_config = self._create_step_config(
            job_type="jql_issues",
            parameters=self.config.parameters,
            step_name="jql_discovery"
        )

        # Create changelogs step config (parameters will be populated by parent)
        changelog_step_config = self._create_step_config(
            job_type="changelog",
            parameters={},
            step_name="changelog_sync"
        )
        
        # Create worklog step config (parameters will be populated by parent)
        worklog_step_config = self._create_step_config(
            job_type="worklogs",
            parameters={},
            step_name="worklog_sync"
        )

        # Create comments step config (parameters will be populated by parent)
        comment_step_config = self._create_step_config(
            job_type="comments",
            parameters={},
            step_name="comment_sync"
        )
        
        # Create workflow chain WITHOUT callbacks first
        workflow_chain = chain(
            sync_jql_issues_task.s(jql_step_config),
            group(
                sync_worklogs_task.s(worklog_step_config),
                sync_changelogs_task.s(changelog_step_config),
                sync_comments_task.s(comment_step_config)
            )
        )
        
        # Job record already created in /submit endpoint
        # Just update status to running
        tracker = JobStatusTracker(self.config.tenant_id)
        tracker.update_job_status(workflow_id, JobStatus.RUNNING)
        
        # Submit workflow with completion callback attached
        result = self._attach_completion_callback(
            workflow_chain,
            workflow_id,
            "jql_worklog"
        )
        
        print(f"📤 Submitted JQL→Worklog workflow: {workflow_id}")
        
        return self._create_workflow_result(
            workflow_id=workflow_id,
            workflow_type="jql_worklog",
            message="JQL→Worklog workflow submitted successfully"
        )