/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.response;

public class RegisteredTeamsResponse
{
  private String teamName;
  private String status;

  public String getTeamName()
  {
    return teamName;
  }

  public void setTeamName(final String teamName)
  {
    this.teamName = teamName;
  }

  public String getStatus()
  {
    return status;
  }

  public void setStatus(String status)
  {
    this.status = status;
  }
}
