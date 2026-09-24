##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
SprintsListSyncJob - Synchronizes sprint data from Jira without updating last_synced_at timestamps.

This job fetches sprint data from Jira and stores it in the local database while preserving
existing last_synced_at values. It supports filtering by sprint states and follows the same
architectural patterns as other sync jobs.
"""

import time
from typing import List, Optional

from jobs.base import BaseSyncJob, JobResult, JobConfig
from services import OAuthJiraClient, SprintService
from repositories import SprintRepository
from models.enums import SprintState


class SprintsListSyncJob(BaseSyncJob):
    """
    Synchronizes sprint data from Jira without updating last_synced_at timestamps.

    This job is designed to work alongside RecentActivityIssueSyncJob, which manages
    the last_synced_at timestamps independently. The job supports filtering by sprint
    states and follows the same board filtering logic as ProactiveSprintsSyncJob.
    """

    def __init__(self, config: JobConfig):
        """
        Initialize the sprints list sync job.

        Args:
            config: JobConfig with job parameters including optional sprint_states filter
        """
        super().__init__(config)
        self.oauth_client = None
        self.sprint_repo = None
        self.sprint_service = None

    def validate_parameters(self) -> tuple[bool, List[str]]:
        """
        Validate job parameters before execution.

        Validates the sprint_states parameter if provided, ensuring all values
        are valid sprint states (active, closed, future).

        Returns:
            Tuple of (is_valid, error_messages)
        """
        errors = []

        # Get sprint_states parameter if provided
        sprint_states = self.config.parameters.get("sprint_states")

        if sprint_states is not None:
            if not isinstance(sprint_states, list):
                errors.append("sprint_states parameter must be a list")
            else:
                valid_states = {state.value for state in SprintState}
                invalid_states = set(sprint_states) - valid_states
                if invalid_states:
                    errors.append(
                        f"Invalid sprint states: {invalid_states}. Valid states are: {valid_states}"
                    )

        return len(errors) == 0, errors

    def _initialize_services(self) -> bool:
        """
        Initialize required services for the job.

        Sets up OAuth client, sprint service, and sprint repository following
        the same pattern as ProactiveSprintsSyncJob.

        Returns:
            bool: True if all services initialized successfully, False otherwise
        """
        try:
            # Initialize OAuth client
            self.oauth_client = OAuthJiraClient(self.config.jira_credentials)

            # Test connection
            try:
                self.oauth_client.get_myself()
            except Exception as e:
                print(f"❌ Error initializing oauth client for {self.__class__.__name__}: {e}")
                return False

            # Initialize sprint service and repository
            self.sprint_service = SprintService()
            self.sprint_service.set_oauth_client(self.oauth_client)
            self.sprint_repo = SprintRepository(self.config.tenant_id)

            return True

        except Exception as e:
            print(f"❌ Error initializing services for {self.__class__.__name__}: {e}")
            return False

    def execute(self) -> JobResult:
        """
        Execute the sprints list synchronization job.

        Fetches sprints from Jira with optional state filtering and stores them
        in the database while preserving existing last_synced_at timestamps.

        Returns:
            JobResult with execution metrics and outcomes
        """

        result = JobResult(
            success=True,
            message="Sprints List Sync Job completed successfully",
            data={},
        )

        start_time = time.time()

        try:
            # Step 1: Initialize services
            self._update_progress(0, 100, "Initializing services...")
            if not self._initialize_services():
                result.add_error("Failed to initialize required services")
                return result

            # Step 2: Get sprint states filter
            sprint_states = self.config.parameters.get("sprint_states")
            if sprint_states:
                self._update_progress(
                    10, 100, f"Filtering by sprint states: {sprint_states}"
                )
            else:
                self._update_progress(10, 100, "Using default filter: active sprints only")

            # Step 3: Get all boards (same logic as ProactiveSprintsSyncJob)
            self._update_progress(20, 100, "Fetching boards...")
            all_boards = self.sprint_service.get_all_boards()

            # Step 4: Fetch sprints from boards with state filtering
            all_sprints = []
            board_count = len(all_boards)

            for i, board in enumerate(all_boards):
                # Filter boards by type (same as ProactiveSprintsSyncJob)
                if (board.get("type") == "scrum") or (board.get("type") == "simple"):
                    board_id = board.get("id")
                    board_name = board.get("name", f"Board {board_id}")

                    progress = 20 + (i * 50 // board_count)
                    self._update_progress(
                        progress, 100, f"Fetching sprints from board: {board_name}"
                    )
                    
                    board_sprints = (
                        self.sprint_service.get_all_sprints_against_board(board_id, sprint_states)
                    )

                    all_sprints.extend(board_sprints)

            # Step 5: Store sprints in database (preserving last_synced_at)
            if all_sprints:
                self._update_progress(80, 100, "Storing sprints in database...")

                # Use the preserve sync timestamp method to maintain existing last_synced_at values
                if self.sprint_repo.upsert_sprints_preserve_sync_timestamp(all_sprints):
                    # Get final metrics
                    total_sprints_in_db = self.sprint_repo.get_sprint_count()

                    result.data["total_sprints_in_db"] = total_sprints_in_db
                    result.data["sprints_processed"] = len(all_sprints)
                    result.data["sprint_states_filter"] = sprint_states
                    result.records_processed = len(all_sprints)
                else:
                    result.add_error("Failed to store sprints in database")
                    return result
            else:
                result.add_warning("No sprints found to store")
                result.data["sprints_processed"] = 0
                result.data["sprint_states_filter"] = sprint_states

            # Step 6: Complete
            self._update_progress(100, 100, "Sprints list sync completed")

        except Exception as e:
            result.add_error(f"Sprints list sync execution failed: {str(e)}")
            raise
        finally:
            result.execution_time = time.time() - start_time

        return result