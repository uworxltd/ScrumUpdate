/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

public class FilterSprint extends Sprint
{
  private boolean outOfRequestedDateRange;

  /**
   * Constructor
   *
   * @param sprint           the sprint
   * @param isOutOfDateRange if the sprint is out of date range
   */
  public FilterSprint(Sprint sprint, boolean isOutOfDateRange)
  {
    super(sprint);
    this.outOfRequestedDateRange = isOutOfDateRange;
  }

  /**
   * @return if sprint is out of date range
   */
  public boolean isOutOfRequestedDateRange()
  {
    return outOfRequestedDateRange;
  }
}
