/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

/**
 * Model for status category configs
 */
public class StatusCategoryConfig
{
  private boolean isInferred;

  public StatusCategoryConfig(final boolean isInferred)
  {
    this.isInferred = isInferred;
  }

  public boolean isInferred()
  {
    return isInferred;
  }

  public void setInferred(final boolean isInferred)
  {
    this.isInferred = isInferred;
  }
}
