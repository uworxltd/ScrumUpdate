/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class InstanceUserDetails
{
  private boolean calendarIntegration;
  private boolean calendarTokenValid;
  private String accountId;
  private String name;
  private String timeZone;
  private Map<String, Object> userPreferences;
}
