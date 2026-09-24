/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.annotation.JsonView;
import uk.co.uworx.khoji.agile.internal.model.multi.tenant.TenantDetails;
import uk.co.uworx.khoji.agile.internal.model.request.Views;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.io.Serializable;

public class Project implements Serializable
{
  @Id
  @GeneratedValue(strategy = GenerationType.AUTO, generator = "hibernate_sequence")
  @JsonView(Views.Board.class)
  private long id;

  @NotBlank(message = "{project.name.notBlank}")
  @JsonView(Views.Board.class)
  private String name;

  @NotBlank(message = "{project.projectId.notBlank}")
  @Column(name = "projectid")
  @JsonView(Views.Board.class)
  String projectID;

  @NotBlank(message = "{project.key.notBlank}")
  String projectKey;

  String projectLead;

  String projectUrl;
  @OneToOne
  @JoinColumn(name = "tenant_id")
  private TenantDetails tenantId;

//  @JsonIgnoreProperties(value = "project", allowSetters = true)
//  @OneToMany(fetch = FetchType.LAZY, mappedBy = "project")
//  private List<TeamBoard> teamBoards;


  public String getProjectID()
  {
    return projectID;
  }

  public void setProjectID(String projectID)
  {
    this.projectID = projectID;
  }

  public String getName()
  {
    return name;
  }

  public void setName(String name)
  {
    this.name = name;
  }

  public void setId(final long id)
  {
    this.id = id;
  }

  public long getId()
  {
    return id;
  }

  public String getProjectKey()
  {
    return projectKey;
  }

  public void setProjectKey(final String projectKey)
  {
    this.projectKey = projectKey;
  }

  public String getProjectLead()
  {
    return projectLead;
  }

  public void setProjectLead(final String projectLead)
  {
    this.projectLead = projectLead;
  }

  public String getProjectUrl()
  {
    return projectUrl;
  }

  public void setProjectUrl(final String projectUrl)
  {
    this.projectUrl = projectUrl;
  }

//  public List<TeamBoard> getTeamBoards()
//  {
//    return teamBoards;
//  }
//
//  public void setTeamBoards(List<TeamBoard> teamBoards)
//  {
//    this.teamBoards = teamBoards;
//  }

  public TenantDetails getTenantId()
  {
    return tenantId;
  }

  public void setTenantId(TenantDetails tenantId)
  {
    this.tenantId = tenantId;
  }
}
