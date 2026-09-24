##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Celery signal handlers.
This module handles Celery task lifecycle events and signals.
"""

from celery.signals import task_prerun, task_postrun, task_failure
from .celery_app import app


# =============================================================================
# CELERY SIGNAL HANDLERS
# =============================================================================

@task_prerun.connect
def task_prerun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, **kwds):
    """Called before task execution"""
    print(f"🏁 Starting task: {task.name} (ID: {task_id})")


@task_postrun.connect  
def task_postrun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, 
                        retval=None, state=None, **kwds):
    """Called after task execution"""
    print(f"🏁 Finished task: {task.name} (ID: {task_id}) - State: {state}")


@task_failure.connect
def task_failure_handler(sender=None, task_id=None, exception=None, traceback=None, einfo=None, **kwds):
    """Called when task fails"""
    print(f"💥 Task failed: {sender.name} (ID: {task_id}) - Exception: {exception}")