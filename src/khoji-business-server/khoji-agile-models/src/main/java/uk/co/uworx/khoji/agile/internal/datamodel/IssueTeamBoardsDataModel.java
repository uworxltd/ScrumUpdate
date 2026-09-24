/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.datamodel;

public class IssueTeamBoardsDataModel
{
  private String sourceKey;
  private String issueKey;
  private String teamBoardId;

  public IssueTeamBoardsDataModel(){}

  public IssueTeamBoardsDataModel(String sourceKey, String issueKey, String teamBoardId)
  {
    this.sourceKey = sourceKey;
    this.issueKey = issueKey;
    this.teamBoardId = teamBoardId;
  }

  public String getSourceKey()
  {
    return sourceKey;
  }

  public void setSourceKey(String sourceKey)
  {
    this.sourceKey = sourceKey;
  }

  public String getIssueKey()
  {
    return issueKey;
  }

  public void setIssueKey(String issueKey)
  {
    this.issueKey = issueKey;
  }

  public String getTeamBoardId()
  {
    return teamBoardId;
  }

  public void setTeamBoardId(String teamBoardId)
  {
    this.teamBoardId = teamBoardId;
  }

  @Override
  public String toString() {
    return "IssueTeamBoardsDataModel{" +
            "sourceKey='" + sourceKey + '\'' +
            ", issueKey='" + issueKey + '\'' +
            ", teamBoardId='" + teamBoardId + '\'' +
            '}';
  }
}
