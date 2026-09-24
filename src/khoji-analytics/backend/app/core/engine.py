##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

# app/core/engine.py
import asyncio, asyncpg, aiohttp, orjson, importlib, re, yaml
from typing import Any, Dict
from pathlib import Path

from app.core.errors import AIRequestFailed
from app.helpers import json_helpers
from app.core.service_registry import acquire_conn, ai_endpoint
from app.core.cache import get as cache_get, set as cache_set


CACHE_KEY_BLACKLIST = { "team_name", "jira_browse_base" }
print("KAS-Engine", flush=True)


def _coerce_from_decl(val: str | None, source_tpl: str, spec_inputs: dict) -> object:
    """
    Coerce rendered string values into types declared in spec.inputs.
    Only triggers when the source template is exactly {{ inputs.X }}.
    """
    m = re.fullmatch(r"\{\{\s*inputs\.([A-Za-z0-9_]+)\s*\}\}", str(source_tpl))
    decl_type = None
    if m:
        inp = m.group(1)
        decl = (spec_inputs or {}).get(inp) or {}
        decl_type = (decl.get("type") or "").lower()

    if val in (None, "None", "null", "Null", ""):
        return None

    s = str(val).strip()
    if decl_type in ("int", "integer"):  return int(s)
    if decl_type in ("float", "number"): return float(s)
    if decl_type in ("bool", "boolean"): return s.lower() in ("1","true","t","yes","on")
    return s


async def _http_ai(endpoint: str, payload: dict, headers: dict | None = None):
    print(f"[HTTP_AI::_http_ai] Calling {endpoint}", flush=True)
    headers_json = orjson.dumps(headers or {}, option=orjson.OPT_INDENT_2, default=json_helpers.orjson_default).decode('utf-8')
    print(f"Headers: {headers_json}", flush=True)

    try:
        async with aiohttp.ClientSession() as s:
            try:
                r = await s.post(
                    endpoint,
                    json=payload,
                    headers=headers or {},
                    timeout=120
                )
            except aiohttp.ClientError as e:
                msg = f"Network error contacting AI service: {str(e)}"
                print(f"[HTTP_AI NETWORK ERROR] {msg}", flush=True)
                raise AIRequestFailed(503, msg)

            if r.status < 200 or r.status >= 300:
                try:
                    body = await r.text()
                except Exception:
                    body = "<unable to read response body>"

                msg = f"AI provider returned HTTP {r.status}: {body}"
                print(f"[HTTP_AI BAD STATUS] {msg}", flush=True)
                raise AIRequestFailed(r.status, msg)

            try:
                return await r.json()
            except aiohttp.ContentTypeError:
                text_body = await r.text()
                return {"text": text_body}

    except asyncio.TimeoutError:
        msg = "AI request timed out"
        print(f"[HTTP_AI TIMEOUT] {msg}", flush=True)
        raise AIRequestFailed(504, msg)

    except Exception as e:
        msg = f"Unexpected AI request error: {str(e)}"
        print(f"[HTTP_AI UNEXPECTED] {msg}", flush=True)
        raise AIRequestFailed(500, msg)


def _import_function(path: str):
    mod, fn = path.rsplit(".", 1)
    return getattr(importlib.import_module(mod), fn)


def _build_cache_identity_params(params: dict) -> dict:
    return {
        k: v
        for k, v in params.items()
        if k not in CACHE_KEY_BLACKLIST
    }


async def execute_pipeline(metric: str, spec: dict, params: dict, schema: str) -> Dict[str, Any]:
    """
    Step types:
      - sql       : run parametrized SQL
      - function  : import & call a python function
      - http_ai   : POST to an AI endpoint with rendered JSON body
      - file      : read JSON/text file
      - pipeline  : call another metric (YAML) and reuse its outputs
    """
    artefacts: Dict[str, Any] = {}

    async def render(template: str) -> str:
        out = template.replace("{{ schema }}", schema)
        if schema.startswith("tenant_"):
            raw_tenant = schema.split("_", 1)[1]
            out = out.replace("{{ tenant_id }}", raw_tenant)

        for k, v in params.items():
            out = out.replace(f"{{{{ inputs.{k} }}}}", str(v))
        # NOTE: we still allow string replacement for steps.* but deep_render/resolve_value
        # will return proper Python objects when used in JSON bodies.
        for sid, outs in artefacts.items():
            for name, val in outs.items():
                ph = f"{{{{ steps.{sid}.outputs.{name} }}}}"
                json_val = orjson.dumps(val, default=json_helpers.orjson_default).decode('utf-8')
                out = out.replace(ph, json_val)
        return out

    async def resolve_value(expr, extra=None):
        s = await render(str(expr))  # expand plain tokens first

        # exact steps-reference? return the Python value, not a string
        m = re.fullmatch(
            r"\s*\{\{\s*steps\.([A-Za-z0-9_\-]+)\.outputs\.([A-Za-z0-9_\-]+)\s*\}\}\s*", s
        )
        if m:
            sid, oname = m.group(1), m.group(2)
            return artefacts[sid][oname]

        # If it *looks* like JSON, parse it; else return raw string
        try:
            return orjson.loads(s)
        except Exception:
            return s

    async def deep_render(x):
        if isinstance(x, dict):
            return {k: await deep_render(v) for k, v in x.items()}
        if isinstance(x, list):
            return [await deep_render(v) for v in x]
        # leaf: prefer resolve_value so steps.* returns real objects
        return await resolve_value(x)

    METRICS_DIR = Path(__file__).resolve().parents[2] / "app" / "metrics" # base dir for locating child metrics by name
    cache_toset = None

    for step in spec["steps"]:
        sid    = step["id"]
        kind   = step["type"]
        target = step["output"]["name"]

        filtered_params = _build_cache_identity_params(params)
        ck  = f"{metric}:{spec['name']}:{sid}:{orjson.dumps(filtered_params, option=orjson.OPT_SORT_KEYS, default=json_helpers.orjson_default).decode('utf-8')}"
        ttl = int(step.get("cache", 0) or 0)

        if ttl:
            cached = cache_get(ck, ttl=ttl, schema=schema)
            if cached is not None:
                artefacts[sid] = {target: cached}
                print(f"[CACHE HIT] step={sid} key={ck}", flush=True)
                if "return" in spec:
                    try:
                        path = spec["return"].split(".")
                        obj = artefacts
                        for key in path:
                            obj = obj[key]
                        return obj
                    except Exception:
                        pass
                continue

        # ---------------- SQL step ----------------
        if kind == "sql":
            conn  = await acquire_conn(step["service"], schema)
            try:
                query = await render(step["query"])
                spec_inputs = spec.get("inputs") or {}

                raw_tenant = schema.split("_", 1)[1] if schema.startswith("tenant_") else schema

                binds = []
                for raw in step.get("params", []):
                    src = str(raw).strip()
                    val = await render(src)
                    if val in ("None", "null", "", "Null"):
                        binds.append(None); continue
                    if src in ("{{ tenant_id }}", "{{tenant_id}}"):
                        binds.append(int(raw_tenant)); continue
                    coerced = _coerce_from_decl(val, src, spec_inputs)
                    binds.append(coerced)

                print(
                    f"[SQL] step={sid} query={len(query)} binds={binds} types={[type(b).__name__ for b in binds]}",
                    flush=True
                )
                rows = await conn.fetch(query, *binds)
                artefacts[sid] = {target: [dict(r) for r in rows]}
            finally:
                await conn.close()

        # ---------------- Function step ----------------
        elif kind == "function":
            fn = _import_function(step["function"])
            kwargs = {arg: await resolve_value(v) for arg, v in step.get("inputs", {}).items()}
            print(f"[FUNCTION] step={sid} fn={step['function']} kwargs_keys={list(kwargs.keys())}", flush=True)
            artefacts[sid] = {target: fn(**kwargs)}

        # ---------------- HTTP / LLM step ----------------
        elif kind == "http_ai":
            endpoint = ai_endpoint(step.get("service", "llm"))
            headers  = {k: await render(str(v)) for k, v in step.get("headers", {}).items()}
            if "body" in step:
                payload = await deep_render(step["body"])
            else:
                payload = {
                    "prompt": step["prompt_name"],
                    "inputs": {k: artefacts[v.split(".")[1]][v.split(".")[3]]
                               for k, v in step.get("prompt_inputs", {}).items()},
                }
            print(f"[HTTP_AI] step={sid} POST {endpoint}\nheaders={headers}\npayload(keys)={list(payload.keys())}", flush=True)

            result = await _http_ai(endpoint, payload, headers=headers)
            artefacts[sid] = {target: result}

        # ---------------- FILE step ----------------
        elif kind == "file":
            rel = await render(step["path"])
            p = Path(rel)
            if not p.is_absolute():
                p = Path.cwd() / p
            text = p.read_text(encoding="utf-8")
            try:
                val = orjson.loads(text)
            except Exception:
                val = text
            artefacts[sid] = {target: val}

        # ---------------- PIPELINE (child metric) step ----------------
        elif kind == "pipeline":
            # find child metric
            if "file" in step:
                child_path = Path(await render(step["file"]))
                if not child_path.is_absolute():
                    child_path = Path.cwd() / child_path
            else:
                child_path = METRICS_DIR / f"{step['metric']}.yaml"

            child_spec = yaml.safe_load(child_path.read_text(encoding="utf-8"))

            # build child params
            child_params = {}
            for k, v in (step.get("inputs") or {}).items():
                child_params[k] = await resolve_value(v)

            print(f"[PIPELINE] step={sid} -> {child_path.name} params={child_params}", flush=True)
            # Optionally: include child_params in cache key for this step
            # ck = f"{ck}::{json.dumps(child_params, sort_keys=True)}"

            child_out = await execute_pipeline(step["metric"].lower(), child_spec, child_params, schema)

            selected = child_out
            if "select" in step:
                try:
                    obj = child_out
                    for key in step["select"].split("."):
                        obj = obj[key]
                    selected = obj
                except Exception:
                    pass

            if step.get("passthrough_return"):
                try:
                    r = child_spec.get("return")
                    if r:
                        obj = child_out
                        for key in r.split("."):
                            obj = obj[key]
                        selected = obj
                except Exception:
                    pass

            artefacts[sid] = {target: selected}

        else:
            raise ValueError(f"Unknown step type '{kind}'")

        if cache_toset:
            cache_set(
                cache_toset["key"],
                cache_toset["value"],
                cache_toset["ttl"],
                schema=cache_toset["schema"]
            )
            print(f"[DEFERRED CACHE SET] step={cache_toset['step']} key={cache_toset['key']}", flush=True)
            cache_toset = None

        if ttl:
            if kind != "http_ai":
                cache_set(ck, artefacts[sid][target], ttl, schema=schema)
                print(f"[CACHE SET] step={sid} key={ck}", flush=True)
            elif result:
                cache_toset = {
                    "key": ck,
                    "ttl": ttl,
                    "schema": schema,
                    "value": result,
                    "metric": spec["name"],
                    "step": sid,
                }
                
        if "return" in spec:
            try:
                path = spec["return"].split(".")
                obj = artefacts
                for key in path:
                    obj = obj[key]
                return obj
            except Exception:
                pass

    if cache_toset:
        cache_set(
            cache_toset["key"],
            cache_toset["value"],
            cache_toset["ttl"],
            schema=cache_toset["schema"]
        )
        print(f"[DEFERRED CACHE SET] step={cache_toset['step']} key={cache_toset['key']}", flush=True)
        cache_toset = None

    return artefacts