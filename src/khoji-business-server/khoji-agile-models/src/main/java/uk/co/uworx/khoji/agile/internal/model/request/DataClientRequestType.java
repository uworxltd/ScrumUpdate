/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonValue;

public enum DataClientRequestType
{
  TEAM_BOARD_BY_SPRINT("TeamBoardAnalysisBySprint"),
  SPRINT("SprintAnalysis"),
  TEAM_BOARD_BY_WORK_LOG("TeamBoardAnalysisByWorkLog"),
  SUB_TASK_BY_PARENT_ID("SubTaskByParentId"),
  ISSUE_BY_ID("IssueById"),
  ISSUES_BY_RELEASE("IssuesByRelease");

  @JsonProperty
  private String requestType;

  /**
   * Constructor
   *
   * @param requestType the request type
   */
  DataClientRequestType(final String requestType)
  {
    this.requestType = requestType;
  }

  /**
   * @return the request type
   */
  @JsonValue
  public String getRequestType()
  {
    return requestType;
  }
}
