##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Base job classes and enums for the Jira sync system.
This module defines the foundation for all sync jobs, providing:
- Job status tracking
- Configuration management
- Abstract base class for consistent job implementation
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict
from typing import Dict, Any, Optional, List
from enum import Enum
from datetime import datetime
import uuid
from models import JiraCredentials, OAuthJiraCredentials


class JobStatus(Enum):
    """
    Enumeration of possible job statuses.
    Used for tracking job lifecycle and providing clear status reporting.
    """
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    RETRY = "retry"
    CANCELLED = "cancelled"


class JobPriority(Enum):
    """
    Job priority levels for queue management.
    Higher priority jobs are processed first.
    """
    LOW = 1
    MEDIUM = 5
    HIGH = 8
    CRITICAL = 10


@dataclass
class JobConfig:
    """
    Configuration class for sync jobs.
    Contains all necessary parameters for job execution and tracking.
    
    Attributes:
        job_id: Unique identifier for the job
        job_type: Type of sync job (boards, sprints, issues, etc.)
        tenant_id: Tenant identifier for multi-tenant isolation
        parameters: Job-specific parameters (filters, options, etc.)
        priority: Job priority level
        max_retries: Maximum number of retry attempts
        timeout: Job timeout in seconds
        created_by: User or system that created the job
        tags: Optional tags for job categorization
        jira_credentials: Optional Jira credentials for multi-tenant authentication
    """
    job_id: str
    job_type: str
    tenant_id: str
    parameters: Dict[str, Any]
    priority: int = JobPriority.MEDIUM.value
    max_retries: int = 3
    timeout: int = 3600  # 1 hour default
    created_by: Optional[str] = "system"
    tags: Optional[List[str]] = None
    jira_credentials: Optional[OAuthJiraCredentials] = None
    
    def __post_init__(self):
        """Initialize default values after dataclass creation"""
        if self.tags is None:
            self.tags = []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert JobConfig to dictionary for serialization"""
        result = asdict(self)
        # Handle JiraCredentials serialization
        if self.jira_credentials:
            result['jira_credentials'] = self.jira_credentials.dict()
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'JobConfig':
        """Create JobConfig from dictionary"""
        # Handle JiraCredentials deserialization
        if 'jira_credentials' in data and data['jira_credentials']:
            data['jira_credentials'] = OAuthJiraCredentials(**data['jira_credentials'])
        return cls(**data)


@dataclass
class JobResult:
    """
    Result container for job execution.
    Provides structured way to return job outcomes and metrics.
    
    Attributes:
        success: Whether the job completed successfully
        message: Human-readable result message
        data: Job-specific result data (counts, IDs, etc.)
        errors: List of errors encountered during execution
        warnings: List of warnings (non-fatal issues)
        execution_time: Time taken to execute the job in seconds
        records_processed: Number of records processed
        records_created: Number of new records created
        records_updated: Number of existing records updated
    """
    success: bool
    message: str
    data: Dict[str, Any]
    errors: List[str] = None
    warnings: List[str] = None
    execution_time: Optional[float] = None
    records_processed: int = 0
    records_created: int = 0
    records_updated: int = 0
    
    def __post_init__(self):
        """Initialize default values"""
        if self.errors is None:
            self.errors = []
        if self.warnings is None:
            self.warnings = []
    
    def add_error(self, error: str):
        """Add an error to the result"""
        self.errors.append(error)
        self.success = False
        self.message = error
    
    def add_warning(self, warning: str):
        """Add a warning to the result"""
        self.warnings.append(warning)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert JobResult to dictionary for serialization"""
        return asdict(self)


class BaseSyncJob(ABC):
    """
    Abstract base class for all sync jobs.
    
    This class provides the foundation for all Jira sync operations:
    - Consistent interface for job execution
    - Parameter validation
    - Progress tracking
    - Error handling patterns
    
    All specific job types (BoardSyncJob, SprintSyncJob, etc.) inherit from this class.
    """
    
    def __init__(self, config: JobConfig):
        """
        Initialize the sync job with configuration.
        
        Args:
            config: JobConfig instance containing job parameters
        """
        self.config = config
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self._progress_callback = None
    
    def set_progress_callback(self, callback):
        """
        Set a callback function for progress updates.
        Useful for real-time job monitoring.
        
        Args:
            callback: Function that accepts (current, total, message) parameters
        """
        self._progress_callback = callback
    
    def _update_progress(self, current: int, total: int, message: str = ""):
        """
        Update job progress if callback is set.
        
        Args:
            current: Current progress count
            total: Total items to process
            message: Optional progress message
        """
        if self._progress_callback:
            self._progress_callback(current, total, message)
    
    @abstractmethod
    def validate_parameters(self) -> tuple[bool, List[str]]:
        """
        Validate job parameters before execution.
        
        Returns:
            Tuple of (is_valid, error_messages)
            - is_valid: True if parameters are valid
            - error_messages: List of validation error messages
        """
        pass
    
    @abstractmethod
    def execute(self) -> JobResult:
        """
        Execute the sync job and return results.
        
        This method contains the main job logic and should:
        1. Validate parameters
        2. Connect to required services
        3. Perform the sync operation
        4. Return structured results
        
        Returns:
            JobResult containing execution outcome and metrics
        """
        pass
    
    def run(self) -> JobResult:
        """
        Main entry point for job execution.
        Handles timing, validation, and error catching.
        
        Returns:
            JobResult with execution outcome
        """
        self.start_time = datetime.now()
        
        try:
            # Validate parameters first
            is_valid, validation_errors = self.validate_parameters()
            if not is_valid:
                return JobResult(
                    success=False,
                    message="Parameter validation failed",
                    data={},
                    errors=validation_errors
                )
            
            # Execute the job
            result = self.execute()
            
            # Calculate execution time
            self.end_time = datetime.now()
            if self.start_time:
                execution_time = (self.end_time - self.start_time).total_seconds()
                result.execution_time = execution_time
            
            return result
            
        except Exception as e:
            self.end_time = datetime.now()
            execution_time = (self.end_time - self.start_time).total_seconds() if self.start_time else 0
            
            return JobResult(
                success=False,
                message=f"Job execution failed: {str(e)}",
                data={},
                errors=[str(e)],
                execution_time=execution_time
            )
    
    def get_job_info(self) -> Dict[str, Any]:
        """
        Get basic information about the job.
        
        Returns:
            Dictionary with job metadata
        """
        return {
            "job_id": self.config.job_id,
            "job_type": self.config.job_type,
            "priority": self.config.priority,
            "max_retries": self.config.max_retries,
            "timeout": self.config.timeout,
            "created_by": self.config.created_by,
            "tags": self.config.tags,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None
        }