/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model.multi.tenant;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import jakarta.persistence.Cacheable;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Cacheable
public class
TenantDetails
{
  @Id
  private String tenantId;
  private String domainUrl;
  private String tenantName;
  private boolean usersAdded;
  private boolean workLogCategoryAdded;
  private boolean surveyFilled;

  public TenantDetails(
          String tenantId,
          String domainUrl,
          String tenantName,
          boolean users_added,
          boolean workLogCategoryAdded,
          boolean surveyFilled
  )
  {
    this.tenantId = tenantId;
    this.domainUrl = domainUrl;
    this.tenantName = tenantName;
    this.usersAdded = users_added;
    this.workLogCategoryAdded = workLogCategoryAdded;
    this.surveyFilled = surveyFilled;
  }
}
