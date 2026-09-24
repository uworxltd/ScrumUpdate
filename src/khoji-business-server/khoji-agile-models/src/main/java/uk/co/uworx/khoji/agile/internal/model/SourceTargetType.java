/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Enum to define all possible options for source and target
 */

public enum SourceTargetType
{
  JIRA("Jira"), NONE("None");

  @JsonProperty
  private String sourceType;

  /**
   * Constructor
   *
   * @param sourceType the source or Target Type
   */
  SourceTargetType(String sourceType)
  {
    this.sourceType = sourceType;
  }

  /**
   * @return the sourceType
   */
  @JsonValue
  public String getValue()
  {
    return sourceType;
  }
}
