##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Celery configuration for the Jira sync system.
This file defines how Celery connects to Redis, handles tasks, and manages workers.

Key Configuration Areas:
1. Broker & Backend: Redis connection settings
2. Task Serialization: How tasks are encoded/decoded
3. Worker Configuration: Performance and reliability settings
4. Task Routing: Which queues handle which tasks
5. Monitoring: Integration with Flower and logging
"""

import os
from celery.schedules import crontab

# =============================================================================
# BROKER & RESULT BACKEND CONFIGURATION
# =============================================================================

# Redis connection for message broker (task queue)
broker_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")

# Redis connection for result storage (task results)
result_backend = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

# Connection pool settings for better performance
broker_connection_retry_on_startup = True
broker_connection_retry = True
broker_connection_max_retries = 10

# =============================================================================
# TASK SERIALIZATION & SECURITY
# =============================================================================

# Use JSON for task serialization (more secure than pickle)
task_serializer = "json"
accept_content = ["json"]  # Only accept JSON content
result_serializer = "json"

# Timezone settings
timezone = "UTC"
enable_utc = True

# =============================================================================
# TASK EXECUTION CONFIGURATION
# =============================================================================

# Task execution settings
task_acks_late = True  # Acknowledge tasks only after completion
task_reject_on_worker_lost = True  # Reject tasks if worker dies
task_track_started = True  # Track when tasks start (useful for monitoring)

# Task result settings
result_expires = 3600  # Results expire after 1 hour
result_persistent = True  # Store results persistently

# Task time limits (prevent runaway tasks)
task_soft_time_limit = 1800  # 30 minutes soft limit (sends SIGTERM)
task_time_limit = 2400  # 40 minutes hard limit (sends SIGKILL)

# =============================================================================
# WORKER CONFIGURATION
# =============================================================================

# Worker performance settings
worker_prefetch_multiplier = (
    1  # Process one task at a time (better for long-running tasks)
)
worker_max_tasks_per_child = (
    1000  # Restart worker after 1000 tasks (prevents memory leaks)
)
worker_disable_rate_limits = False  # Enable rate limiting

# Worker process settings
worker_concurrency = 1 if os.name == "nt" else 4  # Single worker on Windows
worker_pool = "solo" if os.name == "nt" else "prefork"  # Use solo pool on Windows

# Windows-specific settings
if os.name == "nt":
    # Disable problematic features on Windows
    worker_pool_restarts = True
    worker_max_memory_per_child = None  # Disable memory limits on Windows
    task_soft_time_limit = None  # Disable soft timeouts on Windows
    worker_disable_rate_limits = True  # Disable rate limits on Windows

# =============================================================================
# TASK ROUTING & QUEUES
# =============================================================================

# Define task routing - which tasks go to which queues
task_routes = {
    "tasks.sync_boards_task": {"queue": "boards"},
    "tasks.sync_sprints_task": {"queue": "sprints"},
    "tasks.sync_sprint_issues_task": {"queue": "sprint_issues"},
    "tasks.sync_worklogs_task": {"queue": "worklogs"},
    "tasks.refresh_burndown_task": {"queue": "burndown"},
    "tasks.sync_proactive_sprints_task": {"queue": "proactive"},
    "tasks.sync_sprints_list_task": {"queue": "sprints_list"},
    "tasks.sync_jql_issues_task": {"queue": "jql_issues"},
    "tasks.workflow_completion_callback": {"queue": "workflows"},
    "tasks.tasks.workflow_error_callback": {"queue": "workflows"},
    "tasks.sync_changelogs_task": {"queue": "changelogs"},
    "tasks.sync_comments_task": {"queue": "comments"},
    "tasks.health_check_task": {"queue": "system"},
}

# Default queue for unrouted tasks
task_default_queue = "default"

# Queue configuration with different priorities
task_queue_max_priority = 10
task_default_priority = 5

# =============================================================================
# SCHEDULED TASKS (CELERY BEAT)
# =============================================================================

# Scheduled task configuration
beat_schedule = {
    # Sync boards daily at 2 AM
    "sync-boards-daily": {
        "task": "tasks.sync_boards_task",
        "schedule": crontab(hour=2, minute=0),
        "args": (
            {
                "job_type": "boards",
                "job_id": "scheduled_boards_daily",
                "parameters": {},
                "priority": 7,
                "created_by": "scheduler",
            },
        ),
        "options": {"queue": "boards"},
    },
    # Sync active sprints every 4 hours
    "sync-sprints-4hourly": {
        "task": "tasks.sync_sprints_task",
        "schedule": crontab(minute=0, hour="*/4"),
        "args": (
            {
                "job_type": "sprints",
                "job_id": "scheduled_sprints_4hourly",
                "parameters": {"sprint_states": ["active"]},
                "priority": 6,
                "created_by": "scheduler",
            },
        ),
        "options": {"queue": "sprints"},
    },
    # Sync recent activity issues every 2 hours
    "sync-recent-activity-2hourly": {
        "task": "tasks.sync_recent_activity_issues_task",
        "schedule": crontab(minute=30, hour="*/2"),
        "args": (
            {
                "job_type": "recent_activity_issues",
                "job_id": "scheduled_recent_activity_2hourly",
                "parameters": {
                    "days_back": 7,
                    "sprint_status": "active",
                    "include_comments": False,
                    "include_changelog": False,
                    "include_subtasks": True,
                },
                "priority": 6,
                "created_by": "scheduler",
            },
        ),
        "options": {"queue": "recent_activity"},
    },
    # Health check every 5 minutes
    "health-check": {
        "task": "tasks.health_check_task",
        "schedule": crontab(minute="*/5"),
        "args": (),
        "options": {"queue": "system"},
    },
}

# Beat scheduler settings
beat_scheduler = (
    "django_celery_beat.schedulers:DatabaseScheduler"  # Use database scheduler
)
beat_schedule_filename = "celerybeat-schedule"

# =============================================================================
# MONITORING & LOGGING
# =============================================================================

# Task result backend settings for monitoring
result_backend_transport_options = {
    "master_name": "mymaster",
    "visibility_timeout": 3600,
}

# Worker log settings
worker_log_format = "[%(asctime)s: %(levelname)s/%(processName)s] %(message)s"
worker_task_log_format = "[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s"

# Enable task events for monitoring (Flower)
worker_send_task_events = True
task_send_sent_event = True

# =============================================================================
# ERROR HANDLING & RETRIES
# =============================================================================

# Default retry settings for all tasks
task_default_retry_delay = 60  # Wait 60 seconds before retry
task_max_retries = 3  # Maximum 3 retries

# Retry settings with exponential backoff
task_retry_backoff = True
task_retry_backoff_max = 700  # Maximum backoff time
task_retry_jitter = False  # Disable jitter for predictable retries

# =============================================================================
# SECURITY SETTINGS
# =============================================================================

# Security settings (important for production)
worker_hijack_root_logger = False  # Don't hijack root logger
worker_log_color = False  # Disable colored logs in production

# Task execution security
task_always_eager = False  # Don't execute tasks synchronously (use for testing only)
task_eager_propagates = True  # Propagate exceptions in eager mode

# =============================================================================
# DEVELOPMENT/DEBUG SETTINGS
# =============================================================================

# Development settings (override in production)
if os.getenv("ENVIRONMENT") == "development":
    # More verbose logging in development
    worker_loglevel = "INFO"

    # Shorter timeouts for development
    task_soft_time_limit = 300  # 5 minutes
    task_time_limit = 600  # 10 minutes

    # Enable task eager mode for testing
    # task_always_eager = True  # Uncomment for synchronous testing

# =============================================================================
# PRODUCTION OPTIMIZATIONS
# =============================================================================

if os.getenv("ENVIRONMENT") == "production":
    # Production-specific settings
    worker_loglevel = "WARNING"

    # Optimize for production workloads
    worker_concurrency = 8  # More workers in production
    worker_prefetch_multiplier = 4  # Higher prefetch for better throughput

    # Longer timeouts for production workloads
    task_soft_time_limit = 3600  # 1 hour
    task_time_limit = 4800  # 80 minutes