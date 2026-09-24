
-- The backend conatains the core engine and end points to calculate the metrics.
-- The frontend just helps navigate around backend using UI.

## Dev Mode:

 create venv, install deps (use virtual env to not to worry about wiered stuff... long file names e.t.c)
```
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt 
uvicorn app.main:app --reload --port 8000 
```
# Docker mode:

docker compose up --build

curl --location 'http://localhost:9000/metrics/issues' --header 'x-tenant: tenant_1005'

### Resoponse:
```
{
    "issues": {
        "issues_rows": [
            {
                "issue_id": "KFX-10",
                "issue_key": "KFX-10",
                "sprint_id": "300",
                "summary": "LLM request/response logs",
                "description": "{\"type\": \"doc\", \"version\": 1, \"content\": [{\"type\": \"paragraph\", \"content\": [{\"type\": \"text\", \"text\": \"Some Text\"}]}]}",
                "issue_type": "Story",
                "status": "To Do",
                "priority": "Low",
                "assignee": "Some Name",
                "reporter": "Some Name",
                "created_date": null,
                "updated_date": null,
                "resolution_date": null,
                "story_points": "2.00",
                "labels": null,
                "components": null,
                "parent_issue_key": null,
                "last_synced_at": "2025-08-07 19:07:48.127722"
            },
            {...}
        ]
    }
}
``` 