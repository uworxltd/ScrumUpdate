##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Board service for Jira board operations.
Handles all board-related API interactions and data transformation.
"""

from typing import List, Dict, Any, Optional, Tuple
from .base_jira_service import BaseJiraService


class BoardService(BaseJiraService):
    """
    Service for Jira board operations.
    Handles fetching, filtering, and transforming board data.
    """

    def fetch_all_boards(self) -> List[Any]:
        """
        Fetch all boards from Jira with pagination.
        Handles pagination automatically to retrieve complete dataset.

        Returns:
            List of Jira board objects
        """
        self._ensure_connected()

        self._log_progress("Fetching boards from Jira")
        all_boards = []
        start_at = 0

        while True:
            self._log_progress(f"Fetching page starting at {start_at}")

            try:
                # Fetch boards with pagination parameters
                boards_page = self.jira_client.boards(
                    startAt=start_at, maxResults=self.pagination_size
                )

                if not boards_page:
                    break

                all_boards.extend(boards_page)

                # Check if we got fewer results than requested (last page)
                if len(boards_page) < self.pagination_size:
                    break

                start_at += self.pagination_size

            except Exception as e:
                self._log_error(f"Error fetching boards page at {start_at}", e)
                break

        self._log_success("Total boards fetched", len(all_boards))
        return all_boards

    def transform_board_data(self, jira_boards: List[Any]) -> List[Dict[str, Any]]:
        """
        Transform Jira board objects into database-ready dictionaries.
        Handles data extraction and normalization.

        Args:
            jira_boards: List of Jira board objects

        Returns:
            List of board dictionaries ready for database storage
        """
        boards_data = []

        for board in jira_boards:
            # Extract project information safely
            project_key, project_name = self._extract_project_info(board)

            board_type = getattr(board, "type", "unknown")

            board_data = {
                "id": board.id,
                "name": board.name,
                "type": board_type,
                "project_key": project_key,
                "project_name": project_name,
            }

            boards_data.append(board_data)

            # Show board type in output for better visibility
            type_indicator = "🏃" if board_type.lower() == "scrum" else "📋"
            self._log_progress(f"{type_indicator} {board.name} (ID: {board.id}, Type: {board_type})")

        return boards_data

    def filter_scrum_boards(self, boards_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filter boards to only include scrum boards.
        Only scrum boards have sprints, so this optimizes sprint fetching.

        Args:
            boards_data: List of all board dictionaries

        Returns:
            List of scrum board dictionaries only
        """
        scrum_boards = [
            board for board in boards_data if board["type"].lower() == "scrum"
        ]

        total_boards = len(boards_data)
        scrum_count = len(scrum_boards)
        kanban_count = total_boards - scrum_count

        self._log_progress("Board type breakdown:")
        self._log_progress(f"   🏃 Scrum boards: {scrum_count}")
        self._log_progress(f"   📋 Kanban/Other boards: {kanban_count}")
        self._log_progress(f"   📈 Will fetch sprints for {scrum_count} scrum boards only")

        return scrum_boards

    def get_board_by_id(self, board_id: int) -> Optional[Any]:
        """
        Fetch a specific board by ID.

        Args:
            board_id: The Jira board ID

        Returns:
            Jira board object or None if not found
        """
        self._ensure_connected()

        try:
            return self.jira_client.board(board_id)
        except Exception as e:
            self._log_error(f"Error fetching board {board_id}", e)
            return None

    def _extract_project_info(self, board: Any) -> Tuple[Optional[str], Optional[str]]:
        """
        Safely extract project information from a Jira board object.

        Args:
            board: Jira board object

        Returns:
            tuple: (project_key, project_name) or (None, None) if not available
        """
        try:
            if hasattr(board, "location") and board.location:
                project_key = getattr(board.location, "projectKey", None)
                project_name = getattr(board.location, "displayName", None)
                return project_key, project_name
        except Exception:
            # Silently handle any attribute access errors
            pass

        return None, None