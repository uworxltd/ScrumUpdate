/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.annotation.JsonView;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import uk.co.uworx.khoji.agile.internal.model.request.Views;

/**
 * Basic cache model that is required to display necessary information
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonView(Views.StatsReleasesAPI.class)
public class CacheModel
{
  private boolean cached;
  private String cacheDate;
  private int cacheInterval;
}
