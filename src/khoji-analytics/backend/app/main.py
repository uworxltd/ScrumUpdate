##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

# main.py
from urllib import request
from fastapi import FastAPI, Request, Header, HTTPException
from fastapi.responses import Response
from pathlib import Path
import yaml, os, orjson
from urllib.parse import unquote
from dotenv import load_dotenv
from decimal import Decimal

from app.core.errors import AIRequestFailed
from app.core.engine import execute_pipeline
from app.helpers import json_helpers

load_dotenv()  # load variables from .env


class ORJSONResponse(Response):
    """Custom response class that uses orjson with decimal support"""
    media_type = "application/json"

    def render(self, content) -> bytes:
        return orjson.dumps(content, default=json_helpers.orjson_default)


def _print_loaded_env():
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        print(f"🔧 DATABASE_URL is set ({len(db_url)} chars)", flush=True)
    else:
        print("🔧 DATABASE_URL is not set", flush=True)

METRIC_DIR = Path(__file__).parent / "metrics"
app = FastAPI(title="Analytics Engine", default_response_class=ORJSONResponse)


@app.exception_handler(AIRequestFailed)
async def handle_ai_failure(request: Request, exc: AIRequestFailed):
    return ORJSONResponse(
        status_code=exc.status_code,
        content={
            "error": "AI_REQUEST_FAILED",
            "message": exc.message,
            "upstream_status": exc.status_code,
            "upstream_message": exc.message,
        }
    )


@app.on_event("startup")
async def startup_event():
    print("🚀 Khoji Analytics Engine starting up...", flush=True)
    _print_loaded_env()


@app.get("/test")
async def test():
    """Test endpoint to check if the service is running."""
    return {"message": "Khoji Analytics Engine is running!"}


@app.get("/metrics/{metric_id}")
async def run_metric(metric_id: str,
                     request: Request,
                     x_tenant: str = Header(...)):
    """Run a YAML metric for a given tenant."""

    spec_file = METRIC_DIR / f"{metric_id}.yaml"
    
    print("METRIC_DIR:", METRIC_DIR.resolve())
    print("Spec file path:", spec_file.resolve())
    
    if not spec_file.exists():
        raise HTTPException(404, detail="Metric not found")

    spec = yaml.safe_load(spec_file.read_text())
    
    # Decode query params safely
    params = {k: unquote(v) for k, v in request.query_params.items()}
    print("✅ Decoded query params:", params, flush=True)

    # Pipeline may raise AIRequestFailed; handler above converts it to HTTP 500
    result = await execute_pipeline(metric_id.lower(), spec, params, schema="tenant_" + x_tenant)
    
    return result