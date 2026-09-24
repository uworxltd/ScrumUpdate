/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Objects;

/**
 * Release model
 */
public class Release
{
  public static final String DD_MM_YYYY = "dd/MM/yyyy";
  private String id;
  private String name;
  private boolean released;
  private String displayName;
  private String projectKey;
  private String description;
  private String startDate;
  private String releaseDate;
  private String url;
  private String status;
  private boolean overdue;
  private ReleaseMetaData releaseMetaData;
  @JsonIgnore
  private String self;
  @JsonIgnore
  private String archived;
  private CacheModel cacheModel;

  public CacheModel getCacheModel()
  {
    return cacheModel;
  }

  public void setCacheModel(CacheModel cacheModel)
  {
    this.cacheModel = cacheModel;
  }
  
  public String getUrl()
  {
    return url;
  }

  public void setUrl(String url)
  {
    this.url = url;
  }

  /**
   * @return the id
   */
  public String getId()
  {
    return id;
  }

  /**
   * Sets the id
   *
   * @param id the id to set
   */
  public void setId(final String id)
  {
    this.id = id;
  }

  /**
   * @return the name
   */
  public String getName()
  {
    return name;
  }

  /**
   * Sets the name
   *
   * @param name the name
   */
  public void setName(final String name)
  {
    this.name = name;
  }

  /**
   * @return the released
   */
  public boolean isReleased()
  {
    return released;
  }

  /**
   * Sets the released check
   *
   * @param released the check to set
   */
  public void setReleased(final boolean released)
  {
    this.released = released;
  }

  /**
   * @return the description
   */
  public String getDescription()
  {
    return description;
  }

  /**
   * Sets the description
   *
   * @param description the description to set
   */
  public void setDescription(final String description)
  {
    this.description = description;
  }

  /**
   * @return the start date
   */
  public String getStartDate()
  {
    return startDate;
  }

  /**
   * Sets the start date
   *
   * @param startDate the start date to set
   */
  public void setStartDate(final String startDate)
  {
    this.startDate = startDate;
  }

  /**
   * @return the release date
   */
  public String getReleaseDate()
  {
    return releaseDate;
  }

  /**
   * @return the formatted release date in DD_MM_YYYY
   */
  @JsonIgnore
  public LocalDate getFormattedReleaseDate()
  {
    return LocalDate.parse(releaseDate, DateTimeFormatter.ofPattern(DD_MM_YYYY));
  }

  /**
   * Sets the release date
   *
   * @param releaseDate the release date to set
   */
  public void setReleaseDate(final String releaseDate)
  {
    this.releaseDate = releaseDate;
  }

  public void setDisplayName(final String displayName)
  {
    this.displayName = displayName;
  }

  public void setProjectKey(final String projectKey)
  {
    this.projectKey = projectKey;
  }

  public String getDisplayName()
  {
    return displayName;
  }

  public String getProjectKey()
  {
    return projectKey;
  }

  public String getSelf()
  {
    return self;
  }

  public void setSelf(final String self)
  {
    this.self = self;
  }

  public String getArchived()
  {
    return archived;
  }

  public void setArchived(final String archived)
  {
    this.archived = archived;
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

  /**
   * @return release as string
   */
  @Override
  public String toString()
  {
    return "Release{" +
            "id='" + id + '\'' +
            ", name='" + name + '\'' +
            ", released=" + released +
            ", displayName='" + displayName + '\'' +
            ", projectKey='" + projectKey + '\'' +
            ", description='" + description + '\'' +
            ", startDate='" + startDate + '\'' +
            ", releaseDate='" + releaseDate + '\'' +
            ", status='" + status + '\'' +
            ", overdue='" + overdue + '\'' +
            '}';
  }

  @Override
  public boolean equals(final Object o)
  {
    if (this == o)
    {
      return true;
    }
    if (o == null || getClass() != o.getClass())
    {
      return false;
    }
    final Release release = (Release) o;
    return released == release.released &&
            Objects.equals(id, release.id) &&
            Objects.equals(name, release.name) &&
            Objects.equals(displayName, release.displayName) &&
            Objects.equals(projectKey, release.projectKey) &&
            Objects.equals(description, release.description) &&
            Objects.equals(startDate, release.startDate) &&
            Objects.equals(releaseDate, release.releaseDate) &&
            Objects.equals(status, release.status) &&
            Objects.equals(overdue, release.overdue);
  }

  @Override
  public int hashCode()
  {
    return Objects.hash(id, name, released, displayName, projectKey, description, startDate, releaseDate, status, overdue);
  }

  public ReleaseMetaData getReleaseMetaData()
  {
    return releaseMetaData;
  }

  public void setReleaseMetaData(ReleaseMetaData releaseMetaData)
  {
    this.releaseMetaData = releaseMetaData;
  }
}
