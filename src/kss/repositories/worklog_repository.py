##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Worklog repository for database operations.
Handles all worklog-related database interactions.
"""

from typing import List, Dict, Any, Optional
from psycopg2.extras import RealDictCursor, execute_values
import json

from .base_repository import BaseRepository


class WorklogRepository(BaseRepository):
    """
    Repository for worklog data operations.
    Encapsulates all worklog-related database operations with multi-tenant support.
    """

    def upsert_worklogs(
        self,
        worklogs_data: List[Dict[str, Any]],
        issue_keys: Optional[List[str]] = None,
    ) -> bool:
        """
        Insert or update worklogs data in the database using a bulk operation.
        Uses a batch timestamp to sync data, deleting any worklogs not present in
        the batch for the synced issue keys only (scoped stale delete).

        Args:
            worklogs_data: List of worklog dictionaries
            issue_keys: Issue keys included in this sync (needed when payload is empty)

        Returns:
            bool: True if successful, False otherwise
        """
        worklogs_data = worklogs_data or []
        synced_issue_keys = list(
            {
                *(issue_keys or []),
                *(
                    w.get("issue_key")
                    for w in worklogs_data
                    if w.get("issue_key")
                ),
            }
        )

        if not worklogs_data and not synced_issue_keys:
            self._log_success("No worklogs data to sync")
            return True

        # De-duplicate worklogs data based on worklog_id
        unique_worklogs = []
        seen_worklog_ids = set()
        for worklog in worklogs_data:
            worklog_id = worklog.get("worklog_id")
            if worklog_id and worklog_id not in seen_worklog_ids:
                unique_worklogs.append(worklog)
                seen_worklog_ids.add(worklog_id)

        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT NOW()")
                    batch_timestamp = cur.fetchone()[0]

                    if unique_worklogs:
                        values_to_insert = [
                            (
                                worklog["worklog_id"],
                                worklog["issue_key"],
                                worklog.get("author_display_name"),
                                worklog.get("author_account_id"),
                                worklog.get("update_author_display_name"),
                                worklog.get("update_author_account_id"),
                                worklog.get("time_spent_seconds", 0),
                                json.dumps(worklog.get("comment")),
                                worklog.get("created_date"),
                                worklog.get("updated_date"),
                                worklog.get("started_date"),
                                batch_timestamp,
                            )
                            for worklog in unique_worklogs
                        ]

                        upsert_sql = """
                            INSERT INTO worklogs
                            (worklog_id, issue_key, author_display_name, author_account_id,
                            update_author_display_name, update_author_account_id,
                            time_spent_seconds, comment, created_date, updated_date, started_date, last_synced_at)
                            VALUES %s
                            ON CONFLICT (worklog_id)
                            DO UPDATE SET
                                issue_key = EXCLUDED.issue_key,
                                author_display_name = EXCLUDED.author_display_name,
                                author_account_id = EXCLUDED.author_account_id,
                                update_author_display_name = EXCLUDED.update_author_display_name,
                                update_author_account_id = EXCLUDED.update_author_account_id,
                                time_spent_seconds = EXCLUDED.time_spent_seconds,
                                comment = EXCLUDED.comment,
                                created_date = EXCLUDED.created_date,
                                updated_date = EXCLUDED.updated_date,
                                started_date = EXCLUDED.started_date,
                                last_synced_at = EXCLUDED.last_synced_at;
                        """
                        execute_values(cur, upsert_sql, values_to_insert)

                    deleted_count = 0
                    if synced_issue_keys:
                        if unique_worklogs:
                            cur.execute(
                                """
                                DELETE FROM worklogs
                                WHERE issue_key = ANY(%s)
                                  AND (last_synced_at IS NULL OR last_synced_at != %s)
                                """,
                                (synced_issue_keys, batch_timestamp),
                            )
                        else:
                            cur.execute(
                                """
                                DELETE FROM worklogs
                                WHERE issue_key = ANY(%s)
                                """,
                                (synced_issue_keys,),
                            )
                        deleted_count = cur.rowcount

                    conn.commit()
                    self._log_success(
                        f"Successfully synced {len(unique_worklogs)} worklogs"
                        f" (removed {deleted_count} stale)",
                        len(unique_worklogs),
                    )
                    return True

        except Exception as e:
            self._log_error("Error syncing worklogs to database", e)
            return False

    def get_worklogs_by_issue_keys(self, issue_keys: List[str]) -> List[Dict[str, Any]]:
        """
        Retrieve worklogs for specific issue keys from the database.

        Args:
            issue_keys: List of issue keys to get worklogs for

        Returns:
            List of worklog dictionaries
        """
        if not issue_keys:
            return []

        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    placeholders = ",".join(["%s"] * len(issue_keys))

                    cur.execute(
                        f"""
                        SELECT * FROM worklogs 
                        WHERE issue_key IN ({placeholders})
                        ORDER BY issue_key, created_date DESC;
                        """,
                        issue_keys,
                    )
                    return [dict(row) for row in cur.fetchall()]

        except Exception as e:
            self._log_error("Error retrieving worklogs by issue keys", e)
            return []

    def get_worklogs_by_date_range(self, date_from: str, date_to: str) -> List[Dict[str, Any]]:
        """
        Retrieve worklogs within a specific date range.

        Args:
            date_from: Start date (YYYY-MM-DD format)
            date_to: End date (YYYY-MM-DD format)

        Returns:
            List of worklog dictionaries
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT * FROM worklogs 
                        WHERE created_date >= %s AND created_date <= %s
                        ORDER BY created_date DESC;
                        """,
                        (date_from, date_to),
                    )
                    return [dict(row) for row in cur.fetchall()]

        except Exception as e:
            self._log_error("Error retrieving worklogs by date range", e)
            return []

    def get_worklog_count(self) -> int:
        """
        Get the total number of worklogs in the database.

        Returns:
            int: Number of worklogs
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) FROM worklogs;")
                    return cur.fetchone()[0]

        except Exception as e:
            self._log_error("Error getting worklog count", e)
            return 0

    def get_worklog_summary_by_author(self) -> Dict[str, Dict[str, Any]]:
        """
        Get a summary of worklogs by author with time spent totals.

        Returns:
            Dictionary with worklog summaries by author
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT 
                            author_display_name,
                            author_account_id,
                            COUNT(*) as worklog_count,
                            SUM(time_spent_seconds) as total_time_seconds,
                            ROUND(SUM(time_spent_seconds) / 3600.0, 2) as total_time_hours
                        FROM worklogs
                        WHERE author_display_name IS NOT NULL
                        GROUP BY author_display_name, author_account_id
                        ORDER BY total_time_seconds DESC;
                        """
                    )

                    result = {}
                    for row in cur.fetchall():
                        author_display_name = row[0]
                        result[author_display_name] = {
                            "account_id": row[1],
                            "worklog_count": row[2],
                            "total_time_seconds": row[3],
                            "total_time_hours": row[4],
                        }

                    return result

        except Exception as e:
            self._log_error("Error getting worklog summary by author", e)
            return {}
