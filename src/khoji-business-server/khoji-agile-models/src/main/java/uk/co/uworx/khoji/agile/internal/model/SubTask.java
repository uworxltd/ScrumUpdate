/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import uk.co.uworx.khoji.agile.internal.datamodel.KhojiIssueType;

public class SubTask {
  private String id;
  private KhojiIssueType taskType;
  private String taskNumber;
  private Status status;
  private Category category;
  private boolean isCategoryMapped;

  public boolean isCategoryMapped()
  {
    return isCategoryMapped;
  }

  public void setCategoryMapped(boolean categoryMapped)
  {
    isCategoryMapped = categoryMapped;
  }

  public SubTask(
          String id,
          KhojiIssueType taskType,
          String taskNumber,
          Status status,
          Category category,
          boolean isCategoryMapped
  )
  {
    this.id = id;
    this.taskType = taskType;
    this.taskNumber = taskNumber;
    this.status = status;
    this.category = category;
    this.isCategoryMapped = isCategoryMapped;
  }

  public SubTask(){}

  public String getId()
  {
    return id;
  }

  public void setId(final String id)
  {
    this.id = id;
  }

  public KhojiIssueType getTaskType() {
    return taskType;
  }

  public void setTaskType(KhojiIssueType taskType) {
    this.taskType = taskType;
  }

  public String getTaskNumber() {
    return taskNumber;
  }

  public void setTaskNumber(String taskNumber) {
    this.taskNumber = taskNumber;
  }

  /**
   * @return the status
   */
  public Status getStatus() {
    return status;
  }

  /**
   * @param status the status to set
   */
  public void setStatus(Status status) {
    this.status = status;
  }

  public Category getCategory()
  {
    return category;
  }

  public void setCategory(Category category)
  {
    this.category = category;
  }
}
