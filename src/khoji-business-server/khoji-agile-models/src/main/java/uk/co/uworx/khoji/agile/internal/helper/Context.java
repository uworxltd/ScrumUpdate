
/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.helper;

public enum Context
{
  ISSUE("ISSUE"),
  ISSUE_WORKLOG("ISSUE_WORKLOG"),
  ISSUE_HISTORY("ISSUE_HISTORY"),
  ISSUE_PROJECT("ISSUE_PROJECT"),
  ISSUE_TEAMBOARD("ISSUE_TEAMBOARD"),
  SCRUM_TEAMBOARD("SCRUM_TEAMBOARD"),
  KANBAN_TEAMBOARD("KANBAN_TEAMBOARD"),
  BACK_LOG_TEAMBOARD("BACK_LOG_TEAMBOARD"),
  SPRINT("SPRINT"),
  RELEASE("RELEASE");

  private final String text;

  Context(final String text)
  {
    this.text = text;
  }

  public String getContext()
  {
    return this.text;
  }

  public String getText()
  {
    return this.text;
  }
}
