##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Tests for yesterday status-category mapping behavior.

The SQL metrics now resolve category per issue at cutoff instead of using a
global lookup: SELECT status_category FROM issues WHERE status = ? LIMIT 1
"""

import orjson

from app.processors.sprint_cards import _build_status_changes


def _map_category_per_issue_at_cutoff(
    historical_status: str,
    issue: dict,
    cutoff_passed: bool = True,
) -> str:
    """Python mirror of per-issue category resolution in the fixed SQL metrics."""
    if issue["status"] == historical_status:
        return issue["status_category"]
    if not issue.get("status_category_change_date_after_cutoff", False):
        return issue["status_category"]
    if issue.get("first_post_cutoff_from") == historical_status:
        current = issue["status_category"]
        from_status = issue["first_post_cutoff_from"]
        if current == "Done":
            if from_status.lower().strip() in ("to do", "open", "backlog", "new", "todo"):
                return "To Do"
            return "In Progress"
        if current == "In Progress":
            return "To Do"
        if current == "To Do":
            if from_status.lower().strip() in ("done", "closed", "resolved", "complete", "completed", "finished"):
                return "Done"
            return "In Progress"
        return "In Progress"
    if issue.get("status_category_change_date_after_cutoff"):
        current = issue["status_category"]
        if current == "Done":
            return "In Progress"
        if current == "In Progress":
            return "To Do"
        if current == "To Do":
            return "Done"
        return "In Progress"
    return issue["status_category"]


def test_orphaned_status_uses_per_issue_category_not_global_lookup():
    """Orphaned status name should use issue transition history, not To Do fallback."""
    issue = {
        "issue_key": "KFX-1",
        "status": "Done",
        "status_category": "Done",
        "status_category_change_date_after_cutoff": True,
        "first_post_cutoff_from": "Legacy QA",
    }
    mapped = _map_category_per_issue_at_cutoff("Legacy QA", issue)
    assert mapped == "In Progress"


def test_unchanged_status_uses_issue_category():
    issue = {
        "issue_key": "KFX-2",
        "status": "Code Review",
        "status_category": "In Progress",
    }
    mapped = _map_category_per_issue_at_cutoff("Code Review", issue)
    assert mapped == "In Progress"


def test_reopened_done_ticket_maps_yesterday_to_done():
    issue = {
        "issue_key": "KFX-99",
        "status": "To Do",
        "status_category": "To Do",
        "status_category_change_date_after_cutoff": True,
        "first_post_cutoff_from": "Closed",
    }
    mapped = _map_category_per_issue_at_cutoff("Closed", issue)
    assert mapped == "Done"


def test_correct_yesterday_buckets_produce_progressed_count():
    """In Progress -> Done should count as progressed when buckets are correct."""
    yesterday_counts = [{"cnt_to_do_yesterday": 0, "cnt_in_progress_yesterday": 1, "cnt_done_yesterday": 0}]
    current_counts = [{"cnt_to_do": 0, "cnt_in_progress": 0, "cnt_done": 1}]

    status_ticket_data = [{
        "status_categories": orjson.dumps({
            "todo_tickets": [],
            "inprogress_tickets": [],
            "done_tickets": ["KFX-1"],
        }).decode("utf-8"),
    }]

    status_ticket_data_yesterday = [{
        "yesterday_tickets": orjson.dumps({
            "todo_tickets": [],
            "inprogress_tickets": ["KFX-1"],
            "done_tickets": [],
        }).decode("utf-8"),
    }]

    result = _build_status_changes(
        yesterday_counts=yesterday_counts,
        current_counts=current_counts,
        status_ticket_data=status_ticket_data,
        status_ticket_data_yesterday=status_ticket_data_yesterday,
    )

    assert result["progressed"] == 1
    assert result["regressed"] == 0


def test_miscategorized_yesterday_done_misses_regression():
    """Done yesterday miscategorized as To Do should miss regressed when reopened."""
    yesterday_counts = [{"cnt_to_do_yesterday": 1, "cnt_in_progress_yesterday": 0, "cnt_done_yesterday": 0}]
    current_counts = [{"cnt_to_do": 1, "cnt_in_progress": 0, "cnt_done": 0}]

    status_ticket_data = [{
        "status_categories": orjson.dumps({
            "todo_tickets": ["KFX-99"],
            "inprogress_tickets": [],
            "done_tickets": [],
        }).decode("utf-8"),
    }]

    # Buggy buckets: Done yesterday mapped to To Do
    status_ticket_data_yesterday_buggy = [{
        "yesterday_tickets": orjson.dumps({
            "todo_tickets": ["KFX-99"],
            "inprogress_tickets": [],
            "done_tickets": [],
        }).decode("utf-8"),
    }]

    buggy = _build_status_changes(
        yesterday_counts=yesterday_counts,
        current_counts=current_counts,
        status_ticket_data=status_ticket_data,
        status_ticket_data_yesterday=status_ticket_data_yesterday_buggy,
    )
    assert buggy["regressed"] == 0

    # Correct buckets: Done yesterday
    status_ticket_data_yesterday_correct = [{
        "yesterday_tickets": orjson.dumps({
            "todo_tickets": [],
            "inprogress_tickets": [],
            "done_tickets": ["KFX-99"],
        }).decode("utf-8"),
    }]

    correct = _build_status_changes(
        yesterday_counts=yesterday_counts,
        current_counts=current_counts,
        status_ticket_data=status_ticket_data,
        status_ticket_data_yesterday=status_ticket_data_yesterday_correct,
    )
    assert correct["regressed"] == 1
