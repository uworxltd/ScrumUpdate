/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.response;

public class WorkLogAuditResponse
{
  private String memberName;
  private String email;
  private String taskId;
  private String taskType;
  private String team;
  private String workLogDate;
  private double workLog;

  public WorkLogAuditResponse(String memberName, String email, String taskId, String taskType, String team,
      double workLog, String workLogDate)
  {
    this.memberName = memberName;
    this.setEmail(email);
    this.taskId = taskId;
    this.taskType = taskType;
    this.team = team;
    this.workLog = workLog;
    this.workLogDate = workLogDate;
  }

  /**
   * @return the memberName
   */
  public String getMemberName()
  {
    return memberName;
  }

  /**
   * @param memberName the memberName to set
   */
  public void setMemberName(String memberName)
  {
    this.memberName = memberName;
  }

  /**
   * @return the taskId
   */
  public String getTaskId()
  {
    return taskId;
  }

  /**
   * @param taskId the taskId to set
   */
  public void setTaskId(String taskId)
  {
    this.taskId = taskId;
  }

  /**
   * @return the taskType
   */
  public String getTaskType()
  {
    return taskType;
  }

  /**
   * @param taskType the taskType to set
   */
  public void setTaskType(String taskType)
  {
    this.taskType = taskType;
  }

  

  /**
   * @return the team
   */
  public String getTeam()
  {
    return team;
  }

  /**
   * @param team the team to set
   */
  public void setTeam(String team)
  {
    this.team = team;
  }

  /**
   * @return the workLog
   */
  public double getWorkLog()
  {
    return workLog;
  }

  /**
   * @param workLog the workLog to set
   */
  public void setWorkLog(double workLog)
  {
    this.workLog = workLog;
  }

  /**
   * @return the workLogDate
   */
  public String getWorkLogDate()
  {
    return workLogDate;
  }

  /**
   * @param workLogDate the workLogDate to set
   */
  public void setWorkLogDate(String workLogDate)
  {
    this.workLogDate = workLogDate;
  }

  /**
   * @return the email
   */
  public String getEmail()
  {
    return email;
  }

  /**
   * @param email the email to set
   */
  public void setEmail(String email)
  {
    this.email = email;
  }

}
