/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import java.util.List;

public class IssueWorklog
{
  private Integer total;
  private Integer maxResults;
  private List<WorkLog> worklogs;

  public IssueWorklog()
  {
  }

  public Integer getTotal()
  {
    return total;
  }

  public void setTotal(Integer total)
  {
    this.total = total;
  }

  public Integer getMaxResults()
  {
    return maxResults;
  }

  public void setMaxResults(Integer maxResults)
  {
    this.maxResults = maxResults;
  }

  public List<WorkLog> getWorklogs()
  {
    return worklogs;
  }

  public void setWorklogs(List<WorkLog> worklogs)
  {
    this.worklogs = worklogs;
  }
}
