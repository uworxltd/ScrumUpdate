##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
API dependencies and common utilities.
Provides shared functionality across API endpoints.
"""

import logging
from fastapi import HTTPException, Request
from pydantic import ValidationError
from database import DatabaseManager
from models.errors import TenantMigrationError
from multi_tenant_manager import multi_tenant_manager
from models import OAuthJiraCredentials

logger = logging.getLogger(__name__)


def resolve_tenant_from_request(request: Request) -> str:
    """
    Resolve tenant ID from HTTP request headers and ensure tenant exists.

    This function:
    1. Extracts tenant ID from X-Tenant-ID header
    2. Validates the tenant ID format
    3. Ensures the tenant schema exists (creates if necessary)
    4. Returns the validated tenant ID

    Args:
        request: FastAPI Request object

    Returns:
        Tenant ID string

    Raises:
        HTTPException: If tenant ID is missing, invalid, or cannot be provisioned
    """
    # Extract tenant ID from header
    tenant_id = request.headers.get("X-Tenant-ID")
    if not tenant_id:
        raise HTTPException(
            status_code=400,
            detail="Missing X-Tenant-ID header. Multi-tenant requests require tenant identification.",
        )

    tenant_id = tenant_id.strip()

    # Validate tenant ID format using MultiTenantManager
    if not multi_tenant_manager._is_valid_tenant_id(tenant_id):
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid X-Tenant-ID format. Must be 1-50 characters long, "
                "contain only alphanumeric characters, hyphens, and underscores, "
                "and not start/end with special characters."
            ),
        )

    # Ensure tenant exists (auto-provision if necessary)
    try:
        if not multi_tenant_manager.ensure_tenant_exists(tenant_id):
            raise HTTPException(
                status_code=503,
                detail=f"Unable to provision tenant '{tenant_id}'. Please try again or contact support.",
            )

        logger.debug(f"Tenant '{tenant_id}' resolved and ready for use")
        return tenant_id

    except ValueError as e:
        # Validation error from MultiTenantManager
        raise HTTPException(status_code=400, detail=str(e))
    except TenantMigrationError as e:
        raise
    except Exception as e:
        # System error during tenant provisioning
        logger.error(f"Error provisioning tenant '{tenant_id}': {str(e)}")
        raise HTTPException(
            status_code=503,
            detail=f"System error during tenant provisioning: {str(e)}",
        )


def get_database_manager() -> DatabaseManager:
    """
    Get a DatabaseManager instance.

    Returns:
        DatabaseManager instance
    """
    return DatabaseManager()


def extract_jira_credentials_from_request(request: Request) -> OAuthJiraCredentials:
    """
    Extract and validate Jira credentials from HTTP request headers.

    This function extracts multi-tenant Jira credentials from the following headers:
    - X-Tenant-ID: Tenant identifier for multi-tenant isolation
    - X-Tenant-Source-Tenant-ID: Jira tenant Id
    - X-Tenant-Username: The Jira username/email
    - X-Tenant-Api-Token: The Jira API token
    - X-Tenant-Source-Account-ID: Jira accountId 

    Args:
        request: FastAPI Request object

    Returns:
        OAuthJiraCredentials instance with validated credentials

    Raises:
        HTTPException: If any required headers are missing or invalid
    """
    source_tenant_id = request.headers.get("X-Tenant-Source-Tenant-ID")
    username = request.headers.get("X-Tenant-Username")
    api_token = request.headers.get("X-Tenant-Api-Token")
    tenant_id = request.headers.get("X-Tenant-ID")
    tenant_account_id = request.headers.get("X-Tenant-Source-Account-ID")

    # Check for missing headers first
    missing_headers = []
    if not source_tenant_id:
        missing_headers.append("X-Tenant-Source-Tenant-ID")
    if not username:
        missing_headers.append("X-Tenant-Username")
    if not api_token:
        missing_headers.append("X-Tenant-Api-Token")
    if not tenant_account_id:
        missing_headers.append("X-Tenant-Source-Account-ID")
    if not tenant_id:
        missing_headers.append("X-Tenant-ID")

    if missing_headers:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required Jira credential headers: {', '.join(missing_headers)}",
        )

    try:
        return OAuthJiraCredentials(
            access_token=api_token, 
            cloud_id=source_tenant_id,
            username=username,
            tenant_id=tenant_id,
            tenant_account_id=tenant_account_id
        )
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=f"Invalid Jira credentials: {e}")