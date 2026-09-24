/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;

/**
 * Email Frequency enum Model
 */
public enum EmailFrequency
{
  DAILY("DAILY"), WEEKLY("WEEKLY"), MONTHLY("MONTHLY");

  @Getter
  @JsonProperty
  private String emailFrequency;

  EmailFrequency(String emailFrequency) { this.emailFrequency = emailFrequency; }
}
