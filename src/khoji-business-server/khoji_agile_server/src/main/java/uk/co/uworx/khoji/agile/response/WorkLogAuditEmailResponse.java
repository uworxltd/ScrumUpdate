/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.response;

import lombok.Getter;
import lombok.Setter;
import uk.co.uworx.khoji.agile.internal.model.DaysPercentDistribution;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Getter
public class WorkLogAuditEmailResponse
{
  private String entity;
  private double workLog;
  private boolean isPartOfMultipleTeam;
  private double workLogInDays;
  @Setter
  private String colorCode;
  @Getter
  private int other;
  @Setter
  private List<WorkLogAuditEmailResponse> subWorkLogResponses;
  private Map<String, DaysPercentDistribution> distributionDetails;

  public WorkLogAuditEmailResponse(
          String entity,
          double workLog,
          int other,
          Map<String, DaysPercentDistribution> distributionDetails
  )
  {
    this.entity = entity;
    this.workLog = workLog;
    this.other = other;
    this.distributionDetails = distributionDetails;
  }

  public WorkLogAuditEmailResponse(
          String entity,
          double workLog,
          int other,
          Map<String, DaysPercentDistribution> distributionDetails,
          boolean isPartOfMultipleTeam,
          double workLogInDays
  )
  {
    this.entity = entity;
    this.workLog = workLog;
    this.other = other;
    this.distributionDetails = distributionDetails;
    this.isPartOfMultipleTeam = isPartOfMultipleTeam;
    this.workLogInDays = workLogInDays;
  }

  /**
   * @param workLog the workLog to set
   */
  public void setWorkLog(int workLog)
  {
    this.workLog = workLog;
  }

  /**
   * @return the colorCode
   */
  public String getColorCode()
  {
    return getHTMLColorCode(workLog);
  }

  private String getHTMLColorCode(double attribute)
  {
    if (attribute >= 90)
    {
      return "#32CD32"; // LimeGREEN
    }
    else if (attribute >= 75)
    {
      return "#FFD700"; // ORANGE
    }
    return "#DC143C"; // Crimson
  }

  /**
   * The following method is used inside the velocity template against each entry and
   * will not show any usages in IDE
   * @return total work log in days against an entry in table of work logs
   */
  public double getTotalWorkLogInDays()
  {
    double total = 0;
    for (String key : this.distributionDetails.keySet())
    {
      total += this.distributionDetails.get(key).getTotalDaysSpent();
    }

    return new BigDecimal(total).setScale(2, RoundingMode.HALF_UP).doubleValue();
  }

  public double getTotalOtherDays(Set<String> otherCols)
  {
    double total = 0;
    for(String key : otherCols)
    {
      total += this.distributionDetails.containsKey(key) ? this.distributionDetails.get(key).getTotalDaysSpent() : 0d;
    }
    return new BigDecimal(total).setScale(2, RoundingMode.HALF_UP).doubleValue();
  }
}
