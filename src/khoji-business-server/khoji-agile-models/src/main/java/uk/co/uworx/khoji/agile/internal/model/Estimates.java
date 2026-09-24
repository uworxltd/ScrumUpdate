/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

public class Estimates
{
  private long originalEstimates;
  private long devOriginalEstimates;
  private long qaOriginalEstimates;
  private long othersOriginalEstimates;
  private double originalEstimateInDays;
  private double devOriginalEstimateInDays;
  private double qaOriginalEstimateInDays;
  private double othersOriginalEstimateInDays;
  private double highLevelEstimate;

  /**
   * @return the original estimate in days
   */
  public double getOriginalEstimateInDays()
  {
    return originalEstimateInDays;
  }

  /**
   * Sets the original estimate in days
   *
   * @param originalEstimateInDays the original estimate in days to set
   */
  public void setOriginalEstimateInDays(final double originalEstimateInDays)
  {
    this.originalEstimateInDays = originalEstimateInDays;
  }

  /**
   * @return the original estimate
   */
  public long getOriginalEstimates()
  {
    return originalEstimates;
  }

  /**
   * Sets the original estimate
   *
   * @param originalEstimates the original estimate to set
   */
  public void setOriginalEstimates(long originalEstimates)
  {
    this.originalEstimates = originalEstimates;
  }

  public long getDevOriginalEstimates()
  {
    return devOriginalEstimates;
  }

  public void setDevOriginalEstimates(final long devOriginalEstimates)
  {
    this.devOriginalEstimates = devOriginalEstimates;
  }

  public long getQaOriginalEstimates()
  {
    return qaOriginalEstimates;
  }

  public void setQaOriginalEstimates(final long qaOriginalEstimates)
  {
    this.qaOriginalEstimates = qaOriginalEstimates;
  }

  public double getDevOriginalEstimateInDays()
  {
    return devOriginalEstimateInDays;
  }

  public void setDevOriginalEstimateInDays(final double devOriginalEstimateInDays)
  {
    this.devOriginalEstimateInDays = devOriginalEstimateInDays;
  }

  public double getQaOriginalEstimateInDays()
  {
    return qaOriginalEstimateInDays;
  }

  public void setQaOriginalEstimateInDays(final double qaOriginalEstimateInDays)
  {
    this.qaOriginalEstimateInDays = qaOriginalEstimateInDays;
  }

  public long getOthersOriginalEstimates()
  {
    return othersOriginalEstimates;
  }

  public void setOthersOriginalEstimates(final long othersOriginalEstimates)
  {
    this.othersOriginalEstimates = othersOriginalEstimates;
  }

  public double getOthersOriginalEstimateInDays()
  {
    return othersOriginalEstimateInDays;
  }

  public void setOthersOriginalEstimateInDays(final double othersOriginalEstimateInDays)
  {
    this.othersOriginalEstimateInDays = othersOriginalEstimateInDays;
  }

  public double getHighLevelEstimate()
  {
    return highLevelEstimate;
  }

  public void setHighLevelEstimate(double highLevelEstimate)
  {
    this.highLevelEstimate = highLevelEstimate;
  }
}
