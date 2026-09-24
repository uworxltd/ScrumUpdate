##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Issue relationship repository for database operations.
Handles all issue relationship database interactions.
"""

from typing import List, Dict, Any, Optional
from psycopg2.extras import RealDictCursor

from .base_repository import BaseRepository


class IssueRelationshipRepository(BaseRepository):
    """
    Repository for issue relationship data operations.
    Handles parent-child relationships between issues (subtasks, epics, etc.) with multi-tenant support.
    """

    def upsert_relationships(
        self,
        relationships_data: List[Dict[str, Any]],
        issue_keys: Optional[List[str]] = None,
    ) -> bool:
        """
        Insert or update issue relationships, then remove stale ones for synced issues.

        Args:
            relationships_data: List of relationship dictionaries
                Expected format: {
                    'parent_issue_key': 'PROJ-100',
                    'child_issue_key': 'PROJ-456',
                    'relationship_type': 'epic_child'
                }
            issue_keys: Synced issue keys to scope stale deletion (parent or child)

        Returns:
            bool: True if successful, False otherwise
        """
        relationships_data = relationships_data or []
        synced_issue_keys = list(
            {
                *(issue_keys or []),
                *(
                    r.get("parent_issue_key")
                    for r in relationships_data
                    if r.get("parent_issue_key")
                ),
                *(
                    r.get("child_issue_key")
                    for r in relationships_data
                    if r.get("child_issue_key")
                ),
            }
        )

        if not relationships_data and not synced_issue_keys:
            self._log_success("No relationship data to insert")
            return True

        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT NOW()")
                    batch_timestamp = cur.fetchone()[0]

                    for relationship in relationships_data:
                        cur.execute(
                            """
                            INSERT INTO issue_relationships 
                            (parent_issue_key, child_issue_key, relationship_type, last_synced_at)
                            VALUES (%s, %s, %s, %s)
                            ON CONFLICT (parent_issue_key, child_issue_key, relationship_type) 
                            DO UPDATE SET 
                                last_synced_at = EXCLUDED.last_synced_at;
                            """,
                            (
                                relationship["parent_issue_key"],
                                relationship["child_issue_key"],
                                relationship["relationship_type"],
                                batch_timestamp,
                            ),
                        )

                    deleted_count = 0
                    if synced_issue_keys:
                        if relationships_data:
                            cur.execute(
                                """
                                DELETE FROM issue_relationships
                                WHERE (parent_issue_key = ANY(%s) OR child_issue_key = ANY(%s))
                                  AND (last_synced_at IS NULL OR last_synced_at != %s)
                                """,
                                (synced_issue_keys, synced_issue_keys, batch_timestamp),
                            )
                        else:
                            cur.execute(
                                """
                                DELETE FROM issue_relationships
                                WHERE parent_issue_key = ANY(%s) OR child_issue_key = ANY(%s)
                                """,
                                (synced_issue_keys, synced_issue_keys),
                            )
                        deleted_count = cur.rowcount

                    conn.commit()
                    self._log_success(
                        f"Successfully upserted {len(relationships_data)} issue relationships"
                        f" (removed {deleted_count} stale)",
                        len(relationships_data),
                    )
                    return True

        except Exception as e:
            self._log_error("Error inserting issue relationships", e)
            return False

    def clean_relationships_for_issues(self, issue_keys: List[str]) -> bool:
        """Delete all relationships where the issue is parent or child."""
        if not issue_keys:
            return True
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        DELETE FROM issue_relationships
                        WHERE parent_issue_key = ANY(%s) OR child_issue_key = ANY(%s);
                        """,
                        (issue_keys, issue_keys),
                    )
                    deleted_count = cur.rowcount
                    conn.commit()
                    self._log_success(
                        f"Successfully cleaned {deleted_count} relationships for {len(issue_keys)} issues"
                    )
                    return True
        except Exception as e:
            self._log_error("Error cleaning issue relationships", e)
            return False
