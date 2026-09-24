/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * User status enum
 */
public enum KhojiUserStatus
{
  PENDING("PENDING"), JOINED("JOINED"), REVOKED("REVOKED") , INCOMPLETE("INCOMPLETE");

  @JsonProperty
  private String khojiUserStatus;

  /**
   * Constructor
   *
   * @param khojiUserStatus user status
   */
  KhojiUserStatus(String khojiUserStatus)
  {
    this.khojiUserStatus = khojiUserStatus;
  }

  /**
   * @return user status
   */
  @JsonValue
  public String getKhojiUserStatus()
  {
    return khojiUserStatus;
  }
}
