##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

from jobs.base import BaseSyncJob, JobConfig, JobResult
from database import DatabaseManager
from jobs.utils.common_util import initialize_jira_oauth_client, get_issue_estimation_field
from repositories import (
    IssueRelationshipRepository, SprintRepository,
)
from repositories.sprint_issue_repository import SprintIssueRepository
from repositories.issue_link_repository import IssueLinkRepository
from jira_service import JiraService
from services.oauth_jira_client import OAuthJiraClient
from models.requests import OAuthJiraCredentials
from jobs.utils.issue_transformer_util import IssueTransformerUtil
from typing import List, Dict, Any, Optional
import time
from services import IssueService


class SprintIssueSyncJob(BaseSyncJob):
    """
    Job class for synchronizing Jira issues within specific sprints.

    This job fetches all issues belonging to the specified sprint IDs from Jira
    and stores them in the database. It handles issue data transformation,
    relationship mapping to sprints, and provides detailed progress tracking.

    Parameters accepted in JobConfig.parameters:
    - sprint_ids: List of sprint IDs to fetch issues for (required)
    - include_subtasks: Whether to fetch subtasks of sprint issues (optional, default: True)

    The job will:
    1. Validate that all sprint IDs are valid integers
    2. Fetch issues for each sprint using optimized JQL queries
    4. Optionally fetch subtasks for complete sprint work visibility
    5. Extract and store issue relationships (epic links, subtasks)
    6. Transform issue and relationship data for database storage
    7. Store issues and relationships with UPSERT logic to handle updates
    8. Provide detailed metrics and progress tracking
    """

    def __init__(self, config: JobConfig):
        super().__init__(config)
        self.jira_service = None
        self.oauth_client = None
        self.db_manager = None

        self.relationship_repo = None
        self.sprint_issue_repo = None
        self.issue_link_repo = None
        self.issue_service = None
        self.sprint_repo = None

    def validate_parameters(self) -> tuple[bool, List[str]]:
        """
        Validate job parameters before execution.

        Pydantic validation in SprintIssuesSyncRequest handles all necessary validation.
        Only add validation which can't be handled using Pydantic inside SprintIssuesSyncRequest

        Returns:
            Tuple of (is_valid, error_messages)
        """
        # All validation is handled by Pydantic in SprintIssuesSyncRequest
        return True, []

    def _fetch_sprint_issues_oauth(
        self,
        sprint_id: int,
        include_subtasks: bool = True,
    ) -> Dict[str, Any]:
        """
        Fetch sprint issues using OAuth client.

        Args:
            sprint_id: Sprint ID to fetch issues for
            include_subtasks: Whether to include subtasks

        Returns:
            Dictionary with issues and relationships
        """
        try:
            # Build JQL query for sprint issues
            jql = f"sprint = {sprint_id}"

            # Fetch issues
            all_issues = self.issue_service.fetch_issues_untransformed_jql(jql)

            # Try to resolve storypoints custom field
            board_id = self.sprint_repo.find_by_id(sprint_id).get('board_id')
            issue_estimation_field = get_issue_estimation_field(all_issues, board_id, self.oauth_client)

            # Transform issues and extract related data
            transformed_issues = []
            relationships = []
            for issue_json in all_issues:
                issue_data = IssueTransformerUtil.transform_issue_data_from_json(
                    issue_json=issue_json, sprint_id=sprint_id, issue_estimation_field=issue_estimation_field
                )
                if issue_data:
                    transformed_issues.append(issue_data)

            # Handle subtasks if requested
            if include_subtasks:
                # Use the issue service method which handles both OAuth and SDK clients
                (
                    subtask_issues,
                    subtask_relationships
                ) = self.jira_service.issue_service.fetch_subtasks_for_issues(
                    transformed_issues, sprint_id, issue_estimation_field
                )
                transformed_issues.extend(subtask_issues)
                relationships.extend(subtask_relationships)

            # Extract Epic relationships from all issues
            epic_relationships = self._extract_epic_relationships(transformed_issues)
            relationships.extend(epic_relationships)

            # Fetch parent Epics for any issues that have a parent_issue_key
            parent_epics = self._fetch_parent_epics(transformed_issues)
            if parent_epics:
                transformed_issues.extend(parent_epics)

            return {
                "issues": transformed_issues,
                "relationships": relationships,
            }

        except Exception as e:
            print(f"❌ Error fetching sprint issues via OAuth: {e}")
            return {"issues": [], "relationships": []}

    def _extract_sprint_ids_from_sprints_data(self, sprints_data: Any) -> List[int]:
        """
        Extract sprint IDs from the raw sprints data returned by the utility.

        Args:
            sprints_data: Raw sprints data from the utility (could be list, single object, etc.)

        Returns:
            List of sprint IDs
        """
        sprint_ids = []

        if not sprints_data:
            return sprint_ids

        try:
            # Handle list of sprint objects
            if isinstance(sprints_data, list):
                for sprint_obj in sprints_data:
                    sprint_id = self._extract_single_sprint_id(sprint_obj)
                    if sprint_id:
                        sprint_ids.append(sprint_id)
            else:
                # Handle single sprint object
                sprint_id = self._extract_single_sprint_id(sprints_data)
                if sprint_id:
                    sprint_ids.append(sprint_id)

        except Exception as e:
            print(f"⚠️  Error extracting sprint IDs from sprints data: {e}")

        return sprint_ids

    def _extract_single_sprint_id(self, sprint_obj: Any) -> Optional[int]:
        """
        Extract sprint ID from a single sprint object.

        Args:
            sprint_obj: Single sprint object (could be dict, string, etc.)

        Returns:
            Sprint ID as integer, or None if not found
        """
        try:
            # Handle dictionary format (most common for JSON responses)
            if isinstance(sprint_obj, dict):
                if "id" in sprint_obj:
                    return int(sprint_obj["id"])

            # Handle string format (sprint string representations)
            elif isinstance(sprint_obj, str):
                import re

                id_match = re.search(r"id=(\d+)", sprint_obj)
                if id_match:
                    return int(id_match.group(1))

            # Handle object with id attribute
            elif hasattr(sprint_obj, "id"):
                return int(sprint_obj.id)

        except (ValueError, AttributeError, TypeError) as e:
            print(f"⚠️  Could not extract sprint ID from object: {e}")

        return None

    def _create_sprint_issue_associations(
        self, issues: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Create sprint-issue associations from the issues data.

        Args:
            issues: List of issue dictionaries with sprints data

        Returns:
            List of sprint-issue association dictionaries
        """
        associations = []

        for issue in issues:
            issue_key = issue.get("key")
            sprints_data = issue.get("sprints")

            if not issue_key or not sprints_data:
                single_sprint_id = issue.get("sprint_id")
                if single_sprint_id:
                    associations.append({"sprint_id": single_sprint_id, "issue_key": issue_key})
                continue

            # Extract sprint IDs from the sprints data
            sprint_ids = self._extract_sprint_ids_from_sprints_data(sprints_data)

            # Create associations for each sprint
            for sprint_id in sprint_ids:
                associations.append({"sprint_id": sprint_id, "issue_key": issue_key})

        return associations

    def _fetch_parent_epics(
        self, all_issues: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Fetch parent Epic issues for any issues that have a parent_issue_key.
        
        This ensures that all Epics referenced in the issues table are also
        stored as issue records in the database.
        
        Only fetches issues that are of type 'Epic'.

        Args:
            all_issues: List of issues

        Returns:
            List of parent epic issues
        """
        parent_epics = []
        epic_keys_to_fetch = set()
        existing_issue_keys = {issue.get("key") for issue in all_issues}

        # Collect all unique parent epic keys from issues
        for issue in all_issues:
            parent_key = issue.get("parent_issue_key")
            
            # If this issue has a parent and it's not already in our list
            if parent_key and parent_key not in existing_issue_keys:
                epic_keys_to_fetch.add(parent_key)

        if not epic_keys_to_fetch:
            return parent_epics

        try:
            # Fetch each parent epic's full data
            for epic_key in epic_keys_to_fetch:
                try:
                    epic_json = self.oauth_client.get_issue(epic_key)
                    if epic_json:
                        # Only process if it's an Epic
                        if epic_json.get("fields", {}).get("issuetype", {}).get("name", "").lower() == "epic":
                            epic_data = IssueTransformerUtil.transform_issue_data_from_json(
                                epic_json
                            )
                            if epic_data:
                                parent_epics.append(epic_data)
                                print(f"   ✅ Fetched parent epic {epic_key}")
                except Exception as e:
                    print(f"⚠️  Error fetching epic {epic_key}: {e}")
                    continue
        except Exception as e:
            print(f"⚠️  Error fetching parent epics: {e}")

        return parent_epics

    def _extract_epic_relationships(
        self, issues: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Extract Epic → Story/Bug/Task relationships from issues.
        
        This creates 'epic' relationship_type entries for issues that have
        an epic_key, representing the Epic parent relationship.

        Args:
            issues: List of issue dictionaries

        Returns:
            List of relationship dictionaries with epic parent relationships
        """
        relationships = []

        try:
            for issue in issues:
                issue_key = issue.get("key")
                epic_key = issue.get("epic_key")
                issue_type = issue.get("issue_type", "").lower()
                
                # Only create Epic relationship if:
                # 1. Issue has an epic_key
                # 2. Issue is not itself an Epic (Epics don't have Epic parents)
                # 3. Issue is NOT a subtask (subtasks get their parent relationship from subtask relationships)
                # 4. Issue key exists
                if epic_key and issue_key and issue_type != "epic" and issue_type != "subtask":
                    relationships.append({
                        "parent_issue_key": epic_key,
                        "child_issue_key": issue_key,
                        "relationship_type": "epic"
                    })
                    
        except Exception as e:
            print(f"⚠️  Error extracting Epic relationships: {e}")

        return relationships

    def _extract_issue_links_from_json(
        self, issue_json: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Extract issue links from the issue JSON data.

        Args:
            issue_json: Issue JSON data from Jira API

        Returns:
            List of issue link dictionaries
        """
        links = []

        try:
            fields = issue_json.get("fields", {})
            issue_links = fields.get("issuelinks", [])
            source_issue_key = issue_json.get("key", "")

            if not source_issue_key or not issue_links:
                return links

            for link in issue_links:
                try:
                    # Get link type name
                    link_type = link.get("type", {}).get("name", "")
                    if not link_type:
                        continue

                    # Handle outward links (current issue links TO another issue)
                    if "outwardIssue" in link:
                        outward_issue = link["outwardIssue"]
                        linked_issue_key = outward_issue.get("key", "")
                        if linked_issue_key:
                            links.append(
                                {
                                    "source_issue_key": source_issue_key,
                                    "linked_issue_key": linked_issue_key,
                                    "link_type": link.get("type", {}).get("outward"),
                                }
                            )

                    # Handle inward links (another issue links TO current issue)
                    if "inwardIssue" in link:
                        inward_issue = link["inwardIssue"]
                        linked_issue_key = inward_issue.get("key", "")
                        if linked_issue_key:
                            links.append(
                                {
                                    "source_issue_key": source_issue_key,
                                    "linked_issue_key": linked_issue_key,
                                    "link_type": link.get("type", {}).get("inward"),
                                }
                            )

                except Exception as e:
                    print(f"⚠️  Error processing individual issue link: {e}")
                    continue

        except Exception as e:
            print(f"⚠️  Error extracting issue links from JSON: {e}")

        return links

    def _create_issue_link_associations(
        self, issues: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Create issue link associations from the issues data.

        Args:
            issues: List of issue dictionaries

        Returns:
            List of issue link association dictionaries
        """
        all_links = []

        for issue in issues:
            # We need to reconstruct the issue JSON to extract links
            # The raw_data should contain the original JSON
            raw_data = issue.get("raw_data")
            if raw_data:
                issue_links = self._extract_issue_links_from_json(raw_data)
                all_links.extend(issue_links)

        return all_links

    def _initialize_services(self) -> bool:
        try:
            # Initialize database services
            self.db_manager = DatabaseManager()
            self.relationship_repo = IssueRelationshipRepository(self.config.tenant_id)
            self.sprint_issue_repo = SprintIssueRepository(self.config.tenant_id)
            self.issue_link_repo = IssueLinkRepository(self.config.tenant_id)
            self.issue_service = IssueService()
            self.jira_service = JiraService(self.config.jira_credentials)
            self.sprint_repo = SprintRepository(self.config.tenant_id)

            success, client_or_error = initialize_jira_oauth_client(self.config.jira_credentials)
            if not success:
                print(client_or_error)
                return False
            else:
                self.oauth_client = client_or_error
                self.issue_service.set_oauth_client(self.oauth_client)
                self.jira_service.issue_service.set_oauth_client(self.oauth_client)

        except Exception as e:
            print(f"❌ Error initializing required services: {e}")
            return False

        return True

    def execute(self) -> JobResult:
        """
        Execute the sprint issue synchronization job.

        Returns:
            JobResult with execution metrics and outcomes
        """
        result = JobResult(
            success=True, message="Sprint issue sync completed successfully", data={}
        )

        start_time = time.time()

        try:
            # Step 1: Initialize services
            self._update_progress(0, 100, "Initializing services...")
            if not self._initialize_services():
                result.add_error("Failed to initialize required services")
                return result

            # Step 2: Get parameters
            params = self.config.parameters
            sprint_ids = params.get("sprint_ids", [])
            include_subtasks = params.get("include_subtasks", True)

            # TODO: Handle this in validate_parameters implementation
            if not sprint_ids:
                result.add_error("No sprint_ids provided in parameters")
                return result

            result.data["sprint_ids_requested"] = sprint_ids
            result.data["include_subtasks"] = include_subtasks

            # Step 3: Fetch issues with relationships for each sprint
            features = []
            if include_subtasks:
                features.append("subtasks")

            fetch_message = f"Fetching issues{' with ' + ', '.join(features) if features else ''} for {len(sprint_ids)} sprints..."
            self._update_progress(20, 100, fetch_message)

            all_issues = []
            all_relationships = []
            sprints_processed = 0
            sprints_with_issues = 0

            for i, sprint_id in enumerate(sprint_ids):
                try:
                    self._update_progress(
                        20 + (i * 60 // len(sprint_ids)),
                        100,
                        f"Processing sprint {sprint_id}...",
                    )

                    sprint_data = self._fetch_sprint_issues_oauth(
                        sprint_id,
                        include_subtasks=include_subtasks,
                    )

                    if sprint_data["issues"]:
                        all_issues.extend(sprint_data["issues"])
                        all_relationships.extend(sprint_data["relationships"])
                        sprints_with_issues += 1

                        # Calculate counts for logging
                        sprint_issue_count = len(
                            [
                                issue
                                for issue in sprint_data["issues"]
                                if issue.get("sprint_id") == sprint_id
                            ]
                        )
                        subtask_count = len(sprint_data["issues"]) - sprint_issue_count
                        relationship_count = len(sprint_data["relationships"])

                        log_parts = [f"{sprint_issue_count} issues"]
                        if subtask_count > 0:
                            log_parts.append(f"{subtask_count} subtasks")
                        if relationship_count > 0:
                            log_parts.append(f"{relationship_count} relationships")

                        print(
                            f"   ✅ Found {', '.join(log_parts)} in sprint {sprint_id}"
                        )
                    else:
                        print(f"   ⚪ No issues found in sprint {sprint_id}")

                    sprints_processed += 1

                except Exception as e:
                    result.add_warning(f"Error processing sprint {sprint_id}: {str(e)}")
                    continue

            result.data["sprints_processed"] = sprints_processed
            result.data["sprints_with_issues"] = sprints_with_issues
            result.data["issues_fetched"] = len(all_issues)
            result.data["relationships_fetched"] = len(all_relationships)
            result.records_processed = len(all_issues)

            # Step 4: Store issues in database
            if all_issues:
                self._update_progress(75, 100, "Storing issues in database...")
                storage_result = self.issue_service.store_issues(
                    all_issues, self.config.tenant_id
                )

                if storage_result["success"]:
                    result.data["total_issues_in_db"] = storage_result[
                        "total_issues_in_db"
                    ]
                    result.records_created = storage_result["issues_stored"]
                    result.data["issue_keys"] = [
                        issue.get("key") for issue in all_issues
                    ]
                else:
                    result.add_error(storage_result["error"])
                    return result
            else:
                result.add_warning("No issues found to store")

            # Step 4.5: Handle sprint-issue associations — always rewrite membership
            # for the requested sprints so issues removed from a sprint are deleted.
            self._update_progress(
                78, 100, "Processing sprint-issue associations..."
            )
            sprint_issue_associations = []
            if all_issues:
                sprint_issue_associations = self._create_sprint_issue_associations(
                    all_issues
                )
            result.data["sprint_issue_associations_created"] = len(
                sprint_issue_associations
            )

            if sprint_ids:
                self._update_progress(
                    79, 100, "Cleaning old sprint-issue associations..."
                )
                if not self.sprint_issue_repo.clean_sprint_issues_for_sprints(
                    sprint_ids
                ):
                    result.add_warning(
                        "Failed to clean old sprint-issue associations"
                    )

            if sprint_issue_associations:
                self._update_progress(
                    80, 100, "Storing sprint-issue associations..."
                )
                if self.sprint_issue_repo.upsert_sprint_issues(
                    sprint_issue_associations
                ):
                    result.data["sprint_issue_associations_stored"] = len(
                        sprint_issue_associations
                    )
                    association_summary = (
                        self.sprint_issue_repo.get_sprint_issue_summary()
                    )
                    result.data["sprint_issue_summary"] = association_summary
                else:
                    result.add_warning("Failed to store sprint-issue associations")
            else:
                result.data["sprint_issue_associations_stored"] = 0
                result.add_warning(
                    "No sprint-issue associations found to store; "
                    "cleaned membership for requested sprints"
                )

            # Step 4.7: Handle issue link associations
            if all_issues:
                self._update_progress(82, 100, "Processing issue link associations...")

                # Create issue link associations from the issues data
                issue_link_associations = self._create_issue_link_associations(
                    all_issues
                )
                result.data["issue_link_associations_created"] = len(
                    issue_link_associations
                )

                # Always clean links for synced issues first — including when the
                # remote payload is empty (all links unlinked). Skipping clean on
                # an empty association list left stale rows in the DB.
                issue_keys = [
                    issue["key"] for issue in all_issues if issue.get("key")
                ]
                if issue_keys:
                    self._update_progress(
                        83, 100, "Cleaning old issue link associations..."
                    )
                    if not self.issue_link_repo.clean_issue_links_for_issues(
                        issue_keys
                    ):
                        result.add_warning(
                            "Failed to clean old issue link associations"
                        )

                if issue_link_associations:
                    # Store new links
                    self._update_progress(84, 100, "Storing issue link associations...")
                    if self.issue_link_repo.upsert_issue_links(issue_link_associations):
                        result.data["issue_link_associations_stored"] = len(
                            issue_link_associations
                        )

                        # Get summary statistics
                        link_summary = self.issue_link_repo.get_issue_link_summary()
                        result.data["issue_link_summary"] = link_summary
                    else:
                        result.add_warning("Failed to store issue link associations")
                else:
                    result.data["issue_link_associations_stored"] = 0
                    result.add_warning(
                        "No issue link associations found to store; "
                        "cleaned existing links for synced issues"
                    )

            # Step 7: Store relationships (always scoped to synced issues so removals clear)
            issue_keys_for_rels = [
                issue["key"] for issue in all_issues if issue.get("key")
            ] if all_issues else []
            if issue_keys_for_rels or all_relationships:
                self._update_progress(
                    92, 100, "Storing issue relationships in database..."
                )
                if self.relationship_repo.upsert_relationships(
                    all_relationships or [],
                    issue_keys=issue_keys_for_rels,
                ):
                    result.data["relationships_stored"] = len(all_relationships or [])
                else:
                    result.add_warning(
                        "Failed to store issue relationships in database"
                    )

            # Step 8: Complete
            self._update_progress(100, 100, "Sprint issue sync completed")

            # Set final result data
            execution_summary = {
                "sprint_ids_requested": len(sprint_ids),
                "sprints_processed": sprints_processed,
                "sprints_with_issues": sprints_with_issues,
                "issues_fetched": len(all_issues),
                "issues_stored": result.records_created,
                "total_issues_in_database": result.data.get("total_issues_in_db", 0),
                "sprint_issue_associations_created": result.data.get(
                    "sprint_issue_associations_created", 0
                ),
                "sprint_issue_associations_stored": result.data.get(
                    "sprint_issue_associations_stored", 0
                ),
                "sprint_issue_summary": result.data.get("sprint_issue_summary", {}),
                "issue_link_associations_created": result.data.get(
                    "issue_link_associations_created", 0
                ),
                "issue_link_associations_stored": result.data.get(
                    "issue_link_associations_stored", 0
                ),
                "issue_link_summary": result.data.get("issue_link_summary", {}),
                "include_subtasks": include_subtasks,
                "relationships_fetched": len(all_relationships),
                "relationships_stored": result.data.get("relationships_stored", 0),
            }

            # Create appropriate success message
            message_parts = [f"{result.records_processed} issues"]
            if result.data.get("sprint_issue_associations_stored", 0) > 0:
                message_parts.append(
                    f"{result.data['sprint_issue_associations_stored']} sprint-issue associations"
                )
            if result.data.get("issue_link_associations_stored", 0) > 0:
                message_parts.append(
                    f"{result.data['issue_link_associations_stored']} issue links"
                )
            if len(all_relationships) > 0:
                message_parts.append(f"{len(all_relationships)} relationships")

            result.message = f"Successfully synced {', '.join(message_parts)} from {sprints_with_issues} sprints"

        except Exception as e:
            result.add_error(f"Sprint issue sync execution failed: {str(e)}")

        finally:
            result.execution_time = time.time() - start_time

        return result

    @staticmethod
    def get_supported_parameters() -> Dict[str, Any]:
        """
        Get documentation for supported parameters.

        Returns:
            Dictionary describing supported parameters
        """
        return {
            "sprint_ids": {
                "type": "list[int]",
                "description": "List of sprint IDs to fetch issues for (required)",
                "example": [123, 456, 789],
                "required": True,
                "validation": {
                    "min_items": 1,
                    "max_items": 100,
                    "item_type": "integer",
                },
            },
            "include_subtasks": {
                "type": "bool",
                "description": "Whether to fetch subtasks of sprint issues (optional)",
                "example": True,
                "default": True,
                "required": False,
            },
        }