##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Comment service for Jira comment operations.
Handles all comment-related API interactions and data transformation.
"""

from typing import List, Dict, Any
from .base_jira_service import BaseJiraService


class CommentService(BaseJiraService):
    """
    Service for Jira comment operations.
    Handles fetching and transforming comment data.
    Note: Comments are typically fetched as part of issue expansion for efficiency.
    """

    def fetch_comments_for_issue(self, issue_key: str) -> List[Dict[str, Any]]:
        """
        Fetch comments for a specific issue.
        Note: This is less efficient than using issue expansion.

        Args:
            issue_key: Issue key to fetch comments for

        Returns:
            List of comment dictionaries ready for database storage
        """
        self._ensure_connected()

        self._log_progress(f"Fetching comments for issue {issue_key}")
        comments_data = []

        try:
            # Fetch the issue with expanded comments
            issue = self.jira_client.issue(issue_key, expand="comments")
            
            if hasattr(issue.fields, "comment") and issue.fields.comment:
                comments = issue.fields.comment.comments
                
                for comment in comments:
                    comment_data = self._transform_comment_data(comment, issue_key)
                    comments_data.append(comment_data)

            self._log_success(f"Found {len(comments_data)} comments for issue {issue_key}")

        except Exception as e:
            self._log_error(f"Error fetching comments for issue {issue_key}", e)

        return comments_data

    def _transform_comment_data(self, comment: Any, issue_key: str) -> Dict[str, Any]:
        """
        Transform Jira comment object into database-ready dictionary.

        Args:
            comment: Jira comment object
            issue_key: Issue key the comment belongs to

        Returns:
            Comment dictionary ready for database storage
        """
        # Get author information
        author_display_name = None

        if hasattr(comment, "author") and comment.author:
            author_display_name = getattr(comment.author, "displayName", None)

        # Parse dates
        created_date = self._parse_jira_date(getattr(comment, "created", None))
        updated_date = self._parse_jira_date(getattr(comment, "updated", None))

        # Get comment body/text
        comment_body = getattr(comment, "body", None)

        return {
            "comment_id": comment.id,
            "issue_key": issue_key,
            "author_display_name": author_display_name,
            "comment_body": comment_body,
            "created_date": created_date,
            "updated_date": updated_date,
        }