##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Celery worker task registration module.
This module imports all task definitions to register them with Celery.

Usage:
    celery -A tasks.worker worker --loglevel=info
"""

# Import Celery app
from tasks.celery_app import app

# Import all tasks from the new unified system
from jobs.sync_jobs import (
    # Simple sync tasks
    sync_boards_task,
    sync_sprints_task,
    sync_sprint_issues_task,
    sync_worklogs_task,
    sync_jql_issues_task,
    refresh_burndown_task,
    sync_proactive_sprints_task,
    sync_sprints_list_task,
    sync_sprint_issues_task,
    # Workflow tasks
    jql_worklog_workflow_task,
    sprint_issues_worklog_workflow_task,
    # Health check
    health_check_task,
)

# All tasks are now registered with Celery
print(f"✅ Registered {len(app.tasks)} tasks with Celery")