##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

from datetime import date, datetime
import time
from typing import List

from jobs.base import BaseSyncJob, JobResult, JobConfig
from services import OAuthJiraClient, SprintService
from repositories import SprintRepository

class ProactiveSprintsSyncJob(BaseSyncJob):
    
    def __init__(self, config: JobConfig):
        """
        Initialize the proactive sprints sync job.

        Args:
            config: JobConfig with job parameters
        """
        super().__init__(config)
        self.oauth_client = None
        self.sprint_repo = None
        self.sprint_service = None
        
    def validate_parameters(self) -> tuple[bool, List[str]]:
        """
        Validate job parameters before execution.

        Pydantic validation in ProactiveSyncRequest handles all necessary validation.
        Only add validation which can't be handled using Pydantic inside ProactiveSyncRequest

        Returns:
            Tuple of (is_valid, error_messages)
        """
        return True, []
    
    def _initialize_services(self) -> bool:
        try:
            self.oauth_client = OAuthJiraClient(self.config.jira_credentials)
            
            # Test connection
            try:
                self.oauth_client.get_myself()
            except Exception as e:
                print(f"❌ Error initializing oauth client for {self.__class__.__name__}: {e}")
                return False
            
            self.sprint_service = SprintService(self.oauth_client)
            self.sprint_service.set_oauth_client(self.oauth_client)
            self.sprint_repo = SprintRepository(self.config.tenant_id)
            
            return True
        
        except Exception as e:
            print(f"❌ Error initializing services for {self.__class__.__name__}: {e}")
            
    def execute(self) -> JobResult:
        """
        Execute the proactive sprints synchronization job.

        Returns:
            JobResult with execution metrics and outcomes
        """
        
        result = JobResult(
            success=True,
            message="Proactive Sprints Sync Job completed successfully",
            data={}
        )
        
        start_time = time.time()
        
        try:
            self._update_progress(0, 100, "Initializing services...")
            if not self._initialize_services():
                result.add_error("Failed to initialize required services")
                return result
            
            all_boards = self.sprint_service.get_all_boards()
            
            all_sprints = []
            synced_board_ids = []
            for board in all_boards:
                # X4 was not coming in because our board is of type 'simple'
                if (board.get('type') == 'scrum') or (board.get('type') == 'simple'):
                    board_id = board.get('id')
                    synced_board_ids.append(board_id)
                    sprints = self.sprint_service.get_all_sprints_against_board(board_id)
                    all_sprints.extend(sprints)
                
            # Step 5: Store sprints in database
            if all_sprints:
                self._update_progress(80, 100, "Storing sprints in database...")
                if self.sprint_repo.upsert_sprints(
                    all_sprints, delete_stale_for_board_ids=synced_board_ids
                ):
                    # Get final metrics
                    total_sprints_in_db = self.sprint_repo.get_sprint_count()
                    sprint_summary = self.sprint_repo.get_sprint_summary()

                    result.data["total_sprints_in_db"] = total_sprints_in_db
                    result.records_created = len(all_sprints)  # Approximation
                else:
                    result.add_error("Failed to store sprints in database")
                    return result
            else:
                result.add_warning("No sprints found to store")

            # Step 6: Complete
            self._update_progress(100, 100, "Sprint sync completed")
            
        except Exception as e:
            result.add_error(f"Proactive Sprints sync execution failed: {str(e)}")
        finally:
            result.execution_time = time.time() - start_time
        
        return result