/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonView;
import uk.co.uworx.khoji.agile.internal.model.request.Views;

import jakarta.persistence.Cacheable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.io.Serializable;
import java.util.List;

@Cacheable
public class Organization implements Serializable
{
  @Id
  @GeneratedValue(strategy = GenerationType.AUTO, generator = "hibernate_sequence")
  @JsonView(Views.UserSummary.class)
  private Long orgId;

  @Column(name = "org_code")
  @NotBlank(message = "{organization.code.notBlank}",groups = OnOrganizationValidation.class)
  @JsonView({Views.UserSummary.class, Views.Team.class})
  private String orgCode;

  @Column(name = "org_name")
  @NotBlank(message = "{organization.name.notBlank}",groups = OnOrganizationValidation.class)
  @JsonView({Views.UserSummary.class, Views.Team.class})
  private String orgName;

  private String orgContactPersonName;

  @Email(message = "{member.email.validFormat}",groups = OnOrganizationValidation.class)
  private String orgContactPersonEmail;

  @Pattern(regexp="^[0-9+]+$",message="{workPhoneNumber.validFormat}",groups = OnOrganizationValidation.class)
  private String orgContactPersonWorkPhone;

  @Pattern(regexp="^[0-9+]+$",message="{mobilePhoneNumber.validFormat}",groups = OnOrganizationValidation.class)
  private String orgContactPersonMobilePhone;

  @JsonIgnoreProperties(value = "organization", allowSetters = true)
  @OneToMany(fetch = FetchType.LAZY, mappedBy = "organization")
  @Valid
  private List<Location> locations;

  public Long getOrgId()
  {
    return orgId;
  }

  public void setOrgId(Long orgId)
  {
    this.orgId = orgId;
  }

  public String getOrgCode()
  {
    return orgCode;
  }

  public void setOrgCode(String orgCode)
  {
    this.orgCode = orgCode;
  }

  public String getOrgName()
  {
    return orgName;
  }

  public void setOrgName(String orgName)
  {
    this.orgName = orgName;
  }

  public String getOrgContactPersonName()
  {
    return orgContactPersonName;
  }

  public void setOrgContactPersonName(String orgContactPersonName)
  {
    this.orgContactPersonName = orgContactPersonName;
  }

  public String getOrgContactPersonEmail()
  {
    return orgContactPersonEmail;
  }

  public void setOrgContactPersonEmail(String orgContactPersonEmail)
  {
    this.orgContactPersonEmail = orgContactPersonEmail;
  }

  public String getOrgContactPersonWorkPhone()
  {
    return orgContactPersonWorkPhone;
  }

  public void setOrgContactPersonWorkPhone(String orgContactPersonWorkPhone)
  {
    this.orgContactPersonWorkPhone = orgContactPersonWorkPhone;
  }

  public String getOrgContactPersonMobilePhone()
  {
    return orgContactPersonMobilePhone;
  }

  public void setOrgContactPersonMobilePhone(String orgContactPersonMobilePhone)
  {
    this.orgContactPersonMobilePhone = orgContactPersonMobilePhone;
  }

  public List<Location> getLocations()
  {
    return locations;
  }

  public void setLocations(List<Location> locations)
  {
    this.locations = locations;
  }
}
