/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import uk.co.uworx.khoji.agile.internal.model.multi.tenant.TenantDetails;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.io.Serializable;

public class CustomField implements Serializable
{
  @Id
  @GeneratedValue(strategy = GenerationType.AUTO, generator = "hibernate_sequence")
  private long id;

  @Enumerated(EnumType.STRING)
  private KhojiCustomField cfKey;

  private String cfValue;
  @OneToOne
  @JoinColumn(name = "tenant_id")
  private TenantDetails tenantId;

  public long getId()
  {
    return id;
  }

  public KhojiCustomField getCfKey()
  {
    return cfKey;
  }

  public void setCfKey(final KhojiCustomField cfKey)
  {
    this.cfKey = cfKey;
  }

  public String getCfValue()
  {
    return cfValue;
  }

  public void setCfValue(final String cfValue)
  {
    this.cfValue = cfValue;
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
