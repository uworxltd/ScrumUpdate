##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

import orjson
from decimal import Decimal
from typing import Dict, List, Union, Any, Optional


# -------------------------
# Shared helpers
# -------------------------
def _unwrap_sql_result(x: Union[List[Dict[str, Any]], Dict[str, Any]], key: str) -> Any:
    """
    Unwrap the common SQL result shape: a list with one row containing a JSON string
    under `key`, or pass-through if the shape is already unwrapped.
    """
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


# tests missing
# move this to exported section below ?
def merge_epic_with_insights(epic_data: Any, ai_insights: Optional[Dict[str, Any]], timeline_data: Optional[Any] = None) -> Dict[str, Any]:
    """
    Merge epic data from database with AI-generated insights and timeline.
    
    Args:
        epic_data: Raw epic data from database (list with one dict or a dict)
        ai_insights: Parsed LLM response with summary, progress, risks, recommendations
        timeline_data: Timeline events from changelogs
    
    Returns:
        Dict containing epic data merged with AI insights and timeline
    """
    # Handle both list and dict formats
    if isinstance(epic_data, list) and len(epic_data) > 0:
        epic = epic_data[0]
    elif isinstance(epic_data, dict):
        epic = epic_data
    else:
        return {
            'error': 'No epic data found',
            'epic_key': None
        }
    
    # Extract epic fields
    epic_key = epic.get('epic_key', '')
    epic_name = epic.get('epic_name', '')
    sprint_id = epic.get('sprint_id', '')
    
    # Parse JSON strings if necessary
    story_points = epic.get('story_points', {})
    if isinstance(story_points, str):
        try:
            story_points = orjson.loads(story_points)
        except Exception:
            story_points = {}
    
    tickets = epic.get('tickets', [])
    if isinstance(tickets, str):
        try:
            tickets = orjson.loads(tickets)
        except Exception:
            tickets = []
    
    ticket_hygiene_percentage = epic.get('ticket_hygiene_percentage', 100)
    delivery_health_percentage = epic.get('delivery_health_percentage', 0)
    delivery_confidence_percentage = epic.get('delivery_confidence_percentage', 0)
    
    # Parse timeline data - now included directly in epic_data
    timeline_highlights = []
    timeline_data = epic.get('timeline_highlights', [])
    if isinstance(timeline_data, str):
        try:
            timeline_highlights = orjson.loads(timeline_data)
        except Exception:
            timeline_highlights = []
    elif isinstance(timeline_data, list):
        timeline_highlights = timeline_data
    
    # Initialize response structure
    result = {
        'epicKey': epic_key,
        'epicName': epic_name,
        'sprintId': sprint_id,
        'storyPoints': story_points,
        'tickets': tickets,
        'ticketHygienePercentage': ticket_hygiene_percentage,
        'deliveryHealthPercentage': delivery_health_percentage,
        'deliveryConfidencePercentage': delivery_confidence_percentage,
        'timelineHighlights': timeline_highlights
    }
    
    # Add AI insights if available
    if ai_insights and isinstance(ai_insights, dict):
        print(f"[DEBUG] ai_insights keys: {ai_insights.keys()}", flush=True)
        print(f"[DEBUG] ai_insights content: {ai_insights}", flush=True)
        result['insights'] = ai_insights.get('insights', [])
        # Try to get summary from ai_insights, if not present, generate from epic name and completion percentage
        result['summary'] = ai_insights.get('summary', '')
        if not result['summary']:
            # Generate a fallback summary from epic data
            completion_pct = story_points.get('percentage', 0) if isinstance(story_points, dict) else 0
            result['summary'] = f"Delivering {epic_name.strip()} with {completion_pct}% completion in current sprint."
    else:
        # Return basic structure without AI insights
        print(f"[DEBUG] ai_insights is None or not dict: {ai_insights}", flush=True)
        result['insights'] = ['AI insights not available']
        # Generate fallback summary
        completion_pct = story_points.get('percentage', 0) if isinstance(story_points, dict) else 0
        result['summary'] = f"Delivering {epic_name.strip()} with {completion_pct}% completion in current sprint."
    
    return result


# tests missing
# move this to exported section below ?
def merge_ticket_with_insights(ticket_data: Any, ai_insights: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Merge ticket data from database with AI-generated insights.
    
    Args:
        ticket_data: Raw ticket data from database (list with one dict or a dict)
        ai_insights: Parsed LLM response with whatWentWrong, rootCause, recommendedActions, timelineHighlights
    
    Returns:
        Dict containing ticket data merged with AI insights
    """
    # Handle both list and dict formats
    if isinstance(ticket_data, list) and len(ticket_data) > 0:
        ticket = ticket_data[0]
    elif isinstance(ticket_data, dict):
        ticket = ticket_data
    else:
        return {
            'error': 'No ticket data found',
            'issue_key': None
        }
    
    # Extract ticket fields
    issue_key = ticket.get('issue_key', '')
    summary = ticket.get('summary', '')
    description = ticket.get('description', '')
    current_status = ticket.get('current_status', '')
    priority = ticket.get('priority', '')
    story_points = ticket.get('story_points')
    parent_issue_key = ticket.get('parent_issue_key')
    timeline = ticket.get('timeline', [])
    
    # Parse timeline if it's a string (from JSON serialization)
    if isinstance(timeline, str):
        try:
            import json
            timeline = json.loads(timeline) if timeline else []
        except (json.JSONDecodeError, TypeError):
            timeline = []
    elif timeline is None:
        timeline = []
    
    # Use SQL-calculated value for days_in_status
    days_in_status = ticket.get('days_in_status')
    
    # Convert to float/int if it's a string or Decimal
    if days_in_status is not None:
        days_in_status = _to_number(days_in_status)
        # Round to 1 decimal place for display
        days_in_status = round(days_in_status, 1)
    
    # Always prefer SQL value over LLM value
    # SQL value is definitive since it's calculated from actual changelogs
    current_status_days = days_in_status if days_in_status is not None else None
    
    # Initialize response structure
    result = {
        'issueKey': issue_key,
        'summary': summary,
        'description': description,
        'currentStatus': current_status,
        'currentStatusDays': current_status_days,
        'priority': priority,
        'storyPoints': story_points,
        'parentIssueKey': parent_issue_key,
        'timeline': timeline if timeline else []
    }
    
    # Add AI insights if available
    if ai_insights and isinstance(ai_insights, dict):
        result['aiInsights'] = {
            'whatWentWrong': ai_insights.get('whatWentWrong', []),
            'rootCause': ai_insights.get('rootCause', ''),
            'recommendedActions': ai_insights.get('recommendedActions', []),
            'timelineHighlights': ai_insights.get('timelineHighlights', []),
            'daysInCurrentStatus': current_status_days  # Use SQL value
        }
    else:
        # Return basic structure without AI insights
        result['aiInsights'] = {
            'whatWentWrong': ['AI insights not available'],
            'rootCause': 'Unable to analyze',
            'recommendedActions': ['Review ticket manually'],
            'timelineHighlights': [],
            'daysInCurrentStatus': days_in_status
        }
    
    return result


def _to_number(val: Any) -> Any:
    """
    Convert Decimal to native int/float, leave other numbers untouched.
    """
    if isinstance(val, Decimal):
        return float(val) if val % 1 else int(val)
    return val


def _unwrap_counts(
    x: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]],
) -> Dict[str, Any]:
    """
    Unwrap SQL count result (list-of-one-row) to a dict, else return dict or empty.
    """
    if isinstance(x, list) and len(x) == 1:
        return x[0] if isinstance(x[0], dict) else {}
    return x if isinstance(x, dict) else {}


def _calculate_completion_percentage(done_points: float, total_points: float) -> int:
    if total_points and total_points > 0:
        return round((done_points / total_points) * 100)
    return 0


def _build_status_changes(
    yesterday_counts: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]],
    current_counts: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
    status_ticket_data: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
    status_ticket_data_yesterday: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
    status_changes_data: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
    status_flow_data: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Build the status_changes object used by summary card.
    Now uses actual database flow analysis and compares today vs yesterday tickets
    to find newly added tickets in each status category.
    
    The flow analysis is performed by querying the changelogs table to identify
    actual ticket transitions, eliminating the need for hacky delta-based logic
    that could be fooled by scope changes or simultaneous movements.
    
    For ticket IDs, we now compare today's tickets vs yesterday's tickets to find
    which tickets are NEW in each category (weren't in that category yesterday).
    """
    # Get today's ticket IDs from status_ticket_data
    today_todos = set()
    today_in_progress = set()
    today_done = set()
    
    if status_ticket_data:
        today_data = _unwrap_sql_result(status_ticket_data, "status_categories")
        if isinstance(today_data, dict):
            today_todos = set(today_data.get("todo_tickets", []) or [])
            today_in_progress = set(today_data.get("inprogress_tickets", []) or [])
            today_done = set(today_data.get("done_tickets", []) or [])
    
    # Get comparison data (yesterday's tickets OR sprint start tickets for Day 1)
    # The parameter name is still status_ticket_data_yesterday for backward compatibility
    yesterday_todos = set()
    yesterday_in_progress = set()
    yesterday_done = set()
    
    if status_ticket_data_yesterday:
        # Try to unwrap with different keys based on data source
        # (yesterday_tickets for regular days, sprint_start_tickets for Day 1)
        yesterday_data = _unwrap_sql_result(status_ticket_data_yesterday, "yesterday_tickets")
        if not isinstance(yesterday_data, dict):
            yesterday_data = _unwrap_sql_result(status_ticket_data_yesterday, "sprint_start_tickets")
        if isinstance(yesterday_data, dict):
            yesterday_todos = set(yesterday_data.get("todo_tickets", []) or [])
            yesterday_in_progress = set(yesterday_data.get("inprogress_tickets", []) or [])
            yesterday_done = set(yesterday_data.get("done_tickets", []) or [])
    
    # Helper to compute added/removed tickets with reasons for a given status category
    def compute_ticket_changes(today_set: set, yesterday_set: set, status_name: str, 
                               all_today: dict, all_yesterday: dict):
        """
        Returns dict with 'added' and 'removed' lists, each containing {id, reason}.
        
        Added tickets: in today but not yesterday
          - If not in any yesterday list -> "Added to Sprint"
          - If in another yesterday list -> "Moved to {status_name}"
        
        Removed tickets: in yesterday but not today
          - If in another today list -> "Moved to {new_status}"
          - If not in any today list -> "Removed from Sprint"
        """
        added_tickets = today_set - yesterday_set
        removed_tickets = yesterday_set - today_set
        
        added_list = []
        for ticket_id in sorted(added_tickets):
            # Check if ticket was in any category yesterday
            was_in_sprint = (ticket_id in all_yesterday['todo'] or 
                            ticket_id in all_yesterday['inprogress'] or 
                            ticket_id in all_yesterday['done'])
            reason = f"Moved to {status_name}" if was_in_sprint else "Added to Sprint"
            added_list.append({"id": ticket_id, "reason": reason})
        
        removed_list = []
        for ticket_id in sorted(removed_tickets):
            # Check if ticket is in any category today
            if ticket_id in all_today['todo']:
                reason = "Moved to To Do"
            elif ticket_id in all_today['inprogress']:
                reason = "Moved to In Progress"
            elif ticket_id in all_today['done']:
                reason = "Moved to Done"
            else:
                reason = "Removed from Sprint"
            removed_list.append({"id": ticket_id, "reason": reason})
        
        return {"added": added_list, "removed": removed_list}
    
    # Build lookup dicts for all tickets
    all_today = {
        'todo': today_todos,
        'inprogress': today_in_progress,
        'done': today_done
    }
    all_yesterday = {
        'todo': yesterday_todos,
        'inprogress': yesterday_in_progress,
        'done': yesterday_done
    }
    
    # Compute changes for each status category
    todo_changes = compute_ticket_changes(today_todos, yesterday_todos, "To Do", all_today, all_yesterday)
    inprogress_changes = compute_ticket_changes(today_in_progress, yesterday_in_progress, "In Progress", all_today, all_yesterday)
    done_changes = compute_ticket_changes(today_done, yesterday_done, "Done", all_today, all_yesterday)
    
    # Calculate counts from ticket lists
    cnt_to_do = len(today_todos)
    cnt_in_progress = len(today_in_progress)
    cnt_done = len(today_done)
    
    cnt_to_do_yesterday = len(yesterday_todos)
    cnt_in_progress_yesterday = len(yesterday_in_progress)
    cnt_done_yesterday = len(yesterday_done)
    
    todo_change = cnt_to_do - cnt_to_do_yesterday
    in_progress_change = cnt_in_progress - cnt_in_progress_yesterday
    done_change = cnt_done - cnt_done_yesterday
    
    # Calculate progressed/regressed from ticket movements
    # Progressed: tickets that moved from To Do -> In Progress or In Progress/To Do -> Done
    #             OR tickets added directly to In Progress/Done (scope additions = progress)
    # Regressed: tickets that moved from Done -> In Progress/To Do or In Progress -> To Do
    #            OR tickets removed from In Progress/Done entirely (scope removals = regress)
    progressed = 0
    regressed = 0
    
    # All tickets in sprint yesterday (for scope change detection)
    all_yesterday_tickets = yesterday_todos | yesterday_in_progress | yesterday_done
    all_today_tickets = today_todos | today_in_progress | today_done
    
    # Tickets that moved to Done from anywhere = progressed
    # Also count tickets added directly to Done (scope addition)
    new_done = today_done - yesterday_done
    for ticket in new_done:
        if ticket in yesterday_todos or ticket in yesterday_in_progress:
            # Moved from To Do or In Progress to Done
            progressed += 1
        elif ticket not in all_yesterday_tickets:
            # Added directly to Done (scope addition = progress)
            progressed += 1
    
    # Tickets that moved to In Progress from To Do = progressed
    # Also count tickets added directly to In Progress (scope addition)
    new_in_progress = today_in_progress - yesterday_in_progress
    for ticket in new_in_progress:
        if ticket in yesterday_todos:
            # Moved from To Do to In Progress
            progressed += 1
        elif ticket not in all_yesterday_tickets:
            # Added directly to In Progress (scope addition = progress)
            progressed += 1
    
    # Tickets that moved from Done to In Progress or To Do = regressed
    left_done = yesterday_done - today_done
    for ticket in left_done:
        if ticket in today_in_progress or ticket in today_todos:
            # Moved backward from Done
            regressed += 1
        elif ticket not in all_today_tickets:
            # Removed from sprint while in Done (scope removal = regress)
            regressed += 1
    
    # Tickets that moved from In Progress to To Do = regressed
    # Also count tickets removed from In Progress entirely (scope removal)
    left_in_progress = yesterday_in_progress - today_in_progress
    for ticket in left_in_progress:
        if ticket in today_todos:
            # Moved backward from In Progress to To Do
            regressed += 1
        elif ticket not in all_today_tickets:
            # Removed from sprint while in In Progress (scope removal = regress)
            regressed += 1
    
    net_change = progressed - regressed
    
    return {
        "progressed": progressed,
        "regressed": regressed,
        "net": net_change,
        "toDo": {
            "label": "To Do",
            "change": todo_change,
            "from": cnt_to_do_yesterday,
            "to": cnt_to_do,
            "ticketChanges": todo_changes,
        },
        "inProgress": {
            "label": "In Progress",
            "change": in_progress_change,
            "from": cnt_in_progress_yesterday,
            "to": cnt_in_progress,
            "ticketChanges": inprogress_changes,
        },
        "done": {
            "label": "Done",
            "change": done_change,
            "from": cnt_done_yesterday,
            "to": cnt_done,
            "ticketChanges": done_changes,
        },
    }


def _format_summary_explanation(summary_data: dict) -> str:
    """Format the LLM summary data into HTML for the card."""
    parts = []
    
    # Add summary
    if summary_data.get('summary'):
        parts.append(f"<p><strong>Summary:</strong><br>{summary_data['summary']}</p>")
    
    # Add key observations
    observations = summary_data.get('keyObservations', [])
    if observations:
        parts.append("<p><strong>Key Observations:</strong></p>")
        parts.append("<ul>")
        for obs in observations:
            parts.append(f"<li>{obs}</li>")
        parts.append("</ul>")
    
    # Add recommended actions
    actions = summary_data.get('recommendedActions', [])
    if actions:
        parts.append("<p><strong>Recommended Actions:</strong></p>")
        parts.append("<ol>")
        for action in actions:
            parts.append(f"<li>{action}</li>")
        parts.append("</ol>")
    
    return "\n".join(parts)


def _parse_initial_scope_data(initial_scope_data: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]]) -> tuple[float, set]:
    """
    Parse initial scope data and extract scope percentage and ticket keys.
    
    Returns:
        tuple: (scope_change_percentage, initial_ticket_keys)
    """
    scope_change_percentage = None
    initial_ticket_keys: set = set()
    
    if not initial_scope_data:
        return scope_change_percentage, initial_ticket_keys
    
    scope_data = initial_scope_data
    if isinstance(scope_data, list) and len(scope_data) > 0:
        scope_data = scope_data[0]
    
    if isinstance(scope_data, dict):
        tickets_breakdown = scope_data.get("tickets_breakdown", [])
        if isinstance(tickets_breakdown, str):
            tickets_breakdown = orjson.loads(tickets_breakdown)
        
        if isinstance(tickets_breakdown, list):
            initial_ticket_keys = {ticket.get("issue_key") for ticket in tickets_breakdown if isinstance(ticket, dict) and ticket.get("issue_key")}
    
    return scope_change_percentage, initial_ticket_keys


def _calculate_scope_change_percentage(initial_scope: float, total_points: float) -> Optional[float]:
    """Calculate scope change percentage."""
    if initial_scope > 0:
        net_scope_change = total_points - initial_scope
        return round((abs(net_scope_change) / initial_scope) * 100, 1)
    return None


def _parse_status_ticket_data(status_ticket_data: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]]) -> set:
    """
    Parse status ticket data and extract all current ticket keys.
    
    Returns:
        set: Set of current ticket keys across all status categories
    """
    current_ticket_keys: set = set()
    
    if not status_ticket_data:
        return current_ticket_keys
    
    current_data = status_ticket_data
    if isinstance(current_data, list) and len(current_data) > 0:
        current_data = current_data[0]
    
    if isinstance(current_data, dict):
        current_data = current_data['status_categories']
        if isinstance(current_data, str):
            current_data = orjson.loads(current_data)
        
        if isinstance(current_data, dict):
            for category in ['todo_tickets', 'inprogress_tickets', 'done_tickets']:
                tickets = current_data.get(category, [])
                if isinstance(tickets, list):
                    current_ticket_keys.update(tickets)
    
    return current_ticket_keys


def _calculate_scope_additions(initial_ticket_keys: set, current_ticket_keys: set) -> List[str]:
    """
    Calculate tickets added after sprint start.
    
    Args:
        initial_ticket_keys: Tickets at sprint start
        current_ticket_keys: Current tickets in sprint
    
    Returns:
        Sorted list of ticket IDs added after sprint start
    """
    if initial_ticket_keys:
        return sorted(list(current_ticket_keys - initial_ticket_keys))
    elif current_ticket_keys:
        return sorted(list(current_ticket_keys))
    return []


# -------------------------
# Exported processors
# -------------------------
def extract_static_summary(
    yesterday_counts: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
    current_counts: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
    stale_ticket_ids: Optional[Union[List[str], List[Dict[str, Any]]]] = None,
    status_ticket_data: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
    status_ticket_data_yesterday: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
    status_ticket_data_sprint_start: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
    is_day_one: Optional[Union[List[Dict[str, Any]], Dict[str, Any], bool]] = None,
    status_changes_data: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
    status_flow_data: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
    blocker_tickets: Optional[Union[List[str], List[Dict[str, Any]]]] = None,
    initial_scope_data: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
    sprint_basic_info: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
    story_points_data: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
    hygiene_counts_data: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
    hygiene_summary_data: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
    sprint_title_data: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Extracts and transforms sprint data from fn_sprint_ai_payload into a format
    suitable for the sprint static summary card.

    Behavior preserved from the original sprint_static_summary.py.
    
    On Day 1 of the sprint, uses status_ticket_data_sprint_start for comparison
    (showing Start → Today changes). On other days, uses status_ticket_data_yesterday
    (showing Yesterday → Today changes).
    
    Calculates scope change using initial_scope_data (story points at sprint start)
    and current total points: Scope Change % = (|Net Scope Change| ÷ Initial Scope) × 100
    """
    # Sprint info
    sprint_name = ""
    if sprint_title_data:
        title_row = _unwrap_counts(sprint_title_data)
        if isinstance(title_row, dict):
            sprint_name = title_row.get('sprint_title') or title_row.get('sprint_name') or ''

    hygiene_counts = {}
    if hygiene_counts_data:
        hygiene_counts = _unwrap_counts(hygiene_counts_data)

    # Points and completion %
    total_points = 0
    done_points = 0
    
    if story_points_data:
        points_result = _unwrap_counts(story_points_data)
        total_points = float(points_result.get("total_story_points", 0) or 0)
        done_points = float(points_result.get("resolved_story_points", 0) or 0)

    completion_percentage = _calculate_completion_percentage(done_points, total_points)

    # Calculate scope change and scope additions
    scope_change_percentage = None
    scope_addition_ids: List[str] = []
    
    if initial_scope_data:
        scope_data = initial_scope_data
        if isinstance(scope_data, list) and len(scope_data) > 0:
            scope_data = scope_data[0]
        
        if isinstance(scope_data, dict):
            initial_scope = scope_data.get("initial_scope", 0) or 0
            scope_change_percentage = _calculate_scope_change_percentage(initial_scope, total_points)
            
            _, initial_ticket_keys = _parse_initial_scope_data(initial_scope_data)
            current_ticket_keys = _parse_status_ticket_data(status_ticket_data)
            scope_addition_ids = _calculate_scope_additions(initial_ticket_keys, current_ticket_keys)

    # # Extract stale ticket ids (from stale_ticket_ids parameter passed from metric)
    # stale_ids: List[str] = []
    # if stale_ticket_ids and isinstance(stale_ticket_ids, list):
    #     stale_ids = [item.get("issue_key") for item in stale_ticket_ids if isinstance(item, dict) and item.get("issue_key")]
    # 
    # stale_count = len(stale_ids)

    # # Extract blocker issue keys from blocker_tickets parameter (from shared metric)
    # blocker_issue_keys: List[str] = []
    # if blocker_tickets:
    #     if isinstance(blocker_tickets, list):
    #         for item in blocker_tickets:
    #             if isinstance(item, dict):
    #                 key = item.get("issue_key")
    #             elif isinstance(item, str):
    #                 key = item
    #             else:
    #                 continue
    #             if key:
    #                 blocker_issue_keys.append(key)
    #     else:
    #         blocker_issue_keys = []
    # Ticket hygiene (4 checks per issue)
    no_assignee = hygiene_counts.get("no_assignee", 0) or 0
    missing_story_points = hygiene_counts.get("missing_story_points", 0) or 0
    missing_description = hygiene_counts.get("missing_description", 0) or 0
    missing_priority = hygiene_counts.get("missing_priority", 0) or 0
    total_issues = hygiene_counts.get("total_issues_now", 0) or 0

    ticket_hygiene_percentage = 100
    if total_issues > 0:
        total_checks = total_issues * 4
        failed_checks = (
            no_assignee + missing_story_points + missing_description + missing_priority
        )
        ticket_hygiene_percentage = round(
            ((total_checks - failed_checks) / total_checks) * 100
        )

    # Extract hygiene issue IDs from fn_sprint_hygiene_summary
    hygiene_ids = {}
    if hygiene_summary_data:
        hygiene_summary = _unwrap_sql_result(hygiene_summary_data, "hygiene_summary")
        if isinstance(hygiene_summary, dict):
            # Extract all ID arrays from the function result
            hygiene_ids = {
                "noAssigneeIds": hygiene_summary.get("no_assignee_ids", []),
                "missingStoryPointIds": hygiene_summary.get("missing_story_point_ids", []),
                "missingDescriptionIds": hygiene_summary.get("missing_description_ids", []),
                "missingPriorityIds": hygiene_summary.get("missing_priority_ids", [])
            }

    # # Calculate blocker count from blocker_tickets parameter
    # blocker_count = len(blocker_issue_keys) if blocker_issue_keys else 0
    # is_concerning = (stale_count > 0) or (blocker_count > 0)

    # Extract sprint basic info (start_date, end_date, progress)
    start_date = None
    end_date = None
    progress_percentage = None
    current_day = None
    total_days = None
    
    if sprint_basic_info:
        basic_info = sprint_basic_info
        if isinstance(basic_info, list) and len(basic_info) > 0:
            basic_info = basic_info[0]
        
        if isinstance(basic_info, dict):
            start_date = basic_info.get("start_date")
            end_date = basic_info.get("end_date")
            progress_percentage = basic_info.get("progress_percentage")
            
            # Calculate current day and total days
            if start_date and end_date:
                from datetime import datetime, timezone
                try:
                    # Dates come as ISO strings from database
                    start_dt = datetime.fromisoformat(str(start_date).replace('Z', '+00:00'))
                    end_dt = datetime.fromisoformat(str(end_date).replace('Z', '+00:00'))
                    
                    start_date_only = start_dt.date()
                    end_date_only = end_dt.date()
                    today_date_only = datetime.now(timezone.utc).date()
                    
                    # Calculate total days in sprint (inclusive)
                    total_days = (end_date_only - start_date_only).days + 1
                    
                    # Calculate current day (1-indexed)
                    current_day = (today_date_only - start_date_only).days + 1
                    
                    # Clamp current_day between 1 and total_days
                    current_day = max(1, min(current_day, total_days))
                except Exception as e:
                    # Log the error for debugging
                    print(f"Error calculating sprint days: {e}")
                    pass

    summary = {
        "title": "Summary",
        "description": sprint_name,
        # "isConcerning": is_concerning,
        "completedPoints": done_points,
        "totalPoints": total_points,
        "completionPercentage": completion_percentage,
        "scopeChangePercentage": scope_change_percentage,
        "scopeAdditionIds": scope_addition_ids,
        # "staleTickets": stale_count if stale_count > 0 else None,
        # "staleTicketIds": stale_ids if stale_ids else None,
        # "criticalBlockers": blocker_count if blocker_count > 0 else None,
        # "criticalBlockerKey": blocker_issue_keys[0] if blocker_issue_keys else None,
        # "blockerIssueKeys": blocker_issue_keys if blocker_issue_keys else None,
        "ticketHygienePercentage": (
            ticket_hygiene_percentage if ticket_hygiene_percentage < 100 else None
        ),
        "hygieneIssueIds": hygiene_ids if hygiene_ids else None,
        "startDate": start_date,
        "endDate": end_date,
        "progressPercentage": progress_percentage,
        "currentDay": current_day,
        "totalDays": total_days,
    }

    return summary


def extract_status_changes(
    yesterday_counts: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
    current_counts: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
    status_ticket_data: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
    status_ticket_data_yesterday: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
    status_ticket_data_sprint_start: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
    is_day_one: Optional[Union[List[Dict[str, Any]], Dict[str, Any], bool]] = None,
    status_flow_data: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Extracts status changes data for the sprint static summary card.
    
    On Day 1 of the sprint, uses status_ticket_data_sprint_start for comparison
    (showing Start → Today changes). On other days, uses status_ticket_data_yesterday
    (showing Yesterday → Today changes).
    
    Returns:
        Dict containing statusChanges with progressed, regressed, net, and status columns
    """
    # Determine if it's Day 1 of the sprint
    day_one_flag = False
    if isinstance(is_day_one, bool):
        day_one_flag = is_day_one
    elif isinstance(is_day_one, list) and len(is_day_one) > 0:
        day_one_flag = is_day_one[0].get("is_day_one", False) if isinstance(is_day_one[0], dict) else False
    elif isinstance(is_day_one, dict):
        day_one_flag = is_day_one.get("is_day_one", False)

    # On Day 1: compare sprint start tickets vs current tickets (Start → Today)
    # On other days: compare yesterday tickets vs current tickets (Yesterday → Today)
    comparison_data = status_ticket_data_sprint_start if day_one_flag else status_ticket_data_yesterday

    status_changes = _build_status_changes(
        yesterday_counts, 
        current_counts, 
        status_ticket_data,
        comparison_data,
        None,  # status_changes_data not needed
        status_flow_data
    )
    
    # Add flag to indicate if this is Day 1 comparison (for UI display)
    if status_changes:
        status_changes["isDayOne"] = day_one_flag

    return {"statusChanges": status_changes}


def transform_signals_combined(stagnant_issues, blocked_issues, scope_creep_issues=None, unassigned_issues=None, velocity_data=None, bug_ratio_data=None, unclear_ownership_issues=None, backward_transitions=None, workload_imbalance_data=None, effort_without_movement_data=None, testing_bottleneck_data=None, source='jira-insights'):
    """
    Transform SQL results from multiple queries into combined signals format.
    Combines all signal types: velocity, stagnant tasks, blocked issues, scope creep, unassigned issues, bug ratio, unclear ownership, backward transitions, workload imbalance, effort without movement, and testing bottleneck.
    
    Args:
        source: 'jira-insights' or 'human-sensed' to filter which signals to return
        testing_bottleneck_data: Real SQL data from v_issue_status_transitions
    """
    signals = []
    signal_id = 1
    
    # Process sprint velocity data FIRST (most important overview)
    if velocity_data and len(velocity_data) > 0:
        vel = velocity_data[0]  # Should only be one row
        completed_points = vel.get('completed_points', 0)
        total_points = vel.get('total_points', 0)
        target_points = vel.get('target_points', 0)
        completed_issues = vel.get('completed_issues', 0)
        total_issues = vel.get('total_issues', 0)
        days_elapsed = vel.get('days_elapsed', 0)
        days_remaining = vel.get('days_remaining', 0)
        total_days = vel.get('total_days', 0)
        # If total_days not provided, calculate from elapsed and remaining
        if total_days == 0:
            total_days = days_elapsed + days_remaining
        # Ensure we have a valid total_days (minimum 1 to avoid division by zero in other calculations)
        if total_days == 0:
            total_days = 1
        
        # Use velocity from query (same calculation as velocity burndown card)
        # Round to 1 decimal place for consistency with velocity burndown card
        avg_points_per_day = round(float(vel.get('current_velocity', 0)), 1) if vel.get('current_velocity') else 0
        required_points_per_day = round(float(vel.get('required_velocity', 0)), 1) if vel.get('required_velocity') else 0
        points_remaining = total_points - completed_points
        
        # Calculate completion percentage
        completion_pct = (completed_points / total_points * 100) if total_points > 0 else 0
        
        # Only show velocity signal when team is behind pace and sprint is active
        # Don't show on first day of sprint (days_elapsed > 1)
        velocity_signal_needed = (
            days_elapsed > 1 and
            days_remaining > 0 and 
            avg_points_per_day < required_points_per_day and 
            completed_points < target_points
        )
        
        signal_type = 'danger'
        title = 'Velocity at Risk'
        
        if velocity_signal_needed:
            # Build explanation with velocity metrics
            explanation = f"""Sprint velocity is at risk - required pace exceeds current average.

Completed: {completed_points:.1f} / {total_points:.1f} story points
Target: {target_points:.1f} points (80% of total)

Daily Progress:
• Average completed per day: {avg_points_per_day:.1f} points
• Required per day to meet target: {required_points_per_day:.1f} points
• Gap: {(required_points_per_day - avg_points_per_day):.1f} points/day shortfall
• Days elapsed: {days_elapsed} / {total_days}
• Days remaining: {days_remaining}

This indicates:
• Current pace insufficient to meet sprint target
• Team capacity or estimation issues
• Blockers impacting delivery

Recommended actions:
1. Review blockers and remove impediments
2. Consider descoping lower priority items
3. Discuss with Product Owner about sprint goals"""
            
            signals.append({
                'id': f'VELOCITY-{signal_id}',
                'title': title,
                'description': f'{completion_pct:.0f}% complete · {completed_points:.1f}/{total_points:.1f} points',
                'type': signal_type,
                'tickets': [],
                'recommendedAction': 'Review blockers and consider descoping',
                'age': 'Current',
                'source': 'jira-insights',
                'explanation': explanation,
                # Add velocity metrics for frontend calculation and display
                'velocityMetrics': {
                    'completedPoints': completed_points,
                    'totalPoints': total_points,
                    'completedIssues': completed_issues,
                    'totalIssues': total_issues,
                    'targetPoints': target_points,
                    'avgPointsPerDay': avg_points_per_day,
                    'requiredPointsPerDay': required_points_per_day,
                    'pointsRemaining': points_remaining,
                    'daysElapsed': days_elapsed,
                    'daysRemaining': days_remaining,
                    'totalDays': total_days
                }
            })
            signal_id += 1
    
    # Process bug-to-story ratio (second most important overview metric)
    if bug_ratio_data and len(bug_ratio_data) > 0:
        ratio_data = bug_ratio_data[0]
        bug_count = ratio_data.get('bug_count', 0)
        story_count = ratio_data.get('story_count', 0)
        ratio = ratio_data.get('ratio', 0)
        
        # Only create signal if ratio is concerning (>0.3 means >30% bugs)
        if ratio > 0.3 and bug_count > 0:
            if ratio > 0.5:
                signal_type = 'danger'
                title = 'High bug ratio'
            else:
                signal_type = 'warning'
                title = 'Elevated bug ratio'
            
            # Build explanation
            explanation = f"""Sprint has a bug-to-story ratio of {ratio:.2f} ({bug_count} bugs vs {story_count} stories).

Open Bugs: {bug_count}
Open Stories: {story_count}
Ratio: {ratio:.0%}

This indicates:
• Quality issues in recent releases
• Technical debt accumulating
• May impact sprint velocity with unplanned work

Recommended actions:
1. Review bug severity and prioritize critical fixes
2. Consider dedicating capacity to bug resolution
3. Investigate root causes to prevent future bugs
4. Balance new feature work with technical debt"""
            
            signals.append({
                'id': f'BUGS-{signal_id}',
                'title': title,
                'description': f'{bug_count} bugs · {story_count} stories · {ratio:.0%} ratio',
                'type': signal_type,
                'tickets': [],
                'recommendedAction': 'Review bug severity and prioritize fixes',
                'age': 'Current',
                'source': 'jira-insights',
                'explanation': explanation
            })
            signal_id += 1
    
    # Process stagnant tasks - COMPRESS if 2 or more
    if stagnant_issues and len(stagnant_issues) >= 2:
        ticket_keys = [task.get('issue_key') for task in stagnant_issues]
        avg_age = sum(task.get('age_days', 0) or 0 for task in stagnant_issues) // len(stagnant_issues)
        avg_story_points = sum(task.get('story_points', 0) or 0 for task in stagnant_issues) // len(stagnant_issues)
        
        # Determine severity based on average age
        if avg_age > 7:
            signal_type = 'danger'
        elif avg_age > 3:
            signal_type = 'warning'
        else:
            signal_type = 'info'
        
        explanation = f"""{len(stagnant_issues)} tasks are taking longer than their story point estimates.

Issues: {', '.join(ticket_keys[:5])}{'...' if len(ticket_keys) > 5 else ''}

Average: {avg_age} days in status vs {avg_story_points} story points estimated

This indicates:
• Tasks may be underestimated or more complex than expected
• Work items may be stalled or blocked
• Assignees may need support or clarification

Recommended actions:
1. Review each task in daily standup
2. Identify and remove blockers
3. Consider re-estimating remaining work
4. Reassign if needed"""
        
        signals.append({
            'id': f'STALE-{signal_id}',
            'title': f'{len(stagnant_issues)} Stagnant Tasks',
            'description': f"No activity for 4+ days and exceeds story point target",
            'type': signal_type,
            'tickets': ticket_keys,
            'recommendedAction': 'Review task complexity and engage assignee for next steps',
            'age': f'Avg {avg_age}d',
            'source': 'jira-insights',
            'explanation': explanation
        })
        signal_id += 1
    elif stagnant_issues and len(stagnant_issues) > 0:
        # Process single stagnant task
        for task in stagnant_issues:
            age_days = task.get('age_days', 0) or 0
            story_points = task.get('story_points', 0) or 0
            days_over = age_days - story_points
            
            # Determine severity based on how much over estimate
            if days_over > 5:
                signal_type = 'danger'
            elif days_over > 2:
                signal_type = 'warning'
            else:
                signal_type = 'info'
            
            explanation = f"""Task {task.get('issue_key')} ({task.get('title')}) has been in progress for {age_days} days but was estimated at {story_points} story points.

Assignee: {task.get('assignee') or 'Unassigned'}
Priority: {task.get('priority')}
Status: {task.get('current_status')}
Days over estimate: {days_over}

This indicates:
• Task may be underestimated or more complex than expected
• Work item may be stalled or blocked
• Assignee may need support or clarification

Recommended actions:
1. Review task in daily standup
2. Identify and remove blockers
3. Consider re-estimating remaining work
4. Reassign if needed"""
            
            signals.append({
                'id': f'STALE-{signal_id}',
                'title': 'Task over estimate',
                'description': f'{age_days}d in status · {story_points}SP estimate',
                'type': signal_type,
                'tickets': [task.get('issue_key')],
                'recommendedAction': 'Review task complexity and engage assignee for next steps',
                'age': f'{age_days}d',
                'source': 'jira-insights',
                'explanation': explanation
            })
            signal_id += 1
    
    # Process blocked issues - COMPRESS if 2 or more - SHOW BLOCKER CHAINS
    if blocked_issues and len(blocked_issues) >= 2:
        ticket_keys = [issue.get('issue_key') for issue in blocked_issues]
        total_blockers = 0
        blocker_relationships = []
        
        for issue in blocked_issues:
            blockers_in = issue.get('blockers_in', [])
            if isinstance(blockers_in, str):
                try:
                    blockers_in = orjson.loads(blockers_in)
                except:
                    blockers_in = []
            
            blocker_list = blockers_in if blockers_in else []
            total_blockers += len(blocker_list)
            
            # Create blocker chain: blocked_issue → blocker (what's blocked → blocked by what)
            for blocker in blocker_list:
                blocker_relationships.append(f"{issue.get('issue_key')} → {blocker}")
        
        explanation = f"""{len(blocked_issues)} issues are currently blocked by {total_blockers} blocker(s).

Blocker chains:
{chr(10).join(blocker_relationships[:5])}
{'...' if len(blocker_relationships) > 5 else ''}

Issues: {', '.join(ticket_keys)}

This indicates:
• Dependencies are creating delivery risks
• Cross-team coordination needed
• Sprint commitment at risk

Recommended actions:
1. Prioritize resolving blocking issues
2. Escalate to unblock dependencies
3. Consider workarounds where possible"""
        
        signals.append({
            'id': f'BLOCKED-{signal_id}',
            'title': f'{len(blocked_issues)} Tasks Blocked',
            'description': f'Blocked by unresolved linked issues',
            'type': 'danger',
            'tickets': blocker_relationships,  # Store chains instead of simple keys
            'dependencies': blocker_relationships,  # Also store separately for frontend
            'recommendedAction': 'Collaborate and prioritize resolving blocking issues',
            'age': 'Current',
            'source': 'jira-insights',
            'explanation': explanation
        })
        signal_id += 1
    elif blocked_issues and len(blocked_issues) > 0:
        for issue in blocked_issues:
            blocker_count = issue.get('blocker_count', 0)
            blockers_in = issue.get('blockers_in', [])
            
            # Handle different types - could be list, dict, or None
            blocker_keys = []
            if blockers_in:
                if isinstance(blockers_in, list):
                    blocker_keys = blockers_in
                elif isinstance(blockers_in, str):
                    # If it's a string, try to parse it as JSON
                    try:
                        blocker_keys = orjson.loads(blockers_in)
                    except:
                        blocker_keys = []
            
            # Create blocker chain: blocked_issue → blocker (what's blocked → blocked by what)
            blocker_chains = [f"{issue.get('issue_key')} → {b}" for b in blocker_keys]
            blocker_str = ', '.join(blocker_chains[:3]) if blocker_chains else 'None'
            if len(blocker_chains) > 3:
                blocker_str += f' (+{len(blocker_chains) - 3} more)'
            
            # Build explanation
            explanation = f"""Issue {issue.get('issue_key')} ({issue.get('title')}) is currently blocked by {blocker_count} issue(s).

Blocker chains:
{chr(10).join([f"• {chain}" for chain in blocker_chains])}

Assignee: {issue.get('assignee') or 'Unassigned'}
Priority: {issue.get('priority')}
Status: {issue.get('current_status')}

Impact:
• Sprint velocity at risk
• Team waiting on dependencies
• Could cascade to other items

Recommended actions:
1. Contact dependency teams urgently
2. Escalate to management if no response
3. Consider workarounds or parallel work"""
            
            signals.append({
                'id': f'BLOCKED-{signal_id}',
                'title': 'Blocked by dependency',
                'description': f'Blocked by {blocker_count} issue(s)',
                'type': 'danger',
                'tickets': blocker_chains,  # Store chains
                'dependencies': blocker_chains,  # Also store separately
                'recommendedAction': 'Follow up with dependency teams immediately',
                'age': 'Current',
                'source': 'jira-insights',
                'explanation': explanation
            })
            signal_id += 1
    
    # Process scope creep - COMPRESS if 2 or more
    if scope_creep_issues and len(scope_creep_issues) >= 2:
        ticket_keys = [issue.get('issue_key') for issue in scope_creep_issues]
        
        explanation = f"""{len(scope_creep_issues)} issues were added to sprint after start date.

Issues: {', '.join(ticket_keys)}

This indicates:
• Sprint planning scope not well defined
• Urgent requirements emerging
• Potential impact to committed work

Recommended actions:
1. Review sprint commitment with Product Owner
2. Assess impact on original sprint goals
3. Consider removing lower priority items"""
        
        signals.append({
            'id': f'SCOPE-{signal_id}',
            'title': f'Scope Added Mid Sprint',
            'description': f'Scope change detected during active sprint.',
            'type': 'warning',
            'tickets': ticket_keys,
            'recommendedAction': 'Review sprint commitment with PO',
            'age': 'Current',
            'source': 'jira-insights',
            'explanation': explanation
        })
        signal_id += 1
    elif scope_creep_issues and len(scope_creep_issues) > 0:
        for issue in scope_creep_issues:
            days_since_added = issue.get('days_since_added', 0)
            
            # Build explanation
            explanation = f"""Issue {issue.get('issue_key')} ({issue.get('title')}) was added to the sprint {days_since_added} day(s) ago, after the sprint had already started.

Assignee: {issue.get('assignee') or 'Unassigned'}
Priority: {issue.get('priority')}
Status: {issue.get('current_status')}

This indicates:
• Sprint planning scope not well defined
• Urgent requirements emerging
• Potential impact to committed work

Recommended actions:
1. Review sprint commitment with Product Owner
2. Assess impact on original sprint goals
3. Consider removing lower priority items to maintain velocity"""
            
            signals.append({
                'id': f'SCOPE-{signal_id}',
                'title': 'Scope creep',
                'description': f'Added to sprint · {days_since_added}d ago',
                'type': 'warning',
                'tickets': [issue.get('issue_key')],
                'recommendedAction': 'Review sprint commitment with Product Owner',
                'age': f'{days_since_added}d ago',
                'source': 'jira-insights',
                'explanation': explanation
            })
            signal_id += 1
    
    # Process unassigned issues - COMPRESS if 2 or more
    if unassigned_issues and len(unassigned_issues) >= 2:
        ticket_keys = [issue.get('issue_key') for issue in unassigned_issues]
        priorities = [issue.get('priority') for issue in unassigned_issues]
        
        explanation = f"""{len(unassigned_issues)} issues have no assignee.

Issues: {', '.join(ticket_keys)}
Priorities: {', '.join(set(priorities))}

This is important because:
• Work is not being actively worked on
• Sprint commitment at risk
• Team may not be aware of these tasks

Recommended actions:
1. Assign owners in daily standup
2. Verify requirements are clear
3. Ensure assignees have capacity"""
        
        signals.append({
            'id': f'UNASSIGNED-{signal_id}',
            'title': f'{len(unassigned_issues)} Unassigned Tasks',
            'description': f'Unowned Open and In Progress Tasks',
            'type': 'warning',
            'tickets': ticket_keys,
            'recommendedAction': 'Ownership needed for Open and In Progress tasks.',
            'age': 'Current',
            'source': 'jira-insights',
            'explanation': explanation
        })
        signal_id += 1
    elif unassigned_issues and len(unassigned_issues) > 0:
        for issue in unassigned_issues:
            age_days = issue.get('age_days', 0)
            priority = issue.get('priority', 'Unknown')
            
            # Determine severity based on priority
            if priority in ('Highest', 'High'):
                signal_type = 'danger'
            elif priority == 'Medium':
                signal_type = 'warning'
            else:
                signal_type = 'info'
            
            # Build explanation
            explanation = f"""Issue {issue.get('issue_key')} ({issue.get('title')}) is {priority} priority but has no assignee.

Priority: {priority}
Status: {issue.get('current_status')}
Age: {age_days} days

This is important because:
• Work is not being actively worked on
• Sprint commitment at risk
• Team may not be aware of this task

Recommended actions:
1. Assign owner in daily standup
2. Verify requirements are clear
3. Ensure assignee has capacity and skills needed"""
            
            signals.append({
                'id': f'UNASSIGNED-{signal_id}',
                'title': f'{len(unassigned_issues)} Unassigned task',
                'description': f'Unowned Open and In Progress Tasks',
                'type': signal_type,
                'tickets': [issue.get('issue_key')],
                'recommendedAction': 'Ownership needed for Open and In Progress tasks.',
                'age': f'{age_days}d old',
                'source': 'jira-insights',
                'explanation': explanation
            })
            signal_id += 1
    
    # Process unclear ownership issues (currently unassigned with status transitions)
    if unclear_ownership_issues and len(unclear_ownership_issues) > 0:
        # Group by ticket to avoid duplicates
        grouped_tickets = {}
        for issue in unclear_ownership_issues:
            ticket = issue.get('ticket')
            if ticket not in grouped_tickets:
                grouped_tickets[ticket] = {
                    'ticket': ticket,
                    'current_status': issue.get('current_status'),
                    'next_status': issue.get('next_status'),
                    'unassigned_start': issue.get('unassigned_start'),
                    'time_in_status': issue.get('time_in_status', 0)
                }
        
        ticket_keys = list(grouped_tickets.keys())
        
        if len(ticket_keys) > 0:
            # Build explanation
            explanation = f"""{len(ticket_keys)} issue(s) are currently unassigned and in transition.

Issues: {', '.join(ticket_keys)}

This indicates:
• Unclear ownership or responsibility
• Potential environment blockers preventing assignment
• Dev-Ops alignment issues

Recommended actions:
1. Verify environment blockers
2. Align dev-ops on ownership
3. Assign owners in next standup"""
            
            signals.append({
                'id': f'UNCLEAR-{signal_id}',
                'title': 'Unclear Ownership',
                'description': f'Unowned In Progress Tasks',
                'type': 'warning',
                'tickets': ticket_keys,
                'recommendedAction': 'Assign owners to In Progress Tasks to ensure accountability.',
                'age': 'Current',
                'source': 'human-sensed',
                'explanation': explanation
            })
            signal_id += 1
    
    # Process backward transitions (tasks moving backward in workflow)
    # SQL query already filters for backward transitions using automatic workflow order detection
    if backward_transitions and len(backward_transitions) > 0:
        # SQL now returns aggregated data: issue_key, from_status, to_status, backward_count, transition_times
        # Each row represents a status pair that occurred 2+ times
        # Group by issue_key to show all repeated transitions per ticket
        grouped_tickets = {}
        total_backward_moves = 0
        
        for transition in backward_transitions:
            issue_key = transition.get('issue_key')
            from_status = transition.get('from_status')
            to_status = transition.get('to_status')
            backward_count = transition.get('backward_count', 0)
            transition_times = transition.get('transition_times', [])
            
            if issue_key not in grouped_tickets:
                grouped_tickets[issue_key] = {
                    'issue_key': issue_key,
                    'status_pairs': []
                }
            
            # Add this status pair (which already has 2+ occurrences)
            grouped_tickets[issue_key]['status_pairs'].append({
                'from_status': from_status,
                'to_status': to_status,
                'count': backward_count,
                'times': transition_times
            })
            total_backward_moves += backward_count
        
        ticket_keys = list(grouped_tickets.keys())
        
        if len(ticket_keys) > 0:
            # Build explanation grouped by ticket
            transition_details = []
            
            for ticket, data in grouped_tickets.items():
                # Calculate total count for this ticket
                ticket_total = sum(pair['count'] for pair in data['status_pairs'])
                transition_details.append(f"• {ticket} ({ticket_total}):")
                
                # List all status pairs for this ticket
                for pair in data['status_pairs']:
                    for time in pair['times']:
                        transition_details.append(
                            f"  - {pair['from_status']} → {pair['to_status']} (on {time[:10]})"
                        )
            
            # Count unique tickets
            unique_tickets = len(grouped_tickets)
            
            explanation = f"""{unique_tickets} task(s) moved backward in the workflow ({total_backward_moves} total backward transitions).

All backward transitions:
{chr(10).join(transition_details)}

This indicates:
• Quality issues or bugs found in testing
• Requirements not clear or changing
• Rework impacting sprint velocity

Recommended actions:
1. Review why tasks are moving backward
2. Check if requirements need clarification
3. Investigate quality/testing process gaps
4. Consider impact on sprint commitment"""
            
            signals.append({
                'id': f'BACKWARD-{signal_id}',
                'title': 'Tasks moving backward',
                'description': f'{total_backward_moves} workflow reversals',
                'type': 'warning',
                'tickets': ticket_keys,
                'recommendedAction': 'Discuss with team to understand rework and prevent repeat patterns.',
                'age': 'Current',
                'source': 'human-sensed',
                'explanation': explanation
            })
            signal_id += 1
    
    # Process workload imbalance - CONSOLIDATED INTO SINGLE CARD
    if workload_imbalance_data and len(workload_imbalance_data) > 0:
        # Collect all overloaded assignees
        overloaded_assignees = []
        
        for row in workload_imbalance_data:
            assignee_name = row.get('assignee_name')
            active_issue_count = row.get('active_issue_count', 0)
            active_issues = row.get('active_issues', '')
            
            if active_issue_count > 0:
                overloaded_assignees.append({
                    'name': assignee_name,
                    'count': active_issue_count,
                    'tickets': active_issues.split(', ') if active_issues else []
                })
        
        if overloaded_assignees:
            explanation = f"""Multiple team members have high workload:

{chr(10).join([f"• {a['name']}: {a['count']} active tasks" for a in overloaded_assignees])}

This indicates:
• Uneven task distribution across team
• Risk of delays and quality issues
• Some team members may be overloaded while others have capacity

Recommended actions:
1. Review task distribution in next standup
2. Identify team members with available capacity
3. Redistribute tasks to balance workload
4. Monitor progress closely for bottlenecks"""
            
            signals.append({
                'id': f'IMBALANCE-{signal_id}',
                'title': f'Workload Imbalance',
                'description': f'One person overloaded, High active tasks by same assignee',
                'type': 'warning',
                'overloadedAssignees': overloaded_assignees,  # Array of {name, count, tickets} for frontend to render stacked avatars
                'recommendedAction': 'Review team capacity and reassign where needed.',
                'age': 'Current',
                'source': 'human-sensed',
                'explanation': explanation
            })
            signal_id += 1
    
    # Process effort without movement (work logged but stuck in progress 4+ days)
    if effort_without_movement_data and len(effort_without_movement_data) >= 2:
        ticket_keys = [task.get('issue_key') for task in effort_without_movement_data]
        total_hours = sum(task.get('worklog_hours', 0) or 0 for task in effort_without_movement_data)
        avg_age = sum(task.get('age_days', 0) or 0 for task in effort_without_movement_data) // len(effort_without_movement_data)
        
        explanation = f"""{len(effort_without_movement_data)} tasks have significant work logged but remain stuck in progress status.

Issues: {', '.join(ticket_keys[:5])}{'...' if len(ticket_keys) > 5 else ''}

Total effort logged: {total_hours:.1f} hours
Average time stuck: {avg_age} days

This indicates:
• Work is being done but tasks aren't progressing to completion
• May be blocked by dependencies, reviews, or testing
• Could indicate scope creep or incomplete acceptance criteria
• Possible technical debt or environmental issues

Recommended actions:
1. Review each task's blockers and dependencies
2. Check if work is complete but status not updated
3. Verify acceptance criteria and definition of done
4. Consider breaking into smaller deliverable chunks"""
        
        signals.append({
            'id': f'EFFORT-{signal_id}',
            'title': f'Effort without Progress',
            'description': f"No status changes for 4+ days and {total_hours:.1f} hours logged",
            'type': 'warning',
            'tickets': ticket_keys,
            'recommendedAction': 'Sync with assignee to verify progress and update status.',
            'age': f'Avg {avg_age}d',
            'source': 'jira-insights',
            'explanation': explanation
        })
        signal_id += 1
    elif effort_without_movement_data and len(effort_without_movement_data) > 0:
        for task in effort_without_movement_data:
            age_days = task.get('age_days', 0)
            worklog_hours = task.get('worklog_hours', 0) or 0
            story_points = task.get('story_points', 0) or 0
            
            # Determine severity based on time stuck and effort
            if age_days >= 7:
                signal_type = 'danger'
            elif age_days >= 5:
                signal_type = 'warning'
            else:
                signal_type = 'info'
            
            explanation = f"""Task {task.get('issue_key')} ({task.get('title')}) has {worklog_hours:.1f} hours logged but has been stuck in '{task.get('current_status')}' status for {age_days} days.

Assignee: {task.get('assignee') or 'Unassigned'}
Priority: {task.get('priority')}
Story Points: {story_points}
Work Logged: {worklog_hours:.1f} hours

This could indicate:
• Work is complete but status not updated
• Blocked waiting for review, testing, or deployment
• Scope expanded beyond original estimate
• Technical or environmental blockers preventing completion

Recommended actions:
1. Check with assignee if work is actually complete
2. Identify any blockers preventing status progression
3. Verify if additional scope was added mid-task
4. Update status if work is done"""
            
            signals.append({
                'id': f'EFFORT-{signal_id}',
                'title': 'Effort without movement',
                'description': f"No status changes for 4+ days and {worklog_hours:.1f} hours logged",
                'type': signal_type,
                'tickets': [task.get('issue_key')],
                'recommendedAction': 'Sync with the assignee to verify progress and update the status.',
                'age': f'{age_days}d',
                'source': 'jira-insights',
                'explanation': explanation
            })
            signal_id += 1
    
    # Process testing bottleneck - Pass ALL transition data to LLM for intelligent analysis
    # LLM will identify QA-related statuses and calculate bottleneck metrics
    if testing_bottleneck_data and len(testing_bottleneck_data) > 0:
        # Group transitions by ticket for better analysis
        ticket_transitions = {}
        for item in testing_bottleneck_data:
            key = item.get('issue_key')
            if key not in ticket_transitions:
                ticket_transitions[key] = {
                    'issue_key': key,
                    'title': item.get('title'),
                    'current_status': item.get('current_status'),
                    'status_category': item.get('status_category'),
                    'transitions': []
                }
            ticket_transitions[key]['transitions'].append({
                'from_status': item.get('from_status'),
                'to_status': item.get('to_status'),
                'transition_ts': item.get('transition_ts'),
                'duration_secs': item.get('duration_secs'),
                'person': item.get('person')
            })
        
        # Create a simple signal that will be enhanced by LLM
        ticket_keys = list(ticket_transitions.keys())
        
        explanation = f"""{len(ticket_keys)} tickets are currently in QA/Testing statuses for an extended period, indicating a testing bottleneck."""
        
        signals.append({
            'id': f'TESTING-BOTTLENECK-{signal_id}',
            'title': f'Testing Bottleneck',
            'description': f'{len(ticket_keys)} Testing tickets moving slowly, affecting overall progress',
            'type': 'info',
            'tickets': [],  # Don't show ticket list for testing bottleneck
            'recommendedAction': 'AI analysis in progress - check explanation for details',
            'age': f'{len(ticket_keys)} tickets',
            'source': 'human-sensed',  # Testing bottleneck appears in Human Insights view
            'explanation': explanation,
            'testingBottleneckMetrics': {
                'totalTicketCount': len(ticket_keys),
                'avgWaitTimeHours': 0,  # Will be calculated by LLM
                'ticketDetails': [
                    {
                        'issue_key': ticket_data['issue_key'],
                        'title': ticket_data['title'],
                        'assignee': ticket_data['transitions'][-1]['person'] if ticket_data['transitions'] else 'Unknown',
                        'in_progress_timestamp': ticket_data['transitions'][0]['transition_ts'] if ticket_data['transitions'] else '',
                        'awaiting_qa_timestamp': ticket_data['transitions'][-1]['transition_ts'] if ticket_data['transitions'] else '',
                        'time_in_awaiting_qa_hours': 0,  # Will be calculated by LLM
                        'current_status': ticket_data['current_status']
                    }
                    for ticket_data in ticket_transitions.values()
                ]
            }
        })
        signal_id += 1
    
    # Filter signals based on source parameter
    if source == 'human-sensed':
        filtered_signals = [s for s in signals if s['source'] == 'human-sensed']
        # If no human-sensed signals found, show nothing
        if not filtered_signals:
            filtered_signals = []
    elif source == 'jira-insights':
        filtered_signals = [s for s in signals if s['source'] == 'jira-insights']
    else:
        filtered_signals = signals  # Return all if source not specified
    
    # Note: AI summary generation for human-sensed signals is now handled 
    # in YAML using http_ai step type (see sprint_signals.yaml)
    # This keeps the transform function focused on data transformation only
    
    return {'signals': filtered_signals}


def merge_signals_with_ai_summary(signals_data: Dict[str, Any], ai_insights: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Merge AI-generated insights with the signals array.
    Inserts AI summary card at the beginning of signals array for human-sensed tab.
    
    Args:
        signals_data: {'signals': [...]} from transform_signals_combined
        ai_insights: Parsed LLM response with summary, keyObservations, recommendedActions
    
    Returns:
        {'signals': [...]} with AI summary card prepended (if ai_insights provided AND signals are human-sensed)
    """
    if not isinstance(signals_data, dict) or 'signals' not in signals_data:
        return signals_data
    
    signals = signals_data.get('signals', [])
    
    # Check if signals are human-sensed by looking at the first signal's source
    # Only add AI summary for human-sensed signals
    is_human_sensed = False
    if signals and len(signals) > 0:
        first_signal_source = signals[0].get('source', 'jira-insights')
        is_human_sensed = first_signal_source == 'human-sensed'
    
    # If not human-sensed, return signals as-is (no AI summary for jira-insights)
    if not is_human_sensed:
        return signals_data
    
    # If no AI insights provided, return signals as-is
    if not ai_insights or not isinstance(ai_insights, dict):
        return signals_data
    
    # Check if insights have the expected structure
    if not ai_insights.get('summary'):
        return signals_data
    
    # Format recommended actions as a short summary
    actions = ai_insights.get('recommendedActions', [])
    recommended_action = f"{len(actions)} key actions recommended" if actions else "Review detailed insights"
    
    # Create AI summary signal card
    summary_signal = {
        'id': 'SUMMARY-AI',
        'title': 'Human Intuition Summary',
        'description': ai_insights.get('summary', 'No summary available'),
        'type': 'info',  # Different type for styling
        'tickets': [],
        'recommendedAction': recommended_action,
        'age': 'AI Generated',
        'source': 'human-sensed',
        'explanation': _format_summary_explanation(ai_insights),
        'isSummary': True  # Flag for frontend special rendering
    }
    
    # Insert at the beginning
    merged_signals = [summary_signal] + signals
    
    return {'signals': merged_signals}


def format_testing_bottleneck_for_llm(transition_data):
    """
    Format status spans data into a structured format for LLM analysis.
    Groups status spans by ticket showing how long each ticket spent in each status.
    """
    if not transition_data:
        return {
            "message": "No status span data available",
            "tickets": []
        }
    
    # Group status spans by ticket
    tickets = {}
    for row in transition_data:
        issue_key = row.get('issue_key')
        if issue_key not in tickets:
            tickets[issue_key] = {
                'issue_key': issue_key,
                'title': row.get('title'),
                'current_status': row.get('current_status'),
                'status_category': row.get('status_category'),
                'assignee': row.get('assignee_display_name'),
                'priority': row.get('priority'),
                'status_spans': []
            }
        
        # Add each status span (time spent in a status)
        tickets[issue_key]['status_spans'].append({
            'status': row.get('status'),
            'from_ts': row.get('from_ts'),
            'to_ts': row.get('to_ts'),  # NULL if currently in this status
            'duration_seconds': row.get('duration_secs')
        })
    
    return {
        "total_tickets": len(tickets),
        "tickets": list(tickets.values())
    }


def merge_testing_bottleneck_with_signals(
    signals_data: Dict[str, Any], 
    testing_insights: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Merge AI-generated testing bottleneck insights into the testing bottleneck signal.
    Removes the signal entirely if bottleneckCount == 0.
    """

    # Validate signals_data
    if not isinstance(signals_data, dict) or 'signals' not in signals_data:
        return signals_data

    signals = signals_data.get('signals', [])

    # No AI insights → no modification
    if not testing_insights or not isinstance(testing_insights, dict):
        return signals_data

    # Missing summary → invalid LLM output
    if not testing_insights.get('summary'):
        return signals_data

    # Extract bottleneck tickets directly from LLM response
    # Check if bottleneckTickets was explicitly provided (even if empty)
    has_bottleneck_tickets_key = 'bottleneckTickets' in testing_insights
    bottleneck_tickets = testing_insights.get('bottleneckTickets', [])
    non_bottleneck_tickets = testing_insights.get('nonBottleneckTickets', [])
    
    # If no bottleneck tickets provided, infer from signal's ticket count
    if not bottleneck_tickets and not has_bottleneck_tickets_key and signals:
        # Check if any signal has testing bottleneck data
        for s in signals:
            if s.get('id', '').startswith('TESTING-BOTTLENECK'):
                metrics = s.get('testingBottleneckMetrics', {})
                bottleneck_tickets = [t['issue_key'] for t in metrics.get('ticketDetails', [])]
                break
    bcount = len(bottleneck_tickets)  # Use length of bottleneck tickets array

    # Print for debugging
    # print(f"\n{'='*60}")
    # print(f"TESTING BOTTLENECK ANALYSIS")
    # print(f"{'='*60}")
    # print(f"Bottleneck Tickets ({bcount}): {bottleneck_tickets}")
    # print(f"Non-Bottleneck Tickets ({len(non_bottleneck_tickets)}): {non_bottleneck_tickets}")
    # print(f"{'='*60}\n")

    # ---------------------------------------
    # MAIN MERGE LOOP
    # ---------------------------------------
    for signal in signals:
        if signal.get('id', '').startswith('TESTING-BOTTLENECK'):

            # --- HARD RULE: remove card if bottleneckTickets was explicitly provided and is empty ---
            if has_bottleneck_tickets_key and bcount == 0:
                signals.remove(signal)
                return {'signals': signals}
            # -----------------------------------------------------

            # Update explanation with AI insights
            signal['explanation'] = _format_summary_explanation(testing_insights)

            # Update description with summary if no bottleneck tickets
            if has_bottleneck_tickets_key and bottleneck_tickets:
                # Add clickable ticket list - only actual bottleneck tickets from LLM
                signal['tickets'] = bottleneck_tickets
                signal['description'] = (
                    f"{bcount} Testing ticket{'s' if bcount != 1 else ''} moving slowly, affecting overall progress"
                )
            else:
                # Use summary as description if no explicit tickets
                signal['description'] = testing_insights.get('summary', 'Analyzing tickets')

            # Recommended action from AI
            actions = testing_insights.get('recommendedActions', [])
            if actions:
                signal['recommendedAction'] = (
                    actions[0] if len(actions) == 1 else f"{len(actions)} actions recommended"
                )

            signal['hasAiInsights'] = True
            break

    return {'signals': signals}


def select_final_signals(source: str, human_sensed_signals: Dict[str, Any], jira_insights_signals: Dict[str, Any]) -> Dict[str, Any]:
    """
    Select the appropriate signals output based on the source parameter.
    
    Args:
        source: 'jira-insights' or 'human-sensed'
        human_sensed_signals: Signals with human insights AI summary AND testing bottleneck AI insights
        jira_insights_signals: Signals without testing bottleneck (jira-insights has no testing bottleneck)
    
    Returns:
        The appropriate signals dict based on source
    """
    if source == 'human-sensed':
        return human_sensed_signals if human_sensed_signals else {'signals': []}
    else:  # jira-insights
        return jira_insights_signals if jira_insights_signals else {'signals': []}


# looks like this is not used
def transform_stagnant_to_signals(stagnant_issues):
    """
    Transform SQL results from stagnant tasks query into signals format expected by frontend.
    """
    signals = []
    
    if not stagnant_issues or len(stagnant_issues) == 0:
        return {'signals': signals}
    
    signal_id = 1
    for task in stagnant_issues:
        age_days = task.get('age_days', 0)
        
        # Determine signal type based on age
        if age_days > 7:
            signal_type = 'danger'
        elif age_days > 3:
            signal_type = 'warning'
        else:
            signal_type = 'info'
        
        # Build explanation
        explanation = f"""Task {task.get('issue_key')} ({task.get('title')}) has been in '{task.get('current_status')}' status for {age_days} days.

Assignee: {task.get('assignee') or 'Unassigned'}
Priority: {task.get('priority')}

This could indicate:
• Environment or infrastructure issues preventing progress
• Dependencies blocking work
• Team members needing support or clarification

Recommended actions:
1. Check with assignee about blockers
2. Verify dev/test environments are working
3. Review if additional resources or expertise needed"""
        
        signals.append({
            'id': f'STALE-{signal_id}',
            'title': 'Task stagnant',
            'description': f"No status change · {age_days}d",
            'type': signal_type,
            'tickets': [task.get('issue_key')],
            'recommendedAction': 'Check with assignee about blockers; verify environments',
            'age': f'{age_days}d',
            'source': 'jira-insights',
            'explanation': explanation
        })
        signal_id += 1
    
    return {'signals': signals}


def extract_team_pulse(
    burndown: Union[List[Dict[str, Any]], Dict[str, Any]],
    facts: Union[List[Dict[str, Any]], Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Extracts and transforms sprint data from fn_sprint_burndown and fn_sprint_facts
    into a format suitable for the team pulse card.

    Uses fn_sprint_burndown to get the latest completion percentage and daily change.
    Uses fn_sprint_facts to get contributor details.
    
    Note: fn_sprint_burndown returns all 14 days of the sprint, so we filter to get
    only data up to today to calculate current pulse and yesterday's pulse.
    """
    from datetime import date
    
    # Get burndown data
    burndown_data = burndown if isinstance(burndown, list) else []
    
    if not burndown_data:
        return {}

    today = date.today()
    
    # Filter burndown to only include days up to today and sort by day descending
    past_burndown = [
        entry for entry in burndown_data 
        if isinstance(entry.get("day"), (str, date))
    ]
    
    # Convert string dates to date objects for comparison if needed
    for entry in past_burndown:
        day_val = entry.get("day")
        if isinstance(day_val, str):
            try:
                entry["day_parsed"] = date.fromisoformat(day_val)
            except (ValueError, TypeError):
                entry["day_parsed"] = None
        elif isinstance(day_val, date):
            entry["day_parsed"] = day_val
        else:
            entry["day_parsed"] = None
    
    # Filter to only past/present days (not future)
    past_burndown = [
        entry for entry in past_burndown 
        if entry.get("day_parsed") and entry["day_parsed"] <= today
    ]
    
    # Sort by day descending to get most recent data first
    sorted_burndown = sorted(
        past_burndown, 
        key=lambda x: x.get("day_parsed", date.min), 
        reverse=True
    )

    # Calculate completion score from latest burndown entry (today or latest available)
    pulse_score = 0
    pulse_change = None
    current_points = 0
    total_points = 0

    if len(sorted_burndown) >= 1:
        today_burndown = sorted_burndown[0]
        today_done = _to_number(today_burndown.get("done_points", 0) or 0)
        today_scope = _to_number(today_burndown.get("scope_points", 0) or 0)
        
        current_points = today_done
        total_points = today_scope
        pulse_score = _calculate_completion_percentage(today_done, today_scope)

        # Calculate change from yesterday
        if len(sorted_burndown) >= 2:
            yesterday_burndown = sorted_burndown[1]
            yesterday_done = _to_number(yesterday_burndown.get("done_points", 0) or 0)
            yesterday_scope = _to_number(yesterday_burndown.get("scope_points", 0) or 0)

            if today_scope > 0 and yesterday_scope > 0:
                today_percentage = round((today_done / today_scope) * 100)
                yesterday_percentage = round((yesterday_done / yesterday_scope) * 100)
                pulse_change = today_percentage - yesterday_percentage

    # Get contributor data from facts
    facts_data = _unwrap_sql_result(facts, "facts")
    
    contributors_data = []
    data_quality = {}
    if isinstance(facts_data, dict):
        contributors_data = facts_data.get("contributors", []) or []
        data_quality = facts_data.get("dataQuality", {}) or {}

    members_list: List[Dict[str, Any]] = []
    key_contributors: List[Dict[str, Any]] = []

    for contributor in contributors_data:
        if not isinstance(contributor, dict):
            continue
        member_name = contributor.get("person", "Unassigned")
        if not member_name or member_name.strip() == "":
            continue

        member_points = _to_number(contributor.get("points_done_total", 0) or 0)
        member_total = _to_number(contributor.get("points_assigned_now", 0) or 0)
        if member_total == 0:
            continue

        percentage = 0
        if member_total > 0:
            percentage = round((member_points / member_total) * 100)

        member_obj = {
            "name": member_name,
            "points": member_points,
            "committedPoints": member_total,
            "percentage": percentage,
        }
        members_list.append(member_obj)

    members_list.sort(key=lambda x: x["points"], reverse=True)

    for member in members_list:
        if member["points"] > 0 and len(key_contributors) < 2:
            if len(key_contributors) == 0:
                role = "1st"
            elif len(key_contributors) == 1:
                role = "2nd"
            contributor = {
                "name": member["name"],
                "role": role,
                "points": member["points"],
                "committedPoints": member["committedPoints"],
                "percentage": member["percentage"],
            }
            key_contributors.append(contributor)

    team_pulse = {
        "title": "Team Pulse",
        "pulseScore": pulse_score,
        "pulseChange": pulse_change,
        "currentPoints": current_points,
        "totalPoints": total_points,
        "keyContributors": key_contributors,
        "members": members_list,
        "dataQuality": data_quality,
    }

    return team_pulse


# tests missing
def extract_velocity_burndown(velocity_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Extract and transform velocity burndown data from database query results
    
    Args:
        velocity_data: Query results containing velocity and burndown metrics
        
    Returns:
        Transformed velocity burndown data ready for frontend consumption
    """
    if not velocity_data or len(velocity_data) == 0:
        return {
            "title": "Sprint Velocity & Burndown",
            "scopePoints": 0,
            "riskLevel": "Unknown",
            "sprintOverrun": 0,
            "currentVelocity": 0,
            "velocityChange": 0,
            "requiredVelocity": 0,
            "actualShortfall": 0,
            "projectedShortfall": 0,
            "avgPerSprint": 0,
            "daysElapsed": 0,
            "burndownChart": []
        }
    
    row = velocity_data[0]
    
    # Extract burndown chart data - handle both string and list formats
    burndown_chart = []
    if row.get('burndown_chart_data'):
        chart_data = row['burndown_chart_data']
        # If it's a string, parse it as JSON
        if isinstance(chart_data, str):
            try:
                burndown_chart = orjson.loads(chart_data)
            except Exception:
                burndown_chart = []
        # If it's already a list, use it directly
        elif isinstance(chart_data, list):
            burndown_chart = chart_data
        
        # Round remaining and ideal values to whole numbers
        for point in burndown_chart:
            if point.get('remaining') is not None:
                point['remaining'] = round(float(point['remaining']))
            if point.get('ideal') is not None:
                point['ideal'] = round(float(point['ideal']))
    
    # Format the response
    result = {
        "title": "Sprint Velocity & Burndown",
        # scopePoints now reflects the current/latest scope (done + remaining)
        "scopePoints": float(row.get('current_scope', 0)) if row.get('current_scope') else 0,
        # keep committed (day-1) scope available for backward compatibility
        "committedScope": float(row.get('scope_points', 0)) if row.get('scope_points') else 0,
        "riskLevel": row.get('risk_level', 'Unknown'),
        "sprintOverrun": round(float(row.get('sprint_overrun', 0))) if row.get('sprint_overrun') else 0,
        "currentVelocity": round(float(row.get('current_velocity', 0)), 1) if row.get('current_velocity') else 0,
        "velocityChange": round(float(row.get('velocity_change', 0)), 1) if row.get('velocity_change') else 0,
        "requiredVelocity": round(float(row.get('required_velocity', 0)), 1) if row.get('required_velocity') else 0,
        "actualShortfall": round(float(row.get('actual_shortfall', 0))) if row.get('actual_shortfall') else 0,
        "projectedShortfall": round(float(row.get('projected_shortfall', 0))) if row.get('projected_shortfall') else 0,
        "avgPerSprint": round(float(row.get('avg_per_sprint', 0))) if row.get('avg_per_sprint') else 0,
        "daysElapsed": int(row.get('days_elapsed', 0)) if row.get('days_elapsed') else 0,
        "isOverrun": bool(row.get('is_overrun', False)),
        "burndownChart": burndown_chart
    }
    
    return result


# tests missing
def transform_signals_jira_only(stagnant_issues, blocked_issues, scope_creep_issues=None, unassigned_issues=None, velocity_data=None, bug_ratio_data=None, unclear_ownership_issues=None, backward_transitions=None, workload_imbalance_data=None, effort_without_movement_data=None):
    """
    Transform SQL results into JIRA-only signals (optimized, no AI processing).
    Returns only data-driven signals from JIRA without LLM insights.
    
    This is an optimized version for the jira-insights tab that skips AI processing.
    Expected response time: ~2-5 seconds
    """
    # Call the combined function with source='jira-insights' and no testing_bottleneck_data
    return transform_signals_combined(
        stagnant_issues=stagnant_issues,
        blocked_issues=blocked_issues,
        scope_creep_issues=scope_creep_issues,
        unassigned_issues=unassigned_issues,
        velocity_data=velocity_data,
        bug_ratio_data=bug_ratio_data,
        unclear_ownership_issues=unclear_ownership_issues,
        backward_transitions=backward_transitions,
        workload_imbalance_data=workload_imbalance_data,
        effort_without_movement_data=effort_without_movement_data,
        testing_bottleneck_data=None,  # No AI processing
        source='jira-insights'
    )


# tests missing
def extract_epic_progress(
    epic_data: Union[List[Dict[str, Any]], Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Extracts and transforms epic data from the database query result.
    Returns epic keys, names, story points, completion percentage, and child issues.

    Args:
        epic_data: List of epics with epic_key, epic_name, story points data, and child issues from the database

    Returns:
        Dict containing a list of epics with their complete information
    """
    epics_list = []
    
    # Handle both list and dict formats
    if isinstance(epic_data, dict):
        epic_data = [epic_data]
    elif not isinstance(epic_data, list):
        epic_data = []
    
    print(f"[DEBUG] extract_epic_progress received {len(epic_data)} epics", flush=True)
    
    for epic in epic_data:
        if not isinstance(epic, dict):
            continue
            
        epic_key = epic.get("epic_key", "")
        epic_name = epic.get("epic_name", "")
        
        if not epic_key or not epic_name:
            continue
        
        # Extract story points data
        total_story_points = float(epic.get("total_story_points", 0) or 0)
        completed_story_points = float(epic.get("completed_story_points", 0) or 0)
        percent_completed = float(epic.get("percent_completed", 0) or 0)
        
        # Extract child issues
        child_issues = epic.get("child_issues", [])
        print(f"[DEBUG] Epic {epic_key}: child_issues type={type(child_issues)}, value={child_issues}", flush=True)
        
        # Parse JSON string if needed
        if isinstance(child_issues, str):
            import json
            try:
                child_issues = json.loads(child_issues)
            except json.JSONDecodeError:
                print(f"[ERROR] Failed to parse child_issues JSON for epic {epic_key}", flush=True)
                child_issues = []
        
        tickets = []
        
        if isinstance(child_issues, list):
            for issue in child_issues:
                if isinstance(issue, dict):
                    tickets.append({
                        "key": issue.get("key", ""),
                        "summary": issue.get("summary", ""),
                        "status": issue.get("status", ""),
                        "storyPoints": float(issue.get("story_points", 0) or 0)
                    })
        
        print(f"[DEBUG] Epic {epic_key}: extracted {len(tickets)} tickets", flush=True)
        
        epic_item = {
            "epicKey": epic_key,
            "epicName": epic_name,
            "storyPoints": {
                "completed": completed_story_points,
                "total": total_story_points,
                "percentage": percent_completed
            },
            "tickets": tickets,
            "epicInsights": {
                "scopeChange": "Coming soon",
                "stuckStories": "Coming soon",
                "riskFlag": "Coming soon",
                "forecast": "Coming soon"
            }
        }
        epics_list.append(epic_item)
    
    return {
        "epics": epics_list
    }


# tests missing
def transform_signals_human_sensed(stagnant_issues, blocked_issues, scope_creep_issues=None, unassigned_issues=None, velocity_data=None, bug_ratio_data=None, unclear_ownership_issues=None, backward_transitions=None, workload_imbalance_data=None, effort_without_movement_data=None, testing_bottleneck_data=None, testing_bottleneck_ai=None, unclear_ownership_insights=None):
    """
    Transform SQL results into AI-enhanced signals (human-sensed).
    Returns comprehensive signals with LLM insights and testing bottleneck analysis.
    
    This is the full version for the human-intuition tab with AI processing.
    Expected response time: ~15-30 seconds (first call), ~2-5 seconds (cached)
    
    Args:
        testing_bottleneck_ai: LLM analysis from http_ai step 'analyze_testing_bottleneck'
        unclear_ownership_insights: LLM insights from http_ai step 'analyze_unclear_ownership'
    """
    # Call the combined function with source='human-sensed' and AI data
    return transform_signals_combined(
        stagnant_issues=stagnant_issues,
        blocked_issues=blocked_issues,
        scope_creep_issues=scope_creep_issues,
        unassigned_issues=unassigned_issues,
        velocity_data=velocity_data,
        bug_ratio_data=bug_ratio_data,
        unclear_ownership_issues=unclear_ownership_issues,
        backward_transitions=backward_transitions,
        workload_imbalance_data=workload_imbalance_data,
        effort_without_movement_data=effort_without_movement_data,
        testing_bottleneck_data=testing_bottleneck_data,  # Include AI insights
        source='human-sensed'
    )