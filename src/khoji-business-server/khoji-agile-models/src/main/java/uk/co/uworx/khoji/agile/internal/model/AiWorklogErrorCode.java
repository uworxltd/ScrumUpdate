/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;

public enum AiWorklogErrorCode
{
  ND001("No activity found on Jira"),
  ND002("No work log generated from AI"),
  ND003("Error from Jira"),
  ND004("Error from calendar token/permission"),
  ND005("Error from calendar"),
  ND006("No data from Jira and calendar"),
  ND007("No activity found on calendar");

  @Getter
  @JsonProperty
  private String errorCode;

  AiWorklogErrorCode(String errorCode)
  {
    this.errorCode = errorCode;
  }
}
