##############################################################################
# Copyright 2026 UWorx Services.
# Licensed under the Apache License, Version 2.0.
# See LICENSE for the full license text.
##############################################################################

"""
Miscellaneous Common utility methods for use in Jira based sync jobs
"""
from datetime import datetime, timezone
from logging import Logger
from typing import List, Any

from models import OAuthJiraCredentials
from services import OAuthJiraClient


def create_batches(items: List[Any], batch_size: int) -> List[List[Any]]:
    """
    Split provided List of items into batches for processing.

    Args:
        items: List of issue keys to batch
        batch_size: int Number of issues to fetch at a time (optional, default: 50)

    Returns:
        List of batches, each containing up to batch_size issue keys
    """
    return [items[i:i + batch_size] for i in range(0, len(items), batch_size)]

def initialize_jira_oauth_client(jira_oauth_credentials: OAuthJiraCredentials) -> tuple[bool, OAuthJiraClient | str]:
    try:
        oauth_client = OAuthJiraClient(jira_oauth_credentials)
        oauth_client.get_myself()
        return True, oauth_client
    except Exception as e:
        return False, f"❌ OAuth client connection failed: {e}"

# =============================================================================
# CHANGELOG UTILS
# =============================================================================
def fetch_changelogs_against_issues(issue_keys: List[str], jira_client: OAuthJiraClient, logger: Logger) -> List[Any]:
    """
    Fetch changelogs for multiple issues with optimized batch processing.

    Args:
        issue_keys: List[str] List of issue keys to fetch changelogs for
        jira_client: OAuthJiraClient instance

    Returns:
        List[Any] List of changelogs
    """
    all_changelogs = []

    # Fetch changelogs against provided issue_keys
    next_page_token = None
    while True:
        response = jira_client.bulk_fetch_changelogs(
            issue_ids_or_keys=issue_keys, next_page_token=next_page_token
        )
        raw_changelogs = response.get("issueChangeLogs", [])
        all_changelogs.extend(raw_changelogs)

        logger.info(f"Fetched {len(raw_changelogs)} new changelogs")

        next_page_token = response.get('nextPageToken')
        if not next_page_token:
            break

    logger.info(f"✅ Total changelogs fetched: {len(all_changelogs)}")
    return all_changelogs

def transform_raw_changelogs_to_required_format(raw_changelogs: List[Any]) -> List[Any]:
    all_changelogs = []

    for raw_changelog in raw_changelogs:
        issue_id = raw_changelog["issueId"]

        for history in raw_changelog["changeHistories"]:

            for index, item in enumerate(history['items']):
                base_id = history['id']
                composite_id = f"{base_id}_{index}"

                created_raw = history.get("created")
                if isinstance(created_raw, (int, float)) and created_raw > 0:
                    # Convert Unix timestamp to UTC datetime - See KFX-228 for more details
                    created_date = datetime.fromtimestamp(created_raw / 1000.0, tz=timezone.utc)
                else:
                    created_date = created_raw

                record = {
                    'changelog_id': composite_id,
                    'item_index': index,
                    'issue_key': issue_id,
                    'author_display_name': (
                        history.get('author', {}).get('displayName', '')
                        if history.get('author')
                        else ''
                    ),
                    'author_account_id': (
                        history.get('author', {}).get('accountId', '')
                        if history.get('author')
                        else ''
                    ),
                    'created_date': created_date.isoformat(),
                    'field_name': item['field'],
                    'field_type': item.get('fieldtype'),
                    'from_value': item.get('from'),
                    'to_value': item.get('to'),
                    "from_display_value": item.get("fromString", ""),
                    "to_display_value": item.get("toString", "")
                }
                all_changelogs.append(record)

    return all_changelogs

# =============================================================================
# ISSUES UTILS
# =============================================================================
def get_issue_estimation_field(raw_issues, board_id, jira_client: OAuthJiraClient) -> dict:
    """
    Resiliently finds the estimation field by trying multiple issues until one succeeds.

    Args:
        raw_issues: List of untransformed Jira issues from JQL query
        board_id: ID of the board to check estimation field for
        jira_client: OAuthJiraClient instance

    Returns:
        str: The fieldId of the estimation field, or raises ValueError if none found

    Raises:
        ValueError: If no valid issue_key found or all lookups fail
        IndexError: If raw_issues is empty
    """
    if not raw_issues:
        raise ValueError("No issues found in JQL result")

    for issue in raw_issues:
        issue_key = issue.get('key')

        try:
            result = jira_client.get_issue_estimation_for_issue_in_board(issue_key, board_id)
            field_id = result.get('fieldId')
            if field_id:
                return field_id
        except Exception:
            continue

    raise ValueError(
        f"Failed to determine estimation field for board {board_id} "
        f"from {len(raw_issues)} issues (no valid issue_key or all lookups failed)"
    )