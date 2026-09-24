##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Changelogs Synchronization job implementation
Fetches changelogs for specified issues from Jira Cloud Rest APIs with optimized batch processing.

This job:
1. Takes a list of issue keys as input
2. Fetches changelogs for those issues in batches to optimize API usage
3. Uses Oauth token based Jira Cloud Rest APIs
4. Transforms changelog data for database storage
5. Stores changelogs in DB
6. Provides detailed progress tracking and metrics
"""
import time
import logging
from typing import List, Any

from jobs.base import BaseSyncJob, JobConfig, JobResult
from jobs.utils.common_util import initialize_jira_oauth_client, create_batches, fetch_changelogs_against_issues, transform_raw_changelogs_to_required_format
from repositories import ChangelogRepository
from services import OAuthJiraClient

logger = logging.getLogger(__name__)

class ChangelogSyncJob(BaseSyncJob):
    """
    Job class for synchronizing Jira changelogs for specified issues.

    This job fetches changelogs for a given list of issues and stores them in the database.
    It handles batch processing to optimize API calls and avoid rate limits.

    Parameters accepted in JobConfig.parameters:
    - issue_keys: List[str] List of issue keys to fetch changelogs for (required)
    - batch_size: int Number of changelogs to fetch at a time (optional, default: 50)
    """

    def __init__(self, config: JobConfig):
        """
        Initialize the changelog sync job

        Args:
            config: JobConfig with job parameters
        """
        super().__init__(config)
        self.oauth_client = None
        self.changelog_repo = None
        self.batch_size = self.config.parameters.get("batch_size", 1000)

    def _initialize_services(self) -> bool:
        """
        Initialize required services (OAuth Jira client, Database).

        Returns:
            True if all services initialized successfully
        """
        try:
            self.changelog_repo = ChangelogRepository(self.config.tenant_id)
            success, client_or_error = initialize_jira_oauth_client(self.config.jira_credentials)
            if not success:
                print(client_or_error)
                return False
            else:
                self.oauth_client = client_or_error
        except Exception as e:
            print(f"❌ Error initializing required services: {e}")
            return False

        return True

    # TODO: Use this method to validate target job parameters before job submission
    def validate_parameters(self) -> tuple[bool, List[str]]:
        errors = []
        params = self.config.parameters

        if 'issue_keys' in params:
            issue_keys = params['issue_keys']
            if not isinstance(issue_keys, list):
                errors.append("issue_keys must be a list")
            elif not all(isinstance(issue_key, str) for issue_key in issue_keys):
                errors.append("All issue_keys must strings")

        return len(errors) == 0, errors

    def execute(self) -> JobResult:
        """
                Execute the worklog synchronization job.

                Returns:
                    JobResult with execution metrics and outcomes
                """
        result = JobResult(
            success=True, message="Changelog sync completed successfully", data={}
        )

        start_time = time.time()

        try:
            # Step 1: Initialize services:
            self._update_progress(0,100, "Initializing services ...")
            if not self._initialize_services():
                result.add_error("Failed to initialize required services")
                return result

            # Step 2: Get parameters
            self.issue_keys = self.config.parameters["issue_keys"]

            # Step 3: Create batches
            self._update_progress(10, 100, "Creating issue batches...")
            batches = create_batches(self.issue_keys, self.batch_size)

            raw_changelogs = []
            for batch_idx, batch in enumerate(batches):
                try:
                    batch_changelogs = fetch_changelogs_against_issues(batch, self.oauth_client, logger)

                    if batch_changelogs:
                        raw_changelogs.extend(batch_changelogs)

                    # Small delay between batches to avoid rate limiting
                    if batch_idx < len(batches) - 1:  # Don't delay after last batch
                        time.sleep(0.5)

                except Exception as e:
                    result.add_error(
                        f"Failed to process batch {batch_idx + 1}: {str(e)}"
                    )
                    logger.error(f"❌ Failed to process batch {batch_idx + 1}: {str(e)}")

            all_changelogs = transform_raw_changelogs_to_required_format(raw_changelogs)

            # Always pass issue_keys so deletions apply even when Jira returns no changelogs
            if self.changelog_repo.upsert_changelogs(
                all_changelogs, issue_keys=self.issue_keys
            ):
                result.data["total_issues"] = len(self.config.parameters["issue_keys"])
                result.data["changelogs_stored"] = len(all_changelogs)
                result.data["batch_size"] = self.batch_size
                result.data["total_batches"] = len(batches)
                result.execution_time = time.time() - start_time
                result.success = True
                result.message = "Changelog sync completed successfully"
            else:
                result.add_warning("Failed to store changelog in database")

        except Exception as e:
            result.add_error(f"❌ Changelog sync execution failed: {str(e)}")

        return result

    @staticmethod
    def get_supported_parameters() -> dict[str, Any]:
        return {
            "issue_keys": {
                "type": "list[str]",
                "description": "List of issue keys to fetch changelogs for",
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