##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
JQL Issue Sync job implementation.
Discovers Jira issues using a custom JQL query and forwards them to the worklog sync job
for comprehensive worklog synchronization. This job leverages existing infrastructure
and follows established patterns for job chaining.
"""
import logging
import time
from typing import List, Dict, Any

from database import DatabaseManager
from jobs.base import BaseSyncJob, JobResult, JobConfig
from jobs.utils.common_util import initialize_jira_oauth_client, get_issue_estimation_field
from jobs.utils.issue_transformer_util import IssueTransformerUtil
from repositories import SprintRepository
from repositories.issue_repository import IssueRepository
from services.issue_service import IssueService

logger = logging.getLogger(__name__)

class JQLIssueSyncJob(BaseSyncJob):
    """
    Job class for discovering issues using custom JQL queries.

    This job executes a custom JQL query to discover & store issues and extracts their keys
    for forwarding to the worklog sync job. It follows the established job chaining
    pattern where one job's output becomes input for subsequent jobs.

    Parameters accepted in JobConfig.parameters:
    - jql (required, str): JQL query string to execute for issue discovery

    The job will:
    1. Validate parameters and set default values for optional parameters
    2. Execute the JQL query using existing IssueService
    3. Store discovered issues in the database
    4. Extract issue keys from discovered issues
    5. Format output data structure to forward to child tasks
    6. Return issue keys and comprehensive execution metrics
    """

    def __init__(self, config: JobConfig):
        """
        Initialize the JQL issue sync job.

        Args:
            config: JobConfig with job parameters
        """
        super().__init__(config)
        self.oauth_client = None
        self.db_manager = None
        self.issue_service = None
        self.sprint_repo = None

    def validate_parameters(self) -> tuple[bool, List[str]]:
        """
        Validate job parameters before execution.

        Validates required and optional parameters, checks types, and sets default values
        for optional parameters when not provided.

        Returns:
            Tuple of (is_valid, error_messages)
        """
        errors = []
        params = self.config.parameters

        # Validate JQL parameter (required string)
        jql = params.get("jql")
        if not jql:
            errors.append("Required parameter 'jql' is missing")
        elif not isinstance(jql, str):
            errors.append("Parameter 'jql' must be a string")
        elif not jql.strip():
            errors.append("Parameter 'jql' cannot be empty")

        return len(errors) == 0, errors

    def _initialize_services(self) -> bool:
        """
        Initialize required services (OAuth Jira client, Database, Repositories).

        Returns:
            True if all services initialized successfully
        """
        try:
            print("🔧 Initializing database services...")
            # Initialize database services
            self.db_manager = DatabaseManager()
            self.issue_service = IssueService()
            self.issue_repo = IssueRepository(self.config.tenant_id)
            self.sprint_repo = SprintRepository(self.config.tenant_id)

            success, client_or_error = initialize_jira_oauth_client(self.config.jira_credentials)
            if not success:
                logger.error('Failed to initialize Jira oauth client')
                return False
            else:
                self.oauth_client = client_or_error
                self.issue_service.set_oauth_client(client_or_error)

            logger.info("✅ All services initialized successfully")
            return True

        except Exception as e:
            logger.error(f"❌ Error initializing required services: {e}")
            return False

    def _extract_issue_keys(self, issues: List[Dict[str, Any]]) -> List[str]:
        """
        Extract issue keys from discovered issues.

        Args:
            issues: List of issue data from IssueService

        Returns:
            List of issue keys
        """
        self._update_progress(
            60, 100, "Extracting issue keys from discovered issues..."
        )
        print(f"🔑 Starting issue key extraction from {len(issues)} issues...")

        issue_keys = []
        issues_without_keys = 0

        try:
            for i, issue in enumerate(issues):
                # Update progress for large result sets
                if len(issues) > 100 and i % 50 == 0:
                    progress = 60 + (i / len(issues)) * 15  # 60-75% range
                    self._update_progress(
                        int(progress), 100, f"Processing issue {i + 1}/{len(issues)}..."
                    )

                issue_key = issue.get("key")
                if issue_key:
                    issue_keys.append(issue_key)
                else:
                    issues_without_keys += 1
                    print(f"⚠️ Issue missing key field: {issue}")

            # Log summary of extraction
            if issues_without_keys > 0:
                print(f"⚠️ Found {issues_without_keys} issues without key fields")

            print(
                f"✅ Extracted {len(issue_keys)} issue keys from {len(issues)} issues"
            )

            if len(issue_keys) == 0:
                print("⚠️ No valid issue keys found in the result set")

            return issue_keys

        except Exception as e:
            error_msg = f"Failed to extract issue keys: {str(e)}"
            print(f"❌ Error extracting issue keys: {e}")
            raise Exception(error_msg)

    def execute(self) -> JobResult:
        """
        Execute the JQL issue sync job.

        Returns:
            JobResult with execution metrics and issue keys for worklog sync
        """
        result = JobResult(
            success=True,
            message="JQL issue discovery completed successfully",
            data={},
        )

        start_time = time.time()
        logger.info(f"🚀 Starting JQL issue sync job execution...")

        try:
            # Step 1: Initialize services
            self._update_progress(0, 100, "Initializing services...")
            if not self._initialize_services():
                result.add_error("Failed to initialize required services")
                return result

            # Step 2: Get parameters (defaults already set in validation)
            self._update_progress(10, 100, "Retrieving validated parameters...")
            params = self.config.parameters
            jql = params.get("jql", "").strip()
            sprint_ids = params.get("sprint_ids", [])
            board_id = self.sprint_repo.find_by_id(sprint_ids[0]).get('board_id')

            # Step 3: Execute JQL query and transform issues
            self._update_progress(30, 100, "Starting JQL query execution...")
            raw_issues = self.issue_service.fetch_issues_untransformed_jql(jql)

            # Try to resolve storypoints custom field
            # any_single_issue = raw_issues[0].get('key')
            # issue_estimation_field = self.oauth_client.get_issue_estimation_for_issue_in_board(any_single_issue, board_id).get('fieldId')

            # issue_estimation_field = get_issue_estimation_field(raw_issues, board_id, self.oauth_client)

            # Step 4: Transform issues data with issue estimation field
            issues = []
            for issue_json in raw_issues:
                issue_data = IssueTransformerUtil.transform_issue_data_from_json(
                    issue_json=issue_json
                )
                if issue_data:
                    issues.append(issue_data)

            if not len(issues) > 0:
                result.add_error("No issues found to store")
                return result

            # Step 4: Extract issue keys from discovered issues
            self._update_progress(65, 100, "Extracting issue keys...")
            try:
                issue_keys = self._extract_issue_keys(issues)
            except Exception as e:
                result.add_error(str(e))
                return result

            # Step 5: Store issues in database
            self._update_progress(50, 100, "Storing issues in database...")
            if self.issue_repo.upsert_issues(issues):
                result.data["issue_keys"] = issue_keys
                result.data["jql"] = jql
                result.records_processed = len(issues)
                result.records_created = len(issues)
                result.execution_time = time.time() - start_time
            else:
                result.add_error("Failed to upsert issues")
                return result

            # Step 7: Complete
            self._update_progress(100, 100, "JQL issue discovery completed")

        except Exception as e:
            # Catch any unexpected errors not handled in individual steps
            error_msg = f"JQL issue sync execution failed: {str(e)}"
            print(f"❌ Unexpected error during JQL issue sync: {str(e)}")
            result.add_error(error_msg)

        return result

    @staticmethod
    def get_supported_parameters() -> Dict[str, Any]:
        """
        Get documentation for supported parameters.

        Returns:
            Dictionary describing supported parameters with types, descriptions,
            examples, default values, and requirement status
        """
        return {
            "jql": {
                "type": "str",
                "description": "JQL query string to execute for issue discovery. The query will be executed against Jira to find matching issues.",
                "example": "project = PROJ AND updated >= -7d",
                "required": True,
                "validation": "Must be a non-empty string",
            }
        }