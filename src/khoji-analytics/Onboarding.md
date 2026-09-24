
# Khoji Analytics Onboarding Guide

Welcome to the Khoji Analytics project! This guide will help you understand the project structure and get you started with development.

## Project Overview

This project is designed for analyzing Jira data to provide insights into development processes. It consists of a backend service for metrics calculation and a business intelligence component for data modeling and analysis.

## Directory Structure

The project is organized into two main directories:

- `backend/`: Contains the core application logic, API endpoints, and metric calculation engine.
- `business-intelligence/`: Contains the SQL schema, views, and functions for data analysis and reporting.

---

## Backend

The backend is a Python application that provides an API for retrieving analytics data.

### Running the Backend

You can run the backend in two modes:

#### 1. Development Mode (Recommended for local development)

**Prerequisites:**
- Python 3.12
- `pip`

**Steps:**

1.  **Create and activate a virtual environment:**
    ```bash
    python -m venv .venv
    # On Windows
    .venv\Scripts\activate
    # On macOS/Linux
    source .venv/bin/activate
    ```

2.  **Install dependencies:**
    ```bash
    pip install -r backend/requirements.txt
    ```

3.  **Run the application:**
    ```bash
    uvicorn app.main:app --reload --port 8000 --app-dir backend
    ```
    The application will be available at `http://localhost:8000`.

#### 2. Docker Mode

**Prerequisites:**
- Docker
- Docker Compose

**Steps:**

1.  **Build and run the containers:**
    ```bash
    docker-compose up --build
    ```
    This will start the backend service.

**Example API Call:**

You can test the API using a tool like `curl`:

```bash
curl --location 'http://localhost:9000/metrics/issues' --header 'x-tenant: tenant_1005'
```

---

## Business Intelligence

The `business-intelligence` directory contains the data models and SQL logic for transforming raw Jira data into meaningful insights. The SQL scripts are organized in a layered architecture, making the data transformation process modular and maintainable.

### SQL Schema Layers

- **L1: Time windows & scope:** Focuses on how work moves through the system (e.g., status changes, sprint membership).
- **L2: Issue helpers:** Provides factual information for triaging issues (e.g., when an issue was "Done", its children, blockers).
- **L3: People & team views:** Offers insights into accountability, workload, and flow (e.g., sprint rollups, transition statistics).
- **L4: Speed layer:** Contains materialized views for performance-critical data, like daily burndown charts.
- **L5: AI/API endpoints:** Provides facts-only JSON outputs for consumption by AI models or other API clients.

For a detailed view of the schema, you can explore the `.sql` files in the `business-intelligence/schema/current/` and `business-intelligence/schema/backup-work-in-progress/` directories.

---

## Getting Started: A Quick Guide

1.  **Clone the repository.**
2.  **Set up the backend:**
    - Follow the steps in the "Development Mode" section to run the backend locally.
3.  **Explore the API:**
    - Use an API client like Postman or `curl` to interact with the running backend.
4.  **Understand the data:**
    - Review the SQL files in the `business-intelligence` directory to understand how the data is structured and transformed.

This should give you a good starting point for working on the Khoji Analytics project. Welcome aboard!
