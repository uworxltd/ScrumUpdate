##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Base workflow class and utilities for workflow orchestration.

This module provides the abstract BaseWorkflow class that all workflow
implementations must inherit from, along with helper methods for creating
workflow configurations and results.
"""

from abc import abstractmethod
from typing import Dict, Any

from jobs.base import BaseSyncJob, JobResult


class BaseWorkflow(BaseSyncJob):
    """
    Abstract base class for workflow orchestration.
    
    Workflows are complex sync operations that involve multiple steps with dependencies.
    They use Celery primitives (chain, group) to orchestrate execution.
    
    Subclasses must implement the orchestrate() method to define workflow logic.
    """
    
    def execute(self) -> JobResult:
        """
        Execute the workflow by calling orchestrate().
        
        This method overrides BaseSyncJob.execute() to delegate to orchestrate().
        
        Returns:
            JobResult containing workflow execution outcome
        """
        return self.orchestrate()
    
    @abstractmethod
    def orchestrate(self) -> JobResult:
        """
        Define and execute the workflow orchestration logic.
        
        This method should:
        1. Create job configurations for workflow steps
        2. Use Celery primitives (chain, group) to define execution order
        3. Submit the workflow for execution
        4. Return a JobResult with workflow metadata
        
        Returns:
            JobResult containing workflow execution outcome
        """
        pass
    
    def _create_step_config(
        self, 
        job_type: str, 
        parameters: Dict[str, Any],
        step_name: str = None
    ) -> Dict[str, Any]:
        """
        Create a job configuration dictionary for a workflow step.
        
        This helper method creates a properly formatted job config that can be
        passed to Celery tasks in the workflow.
        
        Args:
            job_type: Type of job for this step
            parameters: Job-specific parameters
            step_name: Optional name for this step (for tracking)
        
        Returns:
            Dictionary containing job configuration
        """
        step_config = {
            "job_id": f"temp_{job_type}_{step_name or 'step'}",  # Temporary, will be replaced by task_id
            "job_type": job_type,
            "tenant_id": self.config.tenant_id,
            "parameters": parameters,
            "priority": self.config.priority,
            "created_by": self.config.created_by,
            "jira_credentials": self.config.jira_credentials.dict() if self.config.jira_credentials else None,
        }
        
        return step_config
    
    def _create_workflow_result(
        self, 
        workflow_id: str, 
        workflow_type: str,
        message: str = "Workflow submitted successfully"
    ) -> JobResult:
        """
        Create a standardized JobResult for workflow submission.
        
        Args:
            workflow_id: Celery workflow result ID
            workflow_type: Type of workflow being executed
            message: Success message
        
        Returns:
            JobResult with workflow metadata
        """
        return JobResult(
            success=True,
            message=message,
            data={
                "workflow_id": workflow_id,
                "workflow_type": workflow_type,
                "status": "submitted"
            }
        )
    
    def _attach_completion_callback(self, workflow_chain, workflow_id: str, workflow_type: str):
        """
        Attach completion and error callbacks to a workflow chain.
        
        Args:
            workflow_chain: The Celery chain/group to attach callbacks to
            workflow_id: The pre-generated workflow UUID
            workflow_type: Type of workflow for tracking
        
        Returns:
            Celery AsyncResult from workflow submission
        """
        from celery import chain
        from jobs.sync_jobs import workflow_completion_callback, workflow_error_callback
        
        # Create metadata for callbacks
        workflow_metadata = {
            'workflow_id': workflow_id,
            'tenant_id': self.config.tenant_id,
            'workflow_type': workflow_type
        }
        
        # Attach completion callback to the end of the chain
        workflow_with_callback = chain(
            workflow_chain,
            workflow_completion_callback.s(workflow_metadata)
        )
        
        # Submit and attach error callback
        result = workflow_with_callback.apply_async(
            priority=self.config.priority,
            link_error=workflow_error_callback.s(workflow_metadata)
        )
        
        return result