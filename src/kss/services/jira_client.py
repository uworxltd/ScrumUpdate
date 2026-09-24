##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Jira client wrapper and utilities.
Provides centralized Jira client management and common utilities.
"""

from jira import JIRA
from typing import Optional, Dict
from models import JiraCredentials
import logging

logger = logging.getLogger(__name__)


class JiraClient:
    """
    Wrapper for Jira client with connection management.
    Provides a singleton-like interface for Jira connections.
    """

    _instance = None
    _client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(JiraClient, cls).__new__(cls)
        return cls._instance

    def get_client(
        self, credentials: Optional[JiraCredentials] = None
    ) -> Optional[JIRA]:
        """
        Get the Jira client instance, creating connection if needed.

        Args:
            credentials: Optional Jira credentials for multi-tenant usage.
                        If provided, creates a new client with these credentials.
                        If None, uses the singleton pattern with config credentials.

        Returns:
            JIRA client instance or None if connection fails
        """
        # If credentials are provided, create a new client with those credentials
        if credentials:
            return self._create_connection_with_credentials(credentials)

        # Otherwise, use the singleton pattern with config credentials
        if self._client is None:
            self._client = self._create_connection()
        return self._client

    def _create_connection(self) -> Optional[JIRA]:
        """
        Create a new Jira connection using config credentials.

        Returns:
            JIRA client instance or None if connection fails
        """
        # try:
            # client = JIRA(
            #     server=JIRA_CONFIG["server"],
            #     basic_auth=(JIRA_CONFIG["username"], JIRA_CONFIG["api_token"]),
            # )
            # logger.info("✅ Connected to Jira successfully (using config credentials)")
            # return client

        # except Exception as e:
        #     logger.error(f"❌ Error connecting to Jira with config credentials: {e}")
        #     return None

    def _create_connection_with_credentials(
        self, credentials: JiraCredentials
    ) -> Optional[JIRA]:
        """
        Create a new Jira connection with provided credentials.

        Args:
            credentials: JiraCredentials instance with server, username, and api_token

        Returns:
            JIRA client instance or None if connection fails
        """
        try:
            client = JIRA(
                server=credentials.server,
                basic_auth=(credentials.username, credentials.api_token),
            )
            logger.info(
                f"✅ Connected to Jira successfully (using tenant credentials for {credentials.server})"
            )
            return client

        except Exception as e:
            logger.error(f"❌ Error connecting to Jira with tenant credentials: {e}")
            return None

    def disconnect(self):
        """Disconnect and reset the client."""
        if self._client:
            try:
                self._client.close()
            except Exception as e:
                logger.warning(f"Warning during Jira disconnect: {e}")
            finally:
                self._client = None

    def is_connected(self) -> bool:
        """Check if client is connected."""
        return self._client is not None

    def test_connection(self, credentials: Optional[JiraCredentials] = None) -> bool:
        """
        Test the Jira connection.

        Args:
            credentials: Optional Jira credentials to test.
                        If None, tests the default config connection.

        Returns:
            True if connection is working, False otherwise
        """
        try:
            client = self.get_client(credentials)
            if client:
                # Try a simple API call to test connection
                client.myself()
                return True
        except Exception as e:
            cred_info = (
                f"tenant credentials ({credentials.server})"
                if credentials
                else "config credentials"
            )
            logger.error(f"Connection test failed with {cred_info}: {e}")

        return False