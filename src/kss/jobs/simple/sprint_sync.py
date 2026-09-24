##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Sprint synchronization job implementation.
Converts the existing sprint sync logic into a structured, trackable job class.

This job:
1. Identifies scrum boards (only scrum boards have sprints)
2. Fetches sprints for specified boards or all scrum boards
3. Transforms sprint data for database storage
4. Stores sprints in PostgreSQL with UPSERT logic
5. Provides detailed progress tracking and metrics
"""

from typing import List, Dict, Any, Optional, Union
from jobs.base import BaseSyncJob, JobResult, JobConfig
from jira_service import JiraService
from services.oauth_jira_client import OAuthJiraClient
from models.requests import OAuthJiraCredentials
from database import DatabaseManager
from repositories import BoardRepository, SprintRepository
import time


class SprintSyncJob(BaseSyncJob):
    """
    Job class for synchronizing Jira sprints.

    This job fetches sprints from scrum boards and stores them in the database.
    It automatically filters for scrum boards only, as kanban boards don't have sprints.

    Parameters accepted in JobConfig.parameters:
    - board_ids: List of specific board IDs to sync (optional)
    - sprint_states: List of sprint states to include (default: ['active'])
    - project_keys: List of project keys to filter boards (optional)
    - max_boards: Maximum number of boards to process (optional, for testing)
    """

    def __init__(self, config: JobConfig):
        """
        Initialize the sprint sync job.

        Args:
            config: JobConfig with job parameters
        """
        super().__init__(config)
        self.jira_service = None
        self.oauth_client = None
        self.board_repo = None
        self.sprint_repo = None
        self.db_manager = None

    def validate_parameters(self) -> tuple[bool, List[str]]:
        """
        Validate job parameters before execution.

        Pydantic validation in SprintSyncRequest handles all necessary validation
        including enum validation for sprint_states.
        Only add validation which can't be handled using Pydantic inside SprintSyncRequest

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
            self.board_repo = BoardRepository(self.config.tenant_id)
            self.sprint_repo = SprintRepository(self.config.tenant_id)

            # Check if we have OAuth credentials, otherwise fall back to traditional client
            if (
                hasattr(self.config, "jira_credentials")
                and self.config.jira_credentials
            ):
                # Use OAuth client for this experimental run
                # jira_credentials = OAuthJiraCredentials(
                #     access_token=self.config.jira_credentials.api_token,
                #     cloud_id=self.config.jira_credentials.server,
                # )
                self.oauth_client = OAuthJiraClient(self.config.jira_credentials)
                # Test connection
                try:
                    self.oauth_client.get_myself()
                    print("✅ OAuth Jira client connected successfully")
                except Exception as e:
                    print(f"❌ OAuth client connection failed: {e}")
                    return False
            else:
                # Fall back to traditional Jira service
                self.jira_service = JiraService(self.config.jira_credentials)
                if not self.jira_service.connect():
                    return False

            return True

        except Exception as e:
            print(f"❌ Error initializing services: {e}")
            return False

    def _get_target_boards(self) -> List[Dict[str, Any]]:
        """
        Get the list of boards to sync sprints for.

        Returns:
            List of board dictionaries (scrum boards only)
        """
        params = self.config.parameters

        # If specific board IDs are provided, use those
        if "board_ids" in params and params["board_ids"]:
            board_ids = params["board_ids"]

            # We need to verify these are scrum boards
            # For now, we'll trust the user, but in production you'd validate
            target_boards = []
            for board_id in board_ids:
                # Create minimal board dict - in production, you'd fetch from DB or Jira
                target_boards.append(
                    {
                        "id": board_id,
                        "name": f"Board {board_id}",  # Placeholder
                        "type": "scrum",  # Assuming provided boards are scrum
                    }
                )

            return target_boards

        # Otherwise, get all boards and filter for scrum boards
        try:
            if self.oauth_client:
                # Use OAuth client to fetch boards
                boards_data = self._fetch_boards_oauth()
                # Filter for scrum boards only
                scrum_boards = [
                    board
                    for board in boards_data
                    if board.get("type", "").lower() == "scrum"
                ]
            else:
                # Use traditional Jira service
                jira_boards = self.jira_service.fetch_all_boards()
                boards_data = self.jira_service.transform_board_data(jira_boards)
                # Filter for scrum boards only
                scrum_boards = self.jira_service.filter_scrum_boards(boards_data)

            # Apply additional filters if specified
            if "project_keys" in params and params["project_keys"]:
                project_keys = [key.upper() for key in params["project_keys"]]
                scrum_boards = [
                    board
                    for board in scrum_boards
                    if board.get("project_key", "").upper() in project_keys
                ]

            # Apply max_boards limit if specified
            if "max_boards" in params and params["max_boards"]:
                max_boards = params["max_boards"]
                scrum_boards = scrum_boards[:max_boards]

            return scrum_boards

        except Exception as e:
            print(f"❌ Error getting target boards: {e}")
            return []

    def _transform_sprint_data_from_json(
        self, sprint_json: Dict[str, Any], board_id: int
    ) -> Optional[Dict[str, Any]]:
        """
        Transform sprint JSON data from OAuth API to database format.

        Args:
            sprint_json: Sprint data from OAuth API
            board_id: Board ID this sprint belongs to

        Returns:
            Transformed sprint data dictionary or None if transformation fails
        """
        try:
            # Parse dates if present
            start_date = None
            end_date = None
            complete_date = None

            if sprint_json.get("startDate"):
                start_date = sprint_json["startDate"]
            if sprint_json.get("endDate"):
                end_date = sprint_json["endDate"]
            if sprint_json.get("completeDate"):
                complete_date = sprint_json["completeDate"]

            # Try to get board_id from sprint data if not provided
            if board_id == 0:
                board_id = sprint_json.get("originBoardId", 0)

            return {
                "id": int(sprint_json["id"]),
                "name": sprint_json.get("name", ""),
                "state": sprint_json.get("state", "").upper(),
                "board_id": board_id,
                "start_date": start_date,
                "end_date": end_date,
                "complete_date": complete_date,
                "goal": sprint_json.get("goal", ""),
                "raw_data": sprint_json,
            }
        except Exception as e:
            print(f"⚠️  Error transforming sprint data from JSON: {e}")
            return None

    def _fetch_boards_oauth(self) -> List[Dict[str, Any]]:
        """
        Fetch boards using OAuth client.

        Returns:
            List of board dictionaries
        """
        all_boards = []
        start_at = 0
        max_results = 50

        try:
            while True:
                response = self.oauth_client.get_boards(
                    start_at=start_at, max_results=max_results
                )
                boards = response.get("values", [])

                if not boards:
                    break

                # Transform board data to match expected format
                for board in boards:
                    board_data = {
                        "id": board.get("id"),
                        "name": board.get("name", ""),
                        "type": board.get("type", "").lower(),
                        "project_key": (
                            board.get("location", {}).get("projectKey", "")
                            if board.get("location")
                            else ""
                        ),
                    }
                    all_boards.append(board_data)

                if len(boards) < max_results:
                    break

                start_at += max_results

        except Exception as e:
            print(f"❌ Error fetching boards via OAuth: {e}")
            raise

        return all_boards

    def _get_sprint_states(self) -> List[str]:
        """
        Get the list of sprint states to fetch.

        Returns:
            List of sprint states
        """
        params = self.config.parameters

        if "sprint_states" in params and params["sprint_states"]:
            return [state.lower() for state in params["sprint_states"]]

        # Default to active sprints only
        return ["active"]

    def _fetch_sprints_by_ids(
        self, sprint_ids: List[Union[int, str]]
    ) -> List[Dict[str, Any]]:
        """
        Fetch specific sprints by their IDs using batch processing.

        Args:
            sprint_ids: List of sprint IDs to fetch (can be int or str)

        Returns:
            List of sprint dictionaries
        """
        if not sprint_ids:
            return []

        self._update_progress(
            40, 100, f"Fetching {len(sprint_ids)} specific sprints..."
        )

        all_sprints = []
        batch_size = 10  # Process sprints in batches to avoid overwhelming the API

        try:
            if self.oauth_client:
                # Use OAuth client to fetch sprints by ID
                for i in range(0, len(sprint_ids), batch_size):
                    batch = sprint_ids[i:i + batch_size]
                    batch_start = i + 1
                    batch_end = min(i + batch_size, len(sprint_ids))
                    
                    self._update_progress(
                        40 + (i * 40 // len(sprint_ids)), 
                        100, 
                        f"Processing sprint batch {batch_start}-{batch_end} of {len(sprint_ids)} (OAuth)"
                    )
                    
                    # Fetch each sprint in the batch using OAuth
                    for sprint_id in batch:
                        try:
                            # Fetch individual sprint via OAuth
                            sprint_json = self.oauth_client.get_sprint(sprint_id)
                            
                            # Transform sprint data - determine board_id from sprint data
                            board_id = sprint_json.get('originBoardId', 0)
                            if not board_id:
                                print(f"⚠️  Could not determine board_id for sprint {sprint_id}, using placeholder")
                                board_id = 0  # Placeholder board_id
                            
                            sprint_data = self._transform_sprint_data_from_json(sprint_json, board_id)
                            if sprint_data:
                                all_sprints.append(sprint_data)
                                print(f"   ✅ Fetched sprint {sprint_id}: {sprint_json.get('name', 'Unknown')} (state: {sprint_json.get('state', 'unknown')})")
                            
                        except Exception as e:
                            print(f"⚠️  Error fetching sprint {sprint_id} via OAuth: {e}")
                            # Continue with other sprints instead of failing the entire batch
                            continue
                    
                    # Small delay between batches to be respectful to the API
                    import time
                    time.sleep(0.1)
            else:
                # Get the traditional Jira client
                jira_client = self.jira_service.jira_client.get_client()
                if not jira_client:
                    raise RuntimeError("Jira client not available")

                # Process sprints in batches
                for i in range(0, len(sprint_ids), batch_size):
                    batch = sprint_ids[i : i + batch_size]
                    batch_start = i + 1
                    batch_end = min(i + batch_size, len(sprint_ids))

                    self._update_progress(
                        40 + (i * 40 // len(sprint_ids)),
                        100,
                        f"Processing sprint batch {batch_start}-{batch_end} of {len(sprint_ids)}",
                    )

                    # Fetch each sprint in the batch
                    for sprint_id in batch:
                        try:
                            # Fetch individual sprint
                            sprint = jira_client.sprint(sprint_id)

                            # Transform sprint data - we need to determine the board_id
                            # For sprint-centric sync, we'll use the board_id from the sprint object
                            board_id = getattr(
                                sprint, "originBoardId", None
                            ) or getattr(sprint, "boardId", None)
                            if not board_id:
                                # If we can't get board_id from sprint, we'll use a placeholder
                                # This shouldn't happen in normal cases, but we handle it gracefully
                                print(
                                    f"⚠️  Could not determine board_id for sprint {sprint_id}, using placeholder"
                                )
                                board_id = 0  # Placeholder board_id

                            sprint_data = self.jira_service._transform_sprint_data(
                                sprint, board_id
                            )
                            all_sprints.append(sprint_data)

                            print(
                                f"   ✅ Fetched sprint {sprint_id}: {sprint.name} (state: {getattr(sprint, 'state', 'unknown')})"
                            )

                        except Exception as e:
                            print(f"⚠️  Error fetching sprint {sprint_id}: {e}")
                            # Continue with other sprints instead of failing the entire batch
                            continue

                    # Small delay between batches to be respectful to the API
                    import time

                    time.sleep(0.1)

            print(
                f"   ✅ Successfully fetched {len(all_sprints)} out of {len(sprint_ids)} requested sprints"
            )

        except Exception as e:
            print(f"❌ Error during batch sprint fetching: {e}")
            raise

        return all_sprints

    def execute(self) -> JobResult:
        """
        Execute the sprint synchronization job.

        Returns:
            JobResult with execution metrics and outcomes
        """
        result = JobResult(
            success=True, message="Sprint sync completed successfully", data={}
        )

        start_time = time.time()

        try:
            # Step 1: Initialize services
            self._update_progress(0, 100, "Initializing services...")
            if not self._initialize_services():
                result.add_error("Failed to initialize required services")
                return result

            params = self.config.parameters

            # Step 2: Determine sync mode - sprint-centric or board-centric
            if "sprint_ids" in params and params["sprint_ids"]:
                # Sprint-centric mode: sync specific sprint IDs
                sprint_ids = params["sprint_ids"]
                self._update_progress(
                    20,
                    100,
                    f"Sprint-centric mode: syncing {len(sprint_ids)} specific sprints...",
                )

                all_sprints = self._fetch_sprints_by_ids(sprint_ids)

                result.data["sync_mode"] = "sprint_centric"
                result.data["requested_sprint_ids"] = sprint_ids
                result.data["sprints_fetched"] = len(all_sprints)
                result.records_processed = len(all_sprints)
                
                self.sprint_repo.update_sprints_last_synced_at(sprint_ids)

            # Disabling the following for now because we want this behaviour instead
            # TODO: Create an independent job for updating last_synced_at timestamp for sprint
            # else:
            #     # Board-centric mode: sync sprints from boards (existing logic)
            #     self._update_progress(
            #         20, 100, "Board-centric mode: identifying target scrum boards..."
            #     )
            #     target_boards = self._get_target_boards()

            #     if not target_boards:
            #         result.add_warning("No scrum boards found to sync sprints for")
            #         result.data["boards_processed"] = 0
            #         result.data["sprints_fetched"] = 0
            #         return result

            #     result.data["sync_mode"] = "board_centric"
            #     result.data["scrum_boards_found"] = len(target_boards)

            #     # Step 3: Get sprint states to fetch
            #     sprint_states = self._get_sprint_states()
            #     result.data["sprint_states"] = sprint_states

            #     # Step 4: Fetch sprints for each board
            #     self._update_progress(
            #         40,
            #         100,
            #         f"Fetching sprints from {len(target_boards)} scrum boards...",
            #     )

            #     all_sprints = []
            #     boards_with_sprints = 0
            #     boards_processed = 0

            #     for i, board in enumerate(target_boards):
            #         board_id = board["id"]
            #         board_name = board.get("name", f"Board {board_id}")

            #         try:
            #             self._update_progress(
            #                 40 + (i * 40 // len(target_boards)),
            #                 100,
            #                 f"Processing board: {board_name}",
            #             )

            #             # Fetch sprints for this board in all requested states
            #             board_sprints = []
            #             for state in sprint_states:
            #                 try:
            #                     if self.oauth_client:
            #                         # Use OAuth client to fetch sprints
            #                         response = self.oauth_client.get_sprints(
            #                             board_id, state=state
            #                         )
            #                         sprints_data = response.get("values", [])
            #                         for sprint_json in sprints_data:
            #                             sprint_data = (
            #                                 self._transform_sprint_data_from_json(
            #                                     sprint_json, board_id
            #                                 )
            #                             )
            #                             if sprint_data:
            #                                 board_sprints.append(sprint_data)
            #                     else:
            #                         # Use traditional Jira client
            #                         jira_client = (
            #                             self.jira_service.jira_client.get_client()
            #                         )
            #                         sprints = jira_client.sprints(board_id, state=state)
            #                         for sprint in sprints:
            #                             sprint_data = (
            #                                 self.jira_service._transform_sprint_data(
            #                                     sprint, board_id
            #                                 )
            #                             )
            #                             board_sprints.append(sprint_data)
            #                 except Exception as e:
            #                     result.add_warning(
            #                         f"Error fetching {state} sprints for board {board_id}: {str(e)}"
            #                     )

            #             if board_sprints:
            #                 all_sprints.extend(board_sprints)
            #                 boards_with_sprints += 1

            #             boards_processed += 1

            #         except Exception as e:
            #             result.add_warning(
            #                 f"Error processing board {board_id}: {str(e)}"
            #             )
            #             continue

            #     result.data["boards_processed"] = boards_processed
            #     result.data["boards_with_sprints"] = boards_with_sprints
            #     result.data["sprints_fetched"] = len(all_sprints)
            #     result.records_processed = len(all_sprints)

            # Step 5: Store sprints in database
            # if all_sprints:
            #     self._update_progress(80, 100, "Storing sprints in database...")
            #     if self.sprint_repo.upsert_sprints(all_sprints):
            #         # Get final metrics
            #         total_sprints_in_db = self.sprint_repo.get_sprint_count()
            #         sprint_summary = self.sprint_repo.get_sprint_summary()

            #         result.data["total_sprints_in_db"] = total_sprints_in_db
            #         result.data["sprint_summary_by_state"] = sprint_summary
            #         result.records_created = len(all_sprints)  # Approximation
            #     else:
            #         result.add_error("Failed to store sprints in database")
            #         return result
            # else:
            #     result.add_warning("No sprints found to store")

            # Step 6: Complete
            self._update_progress(100, 100, "Sprint sync completed")

            # Set final result data based on sync mode
            if result.data.get("sync_mode") == "sprint_centric":
                result.data.update(
                    {
                        "execution_summary": {
                            "sync_mode": "sprint_centric",
                            "requested_sprint_ids": result.data.get(
                                "requested_sprint_ids", []
                            ),
                            "sprints_fetched": result.data.get("sprints_fetched", 0),
                            "sprints_stored": result.records_created,
                            "total_sprints_in_database": result.data.get(
                                "total_sprints_in_db", 0
                            ),
                        }
                    }
                )

                result.message = f"Successfully synced {result.records_processed} specific sprints by ID"

            else:
                # Board-centric mode summary
                result.data.update(
                    {
                        "execution_summary": {
                            "sync_mode": "board_centric",
                            "scrum_boards_found": result.data.get(
                                "scrum_boards_found", 0
                            ),
                            "boards_processed": result.data.get("boards_processed", 0),
                            "boards_with_sprints": result.data.get(
                                "boards_with_sprints", 0
                            ),
                            "sprints_fetched": result.data.get("sprints_fetched", 0),
                            "sprints_stored": result.records_created,
                            "total_sprints_in_database": result.data.get(
                                "total_sprints_in_db", 0
                            ),
                            "sprint_states_processed": result.data.get(
                                "sprint_states", []
                            ),
                        }
                    }
                )

                boards_with_sprints = result.data.get("boards_with_sprints", 0)
                result.message = f"Successfully synced {result.records_processed} sprints from {boards_with_sprints} scrum boards"

        except Exception as e:
            result.add_error(f"Sprint sync execution failed: {str(e)}")

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
            "board_ids": {
                "type": "list[int]",
                "description": "List of specific board IDs to sync sprints for",
                "example": [123, 456, 789],
                "required": False,
            },
            "sprint_ids": {
                "type": "list[int|str]",
                "description": "List of specific sprint IDs to sync directly",
                "example": [100, "200", 300],
                "required": False,
            },
            "sprint_states": {
                "type": "list[str]",
                "description": "List of sprint states to include",
                "example": ["active", "closed"],
                "valid_values": ["active", "closed", "future"],
                "default": ["active"],
                "required": False,
            },
            "project_keys": {
                "type": "list[str]",
                "description": "List of project keys to filter boards",
                "example": ["PROJ1", "PROJ2"],
                "required": False,
            },
            "max_boards": {
                "type": "int",
                "description": "Maximum number of boards to process (for testing)",
                "example": 10,
                "required": False,
            },
        }