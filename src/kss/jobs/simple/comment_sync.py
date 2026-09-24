##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Comments Synchronization job implementation
Fetches comments for specified issues from Jira Cloud Rest APIs with optimized batch processing.

This job:
1. Takes a list of issue keys as input
2. Fetches comments for those issues in batches to optimize API usage
3. Uses Oauth token based Jira Cloud Rest APIs
4. Transform comments data for database storage
5. Stores comments in DB
6. Provides detailed progress tracking and metrics
"""
import logging
import time
from typing import List

from jobs.base import BaseSyncJob, JobConfig, JobResult
from jobs.utils.common_util import initialize_jira_oauth_client, create_batches
from repositories import CommentRepository

logger = logging.getLogger(__name__)

class CommentSyncJob(BaseSyncJob):
    """
    Job class for synchronizing Jira comments for specified issues.

    This job fetches comments for a given list of issues and stores them in the database.
    It handles batch processing to optimize API calls and avoid rate limits.

    Parameters accepted in JobConfig.parameters:
    - issue_keys: List[str] List of issue keys to fetch comments for (required)
    - batch_size: int Number of comments to fetch at a time (optional, default: 50)
    """

    def __init__(self, config: JobConfig):
        """
        Initialize the comment sync job

        Args:
        config: JobConfig with job parameters
        """
        super().__init__(config)
        self.oauth_client = None
        self.comment_repo = None

        self.issue_keys = self.config.parameters.get('issue_keys', [])
        self.batch_size = self.config.parameters.get('batch_size', 100)

    def _initialize_services(self) -> bool:
        """
        Initialize required services (OAuth Jira client, Database).

        Returns:
            True if all services initialized successfully
        """
        try:
            self.comment_repo = CommentRepository(self.config.tenant_id)
            success, client_or_error = initialize_jira_oauth_client(self.config.jira_credentials)
            if not success:
                logger.error('Failed to initialize Jira oauth client')
                return False
            else:
                self.oauth_client = client_or_error
            
            print("✅ All services initialized successfully")
            return True
        except Exception as e:
            logger.error(f"❌ Error initializing required services: {e}")
            return False

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
        result = JobResult(
            success=False, message="Comment sync job failed", data={}
        )
        start_time = time.time()

        try:
            # Step 1: Initialize services:
            self._update_progress(0, 100, "Initializing services")
            if not self._initialize_services():
                result.add_error("Failed to initialize required services")
                return result

            # Step 2: Get parameters
            self.issue_keys = self.config.parameters["issue_keys"]

            # Step 3: Fetch comments (transformed) against provided issue keys
            all_comments = []
            for key in self.issue_keys:
                comments = self.oauth_client.get_issue_comments(key)
                all_comments.extend(comments)

            # Step 4: Store fetched comments in database & prepare JobResult
            # Always pass issue_keys so deletions are applied even when the remote
            # payload is empty (all comments deleted on those issues).
            self._update_progress(90, 100, "Storing comments in database...")
            if self.comment_repo.upsert_comments(
                all_comments, issue_keys=self.issue_keys
            ):
                result.success = True
                result.message = "Comment sync job completed successfully"
                result.data = {
                    "issue_keys": self.issue_keys,
                    "total_comments_fetched": len(all_comments),
                }
                result.execution_time = time.time() - start_time
            else:
                result.add_error("Failed to store comments in database")

        except Exception as e:
            result.add_error(f"❌ Comment sync execution failed: {str(e)}")

        return result