##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Sprint Issue Repository for managing sprint-issue associations.

This repository handles the many-to-many relationship between sprints and issues,
allowing issues to be associated with multiple sprints.
"""

from typing import List, Dict, Any, Optional
from psycopg2.extras import execute_values
from database import DatabaseManager
from repositories.base_repository import BaseRepository
from datetime import datetime


class SprintIssueRepository(BaseRepository):
    """Repository for managing sprint-issue associations."""

    def __init__(self, tenant_id: str):
        """
        Initialize the sprint issue repository.

        Args:
            tenant_id: Tenant identifier for database operations
        """
        super().__init__(tenant_id)
        self.db_manager = DatabaseManager()

    def upsert_sprint_issues(self, sprint_issue_data: List[Dict[str, Any]]) -> bool:
        """
        Synchronize sprint-issue associations using a bulk operation.
        Uses a batch timestamp to sync data, deleting any stale associations for the sprints.

        Args:
            sprint_issue_data: List of sprint-issue association dictionaries
                              Each dict should have: sprint_id, issue_key

        Returns:
            bool: True if successful, False otherwise
        """
        if not sprint_issue_data:
            self._log_success("No sprint-issue associations to sync")
            return True

        # Deduplicate input data
        seen = set()
        deduped = []
        for d in sprint_issue_data:
            key = (d['issue_key'], d['sprint_id'])
            if key not in seen:
                seen.add(key)
                deduped.append(d)

        sprint_issue_data = deduped

        # Get the set of sprints being synced
        sprint_ids = list(set(assoc["sprint_id"] for assoc in sprint_issue_data))

        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    # Step 1: Get a single timestamp for the entire batch
                    cur.execute("SELECT NOW()")
                    batch_timestamp = cur.fetchone()[0]

                    # Step 2: Prepare data for bulk upsert
                    values_to_insert = [
                        (
                            assoc["sprint_id"],
                            assoc["issue_key"],
                            batch_timestamp,
                        )
                        for assoc in sprint_issue_data
                    ]

                    # Step 2.1: Delete stale associations for the sprints in this batch
                    unique_sprint_ids = list({sprint_id for sprint_id, _, _ in values_to_insert})
                    print("Deleting stale associations for sprints:", unique_sprint_ids)
                    delete_sql = """
                        DELETE FROM sprint_issues
                        WHERE sprint_id = ANY(%s)
                    """
                    cur.execute(delete_sql, (unique_sprint_ids,))
                    print("Stale associations deleted.")

                    # Step 3: Execute bulk upsert
                    upsert_sql = """
                        INSERT INTO sprint_issues
                        (sprint_id, issue_key, last_synced_at)
                        VALUES %s
                        ON CONFLICT (sprint_id, issue_key)
                        DO UPDATE SET
                            last_synced_at = EXCLUDED.last_synced_at;
                    """
                    execute_values(cur, upsert_sql, values_to_insert)

                    # Step 4: Delete stale associations for the sprints in this batch
                    # cur.execute(
                    #     """DELETE FROM sprint_issues
                    #        WHERE sprint_id = ANY(%s) AND last_synced_at != %s""",
                    #     (sprint_ids, batch_timestamp),
                    # )

                    conn.commit()
                    self._log_success(
                        f"Successfully synced {len(sprint_issue_data)} sprint-issue associations for {len(sprint_ids)} sprints",
                        len(sprint_issue_data),
                    )
                    return True

        except Exception as e:
            self._log_error("Error syncing sprint-issue associations to database", e)
            return False

    def clean_sprint_issues_for_issues(self, issue_keys: List[str]) -> bool:
        """
        Clean existing sprint-issue associations for the given issues.
        This is used before re-syncing to ensure clean state.

        Args:
            issue_keys: List of issue keys to clean associations for

        Returns:
            bool: True if successful, False otherwise
        """
        if not issue_keys:
            self._log_success("No issue keys provided for cleaning")
            return True

        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    # Use ANY() to match against array of issue keys
                    cur.execute(
                        """
                        DELETE FROM sprint_issues 
                        WHERE issue_key = ANY(%s);
                        """,
                        (issue_keys,),
                    )

                    deleted_count = cur.rowcount
                    conn.commit()
                    self._log_success(
                        f"Successfully cleaned {deleted_count} sprint-issue associations for {len(issue_keys)} issues"
                    )
                    return True

        except Exception as e:
            self._log_error("Error cleaning sprint-issue associations", e)
            return False

    def clean_sprint_issues_for_sprints(self, sprint_ids: List) -> bool:
        """
        Delete all sprint-issue membership rows for the given sprints.
        Used so issues removed from a sprint are cleared even when the new
        association list is empty.
        """
        if not sprint_ids:
            self._log_success("No sprint ids provided for cleaning")
            return True

        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        DELETE FROM sprint_issues
                        WHERE sprint_id = ANY(%s);
                        """,
                        (list(sprint_ids),),
                    )
                    deleted_count = cur.rowcount
                    conn.commit()
                    self._log_success(
                        f"Successfully cleaned {deleted_count} sprint-issue associations"
                        f" for {len(sprint_ids)} sprints"
                    )
                    return True
        except Exception as e:
            self._log_error("Error cleaning sprint-issue associations by sprint", e)
            return False

    def get_sprints_for_issue(self, issue_key: str) -> List[int]:
        """
        Get all sprint IDs associated with a specific issue.

        Args:
            issue_key: Issue key to get sprints for

        Returns:
            List of sprint IDs
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT sprint_id 
                        FROM sprint_issues 
                        WHERE issue_key = %s
                        ORDER BY sprint_id;
                        """,
                        (issue_key,),
                    )

                    results = cur.fetchall()
                    return [row[0] for row in results]

        except Exception as e:
            self._log_error(f"Error getting sprints for issue {issue_key}", e)
            return []

    def get_issues_for_sprint(self, sprint_id: int) -> List[str]:
        """
        Get all issue keys associated with a specific sprint.

        Args:
            sprint_id: Sprint ID to get issues for

        Returns:
            List of issue keys
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT issue_key 
                        FROM sprint_issues 
                        WHERE sprint_id = %s
                        ORDER BY issue_key;
                        """,
                        (sprint_id,),
                    )

                    results = cur.fetchall()
                    return [row[0] for row in results]

        except Exception as e:
            self._log_error(f"Error getting issues for sprint {sprint_id}", e)
            return []

    def get_sprint_issue_count(self) -> int:
        """
        Get total count of sprint-issue associations.

        Returns:
            Total count of associations
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) FROM sprint_issues;")
                    result = cur.fetchone()
                    return result[0] if result else 0

        except Exception as e:
            self._log_error("Error getting sprint-issue association count", e)
            return 0

    def get_sprint_issue_summary(self) -> Dict[str, Any]:
        """
        Get summary statistics for sprint-issue associations.

        Returns:
            Dictionary with summary statistics
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    # Get total associations
                    cur.execute("SELECT COUNT(*) FROM sprint_issues;")
                    total_associations = cur.fetchone()[0]

                    # Get unique issues count
                    cur.execute("SELECT COUNT(DISTINCT issue_key) FROM sprint_issues;")
                    unique_issues = cur.fetchone()[0]

                    # Get unique sprints count
                    cur.execute("SELECT COUNT(DISTINCT sprint_id) FROM sprint_issues;")
                    unique_sprints = cur.fetchone()[0]

                    return {
                        "total_associations": total_associations,
                        "unique_issues": unique_issues,
                        "unique_sprints": unique_sprints,
                    }

        except Exception as e:
            self._log_error("Error getting sprint-issue summary", e)
            return {
                "total_associations": 0,
                "unique_issues": 0,
                "unique_sprints": 0,
            }