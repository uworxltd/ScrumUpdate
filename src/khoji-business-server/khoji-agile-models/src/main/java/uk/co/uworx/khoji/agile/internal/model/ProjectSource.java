/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import uk.co.uworx.khoji.agile.internal.model.multi.tenant.TenantDetails;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class ProjectSource
{
  @Id
  @GeneratedValue(strategy = GenerationType.AUTO, generator = "hibernate_sequence")
  private Long id;
  private String name;
  @JsonFormat(pattern = "dd-MM-yyyy HH:mm:ss.SSS")
  private LocalDateTime updateDate;
  @JsonInclude
  @Transient
  private SourceSystem sourceSystem;
  @JsonInclude
  @Transient
  private List<Project> projects;
  @JsonInclude
  @Transient
  private List<TeamBoard> teamBoards;
  @JsonInclude
  @Transient
  private List<ProjectSourceUser> users;
  @JsonInclude(JsonInclude.Include.NON_NULL)
  @Transient
  private Map<KhojiCustomField, String> customFields;
  @JsonInclude(JsonInclude.Include.NON_NULL)
  @Transient
  private Map<Integer, Integer> issueCategoryMap;
  @JsonInclude
  @Transient
  private Map<String, List<String>> sprintCategoryMap;
  @JsonInclude
  @Transient
  private Map<String, List<String>> releaseCategoryMap;
  @OneToOne
  @JoinColumn(name = "tenant_id")
  private TenantDetails tenantId;

  public SourceSystem getSourceSystem()
  {
    return sourceSystem;
  }

  public void setSourceSystem(final SourceSystem sourceSystem)
  {
    this.sourceSystem = sourceSystem;
  }

  public List<Project> getProjects()
  {
    return projects;
  }

  public void setProjects(final List<Project> projects)
  {
    this.projects = projects;
  }

  public List<TeamBoard> getTeamBoards()
  {
    return teamBoards;
  }

  public void setTeamBoards(final List<TeamBoard> teamBoards)
  {
    this.teamBoards = teamBoards;
  }

  public List<ProjectSourceUser> getUsers()
  {
    return users;
  }

  public void setUsers(final List<ProjectSourceUser> users)
  {
    this.users = users;
  }

  public Map<KhojiCustomField, String> getCustomFields()
  {
    return customFields;
  }

  public void setCustomFields(final Map<KhojiCustomField, String> customFields)
  {
    this.customFields = customFields;
  }

  public String getName()
  {
    return name;
  }

  public void setName(final String name)
  {
    this.name = name;
  }

  public Long getId()
  {
    return id;
  }

  public void setId(final Long id)
  {
    this.id = id;
  }

  public LocalDateTime getUpdateDate()
  {
    return updateDate;
  }

  public void setUpdateDate(final LocalDateTime updateDate)
  {
    this.updateDate = updateDate;
  }

  public Map<String, List<String>> getSprintCategoryMap()
  {
    return sprintCategoryMap;
  }

  public void setSprintCategoryMap(final Map<String, List<String>> sprintCategoryMap)
  {
    this.sprintCategoryMap = sprintCategoryMap;
  }

  public Map<Integer, Integer> getIssueCategoryMap()
  {
    return issueCategoryMap;
  }

  public void setIssueCategoryMap(Map<Integer, Integer> issueCategoryMap)
  {
    this.issueCategoryMap = issueCategoryMap;
  }

  public Map<String, List<String>> getReleaseCategoryMap()
  {
    return releaseCategoryMap;
  }

  public void setReleaseCategoryMap(final Map<String, List<String>> releaseCategoryMap)
  {
    this.releaseCategoryMap = releaseCategoryMap;
  }

  public TenantDetails getTenantId()
  {
    return tenantId;
  }

  public void setTenantId(TenantDetails tenantId)
  {
    this.tenantId = tenantId;
  }
}
