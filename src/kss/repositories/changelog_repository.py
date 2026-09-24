##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Changelog repository for database operations.
Handles all changelog-related database interactions.
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from psycopg2.extras import RealDictCursor, execute_values

from .base_repository import BaseRepository


class ChangelogRepository(BaseRepository):
    """
    Repository for changelog data operations.
    Encapsulates all changelog-related database operations with multi-tenant support.
    """

    def upsert_changelogs(
        self,
        changelogs_data: List[Dict[str, Any]],
        issue_keys: Optional[List[str]] = None,
    ) -> bool:
        """
        Insert or update changelogs data in the database using a bulk operation.
        Uses a batch timestamp to sync data, deleting stale changelogs for synced
        issue keys only (scoped stale delete).

        Args:
            changelogs_data: List of changelog dictionaries
            issue_keys: Issue keys included in this sync (needed when payload is empty)

        Returns:
            bool: True if successful, False otherwise
        """
        changelogs_data = changelogs_data or []
        synced_issue_keys = list(
            {
                *(issue_keys or []),
                *(
                    c.get("issue_key")
                    for c in changelogs_data
                    if c.get("issue_key")
                ),
            }
        )

        if not changelogs_data and not synced_issue_keys:
            self._log_success("No changelogs data to sync")
            return True

        # Deduplicate based on changelog_id
        unique_changelogs = []
        seen_changelog_ids = set()
        for changelog in changelogs_data:
            changelog_id = changelog.get("changelog_id") or changelog.get("id")
            if changelog_id and changelog_id not in seen_changelog_ids:
                unique_changelogs.append(changelog)
                seen_changelog_ids.add(changelog_id)

        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT NOW()")
                    batch_timestamp = cur.fetchone()[0]

                    if unique_changelogs:
                        values_to_insert = [
                            (
                                changelog.get("changelog_id") or changelog.get("id"),
                                changelog.get("issue_key"),
                                changelog.get("author_display_name")
                                or changelog.get("author"),
                                changelog.get("created_date")
                                or changelog.get("created"),
                                changelog.get("field_name") or changelog.get("field"),
                                changelog.get("field_type"),
                                changelog.get("from_value"),
                                changelog.get("to_value"),
                                changelog.get("from_display_value")
                                or changelog.get("from_string"),
                                changelog.get("to_display_value")
                                or changelog.get("to_string"),
                                batch_timestamp,
                                changelog.get("author_account_id"),
                            )
                            for changelog in unique_changelogs
                        ]

                        upsert_sql = """
                            INSERT INTO changelogs
                            (changelog_id, issue_key, author_display_name, created_date,
                            field_name, field_type, from_value, to_value,
                            from_display_value, to_display_value, last_synced_at, account_id)
                            VALUES %s
                            ON CONFLICT (changelog_id)
                            DO UPDATE SET
                                issue_key = EXCLUDED.issue_key,
                                author_display_name = EXCLUDED.author_display_name,
                                created_date = EXCLUDED.created_date,
                                field_name = EXCLUDED.field_name,
                                field_type = EXCLUDED.field_type,
                                from_value = EXCLUDED.from_value,
                                to_value = EXCLUDED.to_value,
                                from_display_value = EXCLUDED.from_display_value,
                                to_display_value = EXCLUDED.to_display_value,
                                last_synced_at = EXCLUDED.last_synced_at,
                                account_id = EXCLUDED.account_id;
                        """
                        execute_values(cur, upsert_sql, values_to_insert)

                    deleted_count = 0
                    if synced_issue_keys:
                        if unique_changelogs:
                            cur.execute(
                                """
                                DELETE FROM changelogs
                                WHERE issue_key = ANY(%s)
                                  AND (last_synced_at IS NULL OR last_synced_at != %s)
                                """,
                                (synced_issue_keys, batch_timestamp),
                            )
                        else:
                            cur.execute(
                                """
                                DELETE FROM changelogs
                                WHERE issue_key = ANY(%s)
                                """,
                                (synced_issue_keys,),
                            )
                        deleted_count = cur.rowcount

                    conn.commit()
                    self._log_success(
                        f"Successfully synced {len(unique_changelogs)} changelogs"
                        f" (removed {deleted_count} stale)",
                        len(unique_changelogs),
                    )
                    return True

        except Exception as e:
            self._log_error("Error syncing changelogs to database", e)
            return False

    def get_changelogs_by_issue_keys(
        self, issue_keys: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Retrieve changelogs for specific issue keys from the database.

        Args:
            issue_keys: List of issue keys to get changelogs for

        Returns:
            List of changelog dictionaries
        """
        if not issue_keys:
            return []

        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Create placeholders for the IN clause
                    placeholders = ",".join(["%s"] * len(issue_keys))

                    cur.execute(
                        f"""
                        SELECT * FROM changelogs 
                        WHERE issue_key IN ({placeholders})
                        ORDER BY issue_key, created_date DESC;
                        """,
                        issue_keys,
                    )
                    return [dict(row) for row in cur.fetchall()]

        except Exception as e:
            self._log_error("Error retrieving changelogs from database", e)
            return []

    def get_changelog_count(self) -> int:
        """
        Get the total number of changelogs in the database.

        Returns:
            int: Number of changelogs
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) FROM changelogs;")
                    return cur.fetchone()[0]

        except Exception as e:
            self._log_error("Error getting changelog count", e)
            return 0