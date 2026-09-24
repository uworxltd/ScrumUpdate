/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.datamodel;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Issue
{
  private List<String> subTaskList = new ArrayList<>();
  private List<CommentDataModel> commentsList;
  private String parent;
  private CategoryDataModel sourceCategory;
  private List<String> sprintList;
  private double highLevelEstimate;
  private KhojiIssueType issueType;
  private String resolution;
  private boolean qualityRisk;
  private String dateCreated;
  private String dateResolved;
  private Long originalTimeSpent;
  private double refinedEstimate;
  private String id;
  private String tShirtSize;
  private double storyPoints;
  private String teamBoard;
  private Long timeSpent;
  private Long originalEstimates;
  private String priority;
  private String parentType;
  private StatusDataModel sourceStatus;
  private Long aggregateTimeEstimate;
  private Long nonAggregatedOriginalEstimate;
  private String name;
  private String projectName;
  private String projectId;
  private Long aggregateTimeSpent;
  private Long timeRemaining;
  private List<String> fixVersion;
  private String epicId;
  private String sourceId;

  public Issue(
          final List<String> subTaskList,
          final List<CommentDataModel> commentsList,
          final String parent,
          final CategoryDataModel sourceCategory,
          final List<String> sprintList,
          final double highLevelEstimate,
          final KhojiIssueType issueType,
          final String resolution,
          final boolean qualityRisk,
          final String dateCreated,
          final String dateResolved,
          final Long originalTimeSpent,
          final double refinedEstimate,
          final String id,
          final String tShirtSize,
          final double storyPoints,
          final String teamBoard,
          final Long timeSpent,
          final Long originalEstimates,
          final String priority,
          final String parentType,
          final StatusDataModel sourceStatus,
          final Long aggregateTimeEstimate,
          final String name,
          final String projectName,
          final String projectId,
          final Long aggregateTimeSpent,
          final Long timeRemaining,
          final List<String> fixVersion,
          final String epicId,
          final String sourceId,
          final Long nonAggregatedOriginalEstimate
  )
  {
    this.subTaskList = subTaskList;
    this.commentsList = commentsList;
    this.parent = parent;
    this.sourceCategory = sourceCategory;
    this.sprintList = sprintList;
    this.highLevelEstimate = highLevelEstimate;
    this.issueType = issueType;
    this.resolution = resolution;
    this.qualityRisk = qualityRisk;
    this.dateCreated = dateCreated;
    this.dateResolved = dateResolved;
    this.originalTimeSpent = originalTimeSpent;
    this.refinedEstimate = refinedEstimate;
    this.id = id;
    this.tShirtSize = tShirtSize;
    this.storyPoints = storyPoints;
    this.teamBoard = teamBoard;
    this.timeSpent = timeSpent;
    this.originalEstimates = originalEstimates;
    this.priority = priority;
    this.parentType = parentType;
    this.sourceStatus = sourceStatus;
    this.aggregateTimeEstimate = aggregateTimeEstimate;
    this.name = name;
    this.projectName = projectName;
    this.projectId = projectId;
    this.aggregateTimeSpent = aggregateTimeSpent;
    this.timeRemaining = timeRemaining;
    this.fixVersion = fixVersion;
    this.epicId = epicId;
    this.sourceId = sourceId;
    this.nonAggregatedOriginalEstimate = nonAggregatedOriginalEstimate;
  }

  @Override
  public String toString()
  {
    return "Issue{" +
            "subTaskList=" + subTaskList +
            ", commentsList=" + commentsList +
            ", parent='" + parent + '\'' +
            ", sourceCategory=" + sourceCategory +
            ", sprintList=" + sprintList +
            ", highLevelEstimate=" + highLevelEstimate +
            ", type='" + issueType + '\'' +
            ", resolution='" + resolution + '\'' +
            ", qualityRisk=" + qualityRisk +
            ", dateCreated='" + dateCreated + '\'' +
            ", dateResolved='" + dateResolved + '\'' +
            ", originalTimeSpent=" + originalTimeSpent +
            ", refinedEstimate=" + refinedEstimate +
            ", id='" + id + '\'' +
            ", tShirtSize='" + tShirtSize + '\'' +
            ", storyPoints=" + storyPoints +
            ", teamBoard='" + teamBoard + '\'' +
            ", timeSpent=" + timeSpent +
            ", originalEstimates=" + originalEstimates +
            ", priority='" + priority + '\'' +
            ", parentType='" + parentType + '\'' +
            ", sourceStatus=" + sourceStatus +
            ", aggregateTimeEstimate=" + aggregateTimeEstimate +
            ", aggregateOriginalEstimate=" + nonAggregatedOriginalEstimate +
            ", name='" + name + '\'' +
            ", projectName='" + projectName + '\'' +
            ", projectId='" + projectId + '\'' +
            ", aggregateTimeSpent=" + aggregateTimeSpent +
            ", timeRemaining=" + timeRemaining +
            ", fixVersion=" + fixVersion +
            ", epicId='" + epicId + '\'' +
            ", sourceId='" + sourceId + '\'' +
            '}';
  }
}
