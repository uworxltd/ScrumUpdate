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
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;



@Cacheable
public class Location
{
  @Id
  @GeneratedValue(strategy = GenerationType.AUTO, generator = "hibernate_sequence")
  @JsonView({Views.UserSummary.class, Views.Team.class})
  private Long locnId;

  @Column(name = "locn_name")
  @NotBlank(message = "{location.name.notBlank}",groups = OnLocationValidation.class)
  @JsonView({Views.UserSummary.class, Views.Team.class})
  private String locnName;

  @Column(name = "locn_address_line1")
  @NotBlank(message = "{location.address.notBlank}",groups = OnLocationValidation.class)
  private String locnAddressLine1;
  private String locnAddressLine2;

  @Column(name = "locn_city")
  @NotBlank(message = "{location.city.notBlank}",groups = OnLocationValidation.class)
  private String locnCity;
  private String locnState;
  private String locnPostalCode;

  @Column(name = "locn_country")
  @NotBlank(message = "{location.country.notBlank}",groups = OnLocationValidation.class)
  private String locnCountry;

  private String locnContactPersonName;

  @Email(message = "{member.email.validFormat}",groups = OnLocationValidation.class)
  private String locnContactPersonEmail;

  @Pattern(regexp="^[0-9+]+$",message="{workPhoneNumber.validFormat}",groups = OnLocationValidation.class)
  private String locnContactPersonWorkPhone;

  @Pattern(regexp="^[0-9+]+$",message="{mobilePhoneNumber.validFormat}",groups = OnLocationValidation.class)
  private String locnContactPersonMobilePhone;

  @JsonIgnoreProperties(value= "locations", allowSetters = true)
  @ManyToOne
  @JoinColumn(name="orgId", nullable=false)
  @JsonView({Views.UserSummary.class, Views.Team.class})
  private Organization organization;

  public String getLocnName()
  {
    return locnName;
  }

  public void setLocnName(String locnName)
  {
    this.locnName = locnName;
  }

  public Long getLocnId()
  {
    return locnId;
  }

  public void setLocnId(Long locnId)
  {
    this.locnId = locnId;
  }

  public String getLocnAddressLine1()
  {
    return locnAddressLine1;
  }

  public void setLocnAddressLine1(String locnAddressLine1)
  {
    this.locnAddressLine1 = locnAddressLine1;
  }

  public String getLocnAddressLine2()
  {
    return locnAddressLine2;
  }

  public void setLocnAddressLine2(String locnAddressLine2)
  {
    this.locnAddressLine2 = locnAddressLine2;
  }

  public String getLocnCity()
  {
    return locnCity;
  }

  public void setLocnCity(String locnCity)
  {
    this.locnCity = locnCity;
  }

  public String getLocnState()
  {
    return locnState;
  }

  public void setLocnState(String locnState)
  {
    this.locnState = locnState;
  }

  public String getLocnPostalCode()
  {
    return locnPostalCode;
  }

  public void setLocnPostalCode(String locnPostalCode)
  {
    this.locnPostalCode = locnPostalCode;
  }

  public String getLocnCountry()
  {
    return locnCountry;
  }

  public void setLocnCountry(String locnCountry)
  {
    this.locnCountry = locnCountry;
  }

  public String getLocnContactPersonName()
  {
    return locnContactPersonName;
  }

  public void setLocnContactPersonName(String locnContactPersonName)
  {
    this.locnContactPersonName = locnContactPersonName;
  }

  public String getLocnContactPersonEmail()
  {
    return locnContactPersonEmail;
  }

  public void setLocnContactPersonEmail(String locnContactPersonEmail)
  {
    this.locnContactPersonEmail = locnContactPersonEmail;
  }

  public String getLocnContactPersonWorkPhone()
  {
    return locnContactPersonWorkPhone;
  }

  public void setLocnContactPersonWorkPhone(String locnContactPersonWorkPhone)
  {
    this.locnContactPersonWorkPhone = locnContactPersonWorkPhone;
  }

  public String getLocnContactPersonMobilePhone()
  {
    return locnContactPersonMobilePhone;
  }

  public void setLocnContactPersonMobilePhone(String locnContactPersonMobilePhone)
  {
    this.locnContactPersonMobilePhone = locnContactPersonMobilePhone;
  }

  public Organization getOrganization()
  {
    return organization;
  }

  public void setOrganization(Organization organization)
  {
    this.organization = organization;
  }
}
