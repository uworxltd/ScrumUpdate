##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

# transform.py
# config-driven → columns, icons, chips, table options
# Reads 'input.json' and writes 'output.json' by default.
#
# Usage:
#   python transform.py
#   python transform.py --in input.json --out output.json
#   # Or import:
#   # from transform import transform_issues_to_tabulator
#   # transform_issues_to_tabulator("https://company-name.atlassian.net/browse/", "input.json", "output.json",
#   #     columns=["date","parent_link","issue_id","issue_type","summary",...],
#   #     icon_map={"Epic":"🚀", ...}, status_colors={...}, ...)

import orjson
import argparse
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from decimal import Decimal

from app.helpers import json_helpers


# ==============================
# -------- CONFIG ZONE ---------
# ==============================

# A) Which columns (and order) to emit at the top-level table
DEFAULT_COLUMNS: List[str] = [
    "issue_id",
    "parent_link",
    "issue_type",
    "summary",
    "author",
    "status",
    "priority",
    "hygiene",
    "story_points",
    "counts",
    "date",
    "timing",
    "trail",
]

# B) Visuals / formatters (used to build the columns section)
ICON_MAP_DEFAULT = {
    "Epic": "&#128640;",     # 🚀
    "Story": "&#128221;",    # 📝
    "Bug": "&#128027;",      # 🐛
    "Task": "&#9989;",       # ✅
    "Subtask": "&#128312;",  # 🟨
    "Comment": "&#128172;",  # 💬
    "Blockers": "&#128683;", # 🚫
    "Blocking": "&#9940;",   # ⛔
    "BlockedBy": "&#128219;" # 🧫 (approx) – as per your expected JSON
}

TYPE_COLORS_DEFAULT = {
    "Epic": "#4B0082",
    "Story": "#2E8B57",
    "Bug": "#8B0000",
    "Task": "#1E90FF",
    "Subtask": "#20B2AA",
    "Comment": "#696969",
    "Blockers": "#B22222",
    "Blocking": "#FF8C00",
    "BlockedBy": "#800000",
}

STATUS_COLORS_DEFAULT = {
    "In QA": "#9a3412",
    "In Progress": "#9a3412",
    "In Review": "#9a3412",
    "Awaiting QA": "#9a3412",
    "To Do": "#2f4f4f",
    "Done": "#065f46",
}

PRIORITY_COLORS_DEFAULT = {
    "Highest": "#8B0000",
    "High": "#9a3412",
    "Medium": "#8B8000",
    "Low": "#2F4F4F",
    "Lowest": "#1C1C1C",
}

HYGIENE_COLORS_DEFAULT = {
    "🔒Blocked": "#D9534F",
    "💤Stale": "#6C757D",
    "❌StoryPoints": "#5A5ACF",
    "🔄ScopeChurn": "#D98419",
    "📝NoDescription": "#17A2B8",
    "👤NoAssignee": "#5B7C99",
}

# C) Table options
TABLE_OPTIONS_DEFAULT = {
    "dataTree": True,
    # set additional Tabulator options here if needed
    # "layout": "fitColumns",
}

# D) Misc formatting controls
LIST_DELIMS_DEFAULT = {
    "timing": "|",   # used by list formatter on Timing
    "trail": "||",   # used by list formatter on Trail
}
PUSHPIN_ICON = "&#x1F4CC;"  # 📌


# ==============================
# Public API 
# ==============================

# tests missing
def transform_issues_to_tabulator(
    jira_browse_base: str,
    input_path: str,
    output_path: str,
    *,
    columns: Optional[List[str]] = None,
    icon_map: Optional[Dict[str, str]] = None,
    type_colors: Optional[Dict[str, str]] = None,
    status_colors: Optional[Dict[str, str]] = None,
    priority_colors: Optional[Dict[str, str]] = None,
    hygiene_colors: Optional[Dict[str, str]] = None,
    table_options: Optional[Dict[str, Any]] = None,
    list_delims: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """
    File → File transformer.
    - Reads JSON from input_path, writes Tabulator-shaped JSON to output_path.
    - All knobs are overridable; pass None to use defaults from CONFIG ZONE.
    """
    src = _load_json_from_file(input_path)
    result = transform_issues_to_tabulator_from_json(
        jira_browse_base,
        src,
        columns=columns,
        icon_map=icon_map,
        type_colors=type_colors,
        status_colors=status_colors,
        priority_colors=priority_colors,
        hygiene_colors=hygiene_colors,
        table_options=table_options,
        list_delims=list_delims
    )
    with open(output_path, "wb") as out:
        out.write(orjson.dumps(result, option=orjson.OPT_INDENT_2, default=json_helpers.orjson_default))
    return result


# tests missing
def transform_issues_to_tabulator_from_json(
    jira_browse_base: str,
    issues_json: Any,
    *,
    columns: Optional[List[str]] = None,
    icon_map: Optional[Dict[str, str]] = None,
    type_colors: Optional[Dict[str, str]] = None,
    status_colors: Optional[Dict[str, str]] = None,
    priority_colors: Optional[Dict[str, str]] = None,
    hygiene_colors: Optional[Dict[str, str]] = None,
    table_options: Optional[Dict[str, Any]] = None,
    list_delims: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    JSON → JSON transformer (engine use).
    Accepts dict/list/JSON-string or a 1-col row object; returns Tabulator dict.
    """
    # Unwrap common SQL row form (single-column JSON)
    src = issues_json
    if isinstance(src, list) and src and isinstance(src[0], dict) and len(src[0]) == 1:
        only_key = next(iter(src[0].keys()))
        src = src[0][only_key]
    if isinstance(src, str):
        src = orjson.loads(src or "{}")

    issues = src["issues"] if isinstance(src, dict) and "issues" in src else src
    if not isinstance(issues, list):
        issues = []

    # Activate defaults if needed
    columns = columns or DEFAULT_COLUMNS
    icon_map = icon_map or ICON_MAP_DEFAULT
    type_colors = type_colors or TYPE_COLORS_DEFAULT
    status_colors = status_colors or STATUS_COLORS_DEFAULT
    priority_colors = priority_colors or PRIORITY_COLORS_DEFAULT
    hygiene_colors = hygiene_colors or HYGIENE_COLORS_DEFAULT
    table_options = table_options or TABLE_OPTIONS_DEFAULT
    list_delims = list_delims or LIST_DELIMS_DEFAULT

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # Build rows
    data_rows: List[Dict[str, Any]] = []
    for it in issues:
        if not isinstance(it, dict):
            continue
        row = _build_row(it, now, jira_browse_base)
        kids = _build_children(it, jira_browse_base)
        if kids:
            row["_children"] = kids
        data_rows.append(row)

    # Build columns spec based on config
    columns_spec = _build_columns_spec(
        columns=columns,
        icon_map=icon_map,
        type_colors=type_colors,
        status_colors=status_colors,
        priority_colors=priority_colors,
        hygiene_colors=hygiene_colors,
        list_delims=list_delims,
        pushpin_icon=PUSHPIN_ICON,
    )

    table_dict = dict(table_options)  # shallow copy
    table_dict["columns"] = columns_spec
    table_dict["data"] = data_rows

    return {"table": table_dict}


# ==============================
# Internals 
# ==============================

def _load_json_from_file(path: str) -> Any:
    with open(path, "rb") as f:
        return orjson.loads(f.read())

def _safe_date_str(dt: Optional[str]) -> Optional[str]:
    if not dt:
        return None
    try:
        return datetime.fromisoformat(dt).strftime("%Y-%m-%d")
    except Exception:
        try:
            return datetime.fromisoformat(dt.replace("Z", "+00:00")).strftime("%Y-%m-%d")
        except Exception:
            return None

def _to_datetime(dt: Optional[str]) -> Optional[datetime]:
    if not dt:
        return None
    try:
        return datetime.fromisoformat(dt)
    except Exception:
        try:
            return datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except Exception:
            return None

def _days_between(a: Optional[datetime], b: Optional[datetime]) -> Optional[int]:
    if not a or not b:
        return None
    return max(0, (b - a).days)

def _adf_to_text(raw: Any) -> str:
    """
    Atlassian ADF → text (best-effort). Accepts dict/list or JSON-string.
    """
    if not raw:
        return ""
    if isinstance(raw, (dict, list)):
        obj = raw
    else:
        try:
            obj = orjson.loads(raw)
        except Exception:
            return str(raw)

    out: List[str] = []

    def walk(node: Any):
        if node is None:
            return
        if isinstance(node, list):
            for n in node:
                walk(n)
            return
        if isinstance(node, dict):
            t = node.get("type")
            if t == "text":
                out.append(node.get("text", ""))
            elif t == "mention":
                out.append(node.get("attrs", {}).get("text", ""))
            elif t == "inlineCard":
                url = node.get("attrs", {}).get("url")
                out.append(url or "")
            elif t == "hardBreak":
                out.append(" ")
            if "content" in node:
                walk(node["content"])

    walk(obj)
    return " ".join(" ".join(out).split())[:280]

def _compute_days_since_updated(item: Dict[str, Any], now: datetime) -> Optional[int]:
    cand: List[datetime] = []
    d = _to_datetime(item.get("updated_ts") or item.get("updated") or item.get("updated_date"))
    if d: cand.append(d)
    for c in (item.get("comments") or []):
        d = _to_datetime(c.get("created_date"))
        if d: cand.append(d)
    for t in (item.get("transitions") or []):
        d = _to_datetime(t.get("at"))
        if d: cand.append(d)
    return _days_between(max(cand), now) if cand else None

def _scope_change_percent(item: Dict[str, Any]) -> float:
    """
    Simple heuristic → scope change % (bounded 0..100). Tune as you like.
    """
    base = 0.0
    base += 8.0 * float(item.get("assignee_handoffs") or 0)
    base += 6.0 * float(item.get("status_changes_count") or 0)
    if "scope_churn" in (item.get("hygiene_badges") or []):
        base += 20.0
    age = float(item.get("issue_age_days") or 0)
    if age > 0:
        base *= (1.0 - min(0.5, 10.0 / (age + 1.0)))
    return round(max(0.0, min(100.0, base)), 2)

def _build_counts_text(item: Dict[str, Any]) -> str:
    cc = int(item.get("comments_count") or 0)
    dc = int(item.get("dependencies_count") or 0)
    bc = int(item.get("blockers_count") or 0)
    return f"💬 {cc} · 🔗 {dc} · ⛔ {bc}"

def _build_timing_text(item: Dict[str, Any], now: datetime) -> str:
    pieces: List[str] = []
    c = _safe_date_str(item.get("created_ts") or item.get("created_date") or item.get("created"))
    if c: pieces.append(f"🗓️ {c}")
    s = _safe_date_str(item.get("started_at"))
    if s: pieces.append(f"🚀 {s}")
    r = _safe_date_str(item.get("resolved_at"))
    if r: pieces.append(f"✅ {r}")
    age = item.get("issue_age_days")
    if isinstance(age, (int, float)): pieces.append(f"⏳ Issue Age: {int(age)}d")
    cycle = item.get("cycle_time_days")
    if isinstance(cycle, (int, float)): pieces.append(f"🕒 {int(cycle)}d")
    stat_age = item.get("current_status_age_days")
    if isinstance(stat_age, (int, float)): pieces.append(f"⏱️ Status Age: {int(stat_age)}d")
    upd = _compute_days_since_updated(item, now)
    if isinstance(upd, int): pieces.append(f"⌛ Last Update: {upd}d")
    return " | ".join(pieces)

def _build_hygiene_text(item: Dict[str, Any]) -> str:
    # Get hygiene badges from input, as strings
    badges = set(item.get("hygiene_badges") or [])

    # Normalize badge names for internal logic
    # Only add if not already present
    if item.get("blocked") and "blocked" not in badges:
        badges.add("blocked")
    if item.get("type") == "Story" or item.get("type") == "Bug" or item.get("type") == "Task":
        if item.get("story_points") is None and "story_point" not in badges:
            badges.add("story_point")
    if not badges:
        return ""

    # Map internal badge names to user-friendly display strings
    badge_display_map = {
        "stale": "💤Stale",
        "scope_churn": "🔄ScopeChurn",
        "blocked": "🔒Blocked",
        "story_point": "❌StoryPoints",
        "no_description": "📝NoDescription",
        "no_assignee": "👤NoAssignee",
    }

    # Convert all badges to their display form
    display_badges = [badge_display_map.get(badge, badge) for badge in badges]

    # Sort for consistent order
    return " ".join(sorted(display_badges))

def _build_trail_text(item: Dict[str, Any]) -> str:
    trs = sorted((item.get("transitions") or []), key=lambda x: x.get("at") or "",reverse=True)
    parts = []
    for t in trs:
        d = _safe_date_str(t.get("at"))
        ass = t.get("assignee") or "Unassigned"
        st = t.get("status") or "—"
        din = t.get("days_in_state")
        seg = f"{d} {ass} → {st}" if d else f"{ass} → {st}"
        if isinstance(din, (int, float)):
            seg += f" ({int(din)}d)"
        parts.append(seg)
    return " || ".join(parts)

def _build_children(item: Dict[str, Any], jira_browse_base: str) -> Optional[List[Dict[str, Any]]]:
    children: List[Dict[str, Any]] = []

    # Comments (group + leaf rows)
    comments = item.get("comments") or []
    if comments:
        rows = []
        for c in comments:
            rows.append({
                "date": _safe_date_str(c.get("created_date")),
                "parent_link": "",
                "issue_id": f"{item.get('issue')}-C-{c.get('comment_id')}",
                "issue_id_label": f"{item.get('issue')}-C-{c.get('comment_id')}",
                "issue_url": f"{jira_browse_base}{item.get('issue')}",
                "issue_type": "Comment",
                "summary": _adf_to_text(c.get("body")),
                "story_points": None,
                "scope_change_percent": None,
                "author": c.get("author") or c.get("author_display") or "",
            })
        children.append({
            "date": _safe_date_str(item.get("created_ts") or item.get("created_date")),
            "parent_link": "",
            "issue_id": f"{item.get('issue')}#comments",
            "issue_id_label": f"{item.get('issue')} — Comments ({len(rows)})",
            "issue_url": f"{jira_browse_base}{item.get('issue')}",
            "issue_type": "Comment",
            "summary": f"Comments ({len(rows)})",
            "_children": rows,
        })

    # Inbound blockers (blocked by)
    inb = item.get("blockers_in") or item.get("blocked_by") or []
    if inb:
        rows = []
        for b in inb:
            key = b.get("other_key") or b.get("key")
            rows.append({
                "date": _safe_date_str(item.get("created_ts") or item.get("created_date")),
                "parent_link": b.get("other_parent_key") or "", # key or "",
                "issue_id": key or "",
                "issue_id_label": key or "",
                "issue_url": f"{jira_browse_base}{key}" if key else None,
                "issue_type": b.get("other_issue_type") or "", # "BlockedBy",
                "summary": b.get("other_summary") or f"{key} is not synced" or "", # f"Blocked by {key} — {b.get('other_status') or b.get('status') or '—'}",
                "status": b.get("other_status") or b.get("status") or "",
                "author": b.get("other_assignee") or b.get("assignee") or "",
                "story_points": b.get("other_story_points"),
                "priority": b.get("other_priority") or "",
                "scope_change_percent": None,
            })
        children.append({
            "date": _safe_date_str(item.get("created_ts") or item.get("created_date")),
            "parent_link": item.get("issue") or item.get("key"),
            "issue_id": f"{item.get('issue')}#blocked_by",
            "issue_id_label": f"{item.get('issue')} — Blocked By ({len(rows)})",
            "issue_url": f"{jira_browse_base}{item.get('issue')}",
            "issue_type": "Blockers",
            "summary": f"Blocked By ({len(rows)})",
            "_children": rows,
        })

    # Outbound blockers (this issue blocks)
    outb = item.get("blockers_out") or item.get("blocking") or []
    if outb:
        rows = []
        for b in outb:
            key = b.get("other_key") or b.get("key")
            rows.append({
                "date": _safe_date_str(item.get("created_ts") or item.get("created_date")),
                "parent_link": b.get("other_parent_key") or "", # key or "",
                "issue_id": key or "",
                "issue_id_label": key or "",
                "issue_url": f"{jira_browse_base}{key}" if key else None,
                "issue_type": b.get("other_issue_type") or "", # "Blocking",
                "summary": b.get("other_summary") or f"{key} is not synced" or "", # f"Blocking {key} {b.get('other_status') or b.get('status') or ''}",
                "status": b.get("other_status") or b.get("status") or "",
                "author": b.get("other_assignee") or b.get("assignee") or "",
                "story_points": b.get("other_story_points"),
                "priority": b.get("other_priority") or "",
                "scope_change_percent": None,
            })
        children.append({
            "date": _safe_date_str(item.get("created_ts") or item.get("created_date")),
            "parent_link": item.get("issue") or item.get("key"),
            "issue_id": f"{item.get('issue')}#blocking",
            "issue_id_label": f"{item.get('issue')} — Blocking ({len(rows)})",
            "issue_url": f"{jira_browse_base}{item.get('issue')}",
            "issue_type": "Blockers",
            "summary": f"Blocking ({len(rows)})",
            "_children": rows,
        })

    return children or None

def _build_row(item: Dict[str, Any], now: datetime, jira_browse_base: str) -> Dict[str, Any]:
    date = _safe_date_str(item.get("created_ts") or item.get("created_date") or item.get("created"))
    parent = item.get("epic_parent") or item.get("parent") or ""
    issue_key = item.get("issue") or item.get("key") or item.get("issue_id")
    issue_type = item.get("type") or item.get("issuetype") or item.get("issue_type") or "Issue"
    summary = item.get("summary") or _adf_to_text(item.get("summary_adf"))
    sp = item.get("story_points")
    author = item.get("assignee") or item.get("assignee_display") or "Unassigned"
    status = item.get("status") or ""
    priority = item.get("priority") or ""
    timing_text = _build_timing_text(item, now)
    hygiene_text = _build_hygiene_text(item)
    print (hygiene_text)
    trail_text = _build_trail_text(item)

    return {
        "date": date,
        "parent_link": parent,
        "issue_id": issue_key,
        "issue_id_label": issue_key,
        "issue_url": f"{jira_browse_base}{issue_key}" if issue_key else None,
        "issue_type": issue_type,
        "summary": summary,
        "status": status,
        "priority": priority,
        "author": author,
        "story_points": sp,
        "scope_change_percent": _scope_change_percent(item),
        "counts": _build_counts_text(item),
        "timing": timing_text,
        "hygiene": hygiene_text,
        "trail": trail_text,
    }

def _build_columns_spec(
    *,
    columns: List[str],
    icon_map: Dict[str, str],
    type_colors: Dict[str, str],
    status_colors: Dict[str, str],
    priority_colors: Dict[str, str],
    hygiene_colors: Dict[str, str],
    list_delims: Dict[str, str],
    pushpin_icon: str,
) -> List[Dict[str, Any]]:
    """
    Build the columns array. Each column key maps to a spec; we mirror your expected JSON,
    including the multiple 'formatters' arrays (your FE understands those).
    """
    specs: Dict[str, Dict[str, Any]] = {
        "date": { "title": "Date", "field": "date", "hozAlign": "left" },
        "parent_link": {
            "title": "Parent", "field": "parent_link",
            "formatters": [ { "formatter": "icon", "formatterParams": { "position": "left", "icon": pushpin_icon } } ]
        },
        "issue_id": {
            "title": "Issue ID", "field": "issue_id",
            "formatters": [
                { "formatter": "link",
                  "formatterParams": { "labelField": "issue_id_label", "urlField": "issue_url", "target": "_blank" } },
                { "formatter": "icon",
                  "formatterParams": { "position": "left", "mapField": "issue_type", "iconMap": icon_map } },
            ],
        },
        "issue_type": {
            "title": "Type", "field": "issue_type",
            "formatters": [ { "formatter": "chip", "formatterParams": { "colorMap": type_colors } } ],
        },
        "summary": { "title": "Summary", "field": "summary", "maxWidth": 250, "tooltip": bool("true") },
        "status": {
            "title": "Status", "field": "status",
            "formatters": [ { "formatter": "chip", "formatterParams": { "colorMap": status_colors } } ],
        },
        "author": { "title": "Assignee", "field": "author" },
        "priority": {
            "title": "Priority", "field": "priority",
            "formatters": [ { "formatter": "chip", "formatterParams": { "colorMap": priority_colors } } ],
        },
        "story_points": { "title": "Story Points", "field": "story_points", "hozAlign": "right" },
        "counts": { "title": "Counts", "field": "counts" },
        "timing": {
            "title": "Timing", "field": "timing",
            "formatters": [ { "formatter": "list", "formatterParams": { "delimiter": list_delims.get("timing","|") } } ],
        },
        "hygiene": {
            "title": "Hygiene", "field": "hygiene",
            "formatters": [
                { "formatter": "list", "formatterParams": { "delimiter": " " } },
                { "formatter": "chip", "formatterParams": { "styleClass": "block", "colorMap": hygiene_colors } },
            ],
        },
        "trail": {
            "title": "Trail", "field": "trail","tooltip": "This is Trail of users involved in transitions",
            "formatters": [ { "formatter": "list", "formatterParams": { "delimiter": list_delims.get("trail","||") } },{"formatter": "trail"} ],
        },
    }

    out: List[Dict[str, Any]] = []
    for key in columns:
        if key in specs:
            out.append(specs[key])
    return out


# ==============================
# --------- CLI Runner ---------
# ==============================

def _cli():
    p = argparse.ArgumentParser(description="Transform issues → Tabulator JSON")
    p.add_argument("--in", dest="infile", default="input.json", help="Input JSON path (default: input.json)")
    p.add_argument("--out", dest="outfile", default="output.json", help="Output JSON path (default: output.json)")
    args = p.parse_args()
    transform_issues_to_tabulator('https://company-name.atlassian.net/browse/', args.infile, args.outfile)

if __name__ == "__main__":
    _cli()