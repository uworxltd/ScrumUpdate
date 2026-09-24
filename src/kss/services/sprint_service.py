##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Sprint service for Jira sprint operations.
Handles all sprint-related API interactions and data transformation.
"""

from typing import List, Dict, Any, Optional
from .base_jira_service import BaseJiraService


class SprintService(BaseJiraService):
    """
    Service for Jira sprint operations.
    Handles fetching and transforming sprint data.
    """
    
    def get_all_boards(self) -> List[Dict[str, Any]]:
        self._ensure_connected()
        
        all_boards = []
        
        try:
            start_at = 0
            max_results = self.pagination_size
            
            while True:
                response = self.oauth_client.get_boards(start_at, max_results)
                
                boards = response.get('values', [])
                if not boards:
                    break
                
                all_boards.extend(boards)
                
                if len(boards) < max_results:
                    break
                
                start_at += max_results
        
        except Exception as e:
            self._log_error(f"Error fetching boards for proactive sprints sync job via OAuth", e)
            raise
        
        return all_boards
    
    def get_all_sprints_against_board(self, board_id: int, states: List[str] = None) -> List[Dict[str, Any]]:
        """
        Fetch all sprints for a specific board using the OauthClient.

        Args:
            board_id: The board ID to fetch sprints for
            states: Optional states filter for sprints (e.g., 'active', 'closed', 'future') defaults to active if not provided

        Returns:
            List of sprint dictionaries
        """
        self._log_progress(f"Fetching all sprints for board {board_id}")
        
        all_sprints = []
        
        try:
            start_at = 0
            max_results = self.pagination_size
            
            while True:
                
                if states is None:
                    states = ['active']
                    
                response = self.oauth_client.get_sprints_filter_by_state(board_id=board_id, states=states, start_at=start_at, max_results=max_results)
                
                sprints = response.get('values', [])
                if not sprints:
                    break
                
                for sprint_json in sprints:
                    sprint_data = self._transform_sprint_data_from_json(sprint_json, board_id)
                    if sprint_data:
                        all_sprints.append(sprint_data)
                        print(f"   ✅ Fetched sprint {sprint_json.get('id')}: {sprint_json.get('name', 'Unknown')} (state: {sprint_json.get('state', 'unknown')})")
                
                if len(sprints) < max_results:
                    break
                
                start_at += max_results
            
            self._log_success(f"Found {len(all_sprints)} total sprints for board {board_id}")
               
        except Exception as e:
            self._log_error(f"Error fetching sprints for board {board_id}", e)
        return all_sprints
    
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