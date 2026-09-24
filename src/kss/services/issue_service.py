##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Issue service for Jira issue operations.
Handles all issue-related API interactions and data transformation.
"""

from typing import List, Dict, Any, Optional
from .base_jira_service import BaseJiraService
from jobs.utils.issue_transformer_util import IssueTransformerUtil
from repositories.issue_repository import IssueRepository

class IssueService(BaseJiraService):
    """
    Service for Jira issue operations.
    Handles fetching, transforming, and processing issue data with relationships.
    """

    # TODO: Use this method instead of the below one
    def fetch_issues_untransformed_jql(
        self,
        jql
    ) -> List[Dict[str, Any]]:
        """
        Search & Fetch issues via the jql search and bulkfetch endpoints
        
        Args:
            jql: JQL query string to search for issues
            
        Returns:
            A list of accumulated issues
        """
        all_issue_ids = []
        issues = []
        
        try:
            # Step 1: Fetch all issue IDs using pagination
            self._log_progress(f"Fetching issue IDs for JQL: {jql}")
            next_page_token = None
            while True:
                response = self.oauth_client.search_issue_ids(
                    jql=jql, nextPageToken=next_page_token
                )
                
                issue_ids = [issue['id'] for issue in response.get('issues', [])]
                all_issue_ids.extend(issue_ids)
                
                self._log_success(f"Fetched {len(issue_ids)} issue IDs. Total IDs: {len(all_issue_ids)}")

                next_page_token = response.get('nextPageToken')
                if not next_page_token:
                    break
                
            # Step 2: Fetch issue details in batches
            self._log_progress(f"Total issue IDs fetched: {len(all_issue_ids)}. Now fetching details in chunks.")
            chunk_size = 100
            for i in range(0, len(all_issue_ids), chunk_size):
                chunk_ids = all_issue_ids[i:i + chunk_size]
                self._log_progress(f"Fetching details for issue chunk {i // chunk_size + 1} ({len(chunk_ids)} issues).")
                
                # Using *navigable to get all fields the user can see.
                fields_param = "*navigable"

                bulk_issues_response = self.oauth_client.bulk_fetch_issues(
                    issue_ids_or_keys=chunk_ids,
                    fields=fields_param
                )
                
                issues.extend(bulk_issues_response.get("issues", []))
                
        except Exception as e:
            self._log_error(f"Error fetching issues with JQL: {jql}", e)
        
        return issues
    
    def fetch_issues_jql(self, jql: str) -> List[Dict[str, Any]]:
        """
        Search & Fetch issues via the jql search and bulkfetch endpoints
        
        Args:
            jql: JQL query string to search for issues
            
        Returns:
            A tuple containing lists of accumulated issues
        """
        all_issue_ids = []
        issues = []

        try:
            # Step 2: Fetch all issue IDs using pagination
            self._log_progress(f"Fetching issue IDs for JQL: {jql}")
            next_page_token = None
            while True:
                response = self.oauth_client.search_issue_ids(
                    jql=jql, nextPageToken=next_page_token
                )
                
                issue_ids = [issue['id'] for issue in response.get('issues', [])]
                all_issue_ids.extend(issue_ids)
                
                self._log_success(f"Fetched {len(issue_ids)} issue IDs. Total IDs: {len(all_issue_ids)}")

                next_page_token = response.get('nextPageToken')
                if not next_page_token:
                    break

            # Step 3: Fetch issue details in batches
            self._log_progress(f"Total issue IDs fetched: {len(all_issue_ids)}. Now fetching details in chunks.")
            chunk_size = 100
            for i in range(0, len(all_issue_ids), chunk_size):
                chunk_ids = all_issue_ids[i:i + chunk_size]
                self._log_progress(f"Fetching details for issue chunk {i // chunk_size + 1} ({len(chunk_ids)} issues).")
                
                # Using *navigable to get all fields the user can see.
                fields_param = "*navigable"

                bulk_issues_response = self.oauth_client.bulk_fetch_issues(
                    issue_ids_or_keys=chunk_ids,
                    fields=fields_param
                )

                for issue_json in bulk_issues_response.get("issues", []):
                    # Step 5: Transform issue data
                    # We don't have a sprint context here, so sprint_id is None.
                    transformed_issue = IssueTransformerUtil.transform_issue_data_from_json(
                        issue_json, sprint_id=None
                    )
                    if transformed_issue:
                        issues.append(transformed_issue)

        except Exception as e:
            self._log_error(f"Error fetching issues with JQL: {jql}", e)

        return issues

    def fetch_subtasks_for_issues(
        self, parent_issues: List[Dict[str, Any]], sprint_id: int, issue_estimation_field: Optional[str] = None
    ) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Fetch subtasks for a list of parent issues.

        Args:
            parent_issues: List of parent issue dictionaries
            sprint_id: Sprint ID to assign to subtasks
            issue_estimation_field: custom field id for fetching issue estimation values

        Returns:
            Tuple of (subtasks_list, relationships_list)
        """
        subtasks = []
        relationships = []

        # Check if we have an OAuth client available
        if hasattr(self, "oauth_client") and self.oauth_client:
            return self._fetch_subtasks_oauth(parent_issues, sprint_id, issue_estimation_field)

        return subtasks, relationships

    def _fetch_subtasks_oauth(
        self, parent_issues: List[Dict[str, Any]], sprint_id: int, issue_estimation_field: Optional[str] = None
    ) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Fetch subtasks for parent issues using OAuth client.

        Args:
            parent_issues: List of parent issue dictionaries
            sprint_id: Sprint ID to assign to subtasks

        Returns:
            Tuple of (subtasks_list, relationships_list)
        """
        subtasks = []
        relationships = []

        try:
            # Build JQL for subtasks - get all subtasks for the parent issues
            parent_keys = [issue["key"] for issue in parent_issues if issue.get("key")]
            if not parent_keys:
                return subtasks, relationships

            jql = f"parent in ({','.join(parent_keys)})"
            
            all_subtasks_json = self.fetch_issues_untransformed_jql(jql)
            for issue_json in all_subtasks_json:
                # Transform subtask data from JSON
                subtask_data = IssueTransformerUtil.transform_issue_data_from_json(
                    issue_json=issue_json, issue_estimation_field=issue_estimation_field
                )
                if subtask_data:
                    # Find parent key from the issue data
                    parent_key = None
                    if (
                        "fields" in issue_json
                        and "parent" in issue_json["fields"]
                        and issue_json["fields"]["parent"]
                    ):
                        parent_key = issue_json["fields"]["parent"].get("key")

                    # Add parent_issue_key for quick lookups
                    if parent_key:
                        subtask_data["parent_issue_key"] = parent_key

                    subtasks.append(subtask_data)

                    # Create relationship record
                    # Determine proper relationship_type based on issue_type
                    if parent_key:
                        issue_type = subtask_data.get("issue_type", "").lower()
                        
                        # Check if it's truly a subtask issue type
                        if issue_type in ["subtask", "sub-task", "sub task"]:
                            relationship_type = "subtask"
                        else:
                            # For non-subtask types (Story, Bug, Task), this shouldn't happen
                            # as they use Epic links, but handle it gracefully
                            relationship_type = "subtask"
                            
                        relationships.append(
                            {
                                "parent_issue_key": parent_key,
                                "child_issue_key": issue_json.get("key", ""),
                                "relationship_type": relationship_type,
                            }
                        )

        except Exception as e:
            self._log_error(f"Error fetching subtasks via OAuth", e)

        return subtasks, relationships

    def store_issues(self, issues: List[Dict[str, Any]], tenant_id: str) -> Dict[str, Any]:
        """
        Store issues in the database using the issue repository.

        Args:
            issues: List of issue dictionaries to store
            tenant_id: Tenant ID for multi-tenant database operations

        Returns:
            Dictionary with storage results and metrics
        """
        try:
            if not issues:
                self._log_success("No issues to store")
                return {
                    "success": True,
                    "issues_stored": 0,
                    "total_issues_in_db": 0,
                    "error": None
                }

            # Initialize issue repository
            issue_repo = IssueRepository(tenant_id)
            
            # Store issues using repository upsert method
            self._log_progress(f"Storing {len(issues)} issues in database...")
            
            if issue_repo.upsert_issues(issues):
                # Get final metrics
                total_issues_in_db = issue_repo.get_issue_count()
                
                self._log_success(f"Successfully stored {len(issues)} issues")
                
                return {
                    "success": True,
                    "issues_stored": len(issues),
                    "total_issues_in_db": total_issues_in_db,
                    "error": None
                }
            else:
                error_msg = "Failed to store issues in database"
                self._log_error(error_msg)
                return {
                    "success": False,
                    "issues_stored": 0,
                    "total_issues_in_db": 0,
                    "error": error_msg
                }

        except Exception as e:
            error_msg = f"Error storing issues: {str(e)}"
            self._log_error(error_msg, e)
            return {
                "success": False,
                "issues_stored": 0,
                "total_issues_in_db": 0,
                "error": error_msg
            }