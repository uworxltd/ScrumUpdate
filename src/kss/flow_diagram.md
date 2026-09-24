# Job Submission Flow Diagram

```
HTTP POST /api/jobs/submit
         ↓
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Layer                            │
│  (api/job_manager.py - submit_sync_job function)           │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│                Request Validation                           │
│  • Pydantic model validation (JobSubmissionRequest)        │
│  • Job type validation (boards, sprints, etc.)             │
│  • Parameter validation via JobFactory                     │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│                Job Factory Layer                            │
│  • job_factory.validate_job_config()                       │
│  • Creates temporary job instance for validation           │
│  • Calls job.validate_parameters()                         │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│                Task Submission                              │
│  • tasks.submit_job() function called                      │
│  • Creates JobConfig with unique job_id                    │
│  • Submits to appropriate Celery queue                     │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│                Redis Queue                                  │
│  • Task stored in Redis with priority                      │
│  • Routed to specific queue (boards/sprints/etc.)          │
│  • Waits for available worker                              │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│                Celery Worker                                │
│  • Worker picks up task from queue                         │
│  • Calls sync_boards_task() or sync_sprints_task()         │
│  • Creates database job record                             │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│                Job Execution                                │
│  • JobFactory creates actual job instance                  │
│  • Job.run() executes the sync logic                       │
│  • Progress updates stored in Redis                        │
│  • Results stored in database                              │
└─────────────────────────────────────────────────────────────┘
```