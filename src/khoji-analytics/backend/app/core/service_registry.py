##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

import asyncpg, yaml, os, re
from pathlib import Path

_CFG = yaml.safe_load((Path(__file__).parent.parent / "config/services.yaml").read_text())
_pools: dict[str, asyncpg.Pool] = {}

def _expand(template: str) -> str:
    """Replace {env:VAR} placeholders with os.environ values."""
    return re.sub(r"{env:([A-Z0-9_]+)}",
                  lambda m: os.getenv(m.group(1), ""),
                  template)

async def db_pool(service: str) -> asyncpg.Pool:
    if service not in _pools:
        cfg = _CFG["databases"][service]
        dsn=_expand(cfg["dsn"])
        print("📡 opening pool:", service, dsn)        # <— add

        _pools[service] = await asyncpg.create_pool(
            dsn=_expand(cfg["dsn"]),
            min_size=cfg.get("min_size", 1),
            max_size=cfg.get("max_size", 5),
        )
    return _pools[service]

async def acquire_conn(service: str, schema: str) -> asyncpg.Connection:
    pool = await db_pool(service)
    conn = await pool.acquire()
    await conn.execute(f'SET search_path TO "{schema}"')
    return conn

def ai_endpoint(name: str = "llm") -> str:
    return _expand(_CFG["ai_services"][name]["endpoint"])