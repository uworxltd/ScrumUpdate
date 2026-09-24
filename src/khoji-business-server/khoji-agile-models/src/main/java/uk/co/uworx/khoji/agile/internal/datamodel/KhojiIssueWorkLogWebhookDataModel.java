/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.datamodel;

import uk.co.uworx.khoji.agile.internal.helper.Action;
import uk.co.uworx.khoji.agile.internal.helper.Context;


public class KhojiIssueWorkLogWebhookDataModel extends KhojiWebhookDataModelImpl
{
  private WorkLogDataModel worklog;

  public KhojiIssueWorkLogWebhookDataModel(Context context, String source, Action action, String id, WorkLogDataModel worklog)
  {
    super(context, source, action, id);
    this.worklog = worklog;
  }

  /**
   * Get WorkLogDataModel
   *
   * @return
   */
  public WorkLogDataModel getWorklog()
  {
    return worklog;
  }

  /**
   * Set WorkLogDataModel
   *
   * @param worklog
   */
  public void setWorklog(WorkLogDataModel worklog)
  {
    this.worklog = worklog;
  }

  @Override
  public String toString() {
    return "KhojiIssueWorkLogWebhookDataModel{" +
            "worklog=" + worklog +
            '}';
  }
}
