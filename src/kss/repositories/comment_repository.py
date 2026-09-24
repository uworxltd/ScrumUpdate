##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Comment repository for database operations.
Handles all comment-related database interactions.
"""

from typing import List, Dict, Any, Optional
from psycopg2.extras import execute_values
import json

from .base_repository import BaseRepository


class CommentRepository(BaseRepository):
    """
    Repository for comment data operations.
    Encapsulates all comment-related database operations with multi-tenant support.
    """

    def upsert_comments(
        self,
        comments_data: List[Dict[str, Any]],
        issue_keys: Optional[List[str]] = None,
    ) -> bool:
        """
        Insert or update comments data in the database using a bulk operation.
        Uses a batch timestamp to sync data, deleting any comments not present in the
        batch for the synced issue keys only (scoped stale delete).

        Args:
            comments_data: List of comment dictionaries
            issue_keys: Issue keys included in this sync. Required for deletion when
                        the remote payload is empty (all comments deleted).

        Returns:
            bool: True if successful, False otherwise
        """
        comments_data = comments_data or []
        synced_issue_keys = list(
            {
                *(issue_keys or []),
                *(
                    c.get("issue_key")
                    for c in comments_data
                    if c.get("issue_key")
                ),
            }
        )

        if not comments_data and not synced_issue_keys:
            self._log_success("No comments data to sync")
            return True

        # De-duplicate comments data based on comment_id
        unique_comments = []
        seen_comment_ids = set()
        for comment in comments_data:
            comment_id = comment.get("comment_id") or comment.get("id")
            if comment_id and comment_id not in seen_comment_ids:
                unique_comments.append(comment)
                seen_comment_ids.add(comment_id)

        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    # Step 1: Get a single timestamp for the entire batch
                    cur.execute("SELECT NOW()")
                    batch_timestamp = cur.fetchone()[0]

                    # Step 2: Prepare data for bulk upsert (may be empty if all deleted)
                    if unique_comments:
                        values_to_insert = [
                            (
                                comment.get("comment_id") or comment.get("id"),
                                comment.get("issue_key"),
                                comment.get("author_display_name")
                                or comment.get("author"),
                                comment.get("comment_body")
                                or json.dumps(comment.get("body")),
                                comment.get("created_date") or comment.get("created"),
                                comment.get("updated_date") or comment.get("updated"),
                                batch_timestamp,  # last_synced_at
                                comment.get("author_account_id"),
                            )
                            for comment in unique_comments
                        ]

                        # Step 3: Execute bulk upsert
                        upsert_sql = """
                            INSERT INTO comments
                            (comment_id, issue_key, author_display_name,
                            comment_body, created_date, updated_date, last_synced_at, account_id)
                            VALUES %s
                            ON CONFLICT (comment_id)
                            DO UPDATE SET
                                issue_key = EXCLUDED.issue_key,
                                author_display_name = EXCLUDED.author_display_name,
                                comment_body = EXCLUDED.comment_body,
                                created_date = EXCLUDED.created_date,
                                updated_date = EXCLUDED.updated_date,
                                last_synced_at = EXCLUDED.last_synced_at,
                                account_id = EXCLUDED.account_id;
                        """
                        execute_values(cur, upsert_sql, values_to_insert)

                    # Step 4: Scoped stale delete for issues in this sync batch only.
                    # Never use a global last_synced_at delete — comment sync is per-issue.
                    deleted_count = 0
                    if synced_issue_keys:
                        if unique_comments:
                            cur.execute(
                                """
                                DELETE FROM comments
                                WHERE issue_key = ANY(%s)
                                  AND (last_synced_at IS NULL OR last_synced_at != %s)
                                """,
                                (synced_issue_keys, batch_timestamp),
                            )
                        else:
                            # All comments removed remotely for these issues
                            cur.execute(
                                """
                                DELETE FROM comments
                                WHERE issue_key = ANY(%s)
                                """,
                                (synced_issue_keys,),
                            )
                        deleted_count = cur.rowcount

                    conn.commit()
                    self._log_success(
                        f"Successfully synced {len(unique_comments)} comments"
                        f" (removed {deleted_count} stale)",
                        len(unique_comments),
                    )
                    return True

        except Exception as e:
            self._log_error("Error syncing comments to database", e)
            return False
