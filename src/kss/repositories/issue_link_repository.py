##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Issue Link Repository for managing issue link associations.

This repository handles the relationships between issues through Jira issue links,
storing connections like "blocks", "relates to", "duplicates", etc.
"""

from typing import List, Dict, Any
from psycopg2.extras import execute_values
from database import DatabaseManager
from repositories.base_repository import BaseRepository
from datetime import datetime


class IssueLinkRepository(BaseRepository):
    """Repository for managing issue link associations."""

    def __init__(self, tenant_id: str):
        """
        Initialize the issue link repository.

        Args:
            tenant_id: Tenant identifier for database operations
        """
        super().__init__(tenant_id)
        self.db_manager = DatabaseManager()

    def upsert_issue_links(self, issue_link_data: List[Dict[str, Any]]) -> bool:
        """
        Synchronize issue link associations using a bulk operation.
        Uses a batch timestamp to sync data, deleting any stale links for the source issues.

        Args:
            issue_link_data: List of issue link association dictionaries
                            Each dict should have: source_issue_key, linked_issue_key, link_type

        Returns:
            bool: True if successful, False otherwise
        """
        if not issue_link_data:
            self._log_success("No issue link associations to sync")
            return True

        # De-duplicate the issue link data
        unique_links = []
        seen_links = set()
        for link in issue_link_data:
            link_tuple = (
                link.get("source_issue_key"),
                link.get("linked_issue_key"),
                link.get("link_type"),
            )
            if all(link_tuple) and link_tuple not in seen_links:
                unique_links.append(link)
                seen_links.add(link_tuple)
        
        if not unique_links:
            self._log_success("No unique issue link associations to sync after de-duplication")
            return True

        # Get the set of source issues being synced
        source_issue_keys = list(set(link["source_issue_key"] for link in unique_links))

        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    # Step 1: Get a single timestamp for the entire batch
                    cur.execute("SELECT NOW()")
                    batch_timestamp = cur.fetchone()[0]

                    # Step 2: Prepare data for bulk upsert
                    values_to_insert = [
                        (
                            link["source_issue_key"],
                            link["linked_issue_key"],
                            link["link_type"],
                            batch_timestamp,
                        )
                        for link in unique_links
                    ]

                    # Step 3: Execute bulk upsert
                    upsert_sql = """
                        INSERT INTO issue_links
                        (source_issue_key, linked_issue_key, link_type, last_synced_at)
                        VALUES %s
                        ON CONFLICT (source_issue_key, linked_issue_key, link_type)
                        DO UPDATE SET
                            last_synced_at = EXCLUDED.last_synced_at;
                    """
                    execute_values(cur, upsert_sql, values_to_insert)

                    # Step 4: Scoped stale delete for source issues in this batch only.
                    # Never use a global last_synced_at delete — link sync is per-issue.
                    cur.execute(
                        """
                        DELETE FROM issue_links
                        WHERE source_issue_key = ANY(%s)
                          AND (last_synced_at IS NULL OR last_synced_at != %s)
                        """,
                        (source_issue_keys, batch_timestamp),
                    )
                    deleted_count = cur.rowcount

                    conn.commit()
                    self._log_success(
                        f"Successfully synced {len(unique_links)} issue links for {len(source_issue_keys)} source issues"
                        f" (removed {deleted_count} stale)",
                        len(unique_links),
                    )
                    return True

        except Exception as e:
            self._log_error("Error syncing issue link associations to database", e)
            return False

    def clean_issue_links_for_issues(self, issue_keys: List[str]) -> bool:
        """
        Clean existing issue link associations for the given issues.
        This is used before re-syncing to ensure clean state.

        Args:
            issue_keys: List of issue keys to clean link associations for

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
                        DELETE FROM issue_links 
                        WHERE source_issue_key = ANY(%s);
                        """,
                        (issue_keys,),
                    )

                    deleted_count = cur.rowcount
                    conn.commit()
                    self._log_success(
                        f"Successfully cleaned {deleted_count} issue link associations for {len(issue_keys)} issues"
                    )
                    return True

        except Exception as e:
            self._log_error("Error cleaning issue link associations", e)
            return False

    def get_issue_link_count(self) -> int:
        """
        Get total count of issue link associations.

        Returns:
            Total count of associations
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) FROM issue_links;")
                    result = cur.fetchone()
                    return result[0] if result else 0

        except Exception as e:
            self._log_error("Error getting issue link association count", e)
            return 0

    def get_issue_link_summary(self) -> Dict[str, Any]:
        """
        Get summary statistics for issue link associations.

        Returns:
            Dictionary with summary statistics
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    # Get total associations
                    cur.execute("SELECT COUNT(*) FROM issue_links;")
                    total_links = cur.fetchone()[0]

                    # Get unique source issues count
                    cur.execute(
                        "SELECT COUNT(DISTINCT source_issue_key) FROM issue_links;"
                    )
                    unique_source_issues = cur.fetchone()[0]

                    # Get unique linked issues count
                    cur.execute(
                        "SELECT COUNT(DISTINCT linked_issue_key) FROM issue_links;"
                    )
                    unique_linked_issues = cur.fetchone()[0]

                    # Get link types breakdown
                    cur.execute(
                        """
                        SELECT link_type, COUNT(*) as count 
                        FROM issue_links 
                        GROUP BY link_type 
                        ORDER BY count DESC;
                        """
                    )
                    link_types = {row[0]: row[1] for row in cur.fetchall()}

                    return {
                        "total_links": total_links,
                        "unique_source_issues": unique_source_issues,
                        "unique_linked_issues": unique_linked_issues,
                        "link_types_breakdown": link_types,
                    }

        except Exception as e:
            self._log_error("Error getting issue link summary", e)
            return {
                "total_links": 0,
                "unique_source_issues": 0,
                "unique_linked_issues": 0,
                "link_types_breakdown": {},
            }