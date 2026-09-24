/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import uk.co.uworx.khoji.agile.internal.model.TeamWorkLog;
import uk.co.uworx.khoji.agile.internal.model.WorkLogCategory;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class WorkLogResponse
{
  private double summary;
  private List<TeamWorkLog> workAudit;
  private String dateTo;
  private String dateFrom;
  private Map<String, Double> thresholdPercentage;
  private Map<String, String> thresholdColors;
  private List<WorkLogCategory> mainCategoryCols;
  private Set<String> otherCategoryCols;
  private double totalAvailableDays;
  private int memberCount;

}
