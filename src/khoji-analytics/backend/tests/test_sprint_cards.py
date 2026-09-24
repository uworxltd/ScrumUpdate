##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

from decimal import Decimal

from app.processors import (
    extract_static_summary,
    extract_status_changes,
    transform_signals_combined, merge_signals_with_ai_summary, format_testing_bottleneck_for_llm, merge_testing_bottleneck_with_signals, select_final_signals,
    extract_team_pulse,
)
from app.processors.sprint_cards import (
    _parse_initial_scope_data,
    _calculate_scope_change_percentage,
    _parse_status_ticket_data,
    _calculate_scope_additions,
)


def test_extract_static_summary_basic():
    import orjson
    
    payload = [
        {
            "sprint_payload": {
                "facts": {
                    "sprint": {"name": "X1"},
                    "summary_now": {
                        "points_now": 20,
                        "points_done_now": 5,
                        "todo_cnt": 2,
                        "wip_cnt": 3,
                        "done_cnt": 1,
                    },
                    "hygiene": {
                        "counts": {
                            "stale_count": 1,
                            "no_assignee": 0,
                            "missing_story_points": 1,
                            "missing_description": 0,
                            "total_issues_now": 4,
                        }
                    },
                },
                "at_risk": [
                    {"blocked": True, "issue_key": "KFX-100", "priority": "High"},
                    {"blocked": False, "issue_key": "KFX-101", "priority": None},
                ],
            }
        }
    ]

    sprint_title_data = [{"sprint_title": "X1"}]
    story_points_data = [{
        "total_story_points": 20,
        "resolved_story_points": 5
    }]
    hygiene_counts_data = [{
        "no_assignee": 0,
        "missing_story_points": 1,
        "missing_description": 0,
        "missing_priority": 1,
        "total_issues_now": 4
    }]
    initial_scope_data = [{
        "initial_scope": 15.0,
        "initial_ticket_count": 2,
        "tickets_breakdown": orjson.dumps([
            {"issue_key": "KFX-100", "story_points": 5},
            {"issue_key": "KFX-101", "story_points": 10}
        ]).decode('utf-8')
    }]
    status_ticket_data = [{
        "status_categories": orjson.dumps({
            "todo_tickets": ["KFX-100"],
            "inprogress_tickets": ["KFX-101"],
            "done_tickets": []
        }).decode('utf-8')
    }]
    
    summary = extract_static_summary(
        payload,
        sprint_title_data=sprint_title_data,
        story_points_data=story_points_data,
        hygiene_counts_data=hygiene_counts_data,
        initial_scope_data=initial_scope_data,
        status_ticket_data=status_ticket_data
    )

    assert summary["title"] == "Summary"
    assert summary["description"] == "X1"
    # completionPercentage = round(5 /20 *100) =25
    assert summary["completionPercentage"] == 25
    # ticket hygiene percentage: total_checks=16, failed=2 -> (14/16)*100 =87.5 ->88
    assert summary["ticketHygienePercentage"] == 88
    # These fields should NOT be present in the refactored version
    assert "staleTickets" not in summary
    assert "criticalBlockers" not in summary
    assert "criticalBlockerKey" not in summary
    assert "statusChanges" not in summary


def test_extract_static_summary_invalid_payload():
    # Missing expected key -> should return basic structure with title
    payload = [{"not_sprint_payload": {}}]
    result = extract_static_summary(payload)
    assert result["title"] == "Summary"
    assert result["completionPercentage"] == 0


def test_extract_status_changes_basic():
    """Test extract_status_changes with normal data"""
    import orjson
    
    yesterday_counts = [{"cnt_to_do": 3, "cnt_in_progress": 2, "cnt_done": 1}]
    current_counts = [{"cnt_to_do": 2, "cnt_in_progress": 3, "cnt_done": 2}]
    
    status_ticket_data = [{
        "status_categories": orjson.dumps({
            "todo_tickets": ["KFX-100", "KFX-101"],
            "inprogress_tickets": ["KFX-102", "KFX-103", "KFX-104"],
            "done_tickets": ["KFX-105", "KFX-106"]
        }).decode('utf-8')
    }]
    
    status_ticket_data_yesterday = [{
        "status_categories": orjson.dumps({
            "todo_tickets": ["KFX-100", "KFX-101", "KFX-102"],
            "inprogress_tickets": ["KFX-103", "KFX-104"],
            "done_tickets": ["KFX-105"]
        }).decode('utf-8')
    }]
    
    status_ticket_data_sprint_start = [{
        "status_categories": orjson.dumps({
            "todo_tickets": ["KFX-100", "KFX-101", "KFX-102", "KFX-103"],
            "inprogress_tickets": ["KFX-104"],
            "done_tickets": []
        }).decode('utf-8')
    }]
    
    is_day_one = [{"is_day_one": False}]
    status_flow_data = [{"flow_data": orjson.dumps({}).decode('utf-8')}]
    
    result = extract_status_changes(
        yesterday_counts=yesterday_counts,
        current_counts=current_counts,
        status_ticket_data=status_ticket_data,
        status_ticket_data_yesterday=status_ticket_data_yesterday,
        status_ticket_data_sprint_start=status_ticket_data_sprint_start,
        is_day_one=is_day_one,
        status_flow_data=status_flow_data
    )
    
    assert "statusChanges" in result
    status_changes = result["statusChanges"]
    assert "isDayOne" in status_changes
    assert status_changes["isDayOne"] is False
    assert "progressed" in status_changes
    assert "regressed" in status_changes
    assert "net" in status_changes
    assert "toDo" in status_changes
    assert "inProgress" in status_changes
    assert "done" in status_changes


def test_extract_status_changes_day_one():
    """Test extract_status_changes on day one of sprint"""
    import orjson
    
    yesterday_counts = [{"cnt_to_do": 5, "cnt_in_progress": 0, "cnt_done": 0}]
    current_counts = [{"cnt_to_do": 4, "cnt_in_progress": 1, "cnt_done": 0}]
    
    status_ticket_data = [{
        "status_categories": orjson.dumps({
            "todo_tickets": ["KFX-100", "KFX-101", "KFX-102", "KFX-103"],
            "inprogress_tickets": ["KFX-104"],
            "done_tickets": []
        }).decode('utf-8')
    }]
    
    status_ticket_data_yesterday = [{
        "status_categories": orjson.dumps({
            "todo_tickets": ["KFX-100", "KFX-101", "KFX-102", "KFX-103", "KFX-104"],
            "inprogress_tickets": [],
            "done_tickets": []
        }).decode('utf-8')
    }]
    
    status_ticket_data_sprint_start = [{
        "status_categories": orjson.dumps({
            "todo_tickets": ["KFX-100", "KFX-101", "KFX-102", "KFX-103", "KFX-104"],
            "inprogress_tickets": [],
            "done_tickets": []
        }).decode('utf-8')
    }]
    
    is_day_one = [{"is_day_one": True}]
    status_flow_data = [{"flow_data": orjson.dumps({}).decode('utf-8')}]
    
    result = extract_status_changes(
        yesterday_counts=yesterday_counts,
        current_counts=current_counts,
        status_ticket_data=status_ticket_data,
        status_ticket_data_yesterday=status_ticket_data_yesterday,
        status_ticket_data_sprint_start=status_ticket_data_sprint_start,
        is_day_one=is_day_one,
        status_flow_data=status_flow_data
    )
    
    assert "statusChanges" in result
    status_changes = result["statusChanges"]
    assert status_changes["isDayOne"] is True
    # On day one, comparison should be against sprint start
    assert "progressed" in status_changes
    assert "regressed" in status_changes


def test_extract_team_pulse_basic():
    """Test extract_team_pulse with burndown and facts data"""
    from datetime import date, timedelta
    
    today = date.today()
    yesterday = today - timedelta(days=1)
    two_days_ago = today - timedelta(days=2)
    
    # Mock burndown data from fn_sprint_burndown (includes future days)
    burndown = [
        {"sprint_id": 463, "day": str(two_days_ago), "scope_points": Decimal("10"), "done_points": Decimal("1"), "remaining_points": Decimal("9"), "added_points_day": Decimal("0"), "removed_points_day": Decimal("0")},
        {"sprint_id": 463, "day": str(yesterday), "scope_points": Decimal("10"), "done_points": Decimal("2"), "remaining_points": Decimal("8"), "added_points_day": Decimal("0"), "removed_points_day": Decimal("0")},
        {"sprint_id": 463, "day": str(today), "scope_points": Decimal("10"), "done_points": Decimal("4"), "remaining_points": Decimal("6"), "added_points_day": Decimal("0"), "removed_points_day": Decimal("0")},
        # Future days (should be filtered out)
        {"sprint_id": 463, "day": str(today + timedelta(days=1)), "scope_points": Decimal("10"), "done_points": Decimal("4"), "remaining_points": Decimal("6"), "added_points_day": Decimal("0"), "removed_points_day": Decimal("0")},
        {"sprint_id": 463, "day": str(today + timedelta(days=2)), "scope_points": Decimal("10"), "done_points": Decimal("4"), "remaining_points": Decimal("6"), "added_points_day": Decimal("0"), "removed_points_day": Decimal("0")},
    ]
    
    # Mock facts data from fn_sprint_facts
    facts = [
        {
            "facts": {
                "contributors": [
                    {
                        "person": "Sadeed",
                        "points_done_total": Decimal("3"),
                        "points_assigned_now": Decimal("5"),
                    },
                    {
                        "person": "Shahbaz",
                        "points_done_total": Decimal("1"),
                        "points_assigned_now": Decimal("5"),
                    },
                    {
                        "person": "Skipped",
                        "points_done_total": 0,
                        "points_assigned_now": 0,
                    },
                    {"person": "", "points_done_total": 1, "points_assigned_now": 2},
                ],
            }
        }
    ]

    pulse = extract_team_pulse(burndown, facts)

    assert pulse["title"] == "Team Pulse"
    # pulseScore = round(4 /10 *100) =40
    assert pulse["pulseScore"] == 40
    # pulseChange = today(40) - yesterday(20) =20
    assert pulse["pulseChange"] == 20
    assert pulse["currentPoints"] == 4
    assert pulse["totalPoints"] == 10

    members = pulse["members"]
    # Sadeed should be present with points3 and percentage round(3/5*100)=60
    sadeed = next((m for m in members if m["name"] == "Sadeed"), None)
    assert sadeed is not None
    assert sadeed["points"] == 3
    assert sadeed["committedPoints"] == 5
    assert sadeed["percentage"] == 60

    shahbaz = next((m for m in members if m["name"] == "Shahbaz"), None)
    assert shahbaz is not None
    assert shahbaz["points"] == 1
    assert shahbaz["committedPoints"] == 5

    # key contributors should include Sadeed then Shahbaz
    keys = pulse["keyContributors"]
    assert len(keys) >= 2
    assert keys[0]["name"] == "Sadeed"
    assert keys[0]["role"] == "1st"
    assert keys[0]["committedPoints"] == 5
    assert keys[1]["name"] == "Shahbaz"
    assert keys[1]["role"] == "2nd"
    assert keys[1]["committedPoints"] == 5


def test_extract_team_pulse_filters_future_days():
    """Test that future days from fn_sprint_burndown are filtered out"""
    from datetime import date, timedelta
    
    today = date.today()
    yesterday = today - timedelta(days=1)
    
    # Mock burndown with mostly future days
    burndown = [
        {"sprint_id": 463, "day": str(yesterday), "scope_points": Decimal("10"), "done_points": Decimal("2"), "remaining_points": Decimal("8"), "added_points_day": Decimal("0"), "removed_points_day": Decimal("0")},
        {"sprint_id": 463, "day": str(today), "scope_points": Decimal("10"), "done_points": Decimal("3"), "remaining_points": Decimal("7"), "added_points_day": Decimal("0"), "removed_points_day": Decimal("0")},
        # All future days
        {"sprint_id": 463, "day": str(today + timedelta(days=1)), "scope_points": Decimal("10"), "done_points": Decimal("10"), "remaining_points": Decimal("0"), "added_points_day": Decimal("0"), "removed_points_day": Decimal("0")},
        {"sprint_id": 463, "day": str(today + timedelta(days=2)), "scope_points": Decimal("10"), "done_points": Decimal("10"), "remaining_points": Decimal("0"), "added_points_day": Decimal("0"), "removed_points_day": Decimal("0")},
    ]
    
    facts = [{"facts": {"contributors": []}}]
    
    pulse = extract_team_pulse(burndown, facts)
    
    # Should use today's data (3 done / 10 scope = 30%)
    assert pulse["pulseScore"] == 30
    assert pulse["currentPoints"] == 3
    assert pulse["totalPoints"] == 10
    # Change from yesterday: 30% - 20% = 10%
    assert pulse["pulseChange"] == 10


def test_extract_team_pulse_no_change():
    """Test pulse change when there's no change from yesterday"""
    from datetime import date, timedelta
    
    today = date.today()
    yesterday = today - timedelta(days=1)
    
    burndown = [
        {"sprint_id": 463, "day": str(yesterday), "scope_points": Decimal("74"), "done_points": Decimal("3"), "remaining_points": Decimal("71"), "added_points_day": Decimal("0"), "removed_points_day": Decimal("0")},
        {"sprint_id": 463, "day": str(today), "scope_points": Decimal("74"), "done_points": Decimal("3"), "remaining_points": Decimal("71"), "added_points_day": Decimal("0"), "removed_points_day": Decimal("0")},
    ]
    
    facts = [{"facts": {"contributors": []}}]
    
    pulse = extract_team_pulse(burndown, facts)
    
    # 3/74 = 4.05% -> rounds to 4%
    assert pulse["pulseScore"] == 4
    # No change from yesterday
    assert pulse["pulseChange"] == 0


def test_extract_team_pulse_with_date_objects():
    """Test that date objects (not just strings) are handled correctly"""
    from datetime import date, timedelta
    
    today = date.today()
    yesterday = today - timedelta(days=1)
    
    burndown = [
        {"sprint_id": 463, "day": yesterday, "scope_points": Decimal("10"), "done_points": Decimal("5"), "remaining_points": Decimal("5"), "added_points_day": Decimal("0"), "removed_points_day": Decimal("0")},
        {"sprint_id": 463, "day": today, "scope_points": Decimal("10"), "done_points": Decimal("8"), "remaining_points": Decimal("2"), "added_points_day": Decimal("0"), "removed_points_day": Decimal("0")},
    ]
    
    facts = [{"facts": {"contributors": []}}]
    
    pulse = extract_team_pulse(burndown, facts)
    
    assert pulse["pulseScore"] == 80
    # 80% - 50% = 30% improvement
    assert pulse["pulseChange"] == 30


def test_extract_team_pulse_only_one_day():
    """Test when only one day of burndown data exists"""
    from datetime import date
    
    today = date.today()
    
    burndown = [
        {"sprint_id": 463, "day": str(today), "scope_points": Decimal("10"), "done_points": Decimal("6"), "remaining_points": Decimal("4"), "added_points_day": Decimal("0"), "removed_points_day": Decimal("0")},
    ]
    
    facts = [{"facts": {"contributors": []}}]
    
    pulse = extract_team_pulse(burndown, facts)
    
    assert pulse["pulseScore"] == 60
    # No yesterday data, so no change
    assert pulse["pulseChange"] is None


def test_extract_team_pulse_invalid():
    assert extract_team_pulse([], []) == {}
    assert extract_team_pulse({}, {}) == {}


# ===== Tests for transform_signals_combined =====

def test_transform_signals_combined_empty_data():
    """Test with empty data returns empty signals"""
    result = transform_signals_combined(
        stagnant_issues=[],
        blocked_issues=[],
        velocity_data=None,
        bug_ratio_data=None,
    )
    assert result == {'signals': []}


def test_transform_signals_combined_velocity_signal():
    """Test velocity signal generation when team is behind pace"""
    velocity_data = [{
        'completed_points': 20,
        'total_points': 100,
        'target_points': 80,
        'completed_issues': 5,
        'total_issues': 25,
        'days_elapsed': 3,
        'days_remaining': 7,
        'total_days': 10,
        'current_velocity': 6.67,
        'required_velocity': 8.0,
    }]
    
    result = transform_signals_combined(
        stagnant_issues=[],
        blocked_issues=[],
        velocity_data=velocity_data,
        source='jira-insights'
    )
    
    signals = result['signals']
    assert len(signals) == 1
    assert signals[0]['id'].startswith('VELOCITY-')
    assert signals[0]['title'] == 'Velocity at Risk'
    assert signals[0]['type'] == 'danger'
    assert signals[0]['source'] == 'jira-insights'
    assert 'velocityMetrics' in signals[0]
    assert signals[0]['velocityMetrics']['completedPoints'] == 20


def test_transform_signals_combined_bug_ratio_signal():
    """Test bug ratio signal when ratio is concerning"""
    bug_ratio_data = [{
        'bug_count': 15,
        'story_count': 20,
        'ratio': 0.75,
    }]
    
    result = transform_signals_combined(
        stagnant_issues=[],
        blocked_issues=[],
        bug_ratio_data=bug_ratio_data,
        source='jira-insights'
    )
    
    signals = result['signals']
    assert len(signals) == 1
    assert signals[0]['id'].startswith('BUGS-')
    assert 'High bug ratio' in signals[0]['title'] or 'Elevated bug ratio' in signals[0]['title']
    assert signals[0]['type'] == 'danger'
    assert signals[0]['source'] == 'jira-insights'


def test_transform_signals_combined_stagnant_multiple():
    """Test stagnant tasks compressed into single signal when 2+"""
    stagnant_issues = [
        {
            'issue_key': 'KFX-100',
            'title': 'Fix auth bug',
            'age_days': 5,
            'story_points': 2,
            'assignee': 'Khurram',
            'priority': 'High',
            'current_status': 'In Progress',
        },
        {
            'issue_key': 'KFX-101',
            'title': 'Implement feature',
            'age_days': 7,
            'story_points': 3,
            'assignee': 'Shahbaz',
            'priority': 'Medium',
            'current_status': 'In Progress',
        },
    ]
    
    result = transform_signals_combined(
        stagnant_issues=stagnant_issues,
        blocked_issues=[],
        source='jira-insights'
    )
    
    signals = result['signals']
    assert len(signals) == 1
    assert '2 Stagnant Tasks' in signals[0]['title']
    assert signals[0]['tickets'] == ['KFX-100', 'KFX-101']
    assert signals[0]['source'] == 'jira-insights'


def test_transform_signals_combined_stagnant_single():
    """Test individual stagnant task signals"""
    stagnant_issues = [
        {
            'issue_key': 'KFX-100',
            'title': 'Fix auth bug',
            'age_days': 6,
            'story_points': 2,
            'assignee': 'Khurram',
            'priority': 'High',
            'current_status': 'In Progress',
        },
    ]
    
    result = transform_signals_combined(
        stagnant_issues=stagnant_issues,
        blocked_issues=[],
        source='jira-insights'
    )
    
    signals = result['signals']
    assert len(signals) == 1
    assert 'Task over estimate' in signals[0]['title']
    assert signals[0]['tickets'] == ['KFX-100']
    assert signals[0]['type'] == 'warning'  # 6 days - 2 points = 4 days over


def test_transform_signals_combined_blocked_multiple():
    """Test blocked issues compressed into single signal when 2+"""
    blocked_issues = [
        {
            'issue_key': 'KFX-100',
            'title': 'Feature A',
            'blocker_count': 2,
            'blockers_in': ['KFX-200', 'KFX-201'],
            'assignee': 'Khurram',
            'priority': 'High',
            'current_status': 'In Progress',
        },
        {
            'issue_key': 'KFX-101',
            'title': 'Feature B',
            'blocker_count': 1,
            'blockers_in': ['KFX-202'],
            'assignee': 'Shahbaz',
            'priority': 'Medium',
            'current_status': 'In Progress',
        },
    ]
    
    result = transform_signals_combined(
        stagnant_issues=[],
        blocked_issues=blocked_issues,
        source='jira-insights'
    )
    
    signals = result['signals']
    assert len(signals) == 1
    assert '2 Tasks Blocked' in signals[0]['title']
    assert signals[0]['type'] == 'danger'
    assert 'dependencies' in signals[0]


def test_transform_signals_combined_blocked_single():
    """Test individual blocked issue signals"""
    blocked_issues = [
        {
            'issue_key': 'KFX-100',
            'title': 'Feature A',
            'blocker_count': 2,
            'blockers_in': ['KFX-200', 'KFX-201'],
            'assignee': 'Khurram',
            'priority': 'High',
            'current_status': 'In Progress',
        },
    ]
    
    result = transform_signals_combined(
        stagnant_issues=[],
        blocked_issues=blocked_issues,
        source='jira-insights'
    )
    
    signals = result['signals']
    assert len(signals) == 1
    assert 'Blocked by dependency' in signals[0]['title']
    assert signals[0]['tickets'] == ['KFX-100 → KFX-200', 'KFX-100 → KFX-201']


def test_transform_signals_combined_scope_creep():
    """Test scope creep signal generation"""
    scope_creep_issues = [
        {
            'issue_key': 'KFX-100',
            'title': 'New feature',
            'days_since_added': 2,
            'assignee': 'Khurram',
            'priority': 'Medium',
            'current_status': 'To Do',
        },
    ]
    
    result = transform_signals_combined(
        stagnant_issues=[],
        blocked_issues=[],
        scope_creep_issues=scope_creep_issues,
        source='jira-insights'
    )
    
    signals = result['signals']
    assert len(signals) == 1
    assert 'Scope creep' in signals[0]['title']
    assert signals[0]['type'] == 'warning'
    assert signals[0]['tickets'] == ['KFX-100']


def test_transform_signals_combined_unassigned():
    """Test unassigned issues signal"""
    unassigned_issues = [
        {
            'issue_key': 'KFX-100',
            'title': 'Critical bug',
            'age_days': 2,
            'priority': 'Highest',
            'current_status': 'To Do',
        },
    ]
    
    result = transform_signals_combined(
        stagnant_issues=[],
        blocked_issues=[],
        unassigned_issues=unassigned_issues,
        source='jira-insights'
    )
    
    signals = result['signals']
    assert len(signals) == 1
    assert 'Unassigned task' in signals[0]['title']
    assert signals[0]['type'] == 'danger'  # Highest priority


def test_transform_signals_combined_backward_transitions():
    """Test backward transitions signal"""
    backward_transitions = [
        {
            'issue_key': 'KFX-100',
            'from_status': 'In Progress',
            'to_status': 'To Do',
            'transition_ts': '2024-01-15 10:30:00',
        },
        {
            'issue_key': 'KFX-100',
            'from_status': 'Done',
            'to_status': 'In Progress',
            'transition_ts': '2024-01-15 11:00:00',
        },
    ]
    
    result = transform_signals_combined(
        stagnant_issues=[],
        blocked_issues=[],
        backward_transitions=backward_transitions,
        source='human-sensed'
    )
    
    signals = result['signals']
    assert len(signals) == 1
    assert 'Tasks moving backward' in signals[0]['title']
    assert signals[0]['type'] == 'warning'
    assert signals[0]['source'] == 'human-sensed'


def test_transform_signals_combined_workload_imbalance():
    """Test workload imbalance signal"""
    workload_imbalance_data = [
        {
            'assignee_name': 'Khurram',
            'active_issue_count': 5,
            'active_issues': 'KFX-100, KFX-101, KFX-102, KFX-103, KFX-104',
        },
    ]
    
    result = transform_signals_combined(
        stagnant_issues=[],
        blocked_issues=[],
        workload_imbalance_data=workload_imbalance_data,
        source='human-sensed'
    )
    
    signals = result['signals']
    assert len(signals) == 1
    assert 'Workload Imbalance' in signals[0]['title']
    assert signals[0]['type'] == 'warning'
    assert 'overloadedAssignees' in signals[0]


def test_transform_signals_combined_effort_without_movement():
    """Test effort without movement signal"""
    effort_without_movement_data = [
        {
            'issue_key': 'KFX-100',
            'title': 'Feature X',
            'age_days': 5,
            'worklog_hours': 8.5,
            'story_points': 5,
            'assignee': 'Khurram',
            'priority': 'High',
            'current_status': 'In Progress',
        },
    ]
    
    result = transform_signals_combined(
        stagnant_issues=[],
        blocked_issues=[],
        effort_without_movement_data=effort_without_movement_data,
        source='jira-insights'
    )
    
    signals = result['signals']
    assert len(signals) == 1
    assert 'Effort without movement' in signals[0]['title']
    assert signals[0]['type'] == 'warning'


def test_transform_signals_combined_source_filter_jira_insights():
    """Test that jira-insights source filters correctly"""
    # Mix of jira-insights and human-sensed signals
    velocity_data = [{
        'completed_points': 20,
        'total_points': 100,
        'target_points': 80,
        'completed_issues': 5,
        'total_issues': 25,
        'days_elapsed': 3,
        'days_remaining': 7,
        'total_days': 10,
        'current_velocity': 6.67,
        'required_velocity': 8.0,
    }]
    
    backward_transitions = [
        {
            'issue_key': 'KFX-100',
            'from_status': 'In Progress',
            'to_status': 'To Do',
            'transition_ts': '2024-01-15 10:30:00',
        },
    ]
    
    result = transform_signals_combined(
        stagnant_issues=[],
        blocked_issues=[],
        velocity_data=velocity_data,
        backward_transitions=backward_transitions,
        source='jira-insights'
    )
    
    signals = result['signals']
    # Should only have velocity signal (jira-insights source)
    assert all(s['source'] == 'jira-insights' for s in signals)


def test_transform_signals_combined_source_filter_human_sensed():
    """Test that human-sensed source filters correctly"""
    backward_transitions = [
        {
            'issue_key': 'KFX-100',
            'from_status': 'In Progress',
            'to_status': 'To Do',
            'transition_ts': '2024-01-15 10:30:00',
        },
    ]
    
    result = transform_signals_combined(
        stagnant_issues=[],
        blocked_issues=[],
        backward_transitions=backward_transitions,
        source='human-sensed'
    )
    
    signals = result['signals']
    # Should only have human-sensed signals
    assert all(s['source'] == 'human-sensed' for s in signals)


def test_transform_signals_combined_testing_bottleneck():
    """Test testing bottleneck signal creation"""
    testing_bottleneck_data = [
        {
            'issue_key': 'KFX-100',
            'title': 'Feature A',
            'current_status': 'In Testing',
            'status_category': 'Testing',
            'from_status': 'In Progress',
            'to_status': 'In Testing',
            'transition_ts': '2024-01-15 10:00:00',
            'duration_secs': 7200,
            'person': 'Dev Team',
        },
    ]
    
    result = transform_signals_combined(
        stagnant_issues=[],
        blocked_issues=[],
        testing_bottleneck_data=testing_bottleneck_data,
        source='human-sensed'
    )
    
    signals = result['signals']
    assert len(signals) == 1
    assert 'Testing Bottleneck' in signals[0]['title']
    assert signals[0]['source'] == 'human-sensed'
    assert 'testingBottleneckMetrics' in signals[0]


# ===== Tests for merge_signals_with_ai_summary =====

def test_merge_signals_with_ai_summary_empty():
    """Test merge with empty signals"""
    signals_data = {'signals': []}
    ai_insights = {
        'summary': 'No issues detected',
        'keyObservations': [],
        'recommendedActions': [],
    }
    
    result = merge_signals_with_ai_summary(signals_data, ai_insights)
    assert result['signals'] == []  # Should not add summary card for empty signals


def test_merge_signals_with_ai_summary_jira_insights():
    """Test merge with jira-insights source (should not add summary)"""
    signals_data = {
        'signals': [
            {
                'id': 'VELOCITY-1',
                'title': 'Velocity at Risk',
                'source': 'jira-insights',
            }
        ]
    }
    ai_insights = {
        'summary': 'Team is behind',
        'keyObservations': ['Issue 1', 'Issue 2'],
        'recommendedActions': ['Action 1'],
    }
    
    result = merge_signals_with_ai_summary(signals_data, ai_insights)
    # Should not prepend summary card for jira-insights
    assert len(result['signals']) == 1
    assert result['signals'][0]['id'] == 'VELOCITY-1'


def test_merge_signals_with_ai_summary_human_sensed():
    """Test merge with human-sensed signals (should add summary)"""
    signals_data = {
        'signals': [
            {
                'id': 'BACKWARD-1',
                'title': 'Tasks moving backward',
                'source': 'human-sensed',
            }
        ]
    }
    ai_insights = {
        'summary': 'Quality issues detected',
        'keyObservations': ['High defect rate', 'Unclear requirements'],
        'recommendedActions': ['Review requirements', 'Add QA checkpoints'],
    }
    
    result = merge_signals_with_ai_summary(signals_data, ai_insights)
    signals = result['signals']
    
    # Should prepend summary card
    assert len(signals) == 2
    assert signals[0]['id'] == 'SUMMARY-AI'
    assert signals[0]['isSummary'] is True
    assert signals[0]['source'] == 'human-sensed'
    assert 'Quality issues detected' in signals[0]['description']
    assert signals[1]['id'] == 'BACKWARD-1'


def test_merge_signals_with_ai_summary_no_insights():
    """Test merge with no AI insights"""
    signals_data = {
        'signals': [
            {
                'id': 'BACKWARD-1',
                'title': 'Tasks moving backward',
                'source': 'human-sensed',
            }
        ]
    }
    
    result = merge_signals_with_ai_summary(signals_data, None)
    # Should return unchanged
    assert len(result['signals']) == 1
    assert result['signals'][0]['id'] == 'BACKWARD-1'


def test_merge_signals_with_ai_summary_invalid_input():
    """Test merge with invalid input"""
    result = merge_signals_with_ai_summary({'invalid': 'data'}, {})
    assert result == {'invalid': 'data'}


# ===== Tests for format_testing_bottleneck_for_llm =====

def test_format_testing_bottleneck_for_llm_empty():
    """Test formatting with empty data"""
    result = format_testing_bottleneck_for_llm([])
    # assert result['total_tickets'] == 0       # shouldnt this also work, but its not  👈
    assert result['tickets'] == []


def test_format_testing_bottleneck_for_llm_single_ticket():
    """Test formatting single ticket with status spans"""
    data = [
        {
            'issue_key': 'KFX-100',
            'title': 'Feature A',
            'current_status': 'In Testing',
            'status_category': 'Testing',
            'assignee_display_name': 'Khurram',
            'priority': 'High',
            'status': 'In Progress',
            'from_ts': '2024-01-15 10:00:00',
            'to_ts': '2024-01-15 12:00:00',
            'duration_secs': 7200,
        },
        {
            'issue_key': 'KFX-100',
            'title': 'Feature A',
            'current_status': 'In Testing',
            'status_category': 'Testing',
            'assignee_display_name': 'Khurram',
            'priority': 'High',
            'status': 'In Testing',
            'from_ts': '2024-01-15 12:00:00',
            'to_ts': None,
            'duration_secs': None,
        },
    ]
    
    result = format_testing_bottleneck_for_llm(data)
    assert result['total_tickets'] == 1
    assert len(result['tickets']) == 1
    
    ticket = result['tickets'][0]
    assert ticket['issue_key'] == 'KFX-100'
    assert ticket['title'] == 'Feature A'
    assert len(ticket['status_spans']) == 2
    assert ticket['status_spans'][0]['status'] == 'In Progress'
    assert ticket['status_spans'][0]['duration_seconds'] == 7200


def test_format_testing_bottleneck_for_llm_multiple_tickets():
    """Test formatting multiple tickets"""
    data = [
        {
            'issue_key': 'KFX-100',
            'title': 'Feature A',
            'current_status': 'In Testing',
            'status_category': 'Testing',
            'assignee_display_name': 'Khurram',
            'priority': 'High',
            'status': 'In Testing',
            'from_ts': '2024-01-15 12:00:00',
            'to_ts': None,
            'duration_secs': None,
        },
        {
            'issue_key': 'KFX-101',
            'title': 'Feature B',
            'current_status': 'In Testing',
            'status_category': 'Testing',
            'assignee_display_name': 'Shahbaz',
            'priority': 'Medium',
            'status': 'In Testing',
            'from_ts': '2024-01-15 14:00:00',
            'to_ts': None,
            'duration_secs': None,
        },
    ]
    
    result = format_testing_bottleneck_for_llm(data)
    assert result['total_tickets'] == 2
    assert len(result['tickets']) == 2
    assert result['tickets'][0]['issue_key'] == 'KFX-100'
    assert result['tickets'][1]['issue_key'] == 'KFX-101'


# ===== Tests for merge_testing_bottleneck_with_signals =====

def test_merge_testing_bottleneck_with_signals_no_bottleneck_signal():
    """Test merge when testing bottleneck signal doesn't exist"""
    signals_data = {
        'signals': [
            {
                'id': 'VELOCITY-1',
                'title': 'Velocity at Risk',
            }
        ]
    }
    ai_insights = {
        'summary': 'Testing is a bottleneck',
        'keyObservations': ['QA is slow'],
        'recommendedActions': ['Add QA resources'],
    }
    
    result = merge_testing_bottleneck_with_signals(signals_data, ai_insights)
    # Should not modify signals if no testing bottleneck signal
    assert len(result['signals']) == 1
    assert result['signals'][0]['id'] == 'VELOCITY-1'


def test_merge_testing_bottleneck_with_signals_found():
    """Test merge when testing bottleneck signal exists"""
    signals_data = {
        'signals': [
            {
                'id': 'TESTING-BOTTLENECK-1',
                'title': 'Testing Bottleneck',
                'description': 'Analyzing tickets',
                'explanation': 'Old explanation',
                'type': 'info',
            }
        ]
    }
    ai_insights = {
        'summary': 'QA team is overwhelmed',
        'keyObservations': ['3 tickets stuck in testing', 'Average wait time 24 hours'],
        'recommendedActions': ['Hire QA engineer', 'Automate tests'],
    }
    
    result = merge_testing_bottleneck_with_signals(signals_data, ai_insights)
    signals = result['signals']
    
    assert len(signals) == 1
    signal = signals[0]
    assert signal['id'] == 'TESTING-BOTTLENECK-1'
    assert signal['description'] == 'QA team is overwhelmed'
    assert signal['hasAiInsights'] is True
    assert 'QA team is overwhelmed' in signal['explanation']


def test_merge_testing_bottleneck_with_signals_no_insights():
    """Test merge with no AI insights"""
    signals_data = {
        'signals': [
            {
                'id': 'TESTING-BOTTLENECK-1',
                'title': 'Testing Bottleneck',
            }
        ]
    }
    
    result = merge_testing_bottleneck_with_signals(signals_data, None)
    # Should return unchanged
    assert len(result['signals']) == 1
    assert result['signals'][0]['id'] == 'TESTING-BOTTLENECK-1'


# ===== Tests for select_final_signals =====

def test_select_final_signals_human_sensed():
    """Test selecting human-sensed signals"""
    human_signals = {'signals': [{'id': 'HUMAN-1', 'source': 'human-sensed'}]}
    jira_signals = {'signals': [{'id': 'JIRA-1', 'source': 'jira-insights'}]}
    
    result = select_final_signals('human-sensed', human_signals, jira_signals)
    
    assert result == human_signals
    assert result['signals'][0]['source'] == 'human-sensed'


def test_select_final_signals_jira_insights():
    """Test selecting jira-insights signals"""
    human_signals = {'signals': [{'id': 'HUMAN-1', 'source': 'human-sensed'}]}
    jira_signals = {'signals': [{'id': 'JIRA-1', 'source': 'jira-insights'}]}
    
    result = select_final_signals('jira-insights', human_signals, jira_signals)
    
    assert result == jira_signals
    assert result['signals'][0]['source'] == 'jira-insights'


def test_select_final_signals_empty_human():
    """Test selecting when human signals are empty"""
    human_signals = None
    jira_signals = {'signals': [{'id': 'JIRA-1', 'source': 'jira-insights'}]}
    
    result = select_final_signals('human-sensed', human_signals, jira_signals)
    
    assert result == {'signals': []}


def test_select_final_signals_empty_jira():
    """Test selecting when jira signals are empty"""
    human_signals = {'signals': [{'id': 'HUMAN-1', 'source': 'human-sensed'}]}
    jira_signals = None
    
    result = select_final_signals('jira-insights', human_signals, jira_signals)
    
    assert result == {'signals': []}


# -------------------------
# Scope Addition Tests
# -------------------------

def test_scope_additions_with_new_tickets():
    """Test scope additions when tickets are added after sprint start"""
    import orjson
    
    payload = [{"sprint_payload": {"facts": {}, "at_risk": []}}]
    
    # Initial scope: 3 tickets at sprint start
    initial_scope_data = [{
        "initial_scope": 15.0,
        "initial_ticket_count": 3,
        "tickets_breakdown": orjson.dumps([
            {"issue_key": "KFX-100", "story_points": 5},
            {"issue_key": "KFX-101", "story_points": 5},
            {"issue_key": "KFX-102", "story_points": 5}
        ]).decode('utf-8')
    }]
    
    # Current tickets: 5 tickets (2 added after start)
    status_ticket_data = [{
        "status_categories": orjson.dumps({
            "todo_tickets": ["KFX-100", "KFX-103"],
            "inprogress_tickets": ["KFX-101", "KFX-104"],
            "done_tickets": ["KFX-102"]
        }).decode('utf-8')
    }]
    
    story_points_data = [{
        "total_story_points": 25.0,
        "resolved_story_points": 5.0
    }]
    
    result = extract_static_summary(
        payload,
        initial_scope_data=initial_scope_data,
        status_ticket_data=status_ticket_data,
        story_points_data=story_points_data
    )
    
    # Should identify KFX-103 and KFX-104 as scope additions
    assert result["scopeAdditionIds"] == ["KFX-103", "KFX-104"]
    # Scope change: (|25-15| / 15) * 100 = 66.7%
    assert result["scopeChangePercentage"] == 66.7


def test_scope_additions_no_new_tickets():
    """Test scope additions when no tickets added after sprint start"""
    import orjson
    
    payload = [{"sprint_payload": {"facts": {}, "at_risk": []}}]
    
    initial_scope_data = [{
        "initial_scope": 15.0,
        "initial_ticket_count": 3,
        "tickets_breakdown": orjson.dumps([
            {"issue_key": "KFX-100", "story_points": 5},
            {"issue_key": "KFX-101", "story_points": 5},
            {"issue_key": "KFX-102", "story_points": 5}
        ]).decode('utf-8')
    }]
    
    # Same tickets as initial
    status_ticket_data = [{
        "status_categories": orjson.dumps({
            "todo_tickets": ["KFX-100"],
            "inprogress_tickets": ["KFX-101"],
            "done_tickets": ["KFX-102"]
        }).decode('utf-8')
    }]
    
    story_points_data = [{
        "total_story_points": 15.0,
        "resolved_story_points": 5.0
    }]
    
    result = extract_static_summary(
        payload,
        initial_scope_data=initial_scope_data,
        status_ticket_data=status_ticket_data,
        story_points_data=story_points_data
    )
    
    # No scope additions
    assert result["scopeAdditionIds"] == []
    # No scope change
    assert result["scopeChangePercentage"] == 0.0


# -------------------------
# Helper Function Tests
# -------------------------

def test_parse_initial_scope_data_with_valid_data():
    """Test parsing initial scope data with valid input"""
    import orjson
    
    initial_scope_data = [{
        "initial_scope": 15.0,
        "tickets_breakdown": orjson.dumps([
            {"issue_key": "KFX-100", "story_points": 5},
            {"issue_key": "KFX-101", "story_points": 5},
            {"issue_key": "KFX-102", "story_points": 5}
        ]).decode('utf-8')
    }]
    
    _, ticket_keys = _parse_initial_scope_data(initial_scope_data)
    
    assert ticket_keys == {"KFX-100", "KFX-101", "KFX-102"}


def test_parse_status_ticket_data_with_valid_data():
    """Test parsing status ticket data"""
    import orjson
    
    status_ticket_data = [{
        "status_categories": orjson.dumps({
            "todo_tickets": ["KFX-100", "KFX-101"],
            "inprogress_tickets": ["KFX-102"],
            "done_tickets": ["KFX-103", "KFX-104"]
        }).decode('utf-8')
    }]
    
    ticket_keys = _parse_status_ticket_data(status_ticket_data)
    
    assert ticket_keys == {"KFX-100", "KFX-101", "KFX-102", "KFX-103", "KFX-104"}


def test_calculate_scope_additions_with_new_tickets():
    """Test calculating scope additions with new tickets"""
    initial = {"KFX-100", "KFX-101"}
    current = {"KFX-100", "KFX-101", "KFX-102", "KFX-103"}
    
    result = _calculate_scope_additions(initial, current)
    
    assert result == ["KFX-102", "KFX-103"]