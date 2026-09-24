##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
API layer for FastAPI endpoints.
Provides clean separation between API routes and business logic.
"""

from .dependencies import resolve_tenant_from_request, get_database_manager
from .health import health_router
from .jobs import jobs_router
from .tenant_management import tenant_management_router
from .sprints import sprints_router

__all__ = [
    "resolve_tenant_from_request",
    "get_database_manager",
    "health_router",
    "jobs_router", 
    "sprints_router",
    "tenant_management_router"
]