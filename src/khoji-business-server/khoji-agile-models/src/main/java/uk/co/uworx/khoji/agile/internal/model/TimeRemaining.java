/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

public class TimeRemaining
{
  private long time;
  private long devTime;
  private long qaTime;
  private long othersTime;
  private double timeInDays;
  private double devTimeInDays;
  private double qaTimeInDays;
  private double othersTimeInDays;

  /**
   * @return the time remaining
   */
  public long getTime()
  {
    return time;
  }

  /**
   * Sets the time remaining
   *
   * @param time the time remaining to set
   */
  public void setTime(long time)
  {
    this.time = time;
  }

  /**
   * @return the timeInDays
   */
  public double getTimeInDays()
  {
    return timeInDays;
  }

  /**
   * Sets the timeInDays
   *
   * @param timeInDays the timeRemainingInDays to set
   */
  public void setTimeInDays(final double timeInDays)
  {
    this.timeInDays = timeInDays;
  }

  public long getDevTime()
  {
    return devTime;
  }

  public void setDevTime(final long devTime)
  {
    this.devTime = devTime;
  }

  public long getQaTime()
  {
    return qaTime;
  }

  public void setQaTime(final long qaTime)
  {
    this.qaTime = qaTime;
  }

  public double getDevTimeInDays()
  {
    return devTimeInDays;
  }

  public void setDevTimeInDays(final double devTimeInDays)
  {
    this.devTimeInDays = devTimeInDays;
  }

  public double getQaTimeInDays()
  {
    return qaTimeInDays;
  }

  public void setQaTimeInDays(final double qaTimeInDays)
  {
    this.qaTimeInDays = qaTimeInDays;
  }

  public long getOthersTime()
  {
    return othersTime;
  }

  public void setOthersTime(final long othersTime)
  {
    this.othersTime = othersTime;
  }

  public double getOthersTimeInDays()
  {
    return othersTimeInDays;
  }

  public void setOthersTimeInDays(final double othersTimeInDays)
  {
    this.othersTimeInDays = othersTimeInDays;
  }
}
