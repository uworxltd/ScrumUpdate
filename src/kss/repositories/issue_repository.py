##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Issue repository for database operations.
Handles all issue-related database interactions.
"""

import json
from datetime import datetime
from typing import List, Dict, Any
from .base_repository import BaseRepository


class IssueRepository(BaseRepository):
    """
    Repository for issue data operations.
    Encapsulates all issue-related database operations with multi-tenant support.
    """

    def upsert_issues(self, issues_data: List[Dict[str, Any]]) -> bool:
        """
        Insert or update issues data in the database using bulk insert.
        Uses a batch timestamp to sync data, deleting any issues not present in the batch.

        Args:
            issues_data: List of issue dictionaries

        Returns:
            bool: True if successful, False otherwise
        """
        if not issues_data:
            self._log_success("No issues data to insert")
            return True

        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:

                    # Step 1: Get a single timestamp for the entire batch
                    cur.execute("SELECT NOW()")
                    batch_timestamp = cur.fetchone()[0]

                    # Step 2: Remove duplicates from the input data
                    # Create a dict with issue_id as key to remove duplicates
                    unique_issues = {}
                    for issue in issues_data:
                        issue_id = issue["key"]
                        unique_issues[issue_id] = issue

                    # Convert back to list
                    deduplicated_issues = list(unique_issues.values())

                    # Step 3: Prepare all values for bulk insert
                    all_values = []
                    for issue in deduplicated_issues:
                        # Convert description to JSON if present
                        description = issue.get("description")
                        if description is not None:
                            description = json.dumps(description)
                        else:
                            description = None

                        # Append all values for this issue in the correct order
                        all_values.extend(
                            [
                                issue["id"],  # issue_id
                                issue["key"],  # issue_key
                                issue["summary"],
                                description,
                                issue.get("issue_type"),
                                issue.get("status"),
                                issue.get("status_category"),
                                issue.get("status_category_change_date"),
                                issue.get("priority"),
                                issue.get("assignee_display_name"),
                                issue.get("assignee_account_id"),
                                issue.get("reporter_display_name"),
                                issue.get("reporter_account_id"),
                                issue.get("created_date"),
                                issue.get("updated_date"),
                                issue.get("resolved_date"),  # Maps to resolution_date
                                issue.get("story_points"),
                                issue.get("time_spent"),
                                issue.get("time_original_estimate"),
                                issue.get("aggregate_time_spent"),
                                issue.get("labels", []),
                                issue.get("components", []),
                                issue.get("parent_issue_key"),
                                batch_timestamp,  # Use the single batch timestamp
                            ]
                        )

                    # Step 4: Build the bulk insert query
                    num_issues = len(deduplicated_issues)
                    # Each issue has 24 placeholders
                    placeholders = ", ".join(
                        [
                            "(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
                        ]
                        * num_issues
                    )
                    sql = f"""
                        INSERT INTO issues
                        (issue_id, issue_key, summary, description, issue_type, status,
                        status_category, status_category_change_date, priority,
                        assignee_display_name, assignee_account_id, reporter_display_name, reporter_account_id,
                        created_date, updated_date, resolution_date, story_points,
                        time_spent, time_original_estimate, aggregate_time_spent,
                        labels, components, parent_issue_key, last_synced_at)
                        VALUES {placeholders}
                        ON CONFLICT (issue_id)
                        DO UPDATE SET
                            issue_key = EXCLUDED.issue_key,
                            summary = EXCLUDED.summary,
                            description = EXCLUDED.description,
                            issue_type = EXCLUDED.issue_type,
                            status = EXCLUDED.status,
                            status_category = EXCLUDED.status_category,
                            status_category_change_date = EXCLUDED.status_category_change_date,
                            priority = EXCLUDED.priority,
                            assignee_display_name = EXCLUDED.assignee_display_name,
                            assignee_account_id = EXCLUDED.assignee_account_id,
                            reporter_display_name = EXCLUDED.reporter_display_name,
                            reporter_account_id = EXCLUDED.reporter_account_id,
                            created_date = EXCLUDED.created_date,
                            updated_date = EXCLUDED.updated_date,
                            resolution_date = EXCLUDED.resolution_date,
                            story_points = CASE 
                                WHEN EXCLUDED.story_points IS NOT NULL THEN EXCLUDED.story_points 
                                ELSE issues.story_points 
                            END,
                            time_spent = EXCLUDED.time_spent,
                            time_original_estimate = EXCLUDED.time_original_estimate,
                            aggregate_time_spent = EXCLUDED.aggregate_time_spent,
                            labels = EXCLUDED.labels,
                            components = EXCLUDED.components,
                            parent_issue_key = EXCLUDED.parent_issue_key,
                            last_synced_at = EXCLUDED.last_synced_at;
                    """

                    # Step 5: Execute the bulk insert
                    cur.execute(sql, all_values)

                    # Step 6: Do NOT globally delete issues not in this batch.
                    # Issue sync is partial (per sprint / JQL). A global last_synced_at
                    # delete would wipe issues outside the current fetch. Membership
                    # removals are handled via sprint_issues; child-record deletions
                    # (comments, worklogs, links) are scoped by issue_key.
                    # cur.execute(
                    #     "DELETE FROM issues WHERE last_synced_at IS NULL OR last_synced_at != %s",
                    #     (batch_timestamp,),
                    # )

                    conn.commit()
                    self._log_success(
                        f"Successfully synced {num_issues} issues (after removing {len(issues_data) - num_issues} duplicates)",
                        num_issues,
                    )
                    return True

        except Exception as e:
            self._log_error("Error syncing issues to database", e)
            return False

    def get_issue_count(self) -> int:
        """
        Get the total number of issues in the database.

        Returns:
            int: Number of issues
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    cur.execute(f"SELECT COUNT(*) FROM issues;")
                    return cur.fetchone()[0]

        except Exception as e:
            self._log_error("Error getting issue count", e)
            return 0