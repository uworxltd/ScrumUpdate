##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Sprint sync endpoints.
Handles sprint synchronization operations and data retrieval.
"""

import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Request, HTTPException
from repositories.sprint_repository import SprintRepository
from .dependencies import resolve_tenant_from_request

logger = logging.getLogger(__name__)
sprints_router = APIRouter(prefix="/api/jobs/sprints", tags=["sprints"])

@sprints_router.get("/all")
async def get_all_sprints(request: Request) -> List[Dict[str, Any]]:
    """
    Get all sprints for the tenant.
    
    Returns all sprints with their associated board information,
    ordered by start date (most recent first).
    
    Required headers:
    - X-Tenant-ID: Tenant identifier for multi-tenant isolation
    
    Returns:
        List of sprint dictionaries with complete sprint and board information
    """
    try:
        # Resolve tenant from request headers
        tenant_id = resolve_tenant_from_request(request)
        
        # Initialize sprint repository
        sprint_repo = SprintRepository(tenant_id)
        
        # Get all sprints
        sprints = sprint_repo.get_all_sprints()
        
        logger.info(f"Retrieved {len(sprints)} sprints for tenant {tenant_id}")
        return sprints
        
    except ValueError as e:
        logger.error(f"Invalid request: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error retrieving sprints: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")