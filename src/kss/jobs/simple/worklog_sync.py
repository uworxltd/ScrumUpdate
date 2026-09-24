##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Worklog synchronization job implementation.
Fetches worklogs for specified issues from Jira using OAuth authentication with optimized batch processing.

This job:
1. Takes a list of issue keys as input
2. Fetches worklogs for those issues in batches to optimize API usage
3. Uses OAuth-based Jira client for authentication
4. Transforms worklog data for database storage
5. Stores worklogs in PostgreSQL with UPSERT logic
6. Provides detailed progress tracking and metrics
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, date
import time
import re

from jobs.base import BaseSyncJob, JobResult, JobConfig
from services import WorklogService, OAuthJiraClient
from database import DatabaseManager
from repositories import WorklogRepository


class WorklogSyncJob(BaseSyncJob):
    """
    Job class for synchronizing Jira worklogs for specific issues.

    This job fetches worklogs for a given list of issues and stores them in the database.
    It handles batch processing to optimize API calls and avoid rate limits.

    Parameters accepted in JobConfig.parameters:
    - issue_keys: List of issue keys to fetch worklogs for (required)
    - batch_size: Number of issues to process in each batch (optional, default: 50)
    """

    def __init__(self, config: JobConfig):
        """
        Initialize the worklog sync job.

        Args:
            config: JobConfig with job parameters
        """
        super().__init__(config)
        self.oauth_client = None
        self.worklog_service = None
        self.worklog_repo = None
        self.db_manager = None
        self.batch_size = self.config.parameters.get("batch_size", 50)

    def validate_parameters(self) -> tuple[bool, List[str]]:
        """
        Validate job parameters before execution.

        Pydantic validation in WorklogSyncRequest handles all necessary validation.
        Only add validation which can't be handled using Pydantic inside WorklogSyncRequest

        Returns:
            Tuple of (is_valid, error_messages)
        """
        return True, []

    def _initialize_services(self) -> bool:
        """
        Initialize required services (OAuth Jira client, Database).

        Returns:
            True if all services initialized successfully
        """
        try:
            # Initialize database services
            self.db_manager = DatabaseManager()
            self.worklog_repo = WorklogRepository(self.config.tenant_id)

            # Initialize OAuth client
            self.oauth_client = OAuthJiraClient(self.config.jira_credentials)

            # Test connection
            try:
                self.oauth_client.get_myself()
                print("✅ OAuth Jira client connected successfully")
            except Exception as e:
                print(f"❌ OAuth client connection failed: {e}")
                return False

            # Initialize worklog service with OAuth client
            self.worklog_service = WorklogService()
            self.worklog_service.set_oauth_client(self.oauth_client)

            return True

        except Exception as e:
            print(f"❌ Error initializing services: {e}")
            return False

    def _create_issue_batches(self, issue_keys: List[str]) -> List[List[str]]:
        """
        Split issue keys into batches for processing.

        Args:
            issue_keys: List of issue keys to batch

        Returns:
            List of batches, each containing up to batch_size issue keys
        """
        batches = []
        for i in range(0, len(issue_keys), self.batch_size):
            batch = issue_keys[i : i + self.batch_size]
            batches.append(batch)
        return batches

    def execute(self) -> JobResult:
        """
        Execute the worklog synchronization job.

        Returns:
            JobResult with execution metrics and outcomes
        """
        result = JobResult(
            success=True, message="Worklog sync completed successfully", data={}
        )

        start_time = time.time()

        try:
            # Step 1: Initialize services
            self._update_progress(0, 100, "Initializing services...")
            if not self._initialize_services():
                result.add_error("Failed to initialize required services")
                return result

            # Step 2: Get parameters
            issue_keys = self.config.parameters["issue_keys"]

            result.data["total_issues"] = len(issue_keys)
            result.data["batch_size"] = self.batch_size

            # Step 3: Create batches
            self._update_progress(10, 100, "Creating issue batches...")
            batches = self._create_issue_batches(issue_keys)
            result.data["total_batches"] = len(batches)

            # Step 4: Process batches
            total_worklogs = 0
            processed_issues = 0
            failed_issues = []
            all_worklogs = []

            for batch_idx, batch in enumerate(batches):
                batch_progress = 20 + (batch_idx / len(batches)) * 70
                self._update_progress(
                    int(batch_progress),
                    100,
                    f"Processing batch {batch_idx + 1}/{len(batches)} ({len(batch)} issues)...",
                )

                try:
                    # Fetch worklogs for this batch using the enhanced WorklogService
                    batch_worklogs = self.worklog_service.fetch_worklogs_for_issues(
                        batch
                    )
                    
                    if batch_worklogs:
                        all_worklogs.extend(batch_worklogs)
                        total_worklogs += len(batch_worklogs)
                        processed_issues += len(batch)
                    else:
                        # No worklogs found for this batch (not necessarily an error)
                        processed_issues += len(batch)

                    # Small delay between batches to avoid rate limiting
                    if batch_idx < len(batches) - 1:  # Don't delay after last batch
                        time.sleep(0.5)

                except Exception as e:
                    result.add_error(
                        f"Failed to process batch {batch_idx + 1}: {str(e)}"
                    )
                    failed_issues.extend(batch)
                    
            # Always pass issue_keys so deletions apply even when Jira returns no worklogs
            if self.worklog_repo.upsert_worklogs(all_worklogs, issue_keys=issue_keys):
                total_worklogs = len(all_worklogs)
            else:
                result.add_warning("Failed to store worklogs in database")

            # Step 5: Complete and set results
            self._update_progress(100, 100, "Worklog sync completed")

            result.records_processed = len(issue_keys)
            result.records_created = total_worklogs  # New worklogs stored

            result.data.update(
                {
                    "execution_summary": {
                        "total_issues_requested": len(issue_keys),
                        "issues_processed_successfully": processed_issues,
                        "issues_failed": len(failed_issues),
                        "total_worklogs_fetched": total_worklogs,
                        "batches_processed": len(batches),
                        "batch_size_used": self.batch_size,
                    }
                }
            )

            if failed_issues:
                result.data["failed_issues"] = failed_issues
                result.add_warning(f"Failed to process {len(failed_issues)} issues")

            result.message = f"Successfully fetched worklogs for {processed_issues}/{len(issue_keys)} issues ({total_worklogs} worklogs total)"

        except Exception as e:
            result.add_error(f"Worklog sync execution failed: {str(e)}")

        finally:
            result.execution_time = time.time() - start_time

        return result

    def get_supported_parameters(self) -> Dict[str, Any]:
        """
        Get documentation for supported parameters.

        Returns:
            Dictionary describing supported parameters
        """
        return {
            "issue_keys": {
                "type": "list[str]",
                "description": "List of issue keys to fetch worklogs for",
                "example": ["PROJ-123", "PROJ-124", "PROJ-125"],
                "required": True,
            },
            "batch_size": {
                "type": "int",
                "description": "Number of issues to process in each batch (1-100)",
                "example": 50,
                "default": 50,
                "required": False,
            },
        }