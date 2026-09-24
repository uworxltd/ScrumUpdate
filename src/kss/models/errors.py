##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

from typing import Optional, Any

from fastapi import FastAPI, Request, status, HTTPException


class SyncServerHTTPError(HTTPException):
    """Base exception for all KSS errors."""

    def __init__(self,
                 message: str,
                 status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
                 details: Optional[dict[str, Any]] = None,
                 tenant_id: Optional[str] = None
                 ) -> None:
        self.message = message
        self.status_code = status_code
        self.details = details
        self.tenant_id = tenant_id

class TenantMigrationError(SyncServerHTTPError):
    def __init__(self,
                 message: str = "Failed to migrate tenant schema",
                 status_code: int = status.HTTP_412_PRECONDITION_FAILED,
                 details: Optional[dict[str, Any]] = None,
                 tenant_id: Optional[str] = None) -> None:
        super().__init__(message, status_code, details, tenant_id)