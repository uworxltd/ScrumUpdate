/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

import java.util.List;

public class TimeGroup
{
  private long time;
  private double timeInDays;
  private List<String> subTaskTypes;

  public long getTime()
  {
    return time;
  }

  public void setTime(final long time)
  {
    this.time = time;
  }

  public double getTimeInDays()
  {
    return timeInDays;
  }

  public void setTimeInDays(final double timeInDays)
  {
    this.timeInDays = timeInDays;
  }

  public List<String> getSubTaskTypes()
  {
    return subTaskTypes;
  }

  public void setSubTaskTypes(final List<String> subTaskTypes)
  {
    this.subTaskTypes = subTaskTypes;
  }
}
