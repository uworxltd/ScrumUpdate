##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Tenant Management API
Provides endpoints for tenant deletion and management operations.
"""

import logging
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel, Field

from multi_tenant_manager import multi_tenant_manager
from api.dependencies import resolve_tenant_from_request
from services.job_management_service import JobManagementService

logger = logging.getLogger(__name__)

tenant_management_router = APIRouter(prefix="/tenants", tags=["tenant-management"])


# Request/Response Models
class TenantDeletionRequest(BaseModel):
    """Request model for tenant deletion."""

    confirmation_token: str = Field(
        ..., description="Must match tenant_id exactly for safety confirmation"
    )
    force: bool = Field(default=False, description="Skip active job checks if True")
    create_backup: bool = Field(
        default=True, description="Create backup before deletion if True"
    )


class TenantDeletionResponse(BaseModel):
    """Response model for tenant deletion."""

    success: bool
    message: str
    schema_dropped: Optional[bool] = None
    tenant_record_deleted: Optional[bool] = None
    deleted_counts: Optional[Dict[str, Any]] = None
    backup_result: Optional[Dict[str, Any]] = None
    impact: Optional[Dict[str, Any]] = None
    force_used: Optional[bool] = None


class TenantImpactResponse(BaseModel):
    """Response model for tenant deletion impact analysis."""

    tenant_exists: bool
    schema_exists: bool
    schema_name: Optional[str] = None
    active_jobs: int
    total_jobs: int
    issues_count: int
    sprints_count: int
    boards_count: int
    comments_count: int
    worklogs_count: int
    changelogs_count: int
    relationships_count: int
    sprint_issues_count: int
    issue_links_count: int
    can_delete: bool
    blocking_reasons: List[str]


class TenantStatusResponse(BaseModel):
    """Comprehensive tenant status response."""

    tenant_id: str
    exists: bool
    existence_sources: Dict[str, Any]
    sync_history: Dict[str, Any]
    current_activity: Dict[str, Any]
    tenant_state: str
    has_data: bool
    needs_sync: bool
    sync_recommendation: Dict[str, Any]
    created_at: Optional[str] = None
    error: Optional[str] = None


@tenant_management_router.get(
    "/{tenant_id}/deletion-impact", response_model=TenantImpactResponse
)
async def get_tenant_deletion_impact(tenant_id: str):
    """
    Get impact analysis for tenant deletion.

    Returns comprehensive information about what will be deleted,
    including data counts and any blocking conditions.

    Args:
        tenant_id: The tenant identifier to analyze

    Returns:
        TenantImpactResponse: Deletion impact analysis

    Raises:
        HTTPException: If tenant_id is invalid or operation fails
    """
    try:
        logger.info(f"Getting deletion impact for tenant '{tenant_id}'")

        impact = multi_tenant_manager.get_tenant_deletion_impact(tenant_id)

        return TenantImpactResponse(**impact)

    except ValueError as e:
        logger.warning(f"Invalid tenant ID '{tenant_id}': {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting deletion impact for tenant '{tenant_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get deletion impact: {str(e)}",
        )


@tenant_management_router.delete("/{tenant_id}", response_model=TenantDeletionResponse)
async def delete_tenant(tenant_id: str, deletion_request: TenantDeletionRequest):
    """
    Delete tenant schema and record.

    Safely deletes a tenant's schema and all associated data.
    Requires confirmation token matching tenant_id for safety.

    Args:
        tenant_id: The tenant identifier to delete
        deletion_request: Deletion configuration and confirmation

    Returns:
        TenantDeletionResponse: Deletion operation result

    Raises:
        HTTPException: If validation fails or deletion fails
    """
    try:
        logger.info(
            f"Deletion request for tenant '{tenant_id}' (force={deletion_request.force})"
        )

        # Safety check: confirmation token must match tenant_id
        if deletion_request.confirmation_token != tenant_id:
            logger.warning(f"Confirmation token mismatch for tenant '{tenant_id}'")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Confirmation token must match tenant ID '{tenant_id}' exactly",
            )

        # Execute deletion
        deletion_result = multi_tenant_manager.delete_tenant(
            tenant_id,
            force=deletion_request.force,
            create_backup=deletion_request.create_backup,
        )

        # Return appropriate HTTP status based on result
        if deletion_result["success"]:
            logger.info(f"✅ Tenant '{tenant_id}' deleted successfully")
            return TenantDeletionResponse(**deletion_result)
        else:
            # Deletion failed - determine appropriate error code
            if "blocking_reasons" in deletion_result.get("impact", {}):
                # Blocked by business rules (active jobs, etc.)
                logger.warning(
                    f"Tenant deletion blocked for '{tenant_id}': {deletion_result['message']}"
                )
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=deletion_result["message"],
                )
            else:
                # Other failure
                logger.error(
                    f"Tenant deletion failed for '{tenant_id}': {deletion_result['message']}"
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=deletion_result["message"],
                )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except ValueError as e:
        logger.warning(f"Invalid tenant ID '{tenant_id}': {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during tenant deletion for '{tenant_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Deletion failed: {str(e)}",
        )


@tenant_management_router.get("/status", response_model=TenantStatusResponse)
async def get_comprehensive_tenant_status(request: Request):
    """
    Get comprehensive tenant status including existence, sync history, data presence, and sync recommendations.

    This endpoint provides everything needed to understand:
    - Whether tenant exists (multiple verification sources)
    - Tenant sync history, success rates, and data presence
    - Current activity and onboarding status
    - Intelligent sync recommendations

    Tenant States:
    - nonexistent: No tenant record or schema exists
    - incomplete: Tenant record exists but schema is missing
    - new: Schema exists but no jobs have ever been run
    - first_sync: First job is currently running
    - syncing: Has job history and currently has active jobs
    - needs_data: Has jobs but no successful syncs or data
    - healthy: Has data, good success rate, no current issues

    Sync Recommendations:
    - none: No sync needed (has recent successful data)
    - wait: Jobs currently running, wait for completion
    - full_sync: No data exists, needs initial sync
    - sync: Data may be stale, refresh recommended
    - investigate_and_sync: High failure rate, investigate first

    Use Cases:
    - Determine if sync jobs need to be triggered
    - Understand tenant data health and sync success
    - Get actionable recommendations for next steps
    - Monitor tenant onboarding and sync progress
    """
    try:
        tenant_id = resolve_tenant_from_request(request)
        service = JobManagementService(tenant_id)

        status = service.get_comprehensive_tenant_status()

        return TenantStatusResponse(
            tenant_id=tenant_id,
            exists=status["exists"],
            existence_sources=status["existence_sources"],
            sync_history=status["sync_history"],
            current_activity=status["current_activity"],
            tenant_state=status["tenant_state"],
            has_data=status["has_data"],
            needs_sync=status["needs_sync"],
            sync_recommendation=status["sync_recommendation"],
            created_at=status.get("created_at"),
            error=status.get("error"),
        )

    except Exception as e:
        logger.error(f"Error getting comprehensive tenant status: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get tenant status: {str(e)}"
        )