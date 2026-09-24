/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model.request;

import uk.co.uworx.khoji.agile.internal.model.TeamBoard;

import java.util.List;

public class TeamBoardDataClientRequestByWorkLog
{
  private List<TeamBoard> teamBoards;
  private List<String> blackListedIssueKeys;
  private String dateStart;
  private String dateEnd;
  private List<String> issueTypes;
  private String tenantId;

  public TeamBoardDataClientRequestByWorkLog(final List<TeamBoard> teamBoards, final List<String> blackListedIssueKeys, final String dateStart, final String dateEnd, final List<String> issueTypes, final String tenantId)
  {
    this.teamBoards = teamBoards;
    this.blackListedIssueKeys = blackListedIssueKeys;
    this.dateStart = dateStart;
    this.dateEnd = dateEnd;
    this.issueTypes = issueTypes;
    this.tenantId = tenantId;
  }

  public List<TeamBoard> getTeamBoards()
  {
    return teamBoards;
  }

  public void setTeamBoards(final List<TeamBoard> teamBoards)
  {
    this.teamBoards = teamBoards;
  }

  public List<String> getBlackListedIssueKeys()
  {
    return blackListedIssueKeys;
  }

  public void setBlackListedIssueKeys(final List<String> blackListedIssueKeys)
  {
    this.blackListedIssueKeys = blackListedIssueKeys;
  }

  public String getDateStart()
  {
    return dateStart;
  }

  public void setDateStart(final String dateStart)
  {
    this.dateStart = dateStart;
  }

  public String getDateEnd()
  {
    return dateEnd;
  }

  public void setDateEnd(final String dateEnd)
  {
    this.dateEnd = dateEnd;
  }

  public List<String> getIssueTypes()
  {
    return issueTypes;
  }

  public void setIssueTypes(final List<String> issueTypes)
  {
    this.issueTypes = issueTypes;
  }

  public String getTenantId()
  {
    return tenantId;
  }

  public void setTenantId(final String tenantId)
  {
    this.tenantId = tenantId;
  }
}
