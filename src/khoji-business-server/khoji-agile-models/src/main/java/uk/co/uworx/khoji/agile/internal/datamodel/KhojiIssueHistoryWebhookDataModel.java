/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.datamodel;

import uk.co.uworx.khoji.agile.internal.helper.Action;
import uk.co.uworx.khoji.agile.internal.helper.Context;

public class KhojiIssueHistoryWebhookDataModel extends KhojiWebhookDataModelImpl
{
  private HistoryItemDataModel historyDataModel;

  public KhojiIssueHistoryWebhookDataModel(Context context, String source, Action action, String id, HistoryItemDataModel historyDataModel)

  {
    super(context, source, action, id);
    this.historyDataModel = historyDataModel;

  }

  /**
   * get HistoryDataModel
   *
   * @return
   */
  public HistoryItemDataModel getHistoryDataModel()
  {
    return historyDataModel;
  }

  /**
   * Get HistoryDataModel
   *
   * @param historyDataModel
   */
  public void setHistoryDataModel(HistoryItemDataModel historyDataModel)
  {
    this.historyDataModel = historyDataModel;
  }

  @Override
  public String toString() {
    return "KhojiIssueHistoryWebhookDataModel{" +
            "historyDataModel=" + historyDataModel +
            '}';
  }
}
