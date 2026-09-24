##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Base Jira service providing common functionality.
All specific services inherit from this base class.
"""

import re
import logging
from datetime import datetime
from typing import Optional
from jira import JIRA

from config import APP_CONFIG
from .jira_client import JiraClient
from models import JiraCredentials

logger = logging.getLogger(__name__)


class BaseJiraService:
    """
    Base service class with common Jira operations.
    Provides connection management and shared utilities.
    """

    def __init__(self, jira_credentials: Optional[JiraCredentials] = None):
        """
        Initialize base service with optional credentials.
        
        Args:
            jira_credentials: Optional Jira credentials for multi-tenant usage
        """
        self.jira_credentials = jira_credentials
        self.jira_client = None
        self.oauth_client = None
        self.pagination_size = APP_CONFIG["pagination_size"]
        self._jira_client_manager = JiraClient()

    def connect(self) -> bool:
        """
        Establish connection to Jira using JiraClient manager.

        Returns:
            bool: True if connection successful, False otherwise
        """
        try:
            # Get client from JiraClient manager with optional credentials
            self.jira_client = self._jira_client_manager.get_client(self.jira_credentials)
            if self.jira_client:
                logger.info("✅ Connected to Jira successfully via BaseJiraService")
                return True
            else:
                logger.error("❌ Failed to get Jira client from JiraClient manager")
                return False

        except Exception as e:
            logger.error(f"❌ Error connecting to Jira via BaseJiraService: {e}")
            return False

    def _ensure_connected(self):
        """Ensure Jira client is connected, raise error if not."""
        if not self.jira_client and not self.oauth_client:
            raise RuntimeError("Jira client not connected. Call connect() first.")
    
    def set_oauth_client(self, oauth_client):
        """
        Set the OAuth client for this service.
        
        Args:
            oauth_client: OAuthJiraClient instance
        """
        self.oauth_client = oauth_client

    def _parse_jira_date(self, date_str: Optional[str]) -> Optional[str]:
        """
        Parse Jira date string into PostgreSQL-compatible format.

        Args:
            date_str: Jira date string (ISO format)

        Returns:
            PostgreSQL-compatible date string or None
        """
        if not date_str:
            return None

        try:
            # Replace 'Z' with '+00:00' for UTC, if present
            processed_date_str = date_str.replace("Z", "+00:00")

            # Fix timezone offset if necessary:
            # Match +HHMM or -HHMM at the end of the string and add colon between HH and MM
            # Example: +0100 -> +01:00
            m = re.match(r"^(.*)([+-]\d{2})(\d{2})$", processed_date_str)
            if m:
                processed_date_str = f"{m.group(1)}{m.group(2)}:{m.group(3)}"

            parsed_date = datetime.fromisoformat(processed_date_str)

            # Format for PostgreSQL
            return parsed_date.strftime("%Y-%m-%d %H:%M:%S.%f%z")

        except ValueError:
            logger.warning(f"Failed to parse date string: {date_str}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error parsing date {date_str}: {e}")
            return None

    def _log_success(self, message: str, count: int = None):
        """Log successful operation."""
        if count is not None:
            logger.info(f"✅ {message}: {count}")
        else:
            logger.info(f"✅ {message}")

    def _log_error(self, message: str, error: Exception):
        """Log operation error."""
        logger.error(f"❌ {message}: {error}")

    def _log_progress(self, message: str):
        """Log progress information."""
        logger.info(f"🔄 {message}")