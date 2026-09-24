##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
OAuth-based JIRA client for Atlassian Cloud REST API.

This module provides a lightweight HTTP client that makes direct requests to
Atlassian Cloud REST API endpoints using OAuth Bearer token authentication.
Returns raw JSON responses without transformation.
"""

import logging
from typing import Dict, Any, Optional, List
import requests
import jwt
import time
import json

from models.requests import OAuthJiraCredentials
from services.source_token_refresh_service import SourceTokenRefreshService, SourceTokenRefreshError

logger = logging.getLogger(__name__)


class OAuthJiraClientError(Exception):
    """Base exception for OAuth JIRA client errors."""

    pass


class AuthenticationError(OAuthJiraClientError):
    """Raised when OAuth token is invalid or expired."""

    pass


class NotFoundError(OAuthJiraClientError):
    """Raised when requested resource is not found."""

    pass


class RateLimitError(OAuthJiraClientError):
    """Raised when API rate limit is exceeded."""

    pass


class APIError(OAuthJiraClientError):
    """Raised for general API errors."""

    pass


class OAuthJiraClient:
    """
    OAuth-based JIRA client for Atlassian Cloud REST API.

    Provides direct access to JIRA REST API endpoints using OAuth Bearer token
    authentication. Returns raw JSON responses without transformation.
    """

    # TODO: Resolve the base Jira URL from an optional env variable
    def __init__(self, credentials: OAuthJiraCredentials):
        """
        Initialize client with OAuth credentials.

        Args:
            credentials: OAuth credentials containing access_token and cloud_id
        """
        self.credentials = credentials
        self.base_url = f"https://api.atlassian.com/ex/jira/{credentials.cloud_id}"
        self.token_refresh_service = SourceTokenRefreshService()

    def _build_url(self, endpoint: str) -> str:
        """
        Build full URL using cloud ID and endpoint.

        Args:
            endpoint: API endpoint path (e.g., "/rest/api/3/board")

        Returns:
            Complete URL for the Atlassian Cloud API endpoint
        """
        # Ensure endpoint starts with /
        if not endpoint.startswith("/"):
            endpoint = "/" + endpoint

        return f"{self.base_url}{endpoint}"

    def is_token_expired(self) -> bool:
        """
        Check if the JWT access token is expired by decoding its payload.

        Returns:
            True if token is expired or invalid, False otherwise
        """
        try:
            # Decode JWT without signature verification to get claims
            decoded = jwt.decode(
                self.credentials.access_token, options={"verify_signature": False}
            )

            # Get expiration timestamp from 'exp' claim
            exp = decoded.get("exp")
            if exp:
                # Compare with current timestamp
                return time.time() >= exp

            # If no 'exp' claim, assume token doesn't expire
            return False

        except jwt.DecodeError:
            # Token is malformed, treat as expired
            return True
        except Exception:
            # Any other error, treat as expired for safety
            return True

    def refresh_token(self, email: str, tenant_id: str) -> Dict[str, Any]:
        """
        Refresh OAuth access token using the custom two-step process.

        Args:
            email: Email/username to use for token refresh

        Returns:
            Dictionary containing new token information with keys:
            - access_token: New access token
            - cloud_id: JIRA cloud tenant ID
            - token_type: Token type (usually "Bearer")

        Raises:
            AuthenticationError: When token refresh fails
            APIError: For general API errors during token refresh
        """
        logger.debug(f"Refreshing OAuth token for email: {email}")

        try:
            # Use the SourceTokenRefreshService for the two-step process
            token_data = self.token_refresh_service.refresh_token(email, tenant_id)
            
            logger.debug("OAuth token refreshed successfully")
            
            return {
                "access_token": token_data["access_token"],
                "cloud_id": token_data["cloud_id"],
                "token_type": token_data.get("token_type", "Bearer"),
            }

        except SourceTokenRefreshError as e:
            logger.error(f"Token refresh failed: {e}")
            raise AuthenticationError(f"Token refresh failed: {e}")
        except Exception as e:
            logger.error(f"Unexpected error during token refresh: {e}")
            raise APIError(f"Token refresh failed: {e}")

    def _get_headers(self) -> dict:
        """
        Get HTTP headers including OAuth Bearer token.
        Automatically refreshes token if expired.

        Returns:
            Dictionary of HTTP headers with Authorization header
            
        Raises:
            AuthenticationError: When token refresh fails
            APIError: For general errors during token refresh
        """
        # Check if token is expired and refresh if needed
        if self.is_token_expired():
            if not hasattr(self.credentials, 'username') or not self.credentials.username:
                raise AuthenticationError("Access token expired and no username available for refresh")
            
            # Refresh the token using the new service
            new_tokens = self.refresh_token(email=self.credentials.username, tenant_id=self.credentials.tenant_id)
            
            # Update credentials with new token and cloud_id
            self.credentials.access_token = new_tokens["access_token"]
            if new_tokens.get("cloud_id"):
                self.credentials.cloud_id = new_tokens["cloud_id"]
                # Update base_url with new cloud_id
                self.base_url = f"https://api.atlassian.com/ex/jira/{self.credentials.cloud_id}"
            
            logger.info("Access token automatically refreshed")

        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.credentials.access_token}",
        }

    def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Make HTTP request to Atlassian Cloud API.

        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint path (e.g., "/rest/api/3/board")
            params: Optional query parameters
            json_data: Optional JSON body for POST/PUT requests

        Returns:
            Parsed JSON response as dictionary

        Raises:
            AuthenticationError: When OAuth token is invalid or expired
            NotFoundError: When requested resource is not found
            RateLimitError: When API rate limit is exceeded
            APIError: For general API errors
        """
        url = self._build_url(endpoint)
        headers = self._get_headers()

        # Log request (without sensitive data)
        logger.debug(f"Making {method} request to {endpoint}")

        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                json=json_data,
                timeout=30,  # 30 second timeout
            )
            logger.debug(f"Response status: {response.status_code}")
            return self._handle_response(response)
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed for {endpoint}: {e}")
            raise APIError(f"HTTP request failed: {e}")

    def _handle_response(self, response: requests.Response) -> Dict[str, Any]:
        """
        Handle HTTP response and parse JSON.

        Args:
            response: HTTP response object from requests library

        Returns:
            Parsed JSON response as dictionary

        Raises:
            AuthenticationError: When OAuth token is invalid or expired (401)
            NotFoundError: When requested resource is not found (404)
            RateLimitError: When API rate limit is exceeded (429)
            APIError: For other HTTP errors or invalid JSON
        """
        if response.status_code == 401:
            raise AuthenticationError("OAuth token is invalid or expired")
        elif response.status_code == 404:
            raise NotFoundError(f"Resource not found: {response.url}")
        elif response.status_code == 429:
            raise RateLimitError("API rate limit exceeded")
        elif not response.ok:
            try:
                error_data = response.json()
                error_message = (
                    error_data.get("errorMessages", [response.text])[0]
                    if error_data.get("errorMessages")
                    else response.text
                )
            except (ValueError, KeyError):
                error_message = response.text
            raise APIError(
                f"API request failed: {response.status_code} - {error_message}"
            )

        try:
            return response.json()
        except ValueError as e:
            raise APIError(f"Invalid JSON response: {e}")

    def get_boards(self, start_at: int = 0, max_results: int = 50) -> Dict[str, Any]:
        """
        Fetch boards via GET /rest/api/3/board.

        Args:
            start_at: Starting index for pagination (default: 0)
            max_results: Maximum number of results to return (default: 50)

        Returns:
            Parsed JSON response containing boards data

        Raises:
            AuthenticationError: When OAuth token is invalid or expired
            NotFoundError: When boards endpoint is not found
            RateLimitError: When API rate limit is exceeded
            APIError: For general API errors
        """
        params = {"startAt": start_at, "maxResults": max_results}

        return self._make_request("GET", "/rest/agile/1.0/board", params=params)

    def get_board(self, board_id: int) -> Dict[str, Any]:
        """
        Fetch specific board via GET /rest/api/3/board/{boardId}.

        Args:
            board_id: ID of the board to retrieve

        Returns:
            Parsed JSON response containing board data

        Raises:
            AuthenticationError: When OAuth token is invalid or expired
            NotFoundError: When board with specified ID is not found
            RateLimitError: When API rate limit is exceeded
            APIError: For general API errors
        """
        endpoint = f"/rest/agile/1.0/board/{board_id}"
        return self._make_request("GET", endpoint)

    def get_issue_estimation_for_issue_in_board(self, issue_key: str, board_id: int) -> Dict[str, Any]:
        """
        Fetch issue estimation data against a specific teamboard.

        Args:
            board_id: ID of the board against which to get estimation
            issue_key: issue belonging to the board

        Returns:
            Parsed JSON response containing issue estimation data

        Raises:
            AuthenticationError: When OAuth token is invalid or expired
            NotFoundError: When board with specified ID is not found
            RateLimitError: When API rate limit is exceeded
            APIError: For general API errors
        """
        endpoint = f"/rest/agile/1.0/issue/{issue_key}/estimation"
        params = {"boardId": board_id}
        return self._make_request("GET", endpoint, params=params)

    def get_sprints(self, board_id: int, state: Optional[str] = None, start_at: int = 0, max_results: int = 50) -> Dict[str, Any]:
        """
        Fetch sprints via GET /rest/api/3/board/{boardId}/sprint.

        Args:
            board_id: ID of the board to retrieve sprints for
            state: Optional state filter for sprints (e.g., 'active', 'closed', 'future')

        Returns:
            Parsed JSON response containing sprints data

        Raises:
            AuthenticationError: When OAuth token is invalid or expired
            NotFoundError: When board with specified ID is not found
            RateLimitError: When API rate limit is exceeded
            APIError: For general API errors
        """
        endpoint = f"/rest/agile/1.0/board/{board_id}/sprint"
        
        params = {"startAt": start_at, "maxResults": max_results}

        if state is not None:
            params["state"] = state

        return self._make_request("GET", endpoint, params=params)
    
    def get_sprints_filter_by_state(self, board_id: int, states: Optional[List[str]] = None, start_at: int = 0, max_results: int = 50) -> Dict[str, Any]:
        """
        Fetch sprints via GET /rest/api/3/board/{boardId}/sprint.

        Args:
            board_id: ID of the board to retrieve sprints for
            states: Optional states filter for sprints (e.g., 'active', 'closed', 'future')

        Returns:
            Parsed JSON response containing sprints data

        Raises:
            AuthenticationError: When OAuth token is invalid or expired
            NotFoundError: When board with specified ID is not found
            RateLimitError: When API rate limit is exceeded
            APIError: For general API errors
        """
        endpoint = f"/rest/agile/1.0/board/{board_id}/sprint"
        
        params = {"startAt": start_at, "maxResults": max_results}

        if states is not None:
            params["state"] = ','.join(states)

        return self._make_request("GET", endpoint, params=params)

    def get_sprint(self, sprint_id: int) -> Dict[str, Any]:
        """
        Fetch specific sprint via GET /rest/agile/1.0/sprint{sprintId}.

        Args:
            sprint_id: ID of the sprint to retrieve

        Returns:
            Parsed JSON response containing sprint data

        Raises:
            AuthenticationError: When OAuth token is invalid or expired
            NotFoundError: When sprint with specified ID is not found
            RateLimitError: When API rate limit is exceeded
            APIError: For general API errors
        """
        endpoint = f"/rest/agile/1.0/sprint/{sprint_id}"
        return self._make_request("GET", endpoint)
    
    def search_issue_ids(
        self,
        jql,
        nextPageToken: Optional[str] = None,
        max_results: int = 5000,
    ) -> Dict[str, Any]:
        """
        Search issue ids via GET /rest/api/3/search/jql
        
        Args:
            jql: JQL query string to search for issues
            nextPageToken: Next page token for pagination
            max_results: Maximum number of results to return (default: 50)
            
        Returns:
            Parsed JSON response containing search results

        Raises:
            AuthenticationError: When OAuth token is invalid or expired
            NotFoundError: When search endpoint is not found
            RateLimitError: When API rate limit is exceeded
            APIError: For general API errors
        """
        
        params = {"jql": jql, "maxResults": max_results}
        
        if nextPageToken is not None:
            params["nextPageToken"] = nextPageToken
        
        return self._make_request("GET", "/rest/api/3/search/jql", params=params)

    def bulk_fetch_changelogs(
            self,
            issue_ids_or_keys: list[str],
            field_ids: Optional[List[str]] = None,
            max_results: int = 1000,
            next_page_token: Optional[str] = None
    ):
        """
        Bulk Fetch issue changelogs via POST /rest/api/3/changelog/bulkfetch.

        Args:
            issue_ids_or_keys: An array of issue IDs or issue keys to fetch changelogs against.
            field_ids: List of field IDs to filter changelogs
            max_results: Maximum number of results to return (default: 1000)
            next_page_token: Next page token for pagination

        Returns:
            Changelogs data against provided issue_ids_or_keys

        Raises:
            AuthenticationError: When OAuth token is invalid or expired
            NotFoundError: When search endpoint is not found
            RateLimitError: When API rate limit is exceeded
            APIError: For general API errors
        """
        payload = {
            "issueIdsOrKeys": issue_ids_or_keys,
            "maxResults": max_results,
            "nextPageToken": next_page_token
        }

        if field_ids is not None:
            payload["fieldIds"] = field_ids

        return self._make_request("POST", "/rest/api/3/changelog/bulkfetch", json_data=payload)
    
    def bulk_fetch_issues(
        self,
        issue_ids_or_keys: List[str],
        expand: Optional[str] = None,
        fields: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Bulk Fetch issues via POST /rest/api/3/issue/bulkfetch.
        
        Args:
            issue_ids_or_keys: An array of issue IDs or issue keys to fetch. You can mix issue IDs and keys in the same query.
            expand: Optional comma-separated list of fields to expand
            fields: A list of fields to return for each issue, use it to retrieve a subset of fields. This parameter accepts a comma-separated list.
            
        Returns:
            Issues data against provided issueIdsOrKeys
            
        Raises:
            AuthenticationError: When OAuth token is invalid or expired
            NotFoundError: When search endpoint is not found
            RateLimitError: When API rate limit is exceeded
            APIError: For general API errors
        """
        payload = {
            "issueIdsOrKeys": issue_ids_or_keys,
            "properties": []
        }

        if fields:
            payload["fields"] = [f.strip() for f in fields.split(",")]
        
        if expand:
            payload["expand"] = [e.strip() for e in expand.split(",")]
        
        return self._make_request("POST", "/rest/api/3/issue/bulkfetch", json_data=payload)

    def search_issues(
        self,
        jql: str,
        start_at: int = 0,
        max_results: int = 50,
        expand: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Search issues via GET /rest/api/3/search.

        Args:
            jql: JQL query string to search for issues
            start_at: Starting index for pagination (default: 0)
            max_results: Maximum number of results to return (default: 50)
            expand: Optional comma-separated list of fields to expand

        Returns:
            Parsed JSON response containing search results

        Raises:
            AuthenticationError: When OAuth token is invalid or expired
            NotFoundError: When search endpoint is not found
            RateLimitError: When API rate limit is exceeded
            APIError: For general API errors
        """
        params = {"jql": jql, "startAt": start_at, "maxResults": max_results}

        if expand is not None:
            params["expand"] = expand

        return self._make_request("GET", "/rest/api/3/search", params=params)

    def get_issue(self, issue_key: str, expand: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetch issue via GET /rest/api/3/issue/{issueIdOrKey}.

        Args:
            issue_key: Key or ID of the issue to retrieve (e.g., 'TEST-123')
            expand: Optional comma-separated list of fields to expand

        Returns:
            Parsed JSON response containing issue data

        Raises:
            AuthenticationError: When OAuth token is invalid or expired
            NotFoundError: When issue with specified key is not found
            RateLimitError: When API rate limit is exceeded
            APIError: For general API errors
        """
        endpoint = f"/rest/api/3/issue/{issue_key}"
        params = {}

        if expand is not None:
            params["expand"] = expand

        return self._make_request("GET", endpoint, params=params if params else None)

    def get_worklogs(self, issue_key: str) -> Dict[str, Any]:
        """
        Fetch worklogs via GET /rest/api/3/issue/{issueIdOrKey}/worklog.

        Args:
            issue_key: Key or ID of the issue to retrieve worklogs for (e.g., 'TEST-123')

        Returns:
            Parsed JSON response containing worklogs data

        Raises:
            AuthenticationError: When OAuth token is invalid or expired
            NotFoundError: When issue with specified key is not found
            RateLimitError: When API rate limit is exceeded
            APIError: For general API errors
        """
        endpoint = f"/rest/api/3/issue/{issue_key}/worklog"
        return self._make_request("GET", endpoint)

    def get_issue_comments(self, issue_key: str) -> List[Dict[str, Any]]:
        """
        Fetch all comments for an issue via GET /rest/api/3/issue/{issueIdOrKey}/comment.
        Handles pagination to retrieve all comments.

        Args:
            issue_key: Key or ID of the issue to retrieve comments for (e.g., 'TEST-123')

        Returns:
            List of comment dictionaries in the specified format

        Raises:
            AuthenticationError: When OAuth token is invalid or expired
            NotFoundError: When issue with specified key is not found
            RateLimitError: When API rate limit is exceeded
            APIError: For general API errors
        """
        all_comments = []
        start_at = 0
        max_results = 50  # Default page size for comments

        try:
            while True:
                endpoint = f"/rest/api/3/issue/{issue_key}/comment"
                params = {"startAt": start_at, "maxResults": max_results}

                response = self._make_request("GET", endpoint, params=params)

                comments = response.get("comments", [])
                if not comments:
                    break

                # TODO: Move to some util and remove from the scope of this function
                # Transform each comment to the specified format
                for comment in comments:
                    comment_data = {
                        "id": comment.get("id"),
                        "issue_key": issue_key,
                        "author": (
                            comment.get("author", {}).get("displayName", "")
                            if comment.get("author")
                            else ""
                        ),
                        "author_account_id": (
                          comment.get("author", {}).get("accountId", "")
                          if comment.get("author")
                            else ""
                        ),
                        "body": comment.get("body", ""),
                        "created": comment.get("created"),
                        "updated": comment.get("updated"),
                        "raw_data": comment,
                    }
                    all_comments.append(comment_data)

                # Check if we've retrieved all comments
                total = response.get("total", 0)
                if start_at + len(comments) >= total:
                    break

                start_at += max_results

        except Exception as e:
            # Re-raise with more context
            raise APIError(f"Failed to fetch comments for issue {issue_key}: {e}")

        return all_comments

    def get_myself(self) -> Dict[str, Any]:
        """
        Test connection via GET /rest/api/3/myself.

        This method is used for connection testing and returns information about
        the authenticated user. It's useful for validating OAuth credentials
        and API connectivity.

        Returns:
            Parsed JSON response containing authenticated user information

        Raises:
            AuthenticationError: When OAuth token is invalid or expired
            NotFoundError: When myself endpoint is not found
            RateLimitError: When API rate limit is exceeded
            APIError: For general API errors
        """
        return self._make_request("GET", "/rest/api/3/myself")

    def close(self) -> None:
        """
        Cleanup operations for HTTP client.

        This method performs any necessary cleanup operations. For the current
        implementation using the requests library without session objects,
        this is a no-op method. If session objects are added in the future,
        cleanup logic can be added here.
        """
        # No-op for HTTP client - no cleanup needed for requests library
        # If using session objects in the future, cleanup logic would go here
        pass