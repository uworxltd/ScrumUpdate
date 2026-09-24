/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.datamodel;

public class SprintDataModel
{
  private String id;
  private String name;
  private String originBoardId;
  private String startDate;
  private String endDate;
  private String completionDate;
  private String sprintLink;
  private String status;
  private String teamBoardID;

  public SprintDataModel()
  {

  }

  public SprintDataModel(String id, String name, String originBoardId, String startDate, String endDate, String completionDate, String sprintLink, String status, String teamBoardID)
  {
    this.id = id;
    this.name = name;
    this.originBoardId = originBoardId;
    this.startDate = startDate;
    this.endDate = endDate;
    this.completionDate = completionDate;
    this.sprintLink = sprintLink;
    this.status = status;
    this.teamBoardID = teamBoardID;
  }

  public String getId()
  {
    return id;
  }

  public void setId(String id)
  {
    this.id = id;
  }

  public String getName()
  {
    return name;
  }

  public void setName(String name)
  {
    this.name = name;
  }

  public String getOriginBoardId()
  {
    return originBoardId;
  }

  public void setOriginBoardId(String originBoardId)
  {
    this.originBoardId = originBoardId;
  }

  public String getStartDate()
  {
    return startDate;
  }

  public void setStartDate(String startDate)
  {
    this.startDate = startDate;
  }

  public String getEndDate()
  {
    return endDate;
  }

  public void setEndDate(String endDate)
  {
    this.endDate = endDate;
  }

  public String getCompletionDate()
  {
    return completionDate;
  }

  public void setCompletionDate(String completionDate)
  {
    this.completionDate = completionDate;
  }

  public String getSprintLink()
  {
    return sprintLink;
  }

  public void setSprintLink(String sprintLink)
  {
    this.sprintLink = sprintLink;
  }

  public String getStatus()
  {
    return status;
  }

  public void setStatus(String status)
  {
    this.status = status;
  }

  public String getTeamBoardID() {
    return teamBoardID;
  }

  public void setTeamBoardID(String teamBoardID) {
    this.teamBoardID = teamBoardID;
  }

  @Override
  public String toString() {
    return "SprintDataModel{" +
            "id='" + id + '\'' +
            ", name='" + name + '\'' +
            ", originBoardId='" + originBoardId + '\'' +
            ", startDate='" + startDate + '\'' +
            ", endDate='" + endDate + '\'' +
            ", completionDate='" + completionDate + '\'' +
            ", sprintLink='" + sprintLink + '\'' +
            ", status='" + status + '\'' +
            ", teamBoardID='" + teamBoardID + '\'' +
            '}';
  }
}
