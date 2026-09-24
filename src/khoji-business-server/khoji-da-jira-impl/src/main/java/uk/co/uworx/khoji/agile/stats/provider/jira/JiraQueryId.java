package uk.co.uworx.khoji.agile.stats.provider.jira;

import lombok.Getter;

/**
 * Enum to define all possible options for the query id of a JQL
 */
@Getter
public enum JiraQueryId
{
  INDIVIDUALS_ISSUES("INDIVIDUALS_ISSUES"),
  INDIVIDUALS_ISSUES_WITHOUT_RANGE("INDIVIDUALS_ISSUES_WITHOUT_RANGE"),
  USER_ACTIVITY("USER_ACTIVITY"),
  DEFAULT_ACTIVITY("DEFAULT_ACTIVITY"),
  DATE_RANGE_ACTIVITY("DATE_RANGE_ACTIVITY"),
  LAST_WEEK_ACTIVITY("LAST_WEEK_ACTIVITY");
  private final String value;

  JiraQueryId(final String value)
  {
    this.value = value;
  }
}
