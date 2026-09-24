/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.annotation.JsonView;
import lombok.NoArgsConstructor;
import uk.co.uworx.khoji.agile.internal.helper.TimePeriodCalculationCriteria;
import uk.co.uworx.khoji.agile.internal.model.request.Views;

@NoArgsConstructor
@JsonView(Views.StatsReleasesAPI.class)
public class ReleaseMetaData
{
  private boolean isStartDateCalculated;
  private boolean isReleaseDateCalculated;
  private TimePeriodCalculationCriteria timePeriodCalculationCriteria;


  public ReleaseMetaData(boolean isStartDateCalculated, boolean isReleaseDateCalculated, TimePeriodCalculationCriteria timePeriodCalculationCriteria)
  {
    this.isStartDateCalculated = isStartDateCalculated;
    this.isReleaseDateCalculated = isReleaseDateCalculated;
    this.timePeriodCalculationCriteria = timePeriodCalculationCriteria;
  }

  public boolean isStartDateCalculated()
  {
    return isStartDateCalculated;
  }

  public boolean isReleaseDateCalculated()
  {
    return isReleaseDateCalculated;
  }

  public TimePeriodCalculationCriteria getTimePeriodCalculationCriteria()
  {
    return timePeriodCalculationCriteria;
  }
}
