/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.datamodel;

public class ReleaseDataModel
{
  private String id;
  private boolean released;
  private boolean archived;
  private boolean overdue;
  private String releaseDate;
  private String name;
  private String description;
  private String startDate;
  private String url;
  private String projectKey;
  private String status;

  public ReleaseDataModel(String id, boolean archived, String releaseDate, String name,
                          String description, boolean released, String startDate, String url, String projectKey, String status, boolean overdue)
  {
    this.id = id;
    this.archived = archived;
    this.releaseDate = releaseDate;
    this.name = name;
    this.description = description;
    this.released = released;
    this.startDate = startDate;
    this.url = url;
    this.projectKey = projectKey;
    this.status = status;
    this.overdue = overdue;
  }

  public ReleaseDataModel()
  {
    super();
  }

  public String getProjectKey()
  {
    return projectKey;
  }

  public void setProjectKey(String projectKey)
  {
    this.projectKey = projectKey;
  }

  public String getId()
  {
    return id;
  }

  public void setId(String id)
  {
    this.id = id;
  }

  public boolean isArchived()
  {
    return archived;
  }

  public void setArchived(boolean archived)
  {
    this.archived = archived;
  }

  public String getReleaseDate()
  {
    return releaseDate;
  }

  public void setReleaseDate(String releaseDate)
  {
    this.releaseDate = releaseDate;
  }

  public String getName()
  {
    return name;
  }

  public void setName(String name)
  {
    this.name = name;
  }

  public String getDescription()
  {
    return description;
  }

  public void setDescription(String description)
  {
    this.description = description;
  }

  public boolean isReleased()
  {
    return released;
  }

  public void setReleased(boolean released)
  {
    this.released = released;
  }

  public String getStartDate()
  {
    return startDate;
  }

  public void setStartDate(String startDate)
  {
    this.startDate = startDate;
  }

  public String getUrl()
  {
    return url;
  }

  public void setUrl(String url)
  {
    this.url = url;
  }

  public String getStatus()
  {
    return status;
  }

  public void setStatus(String status)
  {
    this.status = status;
  }

  public boolean isOverdue()
  {
    return overdue;
  }

  public void setOverdue(boolean overdue)
  {
    this.overdue = overdue;
  }

  @Override
  public String toString()
  {
    return "ReleaseDataModel{" +
            "id='" + id + '\'' +
            ", released=" + released +
            ", archived=" + archived +
            ", releaseDate='" + releaseDate + '\'' +
            ", name='" + name + '\'' +
            ", description='" + description + '\'' +
            ", startDate='" + startDate + '\'' +
            ", url='" + url + '\'' +
            ", projectKey='" + projectKey + '\'' +
            ", status='" + status + '\'' +
            ", overdue='" + overdue + '\'' +
            '}';
  }


}
