/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.datamodel;

import uk.co.uworx.khoji.agile.internal.helper.Action;
import uk.co.uworx.khoji.agile.internal.helper.Context;

public interface KhojiWebhookDataModelInterface
{

  /**
   * Get Webhook-Data-Model Action
   *
   * @return Action
   */
  public Action getAction();

  /**
   * Get Source of Webhook-Data-Model
   *
   * @return Source of Data Input (e.g. Jira Client, Data Loader)
   */
  public String getSource();

  /**
   * Get Context of Webhook-Data-Model
   *
   * @return Id
   */
  public Context getContext();

  /**
   * Get ID
   * @return
   */
  public String getId();

  /**
   * Set Webhook-Data-Model Action
   *
   * @param action
   */

  public void setAction(Action action);

  /**
   * Set Source of Webhook-Data-Model (e.g. Jira Client, Data Loader)
   *
   * @param source
   */
  public void setSource(String source);

  /**
   * Set Context of Webhook-Data-Model
   *
   * @param context
   */
  public void setContext(Context context);

  /**
   * Set Id
   * @param documentId
   */
  public void setId(String documentId);

}
