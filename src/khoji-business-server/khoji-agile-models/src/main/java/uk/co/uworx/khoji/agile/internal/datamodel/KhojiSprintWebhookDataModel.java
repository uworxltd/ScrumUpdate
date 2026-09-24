/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.datamodel;

import uk.co.uworx.khoji.agile.internal.helper.Action;
import uk.co.uworx.khoji.agile.internal.helper.Context;

public class KhojiSprintWebhookDataModel extends KhojiWebhookDataModelImpl
{

  private SprintDataModel sprint;


  public KhojiSprintWebhookDataModel(Context context, String source, Action action, String id, SprintDataModel sprint)
  {
    super(context, source, action, id);
    this.sprint = sprint;
  }

  /**
   * Get SprintDataModel
   *
   * @return
   */
  public SprintDataModel getSprint()
  {
    return sprint;
  }

  /**
   * Set SprintDataModel
   *
   * @param sprint
   */
  public void setSprint(SprintDataModel sprint)
  {
    this.sprint = sprint;
  }

  @Override
  public String toString() {
    return "KhojiSprintWebhookDataModel{" +
            "sprint=" + sprint +
            '}';
  }
}
