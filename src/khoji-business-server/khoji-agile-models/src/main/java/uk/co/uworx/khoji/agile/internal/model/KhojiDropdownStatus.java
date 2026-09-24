/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

/**
 * KhojiDropdownStatus enum
 */
public enum KhojiDropdownStatus
{
  ACTIVE("active"),
  CLOSED("closed");

  private String khojiDropdownStatus;

  /**
   * Constructor
   *
   * @param khojiDropdownStatus khoji dropdown status
   */
  KhojiDropdownStatus(String khojiDropdownStatus)
  {
    this.khojiDropdownStatus = khojiDropdownStatus;
  }

  /**
   * @return khoji dropdown status
   */
  public String getKhojiDropdownStatus()
  {
    return khojiDropdownStatus;
  }
}
