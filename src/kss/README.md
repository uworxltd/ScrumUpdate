# Jira Sync Platform (KSS)

A **distributed, production-ready multi-tenant platform** for synchronizing Jira data with PostgreSQL. Built with FastAPI, Celery, Redis, and comprehensive job management capabilities.

## 🏗️ Architecture Overview

This platform implements a **multi-tenant SaaS architecture** with complete data isolation, distributed task processing, and enterprise-grade operational features:


### **Environment Variables**
```bash
# Database Configuration
DB_HOST=localhost
DB_NAME=mini-kss
DB_USER=khoji-admin
DB_PASSWORD=khoji
DB_PORT=5435

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379/0
```

### **1. Infrastructure Setup**
```bash
docker-compose up -d redis postgres
```

### **2. Python Environment**
```bash
# Create and activate virtual environment
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### **3. Start the Platform**

**Option A: Full Distributed Setup (Recommended)**
```bash
# Terminal 1: Start API server (auto-initializes multi-tenant system)
python main.py

# Terminal 2: Start Celery workers
celery -A tasks worker --loglevel=info

# Terminal 3: Start monitoring dashboard (optional)
celery -A tasks flower
```

**Option B: Development Mode**
```bash
# Start API server only (for API testing)
python main.py
```

### **4. Test Multi-Tenant API**
```bash
# Submit a board sync job for tenant "acme"
curl -X POST http://localhost:8000/api/jobs/submit
  -H "Content-Type: application/json"
  -H "X-Tenant-ID: 1006"
  -H "X-Tenant-Source-Tenant-ID: <jira_accountId>"
  -H "X-Tenant-Username: <jira_email/khoji_email>"
  -H "X-Tenant-Api-Token: <jira_token>"
  -d '{
    "job_type": "recent_activity_issues",
    "parameters": {
    "days_back": 30,
    "sprint_status": "active",
    "include_comments": true,
    "include_changelog": true,
    "include_subtasks": true
    },
    "priority": 7,
    "created_by": "api_user"
  }'

# Check system health
curl http://localhost:8000/api/system/health
```

**🎉 That's it!** The multi-tenant system auto-initializes and tenants are created on-demand.

## 🔧 System Components

### **Core Services**

| Component | Purpose | URL | Command |
|-----------|---------|-----|---------|
| **FastAPI Server** | Multi-tenant REST API | http://localhost:8000 | `python main.py` |
| **Celery Workers** | Distributed job processing | - | `celery -A tasks worker --loglevel=info` |
| **Flower Monitor** | Job monitoring dashboard | http://localhost:5555 | `celery -A tasks flower` |
| **Redis** | Message broker & cache | localhost:6379 | `docker-compose up redis` |
| **PostgreSQL** | Multi-tenant data storage | localhost:5435 | `docker-compose up postgres` |

### **Key Endpoints**

| Endpoint | Purpose | Requires Tenant Header |
|----------|---------|----------------------|
| **API Documentation** | http://localhost:8000/docs | ❌ |
| **System Health** | http://localhost:8000/api/system/health | ❌ |
| **Job Submission** | http://localhost:8000/api/jobs/submit | ✅ |
| **Job Status** | http://localhost:8000/api/jobs/{job_id}/status | ✅ |
| **Board Sync** | http://localhost:8000/api/jobs/boards/sync | ✅ |
| **Sprint Sync** | http://localhost:8000/api/jobs/sprints/sync | ✅ |
| **Sprint Issues Sync** | http://localhost:8000/api/jobs/sprint_issues/sync | ✅ |

## 📚 Multi-Tenant API Usage

> **Important**: All job-related endpoints require the `X-Tenant-ID` header. Tenants are auto-created on first use!

### **1. Submit Jobs via REST API**

```bash
# Sync all boards for tenant "acme"
curl -X POST "http://localhost:8000/api/jobs/submit" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: acme" \
  -d '{
    "job_type": "boards",
    "parameters": {},
    "priority": 8,
    "created_by": "user123"
  }'

# Sync sprints for specific boards (tenant "beta_inc")
curl -X POST "http://localhost:8000/api/jobs/submit" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: beta_inc" \
  -d '{
    "job_type": "sprints",
    "parameters": {
      "board_ids": [123, 456],
      "sprint_states": ["active", "closed"]
    },
    "priority": 6
  }'

# Sync sprint issues for tenant "gamma_corp"
curl -X POST "http://localhost:8000/api/jobs/submit" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: gamma_corp" \
  -d '{
    "job_type": "sprint_issues",
    "parameters": {
      "sprint_ids": [100, 101, 102]
    },
    "priority": 7
  }'
```

### **2. Convenience Endpoints**

```bash
# Quick board sync for tenant "acme"
curl -X POST "http://localhost:8000/api/jobs/boards/sync?priority=8" \
  -H "X-Tenant-ID: acme"

# Quick sprint sync with filters for tenant "beta_inc"
curl -X POST "http://localhost:8000/api/jobs/sprints/sync?sprint_states=active&priority=6" \
  -H "X-Tenant-ID: beta_inc"

# Quick sprint issues sync for tenant "gamma_corp"
curl -X POST "http://localhost:8000/api/jobs/sprint_issues/sync" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: gamma_corp" \
  -d '{
    "parameters": {"sprint_ids": [100, 101]},
    "priority": 7
  }'
```

### **3. System Monitoring (No Tenant Required)**

```bash
# System health check
curl "http://localhost:8000/api/system/health"

# System statistics
curl "http://localhost:8000/api/system/stats"

# List recent jobs (all tenants)
curl "http://localhost:8000/api/jobs?limit=10"

# Check specific job status
curl "http://localhost:8000/api/jobs/{job_id}/status"
```

### **4. Development Testing**

```bash
# Test multi-tenant functionality
python -m tasks

### **System Health Check**
```json
{
  "status": "healthy",
  "timestamp": "2024-11-28T14:32:15.123456",
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "celery_workers": "healthy (3 workers)",
    "multi_tenant_system": "healthy (5 tenants)"
  },
  "queue_stats": {
    "reserved_tasks": 2,
    "active_tasks": 1,
    "workers": ["worker1@hostname", "worker2@hostname", "worker3@hostname"]
  }
}
```

### **Monitoring and Debugging**
- **API Documentation**: http://localhost:8000/docs
- **Flower Dashboard**: http://localhost:5555 (when running)
- **System Health**: http://localhost:8000/api/system/health
- **Job Status**: http://localhost:8000/api/jobs/{job_id}/status

## 🚀 Production Deployment

### **Docker Deployment**
```bash
# Build and run with Docker Compose
docker-compose up -d

# Scale workers
docker-compose up -d --scale worker=3
```
**Built with ❤️ for enterprise Jira data synchronization**