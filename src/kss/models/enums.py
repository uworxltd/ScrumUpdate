##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Enums for the Jira Sync Platform.
Defines all enumeration types used across the application.
"""

from enum import Enum


class BoardType(str, Enum):
    """Jira board types."""
    scrum = "scrum"
    kanban = "kanban"
    agile = "agile"


class SprintState(str, Enum):
    """Sprint states in Jira."""
    active = "active"
    future = "future"
    closed = "closed"


class JobStatus(str, Enum):
    """Job execution statuses."""
    pending = "pending"
    running = "running"
    success = "success"
    failure = "failure"
    cancelled = "cancelled"
    retrying = "retrying"


class JobPriority(int, Enum):
    """Job priority levels."""
    LOW = 1
    NORMAL = 5
    HIGH = 8
    CRITICAL = 10


class SyncScope(str, Enum):
    """Synchronization scope options."""
    FULL = "full"
    INCREMENTAL = "incremental"
    SELECTIVE = "selective"