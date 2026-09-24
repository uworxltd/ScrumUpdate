/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.apache.commons.collections4.CollectionUtils;
import uk.co.uworx.khoji.agile.internal.datamodel.KhojiIssueType;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@JsonIgnoreProperties
public class Issue
{
  private String id;

  private String name;

  private KhojiIssueType issueType;

  private List<String> subTasksIds;

  private String teamBoard;

  private List<TeamBoard> teamBoardMappedList;

  private String status;

  private Status sourceStatus;

  private Status mappedStatus;

  private Category mappedCategory;

  private Category sourceCategory;

  private String epicId;

  private String epicURL;

  private String dateCreated;

  private String dateStarted;

  private String dateResolved;

  private String parent;

  private String parentURL;

  private String issueURL;

  private double storyPoints = 0;

  private List<SubTask> subTaskList = new ArrayList<>();

  private Project project;

  private Sprint latestSprint;

  private List<Sprint> sprintList;

  private String resolution;

  private FixVersions fixVersions;

  private List<Comment> commentsList;

  private List<History> historyList;

  private String parentType;

  private IssueWorklog worklog;

  private int defectCount;

  private boolean qualityRisk;

  private Double threshold;

  private Integer originalTimeSpent;

  private IssueMetaData issueMetaData;

  private String priority;

  private double refinedEstimate;

  private ProjectedTime projectedTime;

  private TimeSpent timeSpent;

  private TimeRemaining timeRemaining;

  private Estimates estimates;

  private String deliveryRisk;

  private RagStatus ragStatus;

  private Long elapsedDays;

  private HighLevelEstimates mappedHighLevelEstimate;

  private String sourceId;

  private ZonedDateTime updatedTime;

  private String sourceUpdatedTime;

  public Issue(
          String id,
          String name,
          String teamBoard,
          List<TeamBoard> teamBoardMappedList,
          String status,
          Category mappedCategory,
          Category sourceCategory,
          Status mappedStatus,
          Status sourceStatus,
          String dateCreated,
          String dateStarted,
          String dateResolved,
          double storyPoints,
          ProjectedTime projectedTime,
          TimeSpent timeSpent,
          TimeRemaining timeRemaining,
          Estimates estimates,
          RagStatus ragStatus,
          List<Comment> commentsList
  )
  {
    this.id = id;
    this.name = name;
    this.teamBoard = teamBoard;
    this.teamBoardMappedList = teamBoardMappedList;
    this.status = status;
    this.mappedCategory = mappedCategory;
    this.sourceCategory = sourceCategory;
    this.mappedStatus = mappedStatus;
    this.sourceStatus = sourceStatus;
    this.dateCreated = dateCreated;
    this.dateStarted = dateStarted;
    this.dateResolved = dateResolved;
    this.storyPoints = storyPoints;
    this.projectedTime = projectedTime;
    this.timeSpent = timeSpent;
    this.timeRemaining = timeRemaining;
    this.estimates = estimates;
    this.ragStatus = ragStatus;
    this.commentsList=commentsList;
  }

  // this is a copy constructor don't remove it is used for deep copy
  public Issue(Issue issue)
  {
    this.id = issue.id;
    this.name = issue.name;
    this.issueType = issue.issueType;
    this.subTasksIds = issue.subTasksIds;
    this.teamBoard = issue.teamBoard;
    this.teamBoardMappedList = issue.teamBoardMappedList;
    this.status = issue.status;
    this.sourceStatus = issue.sourceStatus;
    this.mappedStatus = issue.mappedStatus;
    this.mappedCategory = issue.mappedCategory;
    this.sourceCategory = issue.sourceCategory;
    this.epicId = issue.epicId;
    this.epicURL = issue.epicURL;
    this.dateCreated = issue.dateCreated;
    this.dateStarted = issue.dateStarted;
    this.dateResolved = issue.dateResolved;
    this.parent = issue.parent;
    this.parentURL = issue.parentURL;
    this.issueURL = issue.issueURL;
    this.storyPoints = issue.storyPoints;
    this.subTaskList = issue.subTaskList;
    this.project = issue.project;
    this.latestSprint = issue.latestSprint;
    this.sprintList = issue.sprintList;
    this.resolution = issue.resolution;
    this.fixVersions = issue.fixVersions;
    this.commentsList = issue.commentsList;
    this.historyList = issue.historyList;
    this.parentType = issue.parentType;
    this.worklog = issue.worklog;
    this.defectCount = issue.defectCount;
    this.qualityRisk = issue.qualityRisk;
    this.threshold = issue.threshold;
    this.originalTimeSpent = issue.originalTimeSpent;
    this.issueMetaData = issue.issueMetaData;
    this.priority = issue.priority;
    this.refinedEstimate = issue.refinedEstimate;
    this.projectedTime = issue.projectedTime;
    this.timeSpent = issue.timeSpent;
    this.timeRemaining = issue.timeRemaining;
    this.estimates = issue.estimates;
    this.deliveryRisk = issue.deliveryRisk;
    this.ragStatus = issue.ragStatus;
    this.elapsedDays = issue.elapsedDays;
    this.mappedHighLevelEstimate = issue.mappedHighLevelEstimate;
    this.sourceId = issue.sourceId;
    this.updatedTime = issue.updatedTime;
    this.sourceUpdatedTime = issue.sourceUpdatedTime;
  }

  public Issue()
  {
    timeSpent = new TimeSpent();
    timeRemaining = new TimeRemaining();
    estimates = new Estimates();
  }

  public HighLevelEstimates getMappedHighLevelEstimate()
  {
    return mappedHighLevelEstimate;
  }

  public void setMappedHighLevelEstimate(final HighLevelEstimates mappedHighLevelEstimate)
  {
    this.mappedHighLevelEstimate = mappedHighLevelEstimate;
  }

  public Long getElapsedDays()
  {
    return elapsedDays;
  }

  public void setElapsedDays(final Long elapsedDays)
  {
    this.elapsedDays = elapsedDays;
  }

  public String getDateResolved()
  {
    return dateResolved;
  }

  public void setDateResolved(final String dateResolved)
  {
    this.dateResolved = dateResolved;
  }

  public RagStatus getRagStatus()
  {
    return ragStatus;
  }

  public void setRagStatus(RagStatus ragStatus)
  {
    this.ragStatus = ragStatus;
  }

  public String getId()
  {
    return id;
  }

  public void setId(final String id)
  {
    this.id = id;
  }

  public String getName()
  {
    return name;
  }

  public void setName(final String name)
  {
    this.name = name;
  }

  public String getTeamBoard()
  {
    return teamBoard;
  }

  public void setTeamBoard(final String teamBoard)
  {
    this.teamBoard = teamBoard;
  }

  public String getStatus()
  {
    if (mappedStatus == null)
    {
      if (sourceStatus != null)
      {
        return sourceStatus.getName();
      }
    }
    else
    {
      return mappedStatus.getName();
    }
    return null;
  }

  public String getStatusCategory()
  {
    if (mappedCategory == null)
    {
      if (sourceCategory != null)
      {
        return sourceCategory.getName();
      }
    }
    else
    {
      return mappedCategory.getName();
    }
    return null;
  }

  public void setStatus(final String status)
  {
    this.status = status;
  }

  public Status getMappedStatus()
  {
    if (mappedStatus == null)
    {
      if (sourceStatus != null)
      {
        return sourceStatus;
      }
    }
    else
    {
      return mappedStatus;
    }
    return null;
  }

  public void setMappedStatus(Status mappedStatus)
  {
    this.mappedStatus = mappedStatus;
  }

  public Category getMappedCategory()
  {
    if (mappedCategory == null)
    {
      if (sourceCategory != null)
      {
        return sourceCategory;
      }
    }
    else
    {
      return mappedCategory;
    }
    return null;
  }

  public void setMappedCategory(Category mappedCategory)
  {
    this.mappedCategory = mappedCategory;
  }

  public Category getSourceCategory()
  {
    return sourceCategory;
  }

  public void setSourceCategory(Category sourceCategory)
  {
    this.sourceCategory = sourceCategory;
  }

  public Status getSourceStatus()
  {
    return sourceStatus;
  }

  public void setSourceStatus(Status sourceStatus)
  {
    this.sourceStatus = sourceStatus;
  }

  public String getDateCreated()
  {
    return dateCreated;
  }

  public void setDateCreated(final String dateCreated)
  {
    this.dateCreated = dateCreated;
  }

  public String getDateStarted()
  {
    return dateStarted;
  }

  public void setDateStarted(final String dateStarted)
  {
    this.dateStarted = dateStarted;
  }

  public KhojiIssueType getIssueType()
  {
    return issueType;
  }

  public void setIssueType(final KhojiIssueType issueType)
  {
    this.issueType = issueType;
  }

  public String getEpicId()
  {
    return epicId;
  }

  public void setEpicId(String epicId)
  {
    this.epicId = epicId;
  }

  public String getEpicURL()
  {
    return epicURL;
  }

  public void setEpicURL(String epicURL)
  {
    this.epicURL = epicURL;
  }

  public String getParentURL()
  {
    return parentURL;
  }

  public void setParentURL(final String parentURL)
  {
    this.parentURL = parentURL;
  }

  public String getIssueURL()
  {
    return issueURL;
  }

  public void setIssueURL(String issueURL)
  {
    this.issueURL = issueURL;
  }

  public double getStoryPoints()
  {
    return storyPoints;
  }

  public void setStoryPoints(double storyPoints)
  {
    this.storyPoints = storyPoints;
  }

  public List<SubTask> getSubTaskList()
  {
    return subTaskList;
  }

  public void setSubTaskList(List<SubTask> subTaskList)
  {
    this.subTaskList = subTaskList;
  }

  public Project getProject()
  {
    return project;
  }

  public void setProject(Project project)
  {
    this.project = project;
  }

  public List<Sprint> getSprintList()
  {
    return sprintList;
  }

  public void setSprintList(final List<Sprint> sprintList)
  {
    this.sprintList = sprintList;
  }

  public Sprint getLatestSprint()
  {
    return latestSprint;
  }

  public void setLatestSprint(final Sprint latestSprint)
  {
    this.latestSprint = latestSprint;
  }

  public String getResolution()
  {
    return resolution;
  }

  public void setResolution(final String resolution)
  {
    this.resolution = resolution;
  }

  public FixVersions getFixVersions()
  {
    return fixVersions;
  }

  public void setFixVersions(final FixVersions fixVersions)
  {
    this.fixVersions = fixVersions;
  }

  public List<Comment> getCommentsList()
  {
    return commentsList;
  }

  public void setCommentsList(List<Comment> commentsList)
  {
    this.commentsList = commentsList;
  }

  public IssueWorklog getWorklog()
  {
    return worklog;
  }

  public void setWorklog(IssueWorklog worklog)
  {
    this.worklog = worklog;
  }

  public String getParentType()
  {
    return parentType;
  }

  public void setParentType(String parentType)
  {
    this.parentType = parentType;
  }

  @Override
  public int hashCode()
  {
    return Objects.hash(id);
  }

  @Override
  public boolean equals(Object obj)
  {
    if (!(obj instanceof Issue))
    {
      return false;
    }
    final Issue issue = (Issue) obj;

    return issue.getId().equalsIgnoreCase(id);
  }

  public void setDefectCount(int calculateDefectCount)
  {
    this.defectCount = calculateDefectCount;
  }

  public int getDefectCount()
  {
    return defectCount;
  }

  public void setQualityRisk(boolean qualityRisk)
  {
    this.qualityRisk = qualityRisk;
  }

  public boolean isQualityRisk()
  {
    return qualityRisk;
  }

  public List<History> getHistoryList()
  {
    return historyList;
  }

  public void setHistoryList(List<History> historyList)
  {
    this.historyList = historyList;
  }

  public void setThreshold(Double threshold)
  {
    this.threshold = threshold;
  }

  public Double getThreshold()
  {
    return threshold;
  }

  public String getParent()
  {
    return parent;
  }

  public void setParent(String parent)
  {
    this.parent = parent;
  }

  public Integer getOriginalTimeSpent()
  {
    return originalTimeSpent;
  }

  public void setOriginalTimeSpent(Integer originalTimeSpent)
  {
    this.originalTimeSpent = originalTimeSpent;
  }

  public IssueMetaData getIssueMetaData()
  {
    return issueMetaData;
  }

  public void setIssueMetaData(final IssueMetaData issueMetaData)
  {
    this.issueMetaData = issueMetaData;
  }

  public String getPriority()
  {
    return priority;
  }

  public void setPriority(String priority)
  {
    this.priority = priority;
  }

  public double getRefinedEstimate()
  {
    return refinedEstimate;
  }

  public void setRefinedEstimate(double refinedEstimate)
  {
    this.refinedEstimate = refinedEstimate;
  }

  public ProjectedTime getProjectedTime()
  {
    return projectedTime;
  }

  public void setProjectedTime(ProjectedTime projectedTime)
  {
    this.projectedTime = projectedTime;
  }

  public TimeSpent getTimeSpent()
  {
    return timeSpent;
  }

  public void setTimeSpent(TimeSpent timeSpent)
  {
    this.timeSpent = timeSpent;
  }

  public TimeRemaining getTimeRemaining()
  {
    return timeRemaining;
  }

  public void setTimeRemaining(TimeRemaining timeRemaining)
  {
    this.timeRemaining = timeRemaining;
  }

  public Estimates getEstimates()
  {
    return estimates;
  }

  public void setEstimates(Estimates estimates)
  {
    this.estimates = estimates;
  }

  public String getDeliveryRisk()
  {
    return deliveryRisk;
  }

  public void setDeliveryRisk(String deliveryRisk)
  {
    this.deliveryRisk = deliveryRisk;
  }

  public String getSourceId()
  {
    return sourceId;
  }

  public void setSourceId(final String sourceId)
  {
    this.sourceId = sourceId;
  }

  public List<TeamBoard> getTeamBoardMappedList()
  {
    return teamBoardMappedList;
  }

  public void setTeamBoardMappedList(List<TeamBoard> teamBoardMappedList)
  {
    this.teamBoardMappedList = teamBoardMappedList;
  }

  /**
   * Creates a TeamBoardList which contain distinct values from both TeamBoardMappedList and TeamBoard Field of Issue
   *
   * @return
   */
  public List<String> getAggregatedTeamBoardList()
  {
    List<String> teamBoardList = new ArrayList<>();

    if (CollectionUtils.isNotEmpty(teamBoardMappedList))
    {
      teamBoardList.addAll(teamBoardMappedList.stream().map(TeamBoard::getBoardName).distinct().collect(Collectors.toList()));
    }
    else
    {
      return null;
    }

    return teamBoardList;
  }

  public ZonedDateTime getUpdatedTime()
  {
    return this.updatedTime;
  }

  public void setUpdatedTime(ZonedDateTime zonedDateTime)
  {
    this.updatedTime = zonedDateTime;
  }

  public void setSourceUpdatedTime(String sourceUpdatedTime)
  {
    this.sourceUpdatedTime = sourceUpdatedTime;
  }

  public String getSourceUpdatedTime()
  {
    return this.sourceUpdatedTime;
  }

  @Override
  public String toString()
  {
    return "Issue{" +
            "id='" + id + '\'' +
            '}';
  }

}
