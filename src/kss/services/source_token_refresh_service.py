##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Source Token Refresh Service for handling two-step token refresh process.

This service handles the custom token refresh flow that involves:
1. Getting a token using email/username with basic auth
2. Using that token to get an updated JIRA access token
"""

import logging
import os
from typing import Dict, Any
import requests
import base64

logger = logging.getLogger(__name__)

# TODO: Move to some centralized exceptions thingy
class SourceTokenRefreshError(Exception):
    """Base exception for source token refresh errors."""

    pass


class SourceTokenRefreshService:
    """
    Service for handling the two-step token refresh process.

    This service replaces the standard OAuth token refresh flow (Because KBS/Khoji doesn't support OAuth) with a custom
    two-step process that involves getting a token from a local service (KBS) and
    then using that token to get an updated JIRA access token.
    """

    # TODO: Resolve KBS URL from env
    def __init__(self, base_url: str = "http://localhost:4243"):
        """
        Initialize the service with base URL.

        Args:
            base_url: Base URL for the token service (default: http://localhost:4243)
        """
        self.base_url = base_url

    def _get_basic_auth_header(self) -> str:
        """
        Generate basic auth header for the first API call.

        Credentials come from the KHOJI_BASICAUTHUSERNAME /
        KHOJI_BASICAUTHUSERPASSWORD env contract (same as KBS). Fails closed
        when either is unset — matching KBS, which returns 401 / refuses to
        start outside dev without them.

        Returns:
            Basic auth header value
        """
        username = os.environ.get("KHOJI_BASICAUTHUSERNAME", "")
        password = os.environ.get("KHOJI_BASICAUTHUSERPASSWORD", "")
        if not username or not password:
            raise SourceTokenRefreshError(
                "KHOJI_BASICAUTHUSERNAME and KHOJI_BASICAUTHUSERPASSWORD must be set to call KBS basic-auth endpoints"
            )
        credentials = base64.b64encode(f"{username}:{password}".encode("ascii")).decode("ascii")
        return f"Basic {credentials}"

    def refresh_token(self, email: str, tenant_id: str) -> Dict[str, Any]:
        """
        Perform two-step token refresh process.

        Args:
            email: Email/username to use for token refresh

        Returns:
            Dictionary containing new token information with keys:
            - access_token: New JIRA access token
            - cloud_id: JIRA cloud tenant ID

        Raises:
            SourceTokenRefreshError: When token refresh fails at any step
        """
        try:
            # Step 1: Get token using email with basic auth
            logger.debug(f"Step 1: Getting token for email: {email}")
            initial_token = self._get_token_against_email(email, tenant_id)

            # Step 2: Use the token to get updated JIRA access token
            logger.debug("Step 2: Getting updated JIRA access token")
            jira_token_data = self._get_updated_jira_access_token(initial_token, tenant_id)

            logger.info("Token refresh completed successfully")

            return {
                "access_token": jira_token_data["token"],
                "cloud_id": jira_token_data["jiraCloudTenantId"],
                "token_type": "Bearer",
            }

        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            raise SourceTokenRefreshError(f"Token refresh failed: {e}")

    def _get_token_against_email(self, email: str, tenant_id: str) -> str:
        """
        Step 1: Get token using email with basic auth.

        Args:
            email: Email/username to get token for

        Returns:
            Token string from the response

        Raises:
            SourceTokenRefreshError: When API call fails
        """
        url = f"{self.base_url}/kgs/get-token-against-email"
        headers = {
            "Authorization": self._get_basic_auth_header(),
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        params = {"email": email}

        try:
            response = requests.get(url, headers=headers, params=params, timeout=30)

            if not response.ok:
                error_message = f"Failed to get token for email: {response.status_code} - {response.text}"
                raise SourceTokenRefreshError(error_message)

            response_data = response.json()
            token = response_data.get("token")

            if not token:
                raise SourceTokenRefreshError("No token found in response")

            logger.debug("Successfully retrieved token for email")
            return token

        except requests.exceptions.RequestException as e:
            raise SourceTokenRefreshError(
                f"Request failed for get-token-against-email: {e}"
            )
        except ValueError as e:
            raise SourceTokenRefreshError(
                f"Invalid JSON response from get-token-against-email: {e}"
            )

    def _get_updated_jira_access_token(self, token: str, tenant_id: str) -> Dict[str, Any]:
        """
        Step 2: Use token to get updated JIRA access token.

        Args:
            token: Token from step 1

        Returns:
            Dictionary containing jiraCloudTenantId and token

        Raises:
            SourceTokenRefreshError: When API call fails
        """
        url = f"{self.base_url}/kgs/get-updated-jira-access-token"
        headers = {
            "Authorization": f"Bearer {token}",
            "instance_id": tenant_id,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        try:
            response = requests.get(url, headers=headers, timeout=30)

            if not response.ok:
                error_message = f"Failed to get updated JIRA access token: {response.status_code} - {response.text}"
                raise SourceTokenRefreshError(error_message)

            response_data = response.json()

            # Validate required fields
            if "jiraCloudTenantId" not in response_data or "token" not in response_data:
                raise SourceTokenRefreshError("Missing required fields in response")

            logger.debug("Successfully retrieved updated JIRA access token")
            return response_data

        except requests.exceptions.RequestException as e:
            raise SourceTokenRefreshError(
                f"Request failed for get-updated-jira-access-token: {e}"
            )
        except ValueError as e:
            raise SourceTokenRefreshError(
                f"Invalid JSON response from get-updated-jira-access-token: {e}"
            )