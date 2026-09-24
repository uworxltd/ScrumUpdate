##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

# app/core/cache.py
# Configurable cache backend selected at CALL TIME (fixes stale env issue)
import os, time, orjson, decimal, datetime, uuid
from typing import Optional

from app.helpers import json_helpers

# -------------------- helpers --------------------
def _backend() -> str:
    # read fresh every call so .env changes or load order don't lock to "memory"
    return (os.getenv("CACHE_BACKEND") or "memory").lower()

# -------------------- MEMORY BACKEND --------------------
_cache: dict[str, tuple[float, bytes]] = {}

def _memory_get(key: str, ttl: Optional[int]) -> Optional[dict]:
    exp, blob = _cache.get(key, (0, b""))
    if exp > time.time():
        print(f"[CACHE HIT][MEM] {key}", flush=True)
        return orjson.loads(blob)
    print(f"[CACHE MISS][MEM] {key}", flush=True)
    return None

def _memory_set(key: str, value, seconds: int):
    _cache[key] = (time.time() + (seconds or 0), orjson.dumps(value, default=json_helpers.orjson_default))
    print(f"[CACHE SET][MEM] {key} ttl={seconds}s", flush=True)

# -------------------- POSTGRES BACKEND --------------------
_psycopg = None
_cfg_dsn = None

def _pg_connect(schema: str):
    # lazy import + DSN expansion from services.yaml (env-aware)
    global _psycopg, _cfg_dsn
    if _psycopg is None:
        import psycopg  # psycopg[binary]
        _psycopg = psycopg
    if _cfg_dsn is None:
        import yaml, re
        from pathlib import Path
        raw = (Path(__file__).parent.parent / "config" / "services.yaml").read_text(encoding="utf-8")
        cfg = yaml.safe_load(raw)
        tpl = cfg["databases"]["main-db"]["dsn"]
        _cfg_dsn = re.sub(r"{env:([A-Z0-9_]+)}", lambda m: os.getenv(m.group(1), ""), tpl)
    conn = _psycopg.connect(_cfg_dsn, autocommit=True)
    with conn.cursor() as cur:
        cur.execute(f'SET search_path TO "{schema}"')
    return conn

def _pg_get(key: str, ttl: Optional[int], schema: str) -> Optional[dict]:
    import datetime as dt
    conn = _pg_connect(schema)
    try:
        with conn.cursor() as cur:
            cur.execute('SELECT value, cached_at_timestamp FROM cache_meta WHERE "key"=%s', (key,))
            row = cur.fetchone()
            if not row:
                print(f"[CACHE MISS][PG] {key}", flush=True)
                return None
            value_txt, cached_at = row
            if ttl and isinstance(cached_at, dt.datetime):
                if cached_at + dt.timedelta(seconds=int(ttl)) <= dt.datetime.utcnow():
                    print(f"[CACHE EXPIRED][PG] {key}", flush=True)
                    return None
            print(f"[CACHE HIT][PG] {key}", flush=True)
            return orjson.loads(value_txt)
    finally:
        conn.close()

def _pg_set(key: str, value, seconds: int, schema: str):
    conn = _pg_connect(schema)
    try:
        with conn.cursor() as cur:
            # orjson.dumps returns bytes, need to decode for text storage
            json_bytes = orjson.dumps(value, default=json_helpers.orjson_default)
            json_str = json_bytes.decode('utf-8')
            cur.execute(
                'INSERT INTO cache_meta("key","value","cached_at_timestamp") VALUES(%s,%s,NOW() at time zone \'UTC\') '
                'ON CONFLICT("key") DO UPDATE SET "value"=EXCLUDED."value","cached_at_timestamp"=EXCLUDED."cached_at_timestamp"',
                (key, json_str),
            )
        print(f"[CACHE SET][PG] {key} ttl={seconds}s", flush=True)
    finally:
        conn.close()

# -------------------- PUBLIC API --------------------
def get(key: str, ttl: Optional[int] = None, schema: Optional[str] = None):
    if _backend() == "postgres":
        if not schema:
            print(f"[CACHE WARN][PG] schema required for key={key}", flush=True)
            return None
        return _pg_get(key, ttl, schema)
    return _memory_get(key, ttl)

def set(key: str, value, seconds: int = 300, schema: Optional[str] = None):
    if _backend() == "postgres":
        if not schema:
            print(f"[CACHE WARN][PG] schema required for key={key}", flush=True)
            return
        return _pg_set(key, value, seconds, schema)
    return _memory_set(key, value, seconds)