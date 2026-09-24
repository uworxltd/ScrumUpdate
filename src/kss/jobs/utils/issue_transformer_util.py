##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Issue transformation utilities for extracting and processing Jira issue data.

This module provides simple utilities for various transformations on Jira issues
for OAuth client responses only.
"""

from typing import List, Dict, Any, Optional


class IssueTransformerUtil:
    """
    Simple utility class for extracting sprint data from Jira issues (OAuth client only).
    """

    # Common custom field names for sprint data across different Jira instances
    COMMON_SPRINT_FIELDS = [
        "customfield_10021",
        "customfield_10020",
        "customfield_10010",
        "sprint",
    ]

    # Common custom field names for story points
    COMMON_STORY_POINTS_FIELDS = [
        "customfield_10026",
        "customfield_10016",
        "customfield_10024",
        "storypoints"
    ]
    
    # Common custom field names for Epic Link
    COMMON_EPIC_LINK_FIELDS = [
        "customfield_10014",
        "customfield_10008",
        "customfield_10006",
        "customfield_10002",
        "parent",  # In some Jira Cloud instances, Epic is under parent
    ]
    
    @staticmethod
    def transform_issue_data_from_json(
        issue_json: Dict[str, Any], sprint_id: Optional[int] = None, issue_estimation_field: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Transform issue JSON data from OAuth API to database format.

        Args:
            issue_json: Issue data from OAuth API
            sprint_id: (Optional) Sprint ID to assign to the issue

        Returns:
            Transformed issue data dictionary or None if transformation fails
        """
        try:
            fields = issue_json.get("fields", {})

            # If sprint_id is not provided, fetch the sprints tagged with this particular issue
            if sprint_id is None:
                sprints_data = (
                    IssueTransformerUtil.get_sprints_from_issue_json(
                        issue_json
                    )
                )
                
            # Try to resolve story points from a list of commonly known custom_fields
            if issue_estimation_field is None:
                sp_custom_field_data = None
            else:
                fields = issue_json.get("fields", {})
                sp_custom_field_data = fields.get(issue_estimation_field)
            
            # Doing this here because labels in certain Jira tenants can be a bit different
            labels = fields.get("labels", [])
            processed_labels = [
                label if isinstance(label, str) else label.get("name", "")
                for label in labels
            ]

            # Basic issue data
            issue_data = {
                "key": issue_json.get("key", ""),
                "id": int(issue_json.get("id", 0)),
                "sprints": sprints_data if sprint_id is None else [],
                "sprint_id": sprint_id,
                "summary": fields.get("summary", ""),
                "description": fields.get("description", ""),
                "issue_type": (
                    fields.get("issuetype", {}).get("name", "")
                    if fields.get("issuetype")
                    else ""
                ),
                "status": (
                    fields.get("status", {}).get("name", "")
                    if fields.get("status")
                    else ""
                ),
                # Status category fields
                "status_category": (
                    fields.get("statusCategory", {}).get("name", "")
                    if fields.get("statusCategory")
                    else ""
                ),
                "status_category_change_date": fields.get("statuscategorychangedate"),
                "priority": (
                    fields.get("priority", {}).get("name", "")
                    if fields.get("priority")
                    else ""
                ),
                # Assignee fields (renamed and new); missing/empty normalized to None
                # so downstream IS NOT NULL queries treat the issue as unassigned.
                "assignee_display_name": IssueTransformerUtil._get_nested_field(
                    fields, "assignee", "displayName"
                ),
                "assignee_account_id": IssueTransformerUtil._get_nested_field(
                    fields, "assignee", "accountId"
                ),
                # Reporter fields (renamed and new)
                "reporter_display_name": IssueTransformerUtil._get_nested_field(
                    fields, "reporter", "displayName"
                ),
                "reporter_account_id": IssueTransformerUtil._get_nested_field(
                    fields, "reporter", "accountId"
                ),
                # Date fields
                "created_date": fields.get("created"),
                "updated_date": fields.get("updated"),
                "resolved_date": fields.get("resolutiondate"),
                # Story points
                "story_points": sp_custom_field_data,
                # Time tracking fields
                "time_spent": fields.get("timespent"),
                "time_original_estimate": fields.get("timeoriginalestimate"),
                "aggregate_time_spent": fields.get("aggregatetimespent"),
                # Additional fields
                "labels": processed_labels,
                "components": [
                    comp.get("name", "") for comp in fields.get("components", [])
                ],
                "parent_issue_key": IssueTransformerUtil._get_nested_field(
                    fields, "parent", "key"
                ),
                "epic_key": IssueTransformerUtil.get_epic_link_from_issue_json(issue_json),
                "raw_data": issue_json,
            }

            return issue_data

        except Exception as e:
            print(f"⚠️  Error transforming issue data from JSON: {e}")
            return None

    @staticmethod
    def _get_nested_field(
        fields: Dict[str, Any], parent_key: str, child_key: str
    ) -> Optional[str]:
        """
        Extract a nested scalar from a Jira object field (e.g. assignee.displayName).

        Missing or empty values are normalized to None so they persist as NULL
        in the database rather than an empty string, allowing downstream
        IS NOT NULL queries to handle them correctly.

        Args:
            fields: The issue "fields" dictionary from the Jira API response
            parent_key: Top-level field name (e.g. "assignee", "parent", "reporter")
            child_key: Nested key to extract (e.g. "displayName", "accountId", "key")

        Returns:
            The nested string value, or None if the parent or child is missing/empty
        """
        parent = fields.get(parent_key)
        if not isinstance(parent, dict):
            return None
        value = parent.get(child_key)
        return value or None

    @staticmethod
    def _get_field_value(
        issue_json: Dict[str, Any], field_list: List[str], issue_context: str
    ) -> Optional[Any]:
        """
        Generic method to get field value from a list of possible field names.

        Args:
            issue_json: Jira issue JSON object
            field_list: List of field names to try
            issue_context: Context string for error messages

        Returns:
            First non-null field value found, or None if not found
        """
        try:
            fields = issue_json.get("fields", {})

            for field_name in field_list:
                if field_name in fields and fields[field_name] is not None:
                    return fields[field_name]

            return None

        except Exception as e:
            print(
                f"⚠️  Could not resolve custom field {issue_context} from issue {issue_json.get('key', 'unknown')}: {e}"
            )
            return None

    @staticmethod
    def resolve_story_points_custom_field(
        issue_json: Dict[str, Any]
    ) -> Optional[List[Any]]:
        return IssueTransformerUtil._get_field_value(
            issue_json, IssueTransformerUtil.COMMON_STORY_POINTS_FIELDS, "story points"
        )

    @staticmethod
    def get_sprints_from_issue_json(issue_json: Dict[str, Any]) -> Optional[List[Any]]:
        return IssueTransformerUtil._get_field_value(
            issue_json, IssueTransformerUtil.COMMON_SPRINT_FIELDS, "sprint data"
        )

    @staticmethod
    def get_epic_link_from_issue_json(issue_json: Dict[str, Any]) -> Optional[str]:
        """
        Extract Epic link/key from issue JSON.
        Epic links can be stored in various custom fields depending on Jira configuration.
        
        Args:
            issue_json: Jira issue JSON object
            
        Returns:
            Epic key string if found, None otherwise
        """
        try:
            fields = issue_json.get("fields", {})
            
            # Try each common Epic link field
            for field_name in IssueTransformerUtil.COMMON_EPIC_LINK_FIELDS:
                if field_name in fields and fields[field_name]:
                    epic_data = fields[field_name]
                    
                    # Handle different Epic field formats
                    if isinstance(epic_data, str):
                        # Direct string value (Epic key)
                        return epic_data
                    elif isinstance(epic_data, dict):
                        # Object with key field (e.g., {"key": "PROJ-123"})
                        if "key" in epic_data:
                            return epic_data["key"]
                    
            return None
            
        except Exception as e:
            print(f"⚠️  Error extracting Epic link from issue {issue_json.get('key', 'unknown')}: {e}")
            return None