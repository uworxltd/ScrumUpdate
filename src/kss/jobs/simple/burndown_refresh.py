##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Burndown Refresh job implementation.
Refreshes the sprint burndown materialized view after data synchronization.

This job is designed to run after the recent activity workflow completes
to ensure the burndown charts reflect the latest data changes.
"""

import time
from typing import List, Dict, Any
from jobs.base import BaseSyncJob, JobResult, JobConfig
from database import DatabaseManager
from repositories import CacheMetaRepository
from tasks import job_tracker
from tasks.job_tracker import JobStatusTracker
from jobs.base import JobStatus


class BurndownRefreshJob(BaseSyncJob):
    """
    Job class for refreshing sprint burndown materialized view.

    This job executes a simple SQL command to refresh the materialized view
    that powers sprint burndown charts. It's designed to be lightweight
    and run quickly after data synchronization completes.

    No parameters are required - the job only needs the tenant_id to
    determine which schema to refresh.
    """

    def __init__(self, config: JobConfig):
        """
        Initialize the burndown refresh job.

        Args:
            config: JobConfig with job parameters
        """
        super().__init__(config)
        self.db_manager = None
        self.cache_meta_repo = None

    def validate_parameters(self) -> tuple[bool, List[str]]:
        """
        Validate job parameters before execution.

        Returns:
            Tuple of (is_valid, error_messages)
        """
        # No parameters needed for this job
        return True, []

    def _initialize_services(self) -> bool:
        """
        Initialize required services (Database manager).

        Returns:
            True if all services initialized successfully
        """
        try:
            self.db_manager = DatabaseManager()
            self.cache_meta_repo = CacheMetaRepository(self.config.tenant_id)
            return True
        except Exception as e:
            print(f"❌ Error initializing database manager: {e}")
            return False

    def execute(self) -> JobResult:
        """
        Execute the burndown refresh job.

        Returns:
            JobResult with execution status
        """
        result = JobResult(
            success=True,
            message="Burndown materialized view refresh completed successfully",
            data={},
        )

        start_time = time.time()

        try:
            # Step 1: Initialize services
            self._update_progress(0, 100, "Initializing services...")
            if not self._initialize_services():
                result.add_error("Failed to initialize required services")
                return result

            # Step 2: Get tenant schema name
            tenant_id = self.config.tenant_id
            schema_name = f"tenant_{tenant_id.lower().replace('-', '').replace('_', '')}"
            
            self._update_progress(25, 100, f"Refreshing burndown view for tenant: {tenant_id}")
            
            # Step 3: Execute the refresh
            with self.db_manager.get_connection(tenant_id) as conn:
                with conn.cursor() as cur:
                    refresh_sql = f"REFRESH MATERIALIZED VIEW mv_sprint_burndown_daily;"
                    print(f"   🔄 Executing: {refresh_sql}")
                    cur.execute(refresh_sql)
                    conn.commit()

            # Step 4: Complete
            self._update_progress(100, 100, "Burndown refresh completed")

            # Set final result data
            result.data.update({
                "tenant_id": tenant_id,
                "schema_name": schema_name,
                "view_name": "mv_sprint_burndown_daily",
                "execution_time_seconds": round(time.time() - start_time, 2)
            })

            print(f"✅ Burndown materialized view refreshed for tenant: {tenant_id}")
            
            # TODO: Move to a reasonable place
            # Do we need to handle multiple sprints? - Waqas
            cache_status = self.cache_meta_repo.delete_by_key(self.config.parameters.get('sprint_ids')[0])
            if cache_status:
                print(f"✅ Cache pruned for tenant: {tenant_id}")
                
            custom_tracker = JobStatusTracker(tenant_id)
            placeholder_job_status = custom_tracker.update_job_status(f'placholder_sync_{tenant_id}', JobStatus.SUCCESS)

        except Exception as e:
            error_msg = f"Failed to refresh burndown materialized view: {str(e)}"
            print(f"❌ {error_msg}")
            result.add_error(error_msg)
            result.data["error_details"] = str(e)

        return result