##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Board synchronization job implementation.
Converts the existing board sync logic into a structured, trackable job class.

This job:
1. Fetches all boards from Jira with pagination
2. Transforms board data for database storage
3. Stores boards in PostgreSQL with UPSERT logic
4. Provides detailed progress tracking and metrics
"""

from typing import List, Dict, Any
from jobs.base import BaseSyncJob, JobResult, JobConfig
from jira_service import JiraService
from database import DatabaseManager
from services.oauth_jira_client import OAuthJiraClient
from models.requests import OAuthJiraCredentials
from repositories import BoardRepository
import time


class BoardSyncJob(BaseSyncJob):
    """
    Job class for synchronizing Jira boards.

    This job fetches all boards from Jira and stores them in the database.
    It handles pagination automatically and provides progress tracking.

    Parameters accepted in JobConfig.parameters:
    - project_keys: List of project keys to filter boards (optional)
    - board_types: List of board types to include (optional, e.g., ['scrum', 'kanban'])
    """

    def __init__(self, config: JobConfig):
        """
        Initialize the board sync job.

        Args:
            config: JobConfig with job parameters
        """
        super().__init__(config)
        self.jira_service = None
        self.board_repo = None
        self.db_manager = None

    def validate_parameters(self) -> tuple[bool, List[str]]:
        """
        Validate job parameters for board synchronization.

        Pydantic validation in BoardSyncRequest handles all necessary validation
        including enum validation for board_types.
        Only add validation which can't be handled using Pydantic inside BoardSyncRequest

        Returns:
            Tuple of (is_valid, error_messages)
        """

        return True, []

    def _initialize_services(self) -> bool:
        """
        Initialize required services (Jira, Database).

        Returns:
            True if all services initialized successfully
        """
        try:
            # Initialize database services
            self.db_manager = DatabaseManager()
            self.board_repo = BoardRepository(self.config.tenant_id)

            # TODO: Remove
            # Ensure database schema exists
            # if not self.db_manager.create_schema_and_table():
            #     return False
            
            if hasattr(self.config, 'jira_credentials') and self.config.jira_credentials:
                # Use OAuth client for this experimental run
                jira_credentials = OAuthJiraCredentials(access_token=self.config.jira_credentials.api_token, cloud_id='db7f0a3b-5436-42d5-9dca-dd125485dd75')
                self.oauth_client = OAuthJiraClient(jira_credentials)
                # Test connection
                try:
                    self.oauth_client.get_myself()
                    print("✅ OAuth Jira client connected successfully")
                except Exception as e:
                    print(f"❌ OAuth client connection failed: {e}")
                    return False
            else:
                # Initialize and connect to Jira
                self.jira_service = JiraService(self.config.jira_credentials)
                if not self.jira_service.connect():
                    return False

            return True

        except Exception as e:
            print(f"❌ Error initializing services: {e}")
            return False

    # TODO: Modify this logic such that whatever is to be filtered shouldn't be requested from Jira in the 1st place
    def _apply_filters(self, boards_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Apply filters based on job parameters.

        Args:
            boards_data: List of board dictionaries

        Returns:
            Filtered list of board dictionaries
        """
        filtered_boards = boards_data
        params = self.config.parameters

        # Filter by project keys
        if "project_keys" in params and params["project_keys"]:
            project_keys = [key.upper() for key in params["project_keys"]]
            filtered_boards = [
                board
                for board in filtered_boards
                if board.get("project_key", "").upper() in project_keys
            ]

        # Filter by board types
        if "board_types" in params and params["board_types"]:
            board_types = [bt.lower() for bt in params["board_types"]]
            filtered_boards = [
                board
                for board in filtered_boards
                if board.get("type", "").lower() in board_types
            ]

        return filtered_boards

    def execute(self) -> JobResult:
        """
        Execute the board synchronization job.

        Returns:
            JobResult with execution metrics and outcomes
        """
        result = JobResult(
            success=True, message="Board sync completed successfully", data={}
        )

        start_time = time.time()

        try:
            # Step 1: Initialize services
            self._update_progress(0, 100, "Initializing services...")
            if not self._initialize_services():
                result.add_error("Failed to initialize required services")
                return result

            # Step 2: Fetch boards from Jira
            self._update_progress(20, 100, "Fetching boards from Jira...")
            jira_boards = self.jira_service.fetch_all_boards()

            if not jira_boards:
                result.add_warning("No boards found in Jira")
                result.data["boards_fetched"] = 0
                return result

            result.data["boards_fetched"] = len(jira_boards)

            # Step 3: Transform board data
            self._update_progress(50, 100, "Processing board data...")
            boards_data = self.jira_service.transform_board_data(jira_boards)

            # Step 4: Apply filters if specified
            if self.config.parameters:
                original_count = len(boards_data)
                boards_data = self._apply_filters(boards_data)
                filtered_count = len(boards_data)

                if filtered_count < original_count:
                    result.data["boards_filtered_out"] = original_count - filtered_count
                    result.add_warning(
                        f"Filtered out {original_count - filtered_count} boards based on job parameters"
                    )

            result.records_processed = len(boards_data)

            # Step 5: Store in database
            self._update_progress(80, 100, "Storing boards in database...")
            if boards_data:
                if self.board_repo.upsert_boards(boards_data):
                    # Get final count from database to determine creates vs updates
                    total_in_db = self.board_repo.get_board_count()
                    result.data["total_boards_in_db"] = total_in_db
                    result.data["boards_processed"] = len(boards_data)

                    # For simplicity, we'll count all as "processed"
                    # In a more advanced version, we'd track actual creates vs updates
                    result.records_created = len(boards_data)  # Approximation
                else:
                    result.add_error("Failed to store boards in database")
                    return result
            else:
                result.add_warning("No boards to store after filtering")

            # Step 6: Complete
            self._update_progress(100, 100, "Board sync completed")

            # Set final result data
            result.data.update(
                {
                    "execution_summary": {
                        "boards_fetched_from_jira": result.data.get(
                            "boards_fetched", 0
                        ),
                        "boards_processed": result.records_processed,
                        "boards_stored": result.records_created,
                        "total_boards_in_database": result.data.get(
                            "total_boards_in_db", 0
                        ),
                    }
                }
            )

            result.message = f"Successfully synced {result.records_processed} boards"

        except Exception as e:
            result.add_error(f"Board sync execution failed: {str(e)}")

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
            "project_keys": {
                "type": "list[str]",
                "description": "List of project keys to filter boards",
                "example": ["PROJ1", "PROJ2"],
                "required": False,
            },
            "board_types": {
                "type": "list[BoardType]",
                "description": "List of board types to include",
                "example": ["scrum", "kanban"],
                "valid_values": ["scrum", "kanban", "simple"],
                "required": False,
            },
        }