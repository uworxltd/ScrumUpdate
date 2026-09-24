##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Jira service module - Refactored.
Main orchestrator for all Jira API interactions using focused service modules.
Implements the Service Layer pattern with clean separation of concerns.
"""

from typing import List, Dict, Any, Optional
from services import (
    BoardService,
    SprintService,
    IssueService,
    WorklogService,
    CommentService,
    JiraClient,
)
from models import JiraCredentials


class JiraService:
    """
    Main Jira service orchestrator.
    Delegates operations to specialized service modules while maintaining the same public API.
    """

    def __init__(self, jira_credentials: Optional[JiraCredentials] = None):
        """
        Initialize JiraService with optional credentials.
        
        Args:
            jira_credentials: Optional Jira credentials for multi-tenant usage.
                            If None, uses config credentials.
        """
        # Store credentials for use in connections
        self.jira_credentials = jira_credentials
        
        # Initialize specialized services with credentials
        self.board_service = BoardService(jira_credentials)
        self.sprint_service = SprintService(jira_credentials)
        self.issue_service = IssueService(jira_credentials)
        self.worklog_service = WorklogService(jira_credentials)
        self.comment_service = CommentService(jira_credentials)
        self.jira_client = JiraClient()

    def connect(self) -> bool:
        """
        Establish connection to Jira for all services.

        Returns:
            bool: True if connection successful, False otherwise
        """
        # Test connection first using provided credentials or config
        if not self.jira_client.test_connection(self.jira_credentials):
            return False

        # Connect all services
        services = [
            self.board_service,
            self.sprint_service,
            self.issue_service,
            self.worklog_service,
            self.comment_service,
        ]

        for service in services:
            if not service.connect():
                return False

        return True

    # Board operations
    def fetch_all_boards(self) -> List[Any]:
        """Fetch all boards from Jira with pagination."""
        return self.board_service.fetch_all_boards()

    def transform_board_data(self, jira_boards: List[Any]) -> List[Dict[str, Any]]:
        """Transform Jira board objects into database-ready dictionaries."""
        return self.board_service.transform_board_data(jira_boards)

    def filter_scrum_boards(self, boards_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Filter boards to only include scrum boards."""
        return self.board_service.filter_scrum_boards(boards_data)

    # def get_board_by_id(self, board_id: int):
    #     """Fetch a specific board by ID."""
    #     return self.board_service.get_board_by_id(board_id)

    # Sprint operations
    # def fetch_active_sprints_for_boards(self, board_ids: List[int]) -> List[Dict[str, Any]]:
    #     """Fetch active sprints for multiple scrum boards."""
    #     return self.sprint_service.fetch_active_sprints_for_boards(board_ids)

    # def fetch_all_sprints_for_board(self, board_id: int) -> List[Dict[str, Any]]:
    #     """Fetch all sprints for a specific board."""
    #     return self.sprint_service.fetch_all_sprints_for_board(board_id)

    # Issue operations
    # def fetch_issues_for_sprint(self, sprint_id: int) -> List[Dict[str, Any]]:
    #     """Fetch all issues for a specific sprint."""
    #     return self.issue_service.fetch_issues_for_sprint(sprint_id)

    # def fetch_issues_with_comments(self, sprint_id: int, include_comments: bool = True) -> List[Dict[str, Any]]:
    #     """Fetch issues for a sprint with their comments using optimized API calls."""
    #     return self.issue_service.fetch_issues_with_comments(sprint_id, include_comments)

    def fetch_sprint_issues_with_relationships(
        self, sprint_id: int, include_comments: bool = False, include_changelog: bool = False, include_subtasks: bool = True
    ) -> Dict[str, Any]:
        """Fetch issues for a sprint with optional comments, changelog, and subtasks."""
        return self.issue_service.fetch_sprint_issues_with_relationships(
            sprint_id, include_comments, include_changelog, include_subtasks
        )

    # Worklog operations
    def fetch_worklogs_for_issues(self, issue_keys: List[str]) -> List[Dict[str, Any]]:
        """Fetch worklogs for multiple issues with optimized batch processing."""
        return self.worklog_service.fetch_worklogs_for_issues(issue_keys)

    # Comment operations (for standalone use)
    # def fetch_comments_for_issue(self, issue_key: str) -> List[Dict[str, Any]]:
    #     """Fetch comments for a specific issue."""
    #     return self.comment_service.fetch_comments_for_issue(issue_key)

    # Utility methods (delegated to base service)
    # def _parse_jira_date(self, date_str):
    #     """Parse Jira date string into PostgreSQL-compatible format."""
    #     return self.board_service._parse_jira_date(date_str)

    # Backward compatibility methods
    def _transform_sprint_data(self, sprint: Any, board_id: int) -> Dict[str, Any]:
        """Transform a Jira sprint object into a database-ready dictionary."""
        return self.sprint_service._transform_sprint_data(sprint, board_id)

    # def _transform_issue_data(self, issue: Any, sprint_id: int) -> Dict[str, Any]:
    #     """Transform a Jira issue object into a database-ready dictionary."""
    #     return self.issue_service._transform_issue_data(issue, sprint_id)

    def _transform_worklog_data(self, worklog: Any, issue_key: str) -> Dict[str, Any]:
        """Transform Jira worklog object into database-ready dictionary."""
        return self.worklog_service._transform_worklog_data(worklog, issue_key)

    # def _transform_comment_data(self, comment: Any, issue_key: str) -> Dict[str, Any]:
    #     """Transform Jira comment object into database-ready dictionary."""
    #     return self.comment_service._transform_comment_data(comment, issue_key)

    # def _extract_comments_from_issue(self, issue: Any) -> List[Dict[str, Any]]:
    #     """Extract and transform comments from a Jira issue object."""
    #     return self.issue_service._extract_comments_from_issue(issue)

    # def _fetch_subtasks_for_issues(self, parent_issues: List[Dict[str, Any]], sprint_id: int):
    #     """Fetch subtasks for a list of parent issues."""
    #     return self.issue_service._fetch_subtasks_for_issues(parent_issues, sprint_id)

    # def _extract_relationships_from_issues(self, issues: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    #     """Extract relationship information from issue data."""
    #     return self.issue_service._extract_relationships_from_issues(issues)    
# def _extract_changelog_from_issue(self, issue: Any) -> List[Dict[str, Any]]:
#         """Extract and transform changelog from a Jira issue object."""
#         return self.issue_service._extract_changelog_from_issue(issue)