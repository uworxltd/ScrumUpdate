##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Jira Sync Platform - FastAPI Application (Refactored)
Main entry point for the distributed Jira synchronization platform.

This FastAPI application provides:
- REST API endpoints for job management
- Real-time job monitoring and status tracking
- System health checks and statistics
- Interactive API documentation
- Integration with Celery for distributed processing
"""

import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

# Import API routers
from api import (
    health_router,
    jobs_router,
    sprints_router,
    tenant_management_router,
)
from models.errors import TenantMigrationError
from multi_tenant_manager import multi_tenant_manager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =============================================================================
# APPLICATION LIFESPAN
# =============================================================================
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("🚀  Starting Khoji Sync Server ...")
    logger.info("✅  API routers registered")

    # Initialize multi-tenant system
    logger.info("Initializing/Updating multi-tenant system...")
    if multi_tenant_manager.initialize_system_schema():
        logger.info("✅ Multi-tenant system ready")
    else:
        logger.error("❌ Failed to initialize multi-tenant system")
        # Don't start if DB initialization fails
        raise RuntimeError("Multi-tenant system initialization failed - cannot start server")

    logger.info("🎯 Application ready to serve requests")

    yield

    # Shutdown
    logger.info("🛑 Jira Sync Platform shutting down...")
    logger.info("✅ Cleanup completed")


# =============================================================================
# FASTAPI APPLICATION SETUP
# =============================================================================

app = FastAPI(
    title="Khoji Sync Server",
    lifespan=lifespan,
    description="""
    A distributed platform for synchronizing data with high performance and reliability.
    
    ## Features
    - **Multi-tenant Architecture**: Isolated data per tenant
    - **Asynchronous Processing**: Celery-based job queue system
    - **Real-time Monitoring**: Live job status tracking
    - **Comprehensive Sync**: Boards, sprints, issues, worklogs, and comments
    - **Relationship Tracking**: Issue hierarchies and dependencies
    - **Health Monitoring**: System health and performance metrics
    
    ## Authentication
    All endpoints require an `X-Tenant-ID` header for multi-tenant isolation.
    """,
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# =============================================================================
# ROUTER REGISTRATION
# =============================================================================

# Register all API routers
app.include_router(health_router)
app.include_router(jobs_router)
app.include_router(sprints_router)
app.include_router(tenant_management_router)

# =============================================================================
# ROOT ENDPOINT
# =============================================================================


@app.get("/")
async def root():
    """
    Root endpoint providing API information and quick links.
    """
    return {
        "service": "Jira Sync Platform",
        "version": "2.0.0",
        "status": "operational",
        "documentation": {
            "swagger_ui": "/docs",
            "redoc": "/redoc",
        },
        "endpoints": {
            "health": "/api/system/health",
            "stats": "/api/system/stats",
            "jobs": "/api/jobs",
            "job_types": "/api/jobs/types",
        },
        "sync_endpoints": {
            "boards": "/api/jobs/boards/sync",
            "sprints": "/api/jobs/sprints/sync",
            "sprint_issues": "/api/jobs/sprint_issues/sync",
            "worklogs": "/api/jobs/worklogs/sync",
        },
        "multi_tenant": {
            "required_header": "X-Tenant-ID",
            "description": "All requests must include tenant identification",
        },
    }


# =============================================================================
# GLOBAL EXCEPTION HANDLERS
# =============================================================================


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "detail": "An unexpected error occurred. Please try again later.",
        },
    )

@app.exception_handler(TenantMigrationError)
async def tenant_migration_handler(request: Request, exc: TenantMigrationError):
    return JSONResponse(
        status_code=exc.status_code or status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "message": exc.message,
            "error": exc.__class__.__name__,
            "details": exc.details,
            "tenant_id": exc.tenant_id
        }
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)