/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
public class SourceSystem implements Serializable
{
  @Id
  @GeneratedValue(strategy = GenerationType.AUTO, generator = "hibernate_sequence")
  private Long id;
  private String sourceUrl;
  private String sourceUser;

  public SourceSystem(String sourceUrl, String sourceUser, String apiToken)
  {
    this.sourceUrl = sourceUrl;
    this.sourceUser = sourceUser;
    this.apiToken = apiToken;
    this.sourceTimeZone = "sourceTimeZone";
    this.sourceType = SourceTargetType.JIRA;
  }
  private String apiToken;
  private String sourceTimeZone;
  @Enumerated(EnumType.STRING)
  private SourceTargetType sourceType;
}
