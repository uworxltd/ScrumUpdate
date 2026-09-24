/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.datamodel;

import uk.co.uworx.khoji.agile.internal.helper.Action;
import uk.co.uworx.khoji.agile.internal.helper.Context;

public class KhojiIssueTeamBoardsWebhookDataModel extends KhojiWebhookDataModelImpl
{

  IssueTeamBoardsDataModel teamBoardsDataModel;

  public KhojiIssueTeamBoardsWebhookDataModel(Context context, String source, Action action, String id, IssueTeamBoardsDataModel teamBoardsDataModel)

  {
    super(context, source, action, id);
    this.teamBoardsDataModel = teamBoardsDataModel;

  }

  /**
   * Get historyDataModel
   *
   * @return
   */
  public IssueTeamBoardsDataModel getTeamBoardsDataModel()
  {
    return teamBoardsDataModel;
  }

  /**
   * Set IssueTeamBoardsDataModel
   *
   * @param teamBoardsDataModel
   */
  public void setTeamBoardsDataModel(IssueTeamBoardsDataModel teamBoardsDataModel)
  {
    this.teamBoardsDataModel = teamBoardsDataModel;
  }

  @Override
  public String toString() {
    return "KhojiIssueTeamBoardsWebhookDataModel{" +
            "teamBoardsDataModel=" + teamBoardsDataModel +
            '}';
  }
}
