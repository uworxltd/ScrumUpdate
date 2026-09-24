/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

import java.util.List;

public class IssueMetaData
{
  private long timeSpent;
  private long originalEstimates;
  private double originalEstimatesInDays;
  private long timeEstimate;

  private long aggregateTimeSpent;
  private double aggregatedTimeSpentInDays;
  private long aggregateTimeEstimate;
  private long aggregateOriginalEstimate;

  private String projectId;
  private String projectName;
  private long defectTime;

  private long devTime;
  private long devOriginalEstimates;
  private long devTimeRemaining;

  private long qaTime;
  private long qaOriginalEstimates;
  private long qaTimeRemaining;

  private long othersTime;
  private long othersOriginalEstimates;
  private long othersTimeRemaining;
  private List<Issue> devTimeList;
  private List<Issue> defectTimeList;
  private List<Issue> qaTimeList;
  private List<Issue> otherTimeList;

  public void setIssueMetaDataDefectList(List<Issue> defectTimeList)
  {
    this.defectTimeList = defectTimeList;
  }

  public void setIssueMetaDataOtherList(List<Issue> otherList)
  {
    this.otherTimeList = otherList;
  }

  public void setIssueMetaDataDevList(List<Issue> devTimeList)
  {
    this.devTimeList = devTimeList;
  }

  public void setIssueMetaDataQAList(List<Issue> qaList)
  {
    qaTimeList = qaList;
  }

  public long getOriginalEstimates()
  {
    return originalEstimates;
  }

  public void setOriginalEstimates(final long originalEstimates)
  {
    this.originalEstimates = originalEstimates;
  }

  public long getOthersTime()
  {
    if (otherTimeList != null)
    {
      return getOriginalTimeSpentOnTask(otherTimeList);
    }
    return othersTime;
  }

  public void setOthersTime(final long othersTime)
  {
    this.othersTime = othersTime;
  }

  public long getOthersOriginalEstimates()
  {
    if (otherTimeList != null)
    {
      return getTimeEstimateOfTasks(otherTimeList);
    }
    return othersOriginalEstimates;
  }

  public void setOthersOriginalEstimates(final long othersOriginalEstimates)
  {
    this.othersOriginalEstimates = othersOriginalEstimates;
  }

  public long getOthersTimeRemaining()
  {
    if (otherTimeList != null)
    {
      return getTimeRemainingOfTasks(otherTimeList);
    }
    return othersTimeRemaining;
  }

  public void setOthersTimeRemaining(final long othersTimeRemaining)
  {
    this.othersTimeRemaining = othersTimeRemaining;
  }

  public long getQaTime()
  {
    if (qaTimeList != null)
    {
      return getOriginalTimeSpentOnTask(qaTimeList);
    }
    return qaTime;
  }

  public void setQaTime(final long qaTime)
  {
    this.qaTime = qaTime;
  }

  public long getQaOriginalEstimates()
  {

    if (qaTimeList != null)
    {
      return getTimeEstimateOfTasks(qaTimeList);
    }
    return qaOriginalEstimates;
  }

  public void setQaOriginalEstimates(final long qaOriginalEstimates)
  {
    this.qaOriginalEstimates = qaOriginalEstimates;
  }

  public long getQaTimeRemaining()
  {
    if (qaTimeList != null)
    {
      return getTimeRemainingOfTasks(qaTimeList);
    }
    return qaTimeRemaining;
  }

  public void setQaTimeRemaining(final long qaTimeRemaining)
  {
    this.qaTimeRemaining = qaTimeRemaining;
  }

  public long getAggregateTimeSpent()
  {
    return aggregateTimeSpent;
  }

  public void setAggregateTimeSpent(final long aggregateTimeSpent)
  {
    this.aggregateTimeSpent = aggregateTimeSpent;
  }

  public long getAggregateTimeEstimate()
  {
    return aggregateTimeEstimate;
  }

  public void setAggregateTimeEstimate(final long aggregateTimeEstimate)
  {
    this.aggregateTimeEstimate = aggregateTimeEstimate;
  }

  public String getProjectId()
  {
    return projectId;
  }

  public void setProjectId(final String projectId)
  {
    this.projectId = projectId;
  }

  public String getProjectName()
  {
    return projectName;
  }

  public void setProjectName(final String projectName)
  {
    this.projectName = projectName;
  }

  public long getDefectTime()
  {
    if (defectTimeList != null)
    {
      return getOriginalTimeSpentOnTask(defectTimeList);
    }
    return defectTime;
  }

  public void setDefectTime(final long defectTime)
  {
    this.defectTime = defectTime;
  }

  public long getDevTime()
  {
    if (devTimeList != null)
    {
      return getOriginalTimeSpentOnTask(devTimeList);
    }
    return devTime;
  }

  public void setDevTime(final long devTime)
  {
    this.devTime = devTime;
  }

  public long getDevOriginalEstimates()
  {
    if (devTimeList != null)
    {
      return getTimeEstimateOfTasks(devTimeList);
    }
    return devOriginalEstimates;
  }

  public void setDevOriginalEstimates(final long devOriginalEstimates)
  {
    this.devOriginalEstimates = devOriginalEstimates;
  }

  public long getDevTimeRemaining()
  {
    if (devTimeList != null)
    {
      return getTimeRemainingOfTasks(devTimeList);
    }
    return devTimeRemaining;
  }

  public void setDevTimeRemaining(final long devTimeRemaining)
  {
    this.devTimeRemaining = devTimeRemaining;
  }

  public long getTimeEstimate()
  {
    return timeEstimate;
  }

  public void setTimeEstimate(long timeEstimate)
  {
    this.timeEstimate = timeEstimate;
  }

  public long getAggregateOriginalEstimate()
  {
    return aggregateOriginalEstimate;
  }

  public void setAggregateOriginalEstimate(long aggregateOriginalEstimate)
  {
    this.aggregateOriginalEstimate = aggregateOriginalEstimate;
  }

  public long getTimeSpent()
  {
    return timeSpent;
  }

  public void setTimeSpent(final long timeSpent)
  {
    this.timeSpent = timeSpent;
  }

  private long getOriginalTimeSpentOnTask(List<Issue> tasks)
  {
    return tasks.stream()
            .filter(task -> task.getOriginalTimeSpent() != null)
            .distinct()
            .mapToLong(Issue::getOriginalTimeSpent)
            .sum();
  }

  private long getTimeEstimateOfTasks(List<Issue> tasks)
  {
    return tasks.stream()
            .filter(task -> task.getOriginalTimeSpent() != null)
            .distinct()
            .mapToLong(issue -> issue.getEstimates().getOriginalEstimates())
            .sum();
  }

  private long getTimeRemainingOfTasks(List<Issue> tasks)
  {
    return tasks.stream()
            .filter(task -> task.getOriginalTimeSpent() != null)
            .distinct()
            .mapToLong(issue -> issue.getIssueMetaData().getAggregateTimeEstimate())
            .sum();
  }

  public double getOriginalEstimatesInDays()
  {
    return originalEstimatesInDays;
  }

  public void setOriginalEstimatesInDays(final double originalEstimatesInDays)
  {
    this.originalEstimatesInDays = originalEstimatesInDays;
  }

  public void setAggregatedTimeSpentInDays(double aggregatedTimeSpentInDays)
  {
    this.aggregatedTimeSpentInDays = aggregatedTimeSpentInDays;
  }

  public double getAggregatedTimeSpentInDays()
  {
    return aggregatedTimeSpentInDays;
  }
}
