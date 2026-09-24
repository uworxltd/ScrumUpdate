/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import uk.co.uworx.khoji.agile.response.WorkLogAuditEmailResponse;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
public class WorkLogEmailModel
{
  private String email;
  private Long instanceId;
  private String name;
  private String dateExpiry;
  private List<WorkLogAuditEmailResponse> mainResponses;
  private int summary;
  private String dateFrom;
  private String dateTo;
  private Set<String> colsInOthers;
  private Set<String> colsInMainCategory;
  private boolean isOtherCategoryExist;
  List<HashMap<String, Double>> totalsDays;
  List<String> mainCategories;

  public WorkLogEmailModel(
          String email,
          Long instanceId,
          String name,
          String dateExpiry,
          List<WorkLogAuditEmailResponse> responses,
          int summary,
          String dateFrom,
          String dateTo,
          Set<String> colsInOthers,
          Set<String> colsInMainCategory,
          boolean isOtherCategoryExist,
          List<HashMap<String, Double>> totalsDays,
          List<String> mainCategories
  )
  {
    super();
    this.email = email;
    this.instanceId = instanceId;
    this.name = name;
    this.dateExpiry = dateExpiry;
    this.mainResponses = responses;
    this.summary = summary;
    this.dateFrom = dateFrom;
    this.dateTo = dateTo;
    this.colsInOthers = colsInOthers;
    this.colsInMainCategory = colsInMainCategory;
    this.isOtherCategoryExist=isOtherCategoryExist;
    this.totalsDays = totalsDays;
    this.mainCategories = mainCategories;
  }

  public Map<String, Double> getDaysSumMap(Set<String> cols)
  {
    Map<String, Double> daysSumMapOnCategory = new HashMap<>();
    for(String col : cols)
    {
      double value = 0d;
      for(WorkLogAuditEmailResponse member : this.mainResponses)
      {
        value += member.getDistributionDetails().containsKey(col) ? member.getDistributionDetails().get(col).getTotalDaysSpent() : 0;
      }

      daysSumMapOnCategory.put(col, new BigDecimal(value).setScale(2, RoundingMode.HALF_UP).doubleValue());
    }

    return daysSumMapOnCategory;
  }


  public double getTotalSummaryDays(Set<String> cols)
  {
    double total = 0;
    for(WorkLogAuditEmailResponse workLogAuditEmailResponse : this.getResponses())
    {
      total += workLogAuditEmailResponse.getTotalOtherDays(cols);
    }

    return new BigDecimal(total).setScale(2, RoundingMode.HALF_UP).doubleValue();
  }

  public HashMap<String, Integer> getSummarizedAveragePercentageMapForCols(Set<String> cols)
  {
    HashMap<String, Integer> summarizedAvgMapForOtherCols = new HashMap<>();
    for (String otherCol : cols)
    {
      summarizedAvgMapForOtherCols.put(otherCol, getSummarizedPercentageAvgForCols(this.getResponses(), otherCol));
    }
    return summarizedAvgMapForOtherCols;
  }

  private int getSummarizedPercentageAvgForCols(List<WorkLogAuditEmailResponse> responses, String key)
  {
    int total = responses.size();
    int value = 0;
    for (WorkLogAuditEmailResponse member : responses)
    {
      value += member.getDistributionDetails().containsKey(key) ? (int) member
              .getDistributionDetails()
              .get(key)
              .getPercentage() : 0;
    }

    return value / total;
  }

  /**
   * @return the responses
   */
  public List<WorkLogAuditEmailResponse> getResponses()
  {
    return mainResponses;
  }

  /**
   * @param responses the responses to set
   */
  public void setResponses(List<WorkLogAuditEmailResponse> responses)
  {
    this.mainResponses = responses;
  }
}
