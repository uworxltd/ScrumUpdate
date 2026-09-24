/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.datamodel;

import uk.co.uworx.khoji.agile.internal.helper.Action;
import uk.co.uworx.khoji.agile.internal.helper.Context;

public class KhojiReleaseWebhookDataModel extends KhojiWebhookDataModelImpl
{
  private ReleaseDataModel release;

  public KhojiReleaseWebhookDataModel(Context context, String source, Action action, String id,ReleaseDataModel release)
  {
    super(context, source, action, id);
    this.release = release;

  }

  /**
   * Get ReleaseDataModel
   *
   * @return
   */
  public ReleaseDataModel getRelease()
  {
    return release;
  }

  /**
   * Set ReleaseDataModel
   *
   * @param release
   */
  public void setRelease(ReleaseDataModel release)
  {
    this.release = release;
  }

  @Override
  public String toString() {
    return "KhojiReleaseWebhookDataModel{" +
            "release=" + release +
            '}';
  }
}
