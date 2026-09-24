##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Worklog service for Jira worklog operations.
Handles all worklog-related API interactions and data transformation.
"""

from typing import List, Dict, Any, Optional
from .base_jira_service import BaseJiraService


class WorklogService(BaseJiraService):
    """
    Service for Jira worklog operations.
    Handles fetching and transforming worklog data.
    """

    def fetch_worklogs_for_issues(self, issue_keys: List[str]) -> List[Dict[str, Any]]:
        """
        Fetch worklogs for multiple issues with optimized batch processing.

        Args:
            issue_keys: List of issue keys to fetch worklogs for

        Returns:
            List of worklog dictionaries ready for database storage
        """
        self._ensure_connected()

        self._log_progress(f"Fetching worklogs for {len(issue_keys)} issues")
        all_worklogs = []

        for issue_key in issue_keys:
            try:
                # Fetch worklogs for individual issue
                issue_worklogs = self._fetch_worklogs_for_single_issue(issue_key)
                all_worklogs.extend(issue_worklogs)

            except Exception as e:
                self._log_error(f"Error fetching worklogs for issue {issue_key}", e)
                # Continue with other issues instead of failing completely
                continue

        self._log_success("Total worklogs fetched", len(all_worklogs))
        return all_worklogs

    def _fetch_worklogs_for_single_issue(self, issue_key: str) -> List[Dict[str, Any]]:
        """
        Fetch worklogs for a single issue.

        Args:
            issue_key: Issue key to fetch worklogs for

        Returns:
            List of worklog dictionaries for the issue
        """
        worklogs = []

        try:
            if self.oauth_client:
                # Use OAuth client
                response = self.oauth_client.get_worklogs(issue_key)
                jira_worklogs = response.get("worklogs", [])

                # Transform JSON worklogs
                for worklog_json in jira_worklogs:
                    worklog_data = self._transform_worklog_data_from_json(
                        worklog_json, issue_key
                    )
                    if worklog_data:
                        worklogs.append(worklog_data)
            else:
                # Use traditional client
                jira_worklogs = self.jira_client.worklogs(issue_key)

                # Transform object worklogs
                for worklog in jira_worklogs:
                    worklog_data = self._transform_worklog_data(worklog, issue_key)
                    worklogs.append(worklog_data)

        except Exception as e:
            self._log_error(f"Error fetching worklogs for {issue_key}", e)

        return worklogs

    def _transform_worklog_data(self, worklog: Any, issue_key: str) -> Dict[str, Any]:
        """
        Transform Jira worklog object into database-ready dictionary.

        Args:
            worklog: Jira worklog object
            issue_key: Issue key the worklog belongs to

        Returns:
            Worklog dictionary ready for database storage
        """
        # Get author information
        author_display_name = None
        if hasattr(worklog, "author") and worklog.author:
            author_display_name = getattr(worklog.author, "displayName", None)

        # Get update author information (who last updated the worklog)
        update_author_display_name = None
        if hasattr(worklog, "updateAuthor") and worklog.updateAuthor:
            update_author_display_name = getattr(
                worklog.updateAuthor, "displayName", None
            )

        # Parse dates
        created_date = self._parse_jira_date(getattr(worklog, "created", None))
        updated_date = self._parse_jira_date(getattr(worklog, "updated", None))
        started_date = self._parse_jira_date(getattr(worklog, "started", None))

        # Get time spent in seconds
        time_spent_seconds = getattr(worklog, "timeSpentSeconds", 0)

        # Get comment/description
        comment = self._extract_comment_text(getattr(worklog, "comment", None))

        return {
            "worklog_id": worklog.id,
            "issue_key": issue_key,
            "author_display_name": author_display_name,
            "author_account_id": (
                getattr(worklog.author, "accountId", None)
                if hasattr(worklog, "author") and worklog.author
                else None
            ),
            "update_author_display_name": update_author_display_name,
            "update_author_account_id": (
                getattr(worklog.updateAuthor, "accountId", None)
                if hasattr(worklog, "updateAuthor") and worklog.updateAuthor
                else None
            ),
            "time_spent_seconds": time_spent_seconds,
            "comment": comment,
            "created_date": created_date,
            "updated_date": updated_date,
            "started_date": started_date,
        }

    def _transform_worklog_data_from_json(
        self, worklog_json: Dict[str, Any], issue_key: str
    ) -> Dict[str, Any]:
        """
        Transform worklog JSON data from OAuth API to database format.

        Args:
            worklog_json: Worklog data from OAuth API
            issue_key: Issue key the worklog belongs to

        Returns:
            Worklog dictionary ready for database storage
        """
        try:
            # Get author information from JSON
            author_info = worklog_json.get("author", {})
            update_author_info = worklog_json.get("updateAuthor", {})

            return {
                "worklog_id": worklog_json.get("id"),
                "issue_key": issue_key,
                "author_display_name": author_info.get("displayName"),
                "author_account_id": author_info.get("accountId"),
                "update_author_display_name": update_author_info.get("displayName"),
                "update_author_account_id": update_author_info.get("accountId"),
                "time_spent_seconds": worklog_json.get("timeSpentSeconds", 0),
                "comment": self._extract_comment_text(worklog_json.get("comment")),
                "created_date": self._parse_jira_date(worklog_json.get("created")),
                "updated_date": self._parse_jira_date(worklog_json.get("updated")),
                "started_date": self._parse_jira_date(worklog_json.get("started")),
            }
        except Exception as e:
            self._log_error(f"Error transforming worklog JSON for {issue_key}", e)
            return None

    def _extract_comment_text(self, comment_data: Any) -> Optional[str]:
        """
        Extract plain text from comment data, handling both string and object formats.
        
        Args:
            comment_data: Comment data from Jira API (could be string, dict, or None)
            
        Returns:
            Plain text comment or None
        """
        if not comment_data:
            return None
            
        # If it's already a string, return it
        if isinstance(comment_data, str):
            return comment_data
            
        # If it's a dict (structured comment), try to extract text
        if isinstance(comment_data, dict):
            # Try common text fields in Jira comment objects
            if "text" in comment_data:
                return comment_data["text"]
            elif "content" in comment_data:
                # Handle Atlassian Document Format (ADF)
                return self._extract_text_from_adf(comment_data["content"])
            elif "body" in comment_data:
                return comment_data["body"]
                
        # If we can't extract text, convert to string as fallback
        try:
            return str(comment_data)
        except Exception:
            return None
            
    def _extract_text_from_adf(self, content: Any) -> Optional[str]:
        """
        Extract plain text from Atlassian Document Format (ADF) content.
        
        Args:
            content: ADF content structure
            
        Returns:
            Plain text extracted from ADF
        """
        if not content:
            return None
            
        try:
            # Simple text extraction from ADF - this is a basic implementation
            # ADF is complex, but for worklogs we usually just need the text content
            if isinstance(content, list):
                text_parts = []
                for item in content:
                    if isinstance(item, dict):
                        if item.get("type") == "paragraph" and "content" in item:
                            for text_node in item["content"]:
                                if text_node.get("type") == "text" and "text" in text_node:
                                    text_parts.append(text_node["text"])
                return " ".join(text_parts) if text_parts else None
            elif isinstance(content, dict):
                if content.get("type") == "text" and "text" in content:
                    return content["text"]
                    
        except Exception as e:
            self._log_error("Error extracting text from ADF content", e)
            
        return None