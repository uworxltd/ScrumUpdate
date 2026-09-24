/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * CustomField enum
 */
public enum KhojiCustomField
{
  TEAM_BOARD("KhojiTeamBoard"),
  EPIC_ID("KhojiEpicId"),
  STORY_POINTS("KhojiStoryPoints"),
  SPRINT_LIST("KhojiSprintList"),
  HIGH_LEVEL_ESTIMATE("KhojiHighLevelEstimate");

  @JsonProperty
  private String khojiCustomField;

  /**
   * Constructor
   *
   * @param khojiCustomField khoji custom field
   */
  KhojiCustomField(String khojiCustomField)
  {
    this.khojiCustomField = khojiCustomField;
  }

  /**
   * @return khoji custom field
   */
  @JsonValue
  public String getKhojiCustomField()
  {
    return khojiCustomField;
  }
}
