##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

import datetime

import pytest

import app.core.cache as cache


class _Store:
    def __init__(self):
        self.rows = {}


class _Cursor:
    def __init__(self, conn):
        self.conn = conn
        self._row = None

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def execute(self, sql, params=None):
        statement = sql.strip()
        if statement.startswith("SET search_path"):
            self.conn.schema = statement.split('"')[1]
            return
        if statement.startswith("SELECT"):
            bucket = self.conn.store.rows.get(self.conn.schema, {})
            self._row = bucket.get(params[0])
            return
        if statement.startswith("INSERT"):
            key, value = params
            bucket = self.conn.store.rows.setdefault(self.conn.schema, {})
            # Naive UTC, matching cache.py's expiry comparison.
            bucket[key] = (value, datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None))
            return
        raise RuntimeError(f"unexpected SQL: {sql}")

    def fetchone(self):
        return self._row


class _Conn:
    def __init__(self, store):
        self.store = store
        self.schema = None

    def cursor(self):
        return _Cursor(self)

    def close(self):
        pass


class _Psycopg:
    def __init__(self, store):
        self.store = store

    def connect(self, dsn, autocommit=True):
        return _Conn(self.store)


@pytest.fixture
def pg_store(monkeypatch):
    store = _Store()
    cache._psycopg = _Psycopg(store)
    cache._cfg_dsn = "postgresql://unused"
    # The old switch must not be able to select a shared in-process store.
    monkeypatch.setenv("CACHE_BACKEND", "memory")
    yield store
    cache._psycopg = None
    cache._cfg_dsn = None


@pytest.mark.parametrize("key", [
    'sprint_insight:sprint_insight_ai_cards:llm:{"sprint_id":430}',
    'sprint_epic_insights:epic_insights:llm:{"epic_key":"PROJ-1","sprint_id":430}',
])
def test_tenants_do_not_share_a_cache_entry(pg_store, key):
    cache.set(key, {"narrative": "tenant A"}, seconds=8640000, schema="tenant_a")

    assert cache.get(key, ttl=8640000, schema="tenant_b") is None
    assert cache.get(key, ttl=8640000, schema="tenant_a") == {"narrative": "tenant A"}

    cache.set(key, {"narrative": "tenant B"}, seconds=8640000, schema="tenant_b")

    assert cache.get(key, ttl=8640000, schema="tenant_a") == {"narrative": "tenant A"}
    assert cache.get(key, ttl=8640000, schema="tenant_b") == {"narrative": "tenant B"}
    assert set(pg_store.rows) == {"tenant_a", "tenant_b"}


def test_missing_schema_does_not_read_or_write(monkeypatch):
    def boom(schema):
        raise AssertionError(f"should not connect for schema={schema!r}")

    monkeypatch.setattr(cache, "_pg_connect", boom)

    assert cache.get("same-key") is None
    assert cache.get("same-key", schema="") is None
    cache.set("same-key", {"narrative": "leaked"})
    cache.set("same-key", {"narrative": "leaked"}, schema="")


def test_postgres_error_is_a_miss(monkeypatch):
    def boom(schema):
        raise RuntimeError("db down")

    monkeypatch.setattr(cache, "_pg_connect", boom)

    assert cache.get("same-key", schema="tenant_a") is None
    cache.set("same-key", {"narrative": "x"}, schema="tenant_a")


def test_no_process_global_memory_store():
    assert not hasattr(cache, "_cache")
    assert not hasattr(cache, "_memory_get")
    assert not hasattr(cache, "_memory_set")
    assert not hasattr(cache, "_backend")
