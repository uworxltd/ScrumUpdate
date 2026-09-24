/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

import java.io.Serializable;

public class DaysPercentDistribution implements Serializable
{
  private double totalDaysSpent;
  private double percentage;


  public DaysPercentDistribution()
  {
  }

  public DaysPercentDistribution(double totalDaysSpent, double percentage)
  {
    this.totalDaysSpent = totalDaysSpent;
    this.percentage = percentage;
  }

  /**
   * @return total days spent
   */
  public double getTotalDaysSpent()
  {
    return totalDaysSpent;
  }

  /**
   * sets the total days spent
   * @param totalDaysSpent the days to set
   */
  public void setTotalDaysSpent(double totalDaysSpent)
  {
    this.totalDaysSpent = totalDaysSpent;
  }

  /**
   * @return the percentage spent
   */
  public double getPercentage()
  {
    return percentage;
  }

  /**
   * sets the percentage spent
   * @param percentage the percentage to set
   */
  public void setPercentage(double percentage)
  {
    this.percentage = percentage;
  }

  public int getPercentageIntValue()
  {
    return Double.valueOf(this.percentage).intValue();
  }

  public int getDaysSpentIntValue()
  {
    return Double.valueOf(this.totalDaysSpent).intValue();
  }
}
