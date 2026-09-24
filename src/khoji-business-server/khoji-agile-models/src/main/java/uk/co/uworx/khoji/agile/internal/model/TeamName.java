/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class TeamName
{
  @NotBlank(message = "{team.name.notBlank}")
  private String teamName;

  @NotNull(message = "{team.owningOrganization.notBlank}")
  private Location location;

  public Location getLocation()
  {
    return location;
  }

  public void setLocation(Location location)
  {
    this.location = location;
  }

  public String getTeamName()
  {
    return teamName;
  }

  public void setTeamName(final String teamName)
  {
    this.teamName = teamName;
  }
}
