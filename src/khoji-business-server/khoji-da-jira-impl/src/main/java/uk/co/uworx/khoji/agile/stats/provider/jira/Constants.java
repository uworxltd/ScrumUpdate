/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.stats.provider.jira;

import java.time.format.DateTimeFormatter;

public interface Constants
{
  String ISSUE_STATE_OPEN = "1";

  int TODO_CATEGORY_ID = 2;

  int RESOLVED_CATEGORY_ID = 3;

  String ISSUE_STATE_TODO = "10001";

  String TEAM_BOARD = "Team Board";

  String ISSUE_STATE_IN_PROGRESS = "3";

  String ISSUE_TYPE_BA_QA_DEV = "BA/QA/Dev";

  String ISSUE_TYPE_DEVELOPMENT_TASK = "Development Sub Task";

  String ISSUE_TYPE_STORY_DEFECT = "Story Defect";

  String ISSUE_TYPE_STORY = "Story";

  String ISSUE_TYPE_BUG = "Bug";

  String ISSUE_TYPE_EPIC = "Epic";

  public static final String STORY_DEFECT_SUB_TASK_DISTRIBUTION_KEY = "Story Defect";

  public static final String DEV_SUB_TASK_DISTRIBUTION_KEY = "Development";

  public static final String QA_SUB_TASK_DISTRIBUTION_KEY = "QA";

  int JIRA_SPRINTS_MAX_RESULTS = 50;

  int JIRA_PROJECTS_MAX_RESULTS = 50;

  int JIRA_USERS_MAX_RESULTS = 50;

  int JIRA_INDIVIDUAL_TASKS_MAX_RESULTS = 500;

  int JIRA_TEAMBOARDS_MAX_RESULTS = 50;

  public static final String STORY_STATISTICS = "storyStatistics";

  public static final String BUG_STATISTICS = "bugStatistics";

  public static final String EPICS = "epics";

  public static final String STATUS_ALL = "All";

  public static final String RELEASE_DISPLAY_NAME_SEPARATOR = " - ";

  public static final String YYYY_MM_DD = "yyyy-MM-dd";

  public static final DateTimeFormatter JIRA_DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("[yyyy-MM-dd HH:mm][yyyy-MM-dd]");

  public static final String TEMPO = "tempo";

  //TODO: Remove this constant and all its usages after refactoring of stats providers to generic Issue type instead of specific issue type (i.e Story and Bug)
  public static final String ALL_ISSUE_TYPES = "allIssueTypes";
  public static final String ISSUE_STATISTICS = "issueStatistics";
}
