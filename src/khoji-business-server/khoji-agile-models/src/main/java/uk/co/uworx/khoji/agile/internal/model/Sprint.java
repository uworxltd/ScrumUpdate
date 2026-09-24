/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateDeserializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateSerializer;

import java.time.LocalDate;

public class Sprint
{
  private String id;
  private String name;
  private String status;
  private String sprintLink;

  @JsonDeserialize(using = LocalDateDeserializer.class)
  @JsonSerialize(using = LocalDateSerializer.class)
  private LocalDate startDate;

  @JsonDeserialize(using = LocalDateDeserializer.class)
  @JsonSerialize(using = LocalDateSerializer.class)
  private LocalDate endDate;

  @JsonDeserialize(using = LocalDateDeserializer.class)
  @JsonSerialize(using = LocalDateSerializer.class)
  private LocalDate completionDate;
  private String originBoardId;

  private String teamBoardID;

  private CacheModel cacheModel;

  /**
   * default constructor
   */
  public Sprint()
  {

  }

  /**
   * copy constructor
   *
   * @param sprint the sprint to set
   */
  public Sprint(final Sprint sprint)
  {
    this.id = sprint.id;
    this.name = sprint.name;
    this.status = sprint.status;
    this.sprintLink = sprint.sprintLink;
    this.startDate = sprint.startDate;
    this.endDate = sprint.endDate;
    this.completionDate = sprint.completionDate;
    this.originBoardId = sprint.originBoardId;
    this.teamBoardID = sprint.teamBoardID;
  }

  public String getId()
  {
    return id;
  }

  public void setId(final String id)
  {
    this.id = id;
  }

  public String getName()
  {
    return name;
  }

  public void setName(final String name)
  {
    this.name = name;
  }

  public String getStatus()
  {
    return status;
  }

  public void setStatus(final String status)
  {
    this.status = status;
  }

  public String getSprintLink()
  {
    return sprintLink;
  }

  public void setSprintLink(final String sprintLink)
  {
    this.sprintLink = sprintLink;
  }

  public LocalDate getStartDate()
  {
    return startDate;
  }

  public void setStartDate(final LocalDate startDate)
  {
    this.startDate = startDate;
  }

  public LocalDate getEndDate()
  {
    return endDate;
  }

  public void setEndDate(final LocalDate endDate)
  {
    this.endDate = endDate;
  }

  public LocalDate getCompletionDate()
  {
    return completionDate;
  }

  public void setCompletionDate(final LocalDate completionDate)
  {
    this.completionDate = completionDate;
  }

  public String getOriginBoardId()
  {
    return originBoardId;
  }

  public void setOriginBoardId(final String originBoardId)
  {
    this.originBoardId = originBoardId;
  }

  public String getTeamBoardID() {
    return teamBoardID;
  }

  public void setTeamBoardID(String teamBoardID) {
    this.teamBoardID = teamBoardID;
  }

  public CacheModel getCacheModel() { return cacheModel; }

  public void setCacheModel(CacheModel cacheModel) { this.cacheModel = cacheModel; }

  @Override
  public boolean equals(Object o)
  {
    if (this == o)
    {
      return true;
    }
    if (o == null || getClass() != o.getClass())
    {
      return false;
    }

    Sprint sprint = (Sprint) o;

    return getId() != null ? getId().equals(sprint.getId()) : sprint.getId() == null;
  }

  @Override
  public int hashCode()
  {
    return getId() != null ? getId().hashCode() : 0;
  }
}
