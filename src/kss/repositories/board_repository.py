##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Board repository for database operations.
Handles all board-related database interactions.
"""

from datetime import datetime
from typing import List, Dict, Any
from psycopg2.extras import RealDictCursor

from .base_repository import BaseRepository


class BoardRepository(BaseRepository):
    """
    Repository for board data operations.
    Encapsulates all board-related database operations with multi-tenant support.
    """

    def upsert_boards(self, boards_data: List[Dict[str, Any]]) -> bool:
        """
        Insert or update boards data in the database.
        Uses UPSERT pattern to handle duplicates gracefully.

        Args:
            boards_data: List of board dictionaries

        Returns:
            bool: True if successful, False otherwise
        """
        if not boards_data:
            self._log_success("No boards data to insert")
            return True

        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    for board in boards_data:
                        cur.execute(
                            f"""
                            INSERT INTO boards 
                            (board_id, name, type, project_key, project_name, location, updated_at, last_synced_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (board_id) 
                            DO UPDATE SET 
                                name = EXCLUDED.name,
                                type = EXCLUDED.type,
                                project_key = EXCLUDED.project_key,
                                project_name = EXCLUDED.project_name,
                                location = EXCLUDED.location,
                                updated_at = EXCLUDED.updated_at,
                                last_synced_at = EXCLUDED.last_synced_at;
                        """,
                            (
                                board["id"],
                                board["name"],
                                board["type"],
                                board["project_key"],
                                board["project_name"],
                                board.get("location"),  # New field - may be None
                                datetime.now(),
                                datetime.now(),  # Set last_synced_at to current time
                            ),
                        )

                    conn.commit()
                    self._log_success(f"Successfully inserted/updated boards", len(boards_data))
                    return True

        except Exception as e:
            self._log_error("Error inserting boards to database", e)
            return False

    def get_all_boards(self) -> List[Dict[str, Any]]:
        """
        Retrieve all boards from the database.

        Returns:
            List of board dictionaries
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        f"""
                        SELECT board_id, name, type, project_key, project_name, 
                               location, created_at, updated_at, last_synced_at
                        FROM boards
                        ORDER BY name;
                    """
                    )
                    return [dict(row) for row in cur.fetchall()]

        except Exception as e:
            self._log_error("Error retrieving boards from database", e)
            return []

    def get_board_count(self) -> int:
        """
        Get the total number of boards in the database.

        Returns:
            int: Number of boards
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    cur.execute(f"SELECT COUNT(*) FROM boards;")
                    return cur.fetchone()[0]

        except Exception as e:
            self._log_error("Error getting board count", e)
            return 0