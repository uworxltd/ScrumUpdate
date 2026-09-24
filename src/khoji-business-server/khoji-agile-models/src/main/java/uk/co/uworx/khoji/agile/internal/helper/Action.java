/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.helper;

public enum Action
{
  CREATE("create"),
  UPDATE("update"),
  DELETE("delete");

  private final String text;

  Action(final String text)
  {
    this.text = text;
  }

  public String getText()
  {
    return this.text;
  }
}
