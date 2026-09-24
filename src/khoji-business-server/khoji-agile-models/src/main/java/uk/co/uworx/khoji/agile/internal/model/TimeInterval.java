/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

import java.time.LocalDate;

public class TimeInterval
{
  private LocalDate startDate;
  private LocalDate endDate;

  public TimeInterval(final LocalDate startDate, final LocalDate endDate)
  {
    this.startDate = startDate;
    this.endDate = endDate;
  }

  public TimeInterval()
  {
  }

  public LocalDate getStartDate()
  {
    return startDate;
  }

  public void setStartDate(final LocalDate startDate)
  {
    this.startDate = startDate;
  }

  public LocalDate getEndDate()
  {
    return endDate;
  }

  public void setEndDate(final LocalDate endDate)
  {
    this.endDate = endDate;
  }

  @Override
  public String toString()
  {
    return "TimeInterval{" +
            "startDate=" + startDate +
            ", endDate=" + endDate +
            '}';
  }
}
