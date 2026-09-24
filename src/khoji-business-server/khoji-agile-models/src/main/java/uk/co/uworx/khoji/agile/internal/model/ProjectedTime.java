/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

/**
 * Model to hold the projected time
 */
public class ProjectedTime
{
  private double timeSpentWithinThreshold;
  private double timeRemainingWithinOriginalEstimate;
  private double timeSpentWithinOriginalEstimate;
  private double timeRemainingWithinThreshold;
  private double timeSpentOverThreshold;
  private double timeRemainingOverThreshold;
  private double unallocatedTimeRemainingWithinEstimate;
  /**
   * @return the unallocated time remaining withing estimate
   */
  public double getUnallocatedTimeRemainingWithinEstimate() {
    return unallocatedTimeRemainingWithinEstimate;
  }

  /**
   * Sets the unallocated time remaining within estimate
   * @param unallocatedTimeRemainingWithinEstimate
   */
  public void setUnallocatedTimeRemainingWithinEstimate(double unallocatedTimeRemainingWithinEstimate) {
    this.unallocatedTimeRemainingWithinEstimate = unallocatedTimeRemainingWithinEstimate;
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
   * @param timeSpentWithinThreshold the time spent
   */
  public void setTimeSpentWithinThreshold(final double timeSpentWithinThreshold)
  {
    this.timeSpentWithinThreshold = timeSpentWithinThreshold;
  }

  /**
   * @return the timeSpentWithinOriginalEstimate
   */
  public double getTimeSpentWithinOriginalEstimate()
  {
    return timeSpentWithinOriginalEstimate;
  }

  /**
   * Sets the time spent within original estimate
   *
   * @param timeSpentWithinOriginalEstimate the time spent
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
   * @param timeSpentOverThreshold the time
   */
  public void setTimeSpentOverThreshold(final double timeSpentOverThreshold)
  {
    this.timeSpentOverThreshold = timeSpentOverThreshold;
  }

  /**
   * @return the time remaining within original estimate
   */
  public double getTimeRemainingWithinOriginalEstimate()
  {
    return timeRemainingWithinOriginalEstimate;
  }

  /**
   * Sets the time Remaining within original estimate
   *
   * @param timeRemainingWithinOriginalEstimate the time remaining within original estimate
   */
  public void setTimeRemainingWithinOriginalEstimate(final double timeRemainingWithinOriginalEstimate)
  {
    this.timeRemainingWithinOriginalEstimate = timeRemainingWithinOriginalEstimate;
  }

  /**
   * @return the time remaining within threshold
   */
  public double getTimeRemainingWithinThreshold()
  {
    return timeRemainingWithinThreshold;
  }

  /**
   * Sets the time remaining within threshold
   *
   * @param timeRemainingWithinThreshold the time remaining within threshold
   */
  public void setTimeRemainingWithinThreshold(final double timeRemainingWithinThreshold)
  {
    this.timeRemainingWithinThreshold = timeRemainingWithinThreshold;
  }

  /**
   * @return the time remaining over threshold
   */
  public double getTimeRemainingOverThreshold()
  {
    return timeRemainingOverThreshold;
  }

  /**
   * Sets the time remaining over threshold
   *
   * @param timeRemainingOverThreshold the time remaining over threshold
   */
  public void setTimeRemainingOverThreshold(final double timeRemainingOverThreshold)
  {
    this.timeRemainingOverThreshold = timeRemainingOverThreshold;
  }
}
