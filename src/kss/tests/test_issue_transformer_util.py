##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

from kss.jobs.utils.issue_transformer_util import IssueTransformerUtil


def _transform(fields):
    return IssueTransformerUtil.transform_issue_data_from_json(
        {"key": "KFX-1", "id": 1, "fields": fields}
    )


def test_missing_assignee_becomes_none():
    """A null/absent assignee must persist as None, never an empty string."""
    for fields in ({"assignee": None}, {}):
        data = _transform(fields)
        assert data["assignee_display_name"] is None
        assert data["assignee_account_id"] is None


def test_empty_assignee_name_becomes_none():
    """An assignee object with an empty displayName still normalizes to None."""
    data = _transform({"assignee": {"displayName": "", "accountId": "abc"}})
    assert data["assignee_display_name"] is None
    assert data["assignee_account_id"] == "abc"


def test_assigned_issue_keeps_values():
    """Populated assignee values pass through unchanged."""
    data = _transform({"assignee": {"displayName": "Alice", "accountId": "123:xyz"}})
    assert data["assignee_display_name"] == "Alice"
    assert data["assignee_account_id"] == "123:xyz"


def test_missing_parent_becomes_none():
    """A null/absent parent must persist as None, never an empty string."""
    for fields in ({"parent": None}, {}):
        data = _transform(fields)
        assert data["parent_issue_key"] is None


def test_present_parent_keeps_key():
    """A populated parent keeps its key."""
    data = _transform({"parent": {"key": "KFX-100", "id": 100}})
    assert data["parent_issue_key"] == "KFX-100"


def test_reporter_fields_normalized_too():
    """Reporter shares the same pattern, so it must normalize to None as well."""
    data = _transform({"reporter": None})
    assert data["reporter_display_name"] is None
    assert data["reporter_account_id"] is None
    data2 = _transform({"reporter": {"displayName": "John", "accountId": "j1"}})
    assert data2["reporter_display_name"] == "John"
    assert data2["reporter_account_id"] == "j1"


def test_other_fields_unchanged():
    """Unrelated fields keep their original behavior."""
    data = _transform({"summary": "Hello", "assignee": None, "parent": None})
    assert data["key"] == "KFX-1"
    assert data["summary"] == "Hello"
    assert data["issue_type"] == ""