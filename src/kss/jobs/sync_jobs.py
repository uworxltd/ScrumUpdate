##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Unified task definition module for Jira sync system.
This module provides a centralized location for all Celery task definitions with:
- Automatic task discovery
- Consistent execution patterns
- Single entry point for job submission
- Support for both simple jobs and complex workflows
"""

from typing import Dict, Any, List, Callable
from celery import Task
from datetime import datetime
import json
import uuid

from tasks.celery_app import app
from jobs.base import JobConfig, JobStatus
from services.job_management_service import JobManagementService
from tasks.job_tracker import create_progress_callback
from database import DatabaseManager


# =============================================================================
# SYNC TASK BASE CLASS
# =============================================================================


class SyncTaskBase(Task):
    """
    Base Celery task class for unified job execution.
    Provides common functionality for executing jobs and workflows.
    """

    def execute_job(self, job_class: type, *args) -> Dict[str, Any]:
        """
        Execute a sync job with the given job class.
        Handles both standalone and chained task execution.

        For standalone tasks: execute_job(JobClass, job_config_dict)
        For chained tasks: execute_job(JobClass, previous_result, job_config_dict)

        Args:
            job_class: The job class to instantiate and execute
            *args: Variable arguments (job_config_dict or previous_result + job_config_dict)

        Returns:
            Dictionary containing job result
        """
        # Determine if this is a chained call
        job_id = self.request.id
        if len(args) == 1:
            # Standalone task
            job_config_dict = args[0]
            previous_result = None
        elif len(args) == 2:
            # Chained task - need to figure out which is which
            if isinstance(args[0], dict) and "job_id" in args[0]:
                # First arg is job_config
                job_config_dict = args[0]
                previous_result = args[1]
            else:
                # First arg is previous_result (Celery chain behavior)
                previous_result = args[0]
                job_config_dict = args[1]
        else:
            raise ValueError(f"Invalid arguments to execute_job: {args}")
        # Update job_id to use actual task_id
        job_config_dict["job_id"] = self.request.id
        job_config = JobConfig.from_dict(job_config_dict)
        job_id = job_config.job_id

        # Create tenant-aware tracker
        tracker = JobManagementService(job_config.tenant_id)

        # Handle previous result for chained tasks (e.g., worklog task needs issue_keys from previous task)
        if (
            previous_result
            and isinstance(previous_result, dict)
            and "data" in previous_result
        ):
            issue_keys = previous_result["data"].get("issue_keys", [])
            if issue_keys:
                job_config.parameters["issue_keys"] = issue_keys
                print(f"🔗 Chained task: received {len(issue_keys)} issue keys from previous task")
            elif job_config.job_type == "worklogs" or job_config.job_type == "changelog":
                print(f"⚠️ job type: {job_config.job_type} but issue_keys are missing in data from previous results")
        elif job_config.job_type == "worklogs" or job_config.job_type == "changelog":
            print(f"⚠️ job type: {job_config.job_type} but we dont have data from previous results")

        print(f"🚀 Starting sync job: {job_id} (type: {job_config.job_type})")

        try:
            # Job record already created in /submit endpoint
            # Just update status to running
            tracker.update_job_status(job_id, JobStatus.RUNNING)

            # Create job instance
            job = job_class(job_config)

            # Set up progress callback
            progress_callback = create_progress_callback(
                job_config.tenant_id, job_class, job_id, self.request.id
            )
            job.set_progress_callback(progress_callback)

            # Execute the job
            result = job.run()

            # Update job status based on result
            if result.success:
                tracker.update_job_status(
                    job_id, JobStatus.SUCCESS, results=result.to_dict()
                )
                print(f"✅ Sync job {job_id} completed successfully")
            else:
                tracker.update_job_status(
                    job_id,
                    JobStatus.FAILED,
                    results=result.to_dict(),
                    error_message=result.message,
                )
                print(f"❌ Sync job {job_id} failed: {result.message}")

            return result.to_dict()

        except Exception as exc:
            # Handle unexpected errors
            error_msg = f"Sync job failed: {str(exc)}"
            tracker.update_job_status(job_id, JobStatus.FAILED, error_message=error_msg)

            # Retry logic
            if self.request.retries < self.max_retries:
                retry_count = self.request.retries + 1
                countdown = 60 * (2 ** self.request.retries)
                print(
                    f"🔄 Retrying sync job {job_id} (attempt {retry_count}/{self.max_retries}) in {countdown} seconds"
                )
                raise self.retry(exc=exc, countdown=countdown)

            print(f"❌ Sync job {job_id} failed after {self.max_retries} retries")
            raise exc

    def execute_workflow(self, workflow_class: type, *args) -> Dict[str, Any]:
        """
        Execute a workflow with the given workflow class.
        
        Workflows handle their own job tracking, so this method does NOT
        create job records like execute_job does.

        Args:
            workflow_class: The workflow class to instantiate and execute
            *args: Variable arguments (job_config_dict)

        Returns:
            Dictionary containing workflow result
        """
        # Parse arguments
        if len(args) == 1:
            job_config_dict = args[0]
        else:
            raise ValueError(f"Invalid arguments to execute_workflow: {args}")
        
        # Handle workflow_id: move it from top-level to parameters
        if 'workflow_id' in job_config_dict:
            workflow_id = job_config_dict.pop('workflow_id')
            if 'parameters' not in job_config_dict:
                job_config_dict['parameters'] = {}
            job_config_dict['parameters']['workflow_id'] = workflow_id
        
        # Create JobConfig
        job_config = JobConfig.from_dict(job_config_dict)
        
        print(f"🚀 Starting workflow: {job_config.job_type}")
        
        try:
            # Create workflow instance
            workflow = workflow_class(job_config)
            
            # Execute the workflow (calls orchestrate())
            result = workflow.run()
            
            return result.to_dict()
            
        except Exception as exc:
            print(f"❌ Workflow {job_config.job_type} failed: {str(exc)}")
            raise exc


# =============================================================================
# TASK DEFINITIONS
# =============================================================================

# Import job classes from simple package
from jobs.simple import (
    BoardSyncJob,
    SprintSyncJob,
    SprintIssueSyncJob,
    WorklogSyncJob,
    JQLIssueSyncJob,
    BurndownRefreshJob,
    ProactiveSprintsSyncJob,
    SprintsListSyncJob,
    ChangelogSyncJob,
    CommentSyncJob,
)


@app.task(bind=True, base=SyncTaskBase, name="tasks.sync_boards_task")
def sync_boards_task(self, *args) -> Dict[str, Any]:
    """Sync boards from Jira."""
    return self.execute_job(BoardSyncJob, *args)


@app.task(bind=True, base=SyncTaskBase, name="tasks.sync_sprints_task")
def sync_sprints_task(self, *args) -> Dict[str, Any]:
    """Sync sprints from Jira."""
    return self.execute_job(SprintSyncJob, *args)


@app.task(bind=True, base=SyncTaskBase, name="tasks.sync_sprint_issues_task")
def sync_sprint_issues_task(self, *args) -> Dict[str, Any]:
    """Sync sprint issues from Jira."""
    return self.execute_job(SprintIssueSyncJob, *args)


@app.task(bind=True, base=SyncTaskBase, name="tasks.sync_worklogs_task")
def sync_worklogs_task(self, *args) -> Dict[str, Any]:
    """Sync worklogs from Jira."""
    return self.execute_job(WorklogSyncJob, *args)


@app.task(bind=True, base=SyncTaskBase, name="tasks.sync_jql_issues_task")
def sync_jql_issues_task(self, *args) -> Dict[str, Any]:
    """Sync issues using JQL query."""
    return self.execute_job(JQLIssueSyncJob, *args)


@app.task(bind=True, base=SyncTaskBase, name="tasks.refresh_burndown_task")
def refresh_burndown_task(self, *args) -> Dict[str, Any]:
    """Refresh burndown data."""
    return self.execute_job(BurndownRefreshJob, *args)


@app.task(bind=True, base=SyncTaskBase, name="tasks.sync_proactive_sprints_task")
def sync_proactive_sprints_task(self, *args) -> Dict[str, Any]:
    """Proactively sync sprints."""
    return self.execute_job(ProactiveSprintsSyncJob, *args)


@app.task(bind=True, base=SyncTaskBase, name="tasks.sync_sprints_list_task")
def sync_sprints_list_task(self, *args) -> Dict[str, Any]:
    """Sync list of sprints."""
    return self.execute_job(SprintsListSyncJob, *args)

@app.task(bind=True, base=SyncTaskBase, name="tasks.sync_changelogs_task")
def sync_changelogs_task(self, *args) -> Dict[str, Any]:
    """Sync changelogs."""
    return self.execute_job(ChangelogSyncJob, *args)

@app.task(bind=True, base=SyncTaskBase, name="tasks.sync_comments_task")
def sync_comments_task(self, *args) -> Dict[str, Any]:
    """Sync comments."""
    return self.execute_job(CommentSyncJob, *args)

# =============================================================================
# WORKFLOW TASK DEFINITIONS
# =============================================================================

# Import workflow classes from workflows package
from jobs.workflows import JQLWorklogWorkflow, SprintIssuesWorklogWorkflow


@app.task(bind=True, base=SyncTaskBase, name="tasks.jql_worklog_workflow_task")
def jql_worklog_workflow_task(self, *args) -> Dict[str, Any]:
    """Execute JQL issues discovery followed by worklog sync workflow."""
    return self.execute_workflow(JQLWorklogWorkflow, *args)


@app.task(bind=True, base=SyncTaskBase, name="tasks.sprint_issues_worklog_workflow_task")
def sprint_issues_worklog_workflow_task(self, *args) -> Dict[str, Any]:
    """Execute sprint issues sync with worklogs in parallel, followed by burndown refresh."""
    return self.execute_workflow(SprintIssuesWorklogWorkflow, *args)


@app.task(bind=True, name="tasks.workflow_completion_callback")
def workflow_completion_callback(self, previous_result, workflow_metadata):
    """
    Callback task to update workflow job record to SUCCESS.
    This is the final task in every workflow chain.
    """
    workflow_id = workflow_metadata['workflow_id']
    tenant_id = workflow_metadata['tenant_id']
    
    tracker = JobManagementService(tenant_id)
    tracker.update_job_status(
        workflow_id,
        JobStatus.SUCCESS,
        results={
            'completed': True,
            'workflow_type': workflow_metadata.get('workflow_type'),
            'final_result': previous_result
        }
    )
    
    print(f"✅ Workflow {workflow_id} completed successfully")
    return previous_result


@app.task(bind=True, name="tasks.workflow_error_callback")
def workflow_error_callback(self, uuid, exception, traceback, workflow_metadata):
    """
    Error callback to update workflow job record to FAILED.
    Attached to workflows via link_error.
    """
    workflow_id = workflow_metadata['workflow_id']
    tenant_id = workflow_metadata['tenant_id']
    
    tracker = JobManagementService(tenant_id)
    tracker.update_job_status(
        workflow_id,
        JobStatus.FAILED,
        error_message=str(exception)
    )
    
    print(f"❌ Workflow {workflow_id} failed: {exception}")


@app.task(bind=True, base=SyncTaskBase, name="tasks.health_check_task")
def health_check_task(self) -> Dict[str, Any]:
    """
    Health check task to verify system components.
    Runs periodically to ensure all services are operational.
    """
    print("🏥 Running health check...")

    health_status = {
        "timestamp": datetime.now().isoformat(),
        "status": "healthy",
        "checks": {},
    }

    try:
        # Check database connectivity
        db_manager = DatabaseManager()
        with db_manager.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
                health_status["checks"]["database"] = "healthy"
    except Exception as e:
        health_status["checks"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "unhealthy"

    try:
        # Check Redis connectivity
        app.backend.get("health_check")
        health_status["checks"]["redis"] = "healthy"
    except Exception as e:
        health_status["checks"]["redis"] = f"unhealthy: {str(e)}"
        health_status["status"] = "unhealthy"

    # Store health check result
    redis_client = app.backend.client
    redis_client.set("system:health", json.dumps(health_status), ex=300)

    print(f"🏥 Health check completed: {health_status['status']}")
    return health_status


# =============================================================================
# AUTOMATIC TASK DISCOVERY
# =============================================================================

# Build task registry by discovering all task functions
SYNC_TASKS: Dict[str, Callable] = {}

# Discover all task functions in this module
for name, obj in list(globals().items()):
    if name.endswith('_task') and callable(obj) and hasattr(obj, 'name'):
        # Extract job type from task name
        # e.g., "sync_boards_task" -> "boards"
        task_name = name.replace('sync_', '').replace('_task', '')
        
        # Map to job type names used in API
        job_type_mapping = {
            'boards': 'boards',
            'sprints': 'sprints',
            'sprint_issues': 'sprint_issues',
            'worklogs': 'worklogs',
            'changelogs': 'changelogs',
            'comments': 'comments',
            'jql_issues': 'jql_issues',
            'refresh_burndown': 'burndown_refresh',
            'proactive_sprints': 'proactive_sprints_sync',
            'sprints_list': 'sprints_list_sync',
            'jql_worklog_workflow': 'jql_issues_worklog_workflow',
            'sprint_issues_worklog_workflow': 'sprint_issues_worklog_workflow',
        }
        
        job_type = job_type_mapping.get(task_name, task_name)
        SYNC_TASKS[job_type] = obj

print(f"✅ Discovered {len(SYNC_TASKS)} sync tasks: {list(SYNC_TASKS.keys())}")


# =============================================================================
# PUBLIC API
# =============================================================================


def get_available_job_types() -> List[str]:
    """
    Get list of all available job types.

    Returns:
        List of job type strings
    """
    return list(SYNC_TASKS.keys())


def submit_sync_job(job_type: str, job_config_dict: Dict[str, Any]) -> str:
    """
    Submit a sync job to Celery for execution.
    Single entry point for all job submissions.

    Args:
        job_type: Type of job to submit
        job_config_dict: Job configuration dictionary (must include pre-generated job_id)

    Returns:
        job_id (same as the one passed in job_config_dict)

    Raises:
        ValueError: If job_type is not recognized or job_id is missing
    """
    if job_type not in SYNC_TASKS:
        available = ', '.join(get_available_job_types())
        raise ValueError(
            f"Unknown job type: '{job_type}'. Available types: {available}"
        )

    # Validate that job_id is provided
    job_id = job_config_dict.get('job_id')
    if not job_id or job_id == "temp":
        raise ValueError("job_config_dict must include a pre-generated job_id")

    # Get the task function
    task_func = SYNC_TASKS[job_type]

    # Check if this is a workflow
    workflow_types = ['jql_issues_worklog_workflow', 'sprint_issues_worklog_workflow']
    
    if job_type in workflow_types:
        # For workflows, use the pre-generated job_id as workflow_id
        job_config_dict['workflow_id'] = job_id
        
        # Submit task
        task = task_func.apply_async(
            args=[job_config_dict]
        )
        
        print(f"📤 Submitted {job_type} workflow: {job_id} (celery_task: {task.id})")
        return job_id
    else:
        # For simple jobs, use the pre-generated job_id
        # Submit with task_id set to our job_id for tracking
        task = task_func.apply_async(
            args=[job_config_dict],
            task_id=job_id,  # Use our pre-generated job_id as Celery task_id
        )
        
        print(f"📤 Submitted {job_type} job: {job_id}")
        return job_id