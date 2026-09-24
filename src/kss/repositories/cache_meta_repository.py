##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Cache Meta repository for database operations.
Handles all cache_meta-related database interactions.
"""

from .base_repository import BaseRepository


class CacheMetaRepository(BaseRepository):
    """
    Repository for cache_meta data operations.
    Encapsulates all cache_meta-related database operations with multi-tenant support.
    """

    def delete_by_key(self, key: str) -> bool:
        """
        Delete a record from the cache_meta table by key.

        Args:
            key: The key of the record to delete.

        Returns:
            bool: True if successful, False otherwise.
        """
        try:
            with self.db_manager.get_connection(self.tenant_id) as conn:
                with conn.cursor() as cur:
                    search_string = f'%"sprint_id":%{key}%'
                    cur.execute(
                        f"""
                        DELETE FROM {self.schema_name}.cache_meta
                        WHERE key LIKE %s;
                        """,
                        (search_string,),
                    )
                    conn.commit()
                    self._log_success(f"Successfully deleted cache entries for key {key}")
                    return True
        except Exception as e:
            self._log_error(f"Error deleting cache entries for key {key}", e)
            return False