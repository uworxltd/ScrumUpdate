/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.datamodel;

import uk.co.uworx.khoji.agile.internal.helper.Action;
import uk.co.uworx.khoji.agile.internal.helper.Context;

public class KhojiWebhookDataModelImpl implements KhojiWebhookDataModelInterface
{
  private Context context;
  private String source;
  private Action action;
  private String id;

  public KhojiWebhookDataModelImpl(Context context, String source, Action action, String id)
  {
    this.context = context;
    this.source = source;
    this.action = action;
    this.id = id;
  }

  @Override
  public Action getAction()
  {
    return action;
  }

  @Override
  public String getSource()
  {
    return source;
  }

  @Override
  public void setAction(Action action)
  {
    this.action = action;
  }

  @Override
  public void setSource(String source)
  {
    this.source = source;
  }

  @Override
  public Context getContext()
  {
    return context;
  }

  @Override
  public void setContext(Context context)
  {
    this.context = context;
  }

  @Override
  public String getId()
  {
    return id;
  }

  @Override
  public void setId(String id)
  {
    this.id = id;
  }
  
  @Override
  public String toString() {
    return "KhojiWebhookDataModelImpl{" +
            "context=" + context +
            ", source='" + source + '\'' +
            ", action=" + action +
            '}';
  }
}
