/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

public class TimeSpent
{
  private long time;
  private TimeGroup devTime;
  private TimeGroup qaTime;
  private TimeGroup othersTime;
  private long defectTime;
  private double timeSpentWithinThreshold;
  private double timeSpentOverThreshold;
  private double timeSpentWithinOriginalEstimate;
  private double defectTimeInDays;
  private double timeInDays;

  /**
   * @return the defect time in days
   */
  public double getDefectTimeInDays()
  {
    return defectTimeInDays;
  }

  /**
   * Sets the defect time in days
   *
   * @param defectTimeInDays the defect time in days to set
   */
  public void setDefectTimeInDays(final double defectTimeInDays)
  {
    this.defectTimeInDays = defectTimeInDays;
  }

  /**
   * @return the time spent in days
   */
  public double getTimeInDays()
  {
    return timeInDays;
  }

  /**
   * Sets the time spent in days
   *
   * @param timeInDays the time spent in days to set
   */
  public void setTimeInDays(final double timeInDays)
  {
    this.timeInDays = timeInDays;
  }

  /**
   * @return the dev time
   */
  public TimeGroup getDevTime()
  {
    return devTime;
  }

  /**
   * Sets the dev time
   *
   * @param devTime the dev time to set
   */
  public void setDevTime(TimeGroup devTime)
  {
    this.devTime = devTime;
  }

  /**
   * @return the defect time
   */
  public long getDefectTime()
  {
    return defectTime;
  }

  /**
   * Sets the defect time
   *
   * @param defectTime the defect time to set
   */
  public void setDefectTime(long defectTime)
  {
    this.defectTime = defectTime;
  }

  /**
   * @return the time spent
   */
  public long getTime()
  {
    return time;
  }

  /**
   * Sets the time spent
   *
   * @param time the time spent to set
   */
  public void setTime(long time)
  {
    this.time = time;
  }

  /**
   * @return the time spent within threshold
   */
  public double getTimeSpentWithinThreshold()
  {
    return timeSpentWithinThreshold;
  }

  /**
   * Sets the time spent within threshold
   *
   * @param timeSpentWithinThreshold the time spent within threshold to set
   */
  public void setTimeSpentWithinThreshold(final double timeSpentWithinThreshold)
  {
    this.timeSpentWithinThreshold = timeSpentWithinThreshold;
  }

  /**
   * @return the time spent within original estimate
   */
  public double getTimeSpentWithinOriginalEstimate()
  {
    return timeSpentWithinOriginalEstimate;
  }

  /**
   * Sets the time spent within original estimate
   *
   * @param timeSpentWithinOriginalEstimate the the time spent within original estimate to set
   */
  public void setTimeSpentWithinOriginalEstimate(final double timeSpentWithinOriginalEstimate)
  {
    this.timeSpentWithinOriginalEstimate = timeSpentWithinOriginalEstimate;
  }

  /**
   * @return the time spent over threshold
   */
  public double getTimeSpentOverThreshold()
  {
    return timeSpentOverThreshold;
  }

  /**
   * Sets the time spent over threshold
   *
   * @param timeSpentOverThreshold the time spent over threshold to set
   */
  public void setTimeSpentOverThreshold(final double timeSpentOverThreshold)
  {
    this.timeSpentOverThreshold = timeSpentOverThreshold;
  }

  public TimeGroup getQaTime()
  {
    return qaTime;
  }

  public void setQaTime(final TimeGroup qaTime)
  {
    this.qaTime = qaTime;
  }

  public TimeGroup getOthersTime()
  {
    return othersTime;
  }

  public void setOthersTime(final TimeGroup othersTime)
  {
    this.othersTime = othersTime;
  }
}
