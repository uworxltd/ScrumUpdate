##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

from app.transformers.transform import (
    HYGIENE_COLORS_DEFAULT,
    _build_hygiene_text,
    transform_issues_to_tabulator_from_json,
)


def test_hygiene_badge_no_description_maps_to_friendly_label():
    """no_description maps to the friendly single-token label 📝NoDescription.

    The label must contain no space and must not leak the raw DB sentinel,
    because the tabulator `list` formatter splits the Hygiene cell on spaces.
    """
    label = _build_hygiene_text({"hygiene_badges": ["no_description"]})
    assert label == "📝NoDescription"
    assert " " not in label
    assert "no_description" not in label


def test_hygiene_badge_no_description_with_other_badges():
    """📝NoDescription renders alongside existing badges in a label list."""
    text = _build_hygiene_text(
        {
            "hygiene_badges": ["no_description", "stale", "scope_churn"],
            "type": "Story",
            "story_points": 5,
        }
    )
    assert "📝NoDescription" in text
    assert "💤Stale" in text
    assert "🔄ScopeChurn" in text
    assert "no_description" not in text


def test_existing_hygiene_badges_unchanged():
    """Pre-existing badges keep their labels (no regression)."""
    assert _build_hygiene_text({"hygiene_badges": ["stale"]}) == "💤Stale"
    assert _build_hygiene_text({"hygiene_badges": ["scope_churn"]}) == "🔄ScopeChurn"
    assert _build_hygiene_text({"hygiene_badges": ["blocked"], "blocked": True}) == "🔒Blocked"
    assert (
        _build_hygiene_text({"hygiene_badges": [], "type": "Story", "story_points": None})
        == "❌StoryPoints"
    )


def test_unmapped_badges_keep_raw_fallback():
    """Truly unmapped badges fall back to the raw sentinel instead of raising."""
    assert _build_hygiene_text({"hygiene_badges": ["unknown_test_badge"]}) == "unknown_test_badge"


def test_hygiene_badge_no_assignee_maps_to_friendly_label():
    """no_assignee maps to the single-token label 👤NoAssignee.

    The label must contain no space and must not leak the raw DB sentinel,
    because the tabulator `list` formatter splits the Hygiene cell on spaces.
    """
    label = _build_hygiene_text({"hygiene_badges": ["no_assignee"]})
    assert label == "👤NoAssignee"
    assert " " not in label
    assert "no_assignee" not in label


def test_hygiene_badge_no_assignee_with_other_badges():
    """👤NoAssignee renders alongside existing badges in a label list."""
    text = _build_hygiene_text(
        {
            "hygiene_badges": ["no_assignee", "stale", "blocked"],
            "type": "Bug",
            "blocked": True,
        }
    )
    assert "👤NoAssignee" in text
    assert "💤Stale" in text
    assert "🔒Blocked" in text
    assert "no_assignee" not in text


def test_hygiene_color_map_has_no_assignee_entry():
    """HYGIENE_COLORS_DEFAULT defines a color for the 👤NoAssignee label."""
    assert "👤NoAssignee" in HYGIENE_COLORS_DEFAULT


def test_no_description_not_exposed_in_user_facing_table():
    """The tabulator table exposes only the friendly label, never the Sentinel."""
    result = transform_issues_to_tabulator_from_json(
        "https://company.atlassian.net/browse/",
        {
            "issues": [
                {
                    "issue": "KFX-1",
                    "type": "Story",
                    "summary": "Sample issue",
                    "assignee": "John",
                    "status": "To Do",
                    "priority": "High",
                    "story_points": 5,
                    "created_ts": "2025-01-01",
                    "hygiene_badges": ["no_description", "stale"],
                    "blockers_in": [],
                    "blockers_out": [],
                    "comments": [],
                }
            ]
        },
    )
    hygiene = result["table"]["data"][0]["hygiene"]
    assert "📝NoDescription" in hygiene
    assert "no_description" not in hygiene


def test_hygiene_color_map_has_description_entry():
    """HYGIENE_COLORS_DEFAULT defines a color for the friendly label."""
    assert "📝NoDescription" in HYGIENE_COLORS_DEFAULT