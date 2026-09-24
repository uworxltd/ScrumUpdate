##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

import orjson
from copy import deepcopy


# looks like this is not used
def summarise_worklog(rows):
    """Compute simple totals/averages from work-log rows list."""
    if not rows:
        return {"user_count": 0, "total_hours": 0, "avg_hours": 0}

    total = sum(r["hrs"] for r in rows)
    users = len(rows)
    return {
        "user_count": users,
        "total_hours": total,
        "avg_hours": round(total / users, 2),
    }


# looks like this is not used
def format_issue_list(rows):
    # Example: "KFX-1 SP5 Monday, KFX-2 SP3 Tuesday"
    parts = []
    for r in rows or []:
        sp = r.get("story_points") or 0
        wd = r.get("work_day") or ""
        parts.append(f"{r['issue_id']} SP{sp} {wd}".strip())
    return ", ".join(parts)


# tests missing
def merge_team_and_sprint(team_rows, sprint_rows):
    """
    Unwraps SQL outputs and merges them into a flat dict.
    Expects each input to be either:
      - a list with one row dict, where the value is a JSON string/dict
      - or already a dict
    """
    def unwrap(x, key):
        if isinstance(x, list) and len(x) == 1:
            row = x[0]
            if isinstance(row, dict) and key in row:
                val = row[key]
                if isinstance(val, str):
                    try:
                        return orjson.loads(val)
                    except Exception:
                        return val
                return val
        return x

    return {
        "team_members": unwrap(team_rows, "team_members"),
        "sprint_facts": unwrap(sprint_rows, "sprint_facts"),
    }


# tests missing
def merge_cards_and_table(cards: dict, table_payload: dict) -> dict:
    """
    cards: full JSON from sprint_insight_ai_cards (already parsed)
    table_payload: {"table": {...}} as produced by sprint_insight_db_tabulator_table
    returns: same cards JSON with 'table' appended at top-level
    """
    out = deepcopy(cards) if isinstance(cards, dict) else {}
    table_obj = table_payload.get("table") if isinstance(table_payload, dict) else None
    if table_obj is not None:
        out["table"] = table_obj
    else:
        # If the child already returned the inner table map (edge case), still attach sanely
        out["table"] = table_payload
    return out