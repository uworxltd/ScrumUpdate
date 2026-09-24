# KSS Jira → PostgreSQL Ingestion Pipeline

(Architecture, Data Flow, Celery Tasks, and System Overview)
**Version:** 2025 Documentation Spike
**Audience:** New Developers, Data Engineers, and Maintainability Team

---

# 1. **System Architecture Overview**

KSS (Khoji Sync Server) is a **multi-tenant Jira data ingestion platform** built on:

- **FastAPI** (API Gateway + Job orchestration)
- **Celery** (distributed async task runner)
- **PostgreSQL (per-tenant schemas)**
- **Jira Cloud / Jira Server APIs** (OAuth 2.0 + Basic Auth)
- **Redis** (Message broker + result backend + progress tracking)
- **Python service + repository architecture**

### **Primary Goal**

Synchronize Jira data into per-tenant PostgreSQL schemas to power analytics features in the Khoji platform.

### **Key Architectural Principles**

1. **Multi-tenancy**: Each tenant gets isolated PostgreSQL schema (e.g., `tenant_1701`)
2. **Separation of Concerns**: Clean layering between API → Jobs → Services → Repositories
3. **Async Processing**: Long-running sync operations handled via Celery workers
4. **Stateless API**: FastAPI handles HTTP requests, delegates work to Celery
5. **OAuth Token Management**: Automatic token refresh for Jira Cloud integrations
6. **Idempotent Operations**: Upsert patterns ensure safe re-runs

---

# 2. **High-Level System Components**

```
/kss
 ├── main.py                  → FastAPI app + router initialization
 ├── api/                     → Job endpoints (trigger sync jobs)
 ├── jobs/                    → Job orchestrators (Celery tasks)
 ├── services/                → Jira API fetch & transform logic
 ├── repositories/            → Database write/read/reporting
 ├── tasks/                   → Celery runtime, signals, status tracking
 ├── models/                  → Pydantic + ORM models
 ├── multi_tenant_manager.py  → Create/manage tenant schemas
 ├── celeryconfig.py          → Celery configuration
 ├── config.py                → App-wide settings
 ├── database.py              → PostgreSQL connection manager
```

---

# 🔌 3. **How Configuration, Environment, Dependencies Load**

### 📄 **config.py**

Centralized configuration module that loads settings from environment variables:

**Database Configuration (`DB_CONFIG`)**:

- `DB_HOST`: PostgreSQL host (default: `localhost`)
- `DB_NAME`: Database name (default: `khoji-admin`)
- `DB_USER`: Database user (default: `khoji-admin`)
- `DB_PASSWORD`: Database password
- `DB_PORT`: Database port (default: `5435`)

**Application Configuration (`APP_CONFIG`)**:

- `schema_name`: System schema name (`kss`)
- `pagination_size`: Default page size for API requests (50)

All settings can be overridden via environment variables for different deployment environments (dev, staging, production).

### 📄 **celeryconfig.py**

Comprehensive Celery configuration defining task execution behavior:

**Broker & Backend**:

- `broker_url`: Redis connection for message queue (default: `redis://localhost:6379/0`)
- `result_backend`: Redis for storing task results (default: `redis://localhost:6379/0`)
- Connection retry settings with max 10 retries

**Task Serialization**:

- Uses JSON for security (avoids pickle vulnerabilities)
- UTC timezone for consistent timestamp handling

**Task Execution**:

- `task_acks_late = True`: Tasks acknowledged only after completion (prevents data loss)
- `task_reject_on_worker_lost = True`: Requeue tasks if worker crashes
- `task_track_started = True`: Enable monitoring of task start times
- `result_expires = 3600`: Results stored for 1 hour
- `task_soft_time_limit = 1800`: 30-minute soft limit (SIGTERM)
- `task_time_limit = 2400`: 40-minute hard limit (SIGKILL)

**Worker Configuration**:

- `worker_prefetch_multiplier = 1`: One task at a time (better for long-running jobs)
- `worker_max_tasks_per_child = 1000`: Restart after 1000 tasks (memory leak prevention)
- `worker_concurrency = 1` on Windows (single worker), `4` on Unix
- `worker_pool`: `solo` on Windows, `prefork` on Unix

**Task Routing**:

- Different queues for job types: `boards`, `sprints`, `issues`, `worklogs`, `workflows`
- Allows specialized worker pools per queue

**Windows-Specific Adjustments**:

- Disables soft timeouts (not supported on Windows)
- Uses solo pool (no multiprocessing)
- Disables rate limits

### 📄 **database.py**

- Creates PostgreSQL connection pool
- Handles per-tenant schema routing

### 📄 **multi_tenant_manager.py**

Manages multi-tenant database operations with schema isolation:

**System Initialization**:

- Creates `kss_system` schema on application startup
- Executes SQL from `data/sql/system/`:
  - `001_create_system_schema.sql`: Core system tables
  - `004_create_functions.sql`: PostgreSQL functions for tenant management

**Tenant Management Functions**:

- `initialize_system_schema()`: One-time setup on first run
- `ensure_tenant_exists(tenant_id)`: Creates tenant schema if missing
- `get_tenant_comprehensive_status(tenant_id)`: Returns sync statistics
- `_load_sql_file(relative_path)`: Loads SQL from versioned files
- `_execute_tenant_sql(tenant_id, sql_files)`: Runs tenant-specific DDL

**Tenant Schema Structure**:
Each tenant gets its own schema (`tenant_XXXX`) with:

- All tables from `data/sql/tenant/*.sql`
- Materialized views for analytics
- Custom functions for data aggregation

**Safety Features**:

- Idempotent schema creation (safe to call multiple times)
- Connection pooling with auto-commit for DDL
- Comprehensive error logging

---

# 🚦 4. **End-to-End Data Flow (Jira → Service → Repository → PostgreSQL)**

Below is the **exact, code-accurate data flow** based on the KSS architecture.

---

# 🔷 **4.1 Master Data Flow Diagram**

```
        ┌─────────────────────────────┐
        │        FastAPI (main.py)    │
        │     /api/jobs/... endpoints │
        └───────────────┬─────────────┘
                        │
                        ▼
        ┌────────────────────────────────┐
        │     Job Factory & JobManager   │
        │ create_job_record() in DB      │
        └────────────────┬───────────────┘
                         │ Celery Task Enqueued
                         ▼
        ┌────────────────────────────────┐
        │         Celery Worker          │
        │ execute_job() inside SyncJob   │
        └────────────────┬───────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │          Services Layer         │
        │ (BoardService, IssueService...) │
        │ Fetch from Jira API + Transform │
        └────────────────┬───────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │       Repository Layer          │
        │  Inserts/Upserts into Postgres  │
        └────────────────┬───────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │      Tenant PostgreSQL Schema   │
        │   tenant_1701.issues, sprints…  │
        └────────────────────────────────┘
```

---

# 🔶 **4.2 Sequence Diagram (Function-Level)**

```
User → FastAPI → JobFactory → Celery Task → Service.fetch_from_jira()
→ Service.transform() → Repo.bulk_upsert() → PostgreSQL
```

In detail:

```
1. FastAPI receives POST /api/jobs/sync/issues
2. JobManagementService.create_job_record()
3. Celery task queued: sync_recent_issues_task.delay()
4. Celery worker starts SyncRecentIssuesJob.execute_job()
5. IssueService.connect()
6. IssueService.search_issues()
7. IssueService.transform_issue()
8. IssueRepository.bulk_upsert()
9. SyncJobRepository.update_job_status(SUCCESS)
```

---

# 🔧 5. **Key Classes, Modules, & Responsibilities**

# 🟥 **main.py**

FastAPI application entry point with lifespan management:

**Application Initialization**:

- Creates FastAPI app with lifespan manager
- Registers API routers:
  - `/api/health`: Health checks and system status
  - `/api/jobs`: Job submission and monitoring
  - `/api/sprints`: Sprint-specific operations
  - `/api/tenant-management`: Tenant provisioning
- Initializes multi-tenant system schema on startup

**Lifespan Management**:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize system schema
    multi_tenant_manager.initialize_system_schema()
    yield
    # Shutdown: Cleanup (if needed)
```

**Key Features**:

- Interactive API documentation at `/docs` (Swagger UI)
- CORS middleware for cross-origin requests
- Global exception handling
- Structured logging throughout

**Startup Sequence**:

1. Load configuration from `config.py`
2. Initialize database connection pool
3. Create system schema if not exists
4. Register all API endpoints
5. Start listening for HTTP requests

---

## 🟧 **api/jobs.py (jobs_router)**

RESTful endpoints for job management with authentication and validation:

**Main Endpoints**:

1. **`POST /api/jobs/submit`** - Submit any job type

   - Validates job type against registered types
   - Pre-generates `job_id` (UUID) before Celery submission
   - Creates database record with status="pending"
   - Enqueues Celery task asynchronously
   - Returns job_id immediately to client

2. **`GET /api/jobs/{job_id}/status`** - Get job status

   - Returns current status, progress, results
   - Queries PostgreSQL job tracking table

3. **`GET /api/jobs/statistics`** - System-wide job statistics
   - Success/failure rates
   - Average execution times
   - Job counts by type

**Required HTTP Headers**:

- `X-Tenant-ID`: Tenant identifier for schema isolation
- `X-Tenant-Source-Tenant-ID`: Jira Cloud ID
- `X-Tenant-Username`: Jira user email
- `X-Tenant-Api-Token`: Jira API token (OAuth access token)
- `X-Tenant-Source-Account-ID`: Jira account ID

**Request Flow**:

```
Client → FastAPI → Validation → JobManagementService.create_job_record()
→ Celery Task Queue → Return job_id to client
```

**Error Handling**:

- 400: Invalid job type or parameters
- 401: Missing authentication headers
- 500: Database or Celery connection failure

**Job Types Supported**:

- `boards`, `sprints`, `sprint_issues`, `worklogs`
- `recent_activity_issues`, `burndown_refresh`
- `proactive_sprints_sync`, `sprints_list_sync`
- `jql_issues`, `jql_issues_worklog_workflow`

---

## 🟨 **jobs/ (Celery job orchestration)**

Job classes orchestrate the entire sync workflow:

**Available Job Types**:

| Job Class                    | Purpose                                    | Key Parameters                  |
| ---------------------------- | ------------------------------------------ | ------------------------------- |
| `BoardSyncJob`               | Sync all boards and projects               | None                            |
| `SprintSyncJob`              | Sync sprints for specific board            | `board_id`                      |
| `SprintIssueSyncJob`         | Sync issues within sprint                  | `sprint_id`, `include_comments` |
| `WorklogSyncJob`             | Sync worklogs for sprint issues            | `sprint_id`                     |
| `RecentActivityIssueSyncJob` | Discover & sync recently updated issues    | `jql`, `days_back`              |
| `BurndownRefreshJob`         | Refresh sprint burndown materialized views | `sprint_id`                     |
| `ProactiveSprintsSyncJob`    | Auto-discover active sprints               | None                            |
| `SprintsListSyncJob`         | Sync specific list of sprints              | `sprint_ids[]`                  |
| `JQLIssueSyncJob`            | Sync issues matching JQL query             | `jql`, `include_comments`       |
| `JQLIssuesWorklogWorkflow`   | Workflow: JQL issues + worklogs            | `jql`, `include_comments`       |

**Base Job Architecture (BaseSyncJob)**:

All jobs inherit from `BaseSyncJob` which provides:

```python
class BaseSyncJob(ABC):
    def __init__(self, config: JobConfig)

    @abstractmethod
    def validate_parameters(self) -> tuple[bool, List[str]]

    @abstractmethod
    def execute_job(self) -> JobResult

    @abstractmethod
    def get_job_type_name(self) -> str

    def set_progress_callback(self, callback)
    def _update_progress(self, current, total, message)
```

**Job Execution Lifecycle**:

1. **Initialization**: Parse JobConfig, validate parameters
2. **Service Setup**: Initialize JiraService, OAuthJiraClient, DatabaseManager
3. **Progress Tracking**: Set up Redis-backed progress callback
4. **Data Fetch**: Call service layer methods to fetch from Jira
5. **Data Transform**: Transform raw Jira JSON to database schema
6. **Data Persist**: Call repository bulk upsert methods
7. **Status Update**: Update job status in database (SUCCESS/FAILED)
8. **Result Return**: Return JobResult with metrics

**Error Handling**:

- Retry logic (up to 3 retries by default)
- Exponential backoff on Jira API errors
- Status tracking in database (`JobStatus` enum)
- Detailed error messages captured

**Responsibility Boundaries**:
✅ Jobs orchestrate workflow
✅ Jobs call services for data
✅ Jobs call repositories for persistence
✅ Jobs track progress and status
❌ Jobs NEVER make direct Jira API calls
❌ Jobs NEVER execute raw SQL

---

## 🟦 **services/ (Jira API Integration Layer)**

Service classes handle all Jira API interactions and data transformation:

| Service                       | Responsibilities                                    | Key Methods                                                    |
| ----------------------------- | --------------------------------------------------- | -------------------------------------------------------------- |
| **BaseJiraService**           | Connection management, logging, date parsing        | `connect()`, `_log_progress()`, `_parse_jira_date()`           |
| **BoardService**              | Fetch boards, transform board data                  | `fetch_boards()`, `transform_board_data()`                     |
| **SprintService**             | Fetch sprints, detect active sprint                 | `fetch_sprints()`, `get_active_sprint()`, `transform_sprint()` |
| **IssueService**              | Search issues via JQL, parse fields, relationships  | `fetch_issues_jql()`, `transform_issue_data()`                 |
| **CommentService**            | Fetch comments for issues                           | `fetch_comments()`, `transform_comment()`                      |
| **WorklogService**            | Fetch worklogs for issues                           | `fetch_worklogs()`, `transform_worklog()`                      |
| **OAuthJiraClient**           | Low-level HTTP client, token refresh, raw API calls | `search_issue_ids()`, `bulk_fetch_issues()`, `get_myself()`    |
| **SourceTokenRefreshService** | Refresh OAuth tokens when expired                   | `refresh_token()`, `is_token_valid()`                          |

### **OAuthJiraClient - Deep Dive**

The primary HTTP client for Jira Cloud API:

**Authentication**:

- Uses OAuth 2.0 Bearer token authentication
- Automatically refreshes expired tokens via `SourceTokenRefreshService`
- JWT token validation with `is_token_expired()`

**Key Methods**:

```python
# Search for issue IDs matching JQL (paginated)
search_issue_ids(jql, nextPageToken=None) -> Dict

# Bulk fetch issue details (up to 100 at once)
bulk_fetch_issues(issueIdsOrKeys, expand=None, fields="*navigable") -> Dict

# Get current user info (auth test)
get_myself() -> Dict

# Board operations
get_boards(startAt=0, maxResults=50) -> Dict
get_board(board_id) -> Dict

# Sprint operations
get_sprints_for_board(board_id, startAt=0, maxResults=50) -> Dict
get_sprint(sprint_id) -> Dict
get_issues_for_sprint(sprint_id, startAt=0, maxResults=50) -> Dict

# Worklog operations
get_worklogs_for_issue(issue_key) -> Dict

# Comment operations
get_comments_for_issue(issue_key, startAt=0, maxResults=50) -> Dict
```

**Error Handling**:

- `AuthenticationError`: Token expired or invalid
- `NotFoundError`: Resource doesn't exist (404)
- `RateLimitError`: API rate limit exceeded (429)
- `APIError`: General API errors (500, 502, etc.)

**Rate Limiting**:

- Respects `Retry-After` header
- Automatic exponential backoff on 429 responses

### **Data Transformation Flow**

Services transform raw Jira JSON to database-ready dictionaries:

```python
# Example: Issue transformation
Jira JSON Response
↓
IssueTransformerUtil._transform_issue_data_from_json()
↓
{
    "key": "KFX-123",
    "summary": "Bug in sync",
    "status": "In Progress",
    "assignee_display_name": "John Doe",
    "assignee_account_id": "557058:abc123",
    "story_points": 5.0,
    "created_date": datetime(2025, 1, 15),
    ...
}
↓
IssueRepository.upsert_issues()
↓
PostgreSQL tenant_xxxx.issues table
```

### **Pagination Handling**

All services handle Jira API pagination:

```python
# Pattern used across all services
all_results = []
start_at = 0
max_results = 50

while True:
    response = oauth_client.get_boards(startAt=start_at, maxResults=max_results)
    all_results.extend(response['values'])

    if response['isLast']:
        break

    start_at += max_results
```

### **Critical Rule**

**Services NEVER write to database** - they only:

1. Fetch data from Jira API
2. Transform data to Python dictionaries
3. Return data to job layer

---

## 🟩 **repositories/ (PostgreSQL Layer)**

Repository classes encapsulate all database operations with tenant-aware context:

| Repository                 | Primary Table          | Key Methods                              | Upsert Strategy                     |
| -------------------------- | ---------------------- | ---------------------------------------- | ----------------------------------- |
| **BoardRepository**        | `tenant.boards`        | `upsert_boards()`                        | ON CONFLICT DO UPDATE               |
| **SprintRepository**       | `tenant.sprints`       | `upsert_sprints()`                       | Batch timestamp sync                |
| **SprintIssueRepository**  | `tenant.sprint_issues` | `upsert_sprint_issues()`                 | Composite key (sprint_id, issue_id) |
| **IssueRepository**        | `tenant.issues`        | `upsert_issues()`                        | Batch timestamp + deduplication     |
| **WorklogRepository**      | `tenant.worklogs`      | `upsert_worklogs()`                      | Worklog ID primary key              |
| **CommentRepository**      | `tenant.comments`      | `upsert_comments()`                      | Comment ID primary key              |
| **IssueLinkRepository**    | `tenant.issue_links`   | `upsert_issue_links()`                   | Link ID + type                      |
| **RelationshipRepository** | `tenant.relationships` | `upsert_relationships()`                 | Parent-child relationship pairs     |
| **ChangelogRepository**    | `tenant.changelogs`    | `upsert_changelogs()`                    | Changelog entry ID                  |
| **SyncJobRepository**      | `kss_system.sync_jobs` | `create_job_record()`, `update_status()` | Job tracking in system schema       |

### **Bulk Upsert Pattern**

All repositories use **bulk upsert** for performance:

```python
def upsert_issues(self, issues_data: List[Dict[str, Any]]) -> bool:
    # 1. Get batch timestamp
    batch_timestamp = NOW()

    # 2. Deduplicate input data
    unique_issues = {issue["key"]: issue for issue in issues_data}

    # 3. Build bulk INSERT with placeholders
    placeholders = "(%s, %s, %s, ...)" * len(unique_issues)

    # 4. Execute single INSERT with ON CONFLICT
    INSERT INTO issues (issue_id, summary, ...)
    VALUES {placeholders}
    ON CONFLICT (issue_id) DO UPDATE SET
        summary = EXCLUDED.summary,
        status = EXCLUDED.status,
        last_synced_at = EXCLUDED.last_synced_at

    # 5. Optional: Delete stale records
    DELETE FROM issues WHERE last_synced_at != batch_timestamp
```

### **Tenant Schema Isolation**

Every repository operation is tenant-aware:

```python
class BaseRepository:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.db_manager = DatabaseManager()

    def _get_connection(self):
        # Automatically sets search_path to tenant schema
        return self.db_manager.get_connection(self.tenant_id)
```

### **Database Connection Management**

Uses context managers for safe connection handling:

```python
with self.db_manager.get_connection(self.tenant_id) as conn:
    with conn.cursor() as cur:
        cur.execute(sql, values)
        conn.commit()
```

### **Key Repository Operations**

**IssueRepository**:

- Handles complex issue data (JSON description, arrays for labels/components)
- Deduplicates issues within batch
- Supports parent issue relationships
- Tracks `last_synced_at` timestamp

**SprintRepository**:

- Manages sprint state transitions (active, closed, future)
- Preserves historical sprint data
- Supports materialized view refresh triggers

**WorklogRepository**:

- Stores time tracking data
- Links worklogs to issues and authors
- Handles time spent calculations

**SyncJobRepository**:

- Stores job execution history in `kss_system.sync_jobs`
- Tracks status, parameters, results, errors
- Provides job statistics and analytics

### **Data Integrity Features**

✅ **Upsert semantics**: No duplicate key errors
✅ **Batch timestamps**: Identify sync cohorts
✅ **Foreign key constraints**: Maintain referential integrity
✅ **JSON field validation**: Structured data in JSONB columns
✅ **Transaction safety**: All operations wrapped in transactions

### **Critical Rule**

**Repositories NEVER call Jira API** - they only:

1. Accept transformed Python dictionaries
2. Execute SQL INSERT/UPDATE/DELETE
3. Return success/failure status

---

## 🟫 **tasks/ (Celery Runtime Layer)**

Task execution, monitoring, and lifecycle management:

| File                         | Responsibility                                                     |
| ---------------------------- | ------------------------------------------------------------------ |
| **worker.py**                | Registers all Celery tasks, imports job classes                    |
| **celery_app.py**            | Creates Celery app instance, loads config from `celeryconfig.py`   |
| **job_tracker.py**           | DB status updates, Redis progress tracking, job statistics         |
| **celery_status_manager.py** | Check Celery backend health, query task states                     |
| **signal_handlers.py**       | Celery signals for task lifecycle (start, success, failure, retry) |

### **Celery Task Registration**

Tasks are registered in `worker.py`:

```python
from tasks.celery_app import app
from jobs.simple import BoardSyncJob, SprintSyncJob, ...

@app.task(name="tasks.sync_boards_task", bind=True)
def sync_boards_task(self, job_config_dict):
    config = JobConfig.from_dict(job_config_dict)
    job = BoardSyncJob(config)
    return job.execute_job()
```

### **Job Progress Tracking**

Progress stored in Redis for real-time monitoring:

```python
def create_progress_callback(tenant_id, job_id, task_id):
    def progress_callback(current, total, message):
        progress_data = {
            'job_id': job_id,
            'current': current,
            'total': total,
            'percentage': (current / total) * 100,
            'message': message,
            'updated_at': datetime.now().isoformat()
        }
        redis_client.set(f"progress:{tenant_id}", json.dumps(progress_data), ex=3600)
    return progress_callback
```

### **Job Status Lifecycle**

Status tracked in PostgreSQL via `JobStatusTracker`:

```
PENDING → RUNNING → SUCCESS
              ↓
            RETRY (max 3 times)
              ↓
            FAILED
```

### **Celery Signals**

Automatic logging and status updates via signals:

```python
@task_prerun.connect
def log_task_start(task_id, task, args, **kwargs):
    logger.info(f"Task {task.name} started: {task_id}")

@task_postrun.connect
def log_task_complete(task_id, task, retval, **kwargs):
    logger.info(f"Task {task.name} completed: {task_id}")

@task_failure.connect
def log_task_failure(task_id, exception, **kwargs):
    logger.error(f"Task failed: {task_id} - {exception}")
```

### **Task Monitoring**

Query job progress via API:

```bash
GET /api/jobs/{job_id}/status
Response:
{
    "job_id": "abc-123",
    "status": "running",
    "progress": {
        "current": 50,
        "total": 100,
        "percentage": 50.0,
        "message": "Processing issues..."
    },
    "started_at": "2025-11-26T10:00:00Z"
}
```

---

# 🟩 6. **Celery Scheduling, Retries, Timeouts**

### ✔ Job Status Lifecycle

Every job progresses through defined states:

```
1. API receives job request
2. JobManagementService.create_job_record() → status = PENDING
3. Celery task queued
4. Worker picks up task → status = RUNNING
5. Job executes → update progress in Redis
6. On success → status = SUCCESS
7. On failure → status = RETRY (if retry_count < 3) OR FAILED
```

### ✔ Retry Logic

Implemented in `JobManagementService`:

```python
# Automatic retry on failure
if job_result.success == False:
    if retry_count < max_retries:
        SyncJobRepository.increment_retry_count(job_id)
        # Re-queue task with exponential backoff
        celery_task.apply_async(countdown=2 ** retry_count * 60)
        status = RETRY
    else:
        status = FAILED
```

**Retry Strategy**:

- Max retries: 3 (configurable via `JobConfig.max_retries`)
- Backoff: Exponential (1min, 2min, 4min)
- Tracked in database: `retry_count` column
- Reset on success

### ✔ Progress Tracking

Real-time progress stored in **Redis** with 1-hour TTL:

```python
# Key pattern
progress:{tenant_id}

# Value structure
{
    "job_id": "uuid",
    "current": 50,
    "total": 100,
    "percentage": 50.0,
    "message": "Fetching issues from Jira...",
    "updated_at": "2025-11-26T10:30:00Z"
}
```

**Progress Updates**:

- Called from job via `_update_progress(current, total, message)`
- Stored with pipeline for atomicity
- Expires after 1 hour (no manual cleanup needed)

### ✔ Celery Timeouts

Configured in `celeryconfig.py`:

| Timeout Type           | Value | Purpose                    |
| ---------------------- | ----- | -------------------------- |
| `task_soft_time_limit` | 1800s | 30 minutes (sends SIGTERM) |
| `task_time_limit`      | 2400s | 40 minutes (sends SIGKILL) |
| `result_expires`       | 3600s | Results kept for 1 hour    |

**Soft vs Hard Timeouts**:

- **Soft**: Raises `SoftTimeLimitExceeded` exception (graceful cleanup possible)
- **Hard**: Kills worker process (no cleanup, job marked FAILED)

### ✔ Task Acknowledgment

```python
task_acks_late = True  # Acknowledge AFTER completion
task_reject_on_worker_lost = True  # Requeue if worker crashes
```

**Why late ack?**

- Prevents data loss if worker crashes mid-execution
- Task stays in queue until successfully completed
- Trade-off: Risk of duplicate execution (idempotency required)

### ✔ Worker Configuration

```python
worker_prefetch_multiplier = 1  # Process one task at a time
worker_max_tasks_per_child = 1000  # Restart after 1000 tasks
worker_concurrency = 4  # 4 worker processes (Unix)
```

**Prefetch = 1**:

- Long-running tasks (sync jobs take minutes)
- Fair distribution across workers
- Better for varied task durations

### ✔ Queue Routing

Different queues for different job types:

```python
task_routes = {
    "tasks.sync_boards_task": {"queue": "boards"},
    "tasks.sync_sprints_task": {"queue": "sprints"},
    "tasks.sync_issues_task": {"queue": "issues"},
    "tasks.sync_worklogs_task": {"queue": "worklogs"},
}
```

**Benefits**:

- Prioritize critical job types
- Scale workers per queue
- Isolate slow jobs from fast jobs

---

# 🗄️ 7. **What Data is Extracted From Jira**

Detailed breakdown of data extracted from Jira API and stored in PostgreSQL:

### 📌 Boards

**Jira Endpoint**: `GET /rest/agile/1.0/board`

**Fields Extracted**:

- `id` (int): Unique board identifier
- `name` (string): Board display name
- `type` (string): Board type (scrum, kanban)
- `project_key` (string): Associated project key (e.g., "KFX")
- `project_name` (string): Project display name

**Stored In**: `tenant_xxxx.boards`

**Use Cases**:

- Board selection dropdowns
- Project-board mapping
- Filter issues by board

---

### 📌 Sprints

**Jira Endpoint**: `GET /rest/agile/1.0/board/{boardId}/sprint`

**Fields Extracted**:

- `id` (int): Unique sprint identifier
- `name` (string): Sprint name (e.g., "Sprint 42")
- `state` (string): Sprint state (active, closed, future)
- `board_id` (int): Parent board ID
- `start_date` (datetime): Sprint start timestamp
- `end_date` (datetime): Sprint end timestamp
- `complete_date` (datetime): Actual completion timestamp
- `goal` (text): Sprint goal description

**Stored In**: `tenant_xxxx.sprints`

**Use Cases**:

- Sprint selection for issue sync
- Burndown chart date ranges
- Sprint velocity calculations

---

### 📌 Issues

**Jira Endpoint**: `POST /rest/api/3/search` (JQL) + `POST /rest/api/3/issue/bulk`

**Core Fields**:

- `key` (string): Issue key (e.g., "KFX-1234")
- `summary` (string): Issue title
- `description` (JSONB): Rich text description (ADF format)
- `issue_type` (string): Type (Story, Bug, Task, Epic)
- `status` (string): Current status (To Do, In Progress, Done)
- `status_category` (string): Category (To Do, In Progress, Done)
- `status_category_change_date` (datetime): When status category last changed
- `priority` (string): Priority level (Highest, High, Medium, Low, Lowest)
- `resolution` (string): Resolution type (Done, Won't Do, Duplicate)

**People Fields**:

- `assignee_display_name` (string): Current assignee name
- `assignee_account_id` (string): Jira account ID for assignee
- `reporter_display_name` (string): Reporter name
- `reporter_account_id` (string): Jira account ID for reporter

**Date Fields**:

- `created_date` (datetime): When issue was created
- `updated_date` (datetime): Last update timestamp
- `resolution_date` (datetime): When issue was resolved

**Agile Fields**:

- `story_points` (float): Story point estimate
- `time_spent` (int): Time logged in seconds
- `time_original_estimate` (int): Original estimate in seconds
- `aggregate_time_spent` (int): Total time including subtasks

**Relationship Fields**:

- `parent_issue_key` (string): Parent issue key (for subtasks)
- `epic_link` (string): Epic issue key
- `labels` (array): Issue labels
- `components` (array): Issue components

**Metadata**:

- `last_synced_at` (datetime): Batch timestamp for sync tracking

**Stored In**: `tenant_xxxx.issues`

**Transformation Logic**:

- Description converted from ADF to JSONB
- Dates parsed from ISO 8601 to PostgreSQL timestamp
- Story points extracted from custom field
- Assignee/reporter parsed from user objects

---

### 📌 Comments

**Jira Endpoint**: `GET /rest/api/3/issue/{issueIdOrKey}/comment`

**Fields Extracted**:

- `id` (string): Unique comment identifier
- `issue_key` (string): Parent issue key
- `body` (JSONB): Comment text (ADF format)
- `author_display_name` (string): Comment author name
- `author_account_id` (string): Author Jira account ID
- `created_date` (datetime): When comment was created
- `updated_date` (datetime): Last update timestamp
- `visibility` (JSONB): Visibility restrictions (if any)

**Stored In**: `tenant_xxxx.comments`

**Use Cases**:

- Issue discussion threads
- Activity feed
- Collaboration analytics

---

### 📌 Worklogs

**Jira Endpoint**: `GET /rest/api/3/issue/{issueIdOrKey}/worklog`

**Fields Extracted**:

- `id` (string): Unique worklog identifier
- `issue_key` (string): Parent issue key
- `author_display_name` (string): Who logged the work
- `author_account_id` (string): Author Jira account ID
- `time_spent_seconds` (int): Time logged in seconds
- `started` (datetime): When work started
- `created_date` (datetime): When worklog entry was created
- `updated_date` (datetime): Last update timestamp
- `comment` (text): Optional worklog comment

**Stored In**: `tenant_xxxx.worklogs`

**Use Cases**:

- Time tracking reports
- Burndown calculations
- Capacity planning

---

### 📌 Changelogs

**Jira Endpoint**: Included in issue bulk fetch with `expand=changelog`

**Fields Extracted**:

- `id` (string): Unique changelog entry ID
- `issue_key` (string): Parent issue key
- `author_display_name` (string): Who made the change
- `author_account_id` (string): Author Jira account ID
- `created_date` (datetime): When change occurred
- `field` (string): Field that changed (e.g., "status", "assignee")
- `from_string` (string): Previous value
- `to_string` (string): New value
- `from_value` (string): Previous raw value
- `to_value` (string): New raw value

**Stored In**: `tenant_xxxx.changelogs`

**Use Cases**:

- Issue history tracking
- Status transition analysis
- Audit trail

---

### 📌 Sprint-Issue Associations

**Jira Endpoint**: Derived from issue `sprint` field

**Fields Extracted**:

- `sprint_id` (int): Sprint identifier
- `issue_key` (string): Issue key
- `added_date` (datetime): When issue added to sprint
- `removed_date` (datetime): When issue removed (if applicable)

**Stored In**: `tenant_xxxx.sprint_issues`

**Use Cases**:

- Sprint scope tracking
- Burndown chart data
- Velocity calculations

---

### 📌 Issue Links

**Jira Endpoint**: Included in issue fields as `issuelinks`

**Fields Extracted**:

- `link_id` (string): Unique link identifier
- `source_issue_key` (string): Source issue
- `target_issue_key` (string): Target issue
- `link_type` (string): Relationship type (blocks, relates to, duplicates)

**Stored In**: `tenant_xxxx.issue_links`

**Use Cases**:

- Dependency tracking
- Issue relationship visualization
- Blocked issue detection

---

### 📌 Relationships (Parent-Child)

**Jira Endpoint**: Derived from issue `parent` field

**Fields Extracted**:

- `parent_issue_key` (string): Parent issue
- `child_issue_key` (string): Child issue (subtask)
- `relationship_type` (string): Always "parent-child"

**Stored In**: `tenant_xxxx.relationships`

**Use Cases**:

- Subtask tracking
- Hierarchical issue views
- Rollup calculations

---

# 🧱 8. **Database Tables Populated**

Each tenant gets a fully isolated PostgreSQL schema with comprehensive tables:

### Schema Naming Convention

```
tenant_{tenant_id}    # User data schemas
kss_system            # System-wide tracking schema
```

### Tenant Schema Tables

#### Core Jira Data Tables

| Table           | Primary Key              | Description                           | Row Estimate (Medium Org) |
| --------------- | ------------------------ | ------------------------------------- | ------------------------- |
| `boards`        | `id`                     | Scrum/Kanban boards                   | 10-50                     |
| `sprints`       | `id`                     | Sprint metadata and dates             | 100-500                   |
| `issues`        | `issue_id`               | All issue types (stories, bugs, etc.) | 5,000-50,000              |
| `sprint_issues` | `(sprint_id, issue_key)` | Many-to-many sprint-issue mapping     | 10,000-100,000            |
| `comments`      | `id`                     | Issue comments and discussions        | 10,000-200,000            |
| `worklogs`      | `id`                     | Time tracking entries                 | 5,000-100,000             |
| `changelogs`    | `id`                     | Issue field change history            | 50,000-500,000            |
| `issue_links`   | `link_id`                | Issue relationships (blocks, etc.)    | 1,000-10,000              |
| `relationships` | `(parent, child)`        | Parent-subtask relationships          | 2,000-20,000              |

#### Analytical Views and Materialized Views

| View/MV                      | Type         | Description                         | Refresh Strategy   |
| ---------------------------- | ------------ | ----------------------------------- | ------------------ |
| `v_issue_status_transitions` | View         | Status change history per issue     | Real-time          |
| `v_person_status_pair_stats` | View         | Person-status transition statistics | Real-time          |
| `mv_sprint_burndown_daily`   | Materialized | Daily sprint progress snapshots     | Manual/Job trigger |
| `v_active_sprints`           | View         | Currently active sprints            | Real-time          |
| `v_sprint_velocity`          | View         | Historical sprint velocity          | Real-time          |

### System Schema Tables

#### Job Tracking (kss_system schema)

| Table       | Primary Key | Description                      |
| ----------- | ----------- | -------------------------------- |
| `sync_jobs` | `job_id`    | Job execution history and status |
| `tenants`   | `tenant_id` | Registered tenant metadata       |

**sync_jobs Schema**:

```sql
CREATE TABLE kss_system.sync_jobs (
    job_id UUID PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    job_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,  -- pending, running, success, failed, retry
    parameters JSONB,
    results JSONB,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_by VARCHAR(255)
);
```

### Bulk Upsert Performance

Records written via **single-query bulk upsert** for optimal performance:

**Performance Characteristics**:

- 1,000 issues: ~2-3 seconds
- 10,000 issues: ~20-30 seconds
- Batch timestamp for sync tracking
- ON CONFLICT for idempotency

**Example Bulk Upsert**:

```sql
INSERT INTO issues (issue_id, summary, status, ...)
VALUES
    ('KFX-1', 'Bug fix', 'Done', ...),
    ('KFX-2', 'New feature', 'In Progress', ...),
    ... (1000 rows)
ON CONFLICT (issue_id) DO UPDATE SET
    summary = EXCLUDED.summary,
    status = EXCLUDED.status,
    last_synced_at = EXCLUDED.last_synced_at;
```

### Indexes for Performance

**Issues Table Indexes**:

```sql
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_assignee ON issues(assignee_account_id);
CREATE INDEX idx_issues_updated ON issues(updated_date DESC);
CREATE INDEX idx_issues_created ON issues(created_date DESC);
CREATE INDEX idx_issues_parent ON issues(parent_issue_key);
```

**Sprint Issues Indexes**:

```sql
CREATE INDEX idx_sprint_issues_sprint ON sprint_issues(sprint_id);
CREATE INDEX idx_sprint_issues_issue ON sprint_issues(issue_key);
```

**Worklogs Indexes**:

```sql
CREATE INDEX idx_worklogs_issue ON worklogs(issue_key);
CREATE INDEX idx_worklogs_author ON worklogs(author_account_id);
CREATE INDEX idx_worklogs_started ON worklogs(started DESC);
```

### Data Retention Strategy

- **Hot data**: Last 6 months (fast queries)
- **Warm data**: 6-24 months (archived tables)
- **Cold data**: 24+ months (compressed/external storage)

Currently no automatic archival implemented (future enhancement).

### Table Statistics (Example Tenant)

```sql
-- Get table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'tenant_1701'
ORDER BY size_bytes DESC;

-- Typical Results:
-- issues:         250 MB
-- changelogs:     180 MB
-- comments:       120 MB
-- worklogs:       80 MB
-- sprint_issues:  60 MB
-- sprints:        5 MB
-- boards:         1 MB
```

---

# ⚠️ 9. Gaps, Risks, Technical Debt

Critical issues identified that should be addressed for production readiness:

## **Logic is spread everywhere**:

Jobs, services, and repositories all contain mixed business logic → confusing for new engineers.

## **solution?**

Move all data cleaning/parsing into one new folder (e.g., transformers/), so logic is not scattered.
