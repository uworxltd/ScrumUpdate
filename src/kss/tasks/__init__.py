##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Tasks package for Jira sync system.
This package provides Celery task definitions and utilities for distributed job execution.

Main exports:
- app: Celery application instance
- job_tracker: Global job status tracker

Note: For Celery worker, use tasks.worker module to register all tasks.
      Worker startup: celery -A tasks.worker worker --loglevel=info
"""

# Import core components
from .celery_app import app
from .job_tracker import job_tracker

# Import signal handlers to register them
from . import signal_handlers

# Public API
__all__ = [
    'app',
    'job_tracker',
]

# NOTE: Task definitions have been moved to jobs.sync_jobs
# For Celery worker startup, use: celery -A tasks.worker worker
# This avoids circular import issues and provides clean task registration.