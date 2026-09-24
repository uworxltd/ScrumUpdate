##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Sprint repository for database operations.
Handles all sprint-related database interactions.
"""

from datetime import datetime
from typing import List, Dict, Any
from psycopg2.extras import RealDictCursor, execute_values

from .base_repository import BaseRepository


class SprintRepository(BaseRepository):
    """
    Repository for sprint data operations.
    Encapsulates all sprint-related database operations with multi-tenant support.
    """

    def upsert_sprints(
        self,
        sprints_data: List[Dict[str, Any]],
        delete_stale_for_board_ids: List = None,
    ) -> bool:
        """
        Synchronize sprints data in the database using a bulk operation.
        Optionally deletes stale sprints for the given board ids only.

        Args:
            sprints_data: List of sprint dictionaries
            delete_stale_for_board_ids: Board ids whose sprints were fully fetched;
                stale rows for those boards are removed. Never deletes globally.

        Returns:
            bool: True if successful, False otherwise
        """
        if not sprints_data:
            self._log_success("No sprints data to sync")
            return True
        
        # Deduplicaate based on sprint_id
        unique_sprints = []
        seen_sprint_ids = set()
        for sprint in sprints_data:
            sprint_id = sprint.get('id')
            if sprint_id and sprint_id not in seen_sprint_ids:
                unique_sprints.append(sprint)
                seen_sprint_ids.add(sprint_id)
                
        if not unique_sprints:
            self._log_success("No unique sprints to store after de-duplication")
            return True

        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    # Step 1: Get a single timestamp for the entire batch
                    cur.execute("SELECT NOW()")
                    batch_timestamp = cur.fetchone()[0]

                    # Step 2: Prepare data for bulk upsert
                    values_to_insert = [
                        (
                            sprint.get('id'),
                            sprint.get('board_id'),
                            sprint.get('name'),
                            sprint.get('state'),
                            sprint.get('start_date'),
                            sprint.get('end_date'),
                            sprint.get('complete_date'),
                            sprint.get('goal'),
                            batch_timestamp,  # last_synced_at
                        )
                        for sprint in unique_sprints
                    ]

                    # Step 3: Execute bulk upsert
                    upsert_sql = """
                        INSERT INTO sprints
                        (sprint_id, board_id, name, state, start_date, end_date,
                        complete_date, goal, last_synced_at)
                        VALUES %s
                        ON CONFLICT (sprint_id)
                        DO UPDATE SET
                            board_id = EXCLUDED.board_id,
                            name = EXCLUDED.name,
                            state = EXCLUDED.state,
                            start_date = EXCLUDED.start_date,
                            end_date = EXCLUDED.end_date,
                            complete_date = EXCLUDED.complete_date,
                            goal = EXCLUDED.goal,
                            last_synced_at = EXCLUDED.last_synced_at;
                    """
                    execute_values(cur, upsert_sql, values_to_insert)

                    # Step 4: Scoped stale delete for boards that were fully synced
                    deleted_count = 0
                    if delete_stale_for_board_ids:
                        board_ids = list(set(delete_stale_for_board_ids))
                        cur.execute(
                            """
                            DELETE FROM sprints
                            WHERE board_id = ANY(%s)
                              AND (last_synced_at IS NULL OR last_synced_at != %s)
                            """,
                            (board_ids, batch_timestamp),
                        )
                        deleted_count = cur.rowcount

                    conn.commit()
                    self._log_success(
                        f"Successfully synced {len(unique_sprints)} sprints"
                        f" (removed {deleted_count} stale)",
                        len(unique_sprints),
                    )
                    return True

        except Exception as e:
            self._log_error("Error syncing sprints to database", e)
            return False

    def get_active_sprints(self) -> List[Dict[str, Any]]:
        """
        Retrieve all active sprints from the database.

        Returns:
            List of active sprint dictionaries
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        f"""
                        SELECT s.sprint_id, s.name as sprint_name, s.board_id, b.name as board_name,
                               s.state, s.start_date, s.end_date, s.goal, s.updated_at
                        FROM sprints s
                        JOIN boards b ON s.board_id = b.board_id
                        WHERE s.state = 'active'
                        ORDER BY s.start_date DESC;
                    """
                    )
                    return [dict(row) for row in cur.fetchall()]

        except Exception as e:
            self._log_error("Error retrieving active sprints from database", e)
            return []

    def get_sprints_by_board(self, board_id: int) -> List[Dict[str, Any]]:
        """
        Retrieve all sprints for a specific board.

        Args:
            board_id: The board ID to filter by

        Returns:
            List of sprint dictionaries for the board
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        f"""
                        SELECT sprint_id, name as sprint_name, board_id, state, start_date, 
                               end_date, complete_date, goal, updated_at
                        FROM sprints
                        WHERE board_id = %s
                        ORDER BY start_date DESC;
                    """,
                        (board_id,),
                    )
                    return [dict(row) for row in cur.fetchall()]

        except Exception as e:
            self._log_error(f"Error retrieving sprints for board {board_id}", e)
            return []

    def get_sprint_count(self) -> int:
        """
        Get the total number of sprints in the database.

        Returns:
            int: Number of sprints
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    cur.execute(f"SELECT COUNT(*) FROM sprints;")
                    return cur.fetchone()[0]

        except Exception as e:
            self._log_error("Error getting sprint count", e)
            return 0

    def find_by_id(self, sprint_id: int) -> Dict[str, Any] | None:
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        f"""
                        SELECT sprint_id, name as sprint_name, board_id, state, start_date, 
                               end_date, complete_date, goal, last_synced_at
                        FROM sprints
                        WHERE sprint_id = %s
                    """,
                        (sprint_id,),
                    )
                    row = cur.fetchone()    
                    return dict(row) if row else None
        except Exception as e:
            self._log_error(f"Error retrieving sprint against id: {sprint_id}", e)
            return None
        
    def get_all_sprints(self) -> List[Dict[str, Any]]:
        """
        Retrieve all sprints from the database with story points aggregation.

        Returns:
            List of all sprint dictionaries with board information and story points summary
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        f"""
                        WITH sprint_story_points AS (
                            SELECT 
                                si.sprint_id,
                                COALESCE(SUM(i.story_points), 0)::numeric(10,2) AS total_story_points,
                                COALESCE(SUM(CASE WHEN i.status_category = 'Done' THEN i.story_points ELSE 0 END), 0)::numeric(10,2) AS resolved_story_points
                            FROM sprint_issues si
                            INNER JOIN issues i ON si.issue_key = i.issue_key
                            GROUP BY si.sprint_id
                        )
                        SELECT s.sprint_id, s.name as sprint_name, s.board_id, b.name as board_name,
                               s.state, s.start_date, s.end_date, s.complete_date, s.goal, 
                               s.last_synced_at,
                               COALESCE(sp.total_story_points, 0) AS total_story_points,
                               COALESCE(sp.resolved_story_points, 0) AS resolved_story_points
                        FROM sprints s
                        LEFT JOIN boards b ON s.board_id = b.board_id
                        LEFT JOIN sprint_story_points sp ON s.sprint_id = sp.sprint_id
                        ORDER BY s.start_date DESC NULLS LAST;
                    """
                    )
                    return [dict(row) for row in cur.fetchall()]

        except Exception as e:
            self._log_error("Error retrieving all sprints from database", e)
            return []

    def upsert_sprints_preserve_sync_timestamp(self, sprints_data: List[Dict[str, Any]]) -> bool:
        """
        Upsert sprints while preserving existing last_synced_at values.
        For existing records: Updates all fields EXCEPT last_synced_at
        For new records: Sets last_synced_at to NULL
        
        Args:
            sprints_data: List of sprint dictionaries

        Returns:
            bool: True if successful, False otherwise
        """
        if not sprints_data:
            self._log_success("No sprints data to sync")
            return True
        
        # Deduplicate based on sprint_id
        unique_sprints = []
        seen_sprint_ids = set()
        for sprint in sprints_data:
            sprint_id = sprint.get('id')
            if sprint_id and sprint_id not in seen_sprint_ids:
                unique_sprints.append(sprint)
                seen_sprint_ids.add(sprint_id)
                
        if not unique_sprints:
            self._log_success("No unique sprints to store after de-duplication")
            return True

        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    # Prepare data for bulk upsert
                    values_to_insert = [
                        (
                            sprint.get('id'),
                            sprint.get('board_id'),
                            sprint.get('name'),
                            sprint.get('state'),
                            sprint.get('start_date'),
                            sprint.get('end_date'),
                            sprint.get('complete_date'),
                            sprint.get('goal'),
                            None,  # last_synced_at set to NULL for new records
                        )
                        for sprint in unique_sprints
                    ]

                    # Execute bulk upsert with preserved last_synced_at
                    upsert_sql = """
                        INSERT INTO sprints
                        (sprint_id, board_id, name, state, start_date, end_date,
                        complete_date, goal, last_synced_at)
                        VALUES %s
                        ON CONFLICT (sprint_id)
                        DO UPDATE SET
                            board_id = EXCLUDED.board_id,
                            name = EXCLUDED.name,
                            state = EXCLUDED.state,
                            start_date = EXCLUDED.start_date,
                            end_date = EXCLUDED.end_date,
                            complete_date = EXCLUDED.complete_date,
                            goal = EXCLUDED.goal
                            -- Deliberately NOT updating last_synced_at to preserve existing values
                    """
                    execute_values(cur, upsert_sql, values_to_insert)

                    conn.commit()
                    self._log_success(f"Successfully synced {len(unique_sprints)} sprints with preserved timestamps", len(unique_sprints))
                    return True

        except Exception as e:
            self._log_error("Error syncing sprints to database with preserved timestamps", e)
            return False

    def update_sprints_last_synced_at(self, sprint_ids: List[int]) -> bool:
        """
        Update the last_synced_at timestamp for multiple sprints.

        Args:
            sprint_ids: List of sprint IDs to update

        Returns:
            bool: True if successful, False otherwise
        """
        if not sprint_ids:
            self._log_success("No sprint IDs provided to update")
            return True
            
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE sprints
                        SET last_synced_at = NOW()
                        WHERE sprint_id = ANY(%s);
                        """,
                        (sprint_ids,)
                    )
                    
                    rows_affected = cur.rowcount
                    conn.commit()
                    
                    self._log_success(f"Updated last_synced_at for {rows_affected} sprints")
                    return True

        except Exception as e:
            self._log_error(f"Error updating last_synced_at for sprints", e)
            return False

    def get_sprint_summary(self) -> Dict[str, int]:
        """
        Get a summary of sprints by state.

        Returns:
            Dictionary with sprint counts by state
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        f"""
                        SELECT state, COUNT(*) as count
                        FROM sprints
                        GROUP BY state
                        ORDER BY state;
                    """
                    )
                    return {row[0]: row[1] for row in cur.fetchall()}

        except Exception as e:
            print(f"❌ Error getting sprint summary: {e}")
            return {}