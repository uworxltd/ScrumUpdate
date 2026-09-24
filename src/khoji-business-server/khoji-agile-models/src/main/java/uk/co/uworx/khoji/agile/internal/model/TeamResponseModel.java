/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

import java.util.Set;

/**
 * Teams API Response Model without Members for members use Teams Model
 */
public class TeamResponseModel
{
  private Long id;
  private String teamName;
  private Set<TeamBoard> boards;
  private Location location;

  public TeamResponseModel(Long id, String teamName, Set<TeamBoard> boards, Location location)
  {
    this.id = id;
    this.teamName = teamName;
    this.boards = boards;
    this.location = location;
  }

  public TeamResponseModel()
  {
  }

  public Set<TeamBoard> getBoards()
  {
    return boards;
  }

  public void setBoards(Set<TeamBoard> boards)
  {
    this.boards = boards;
  }

  public String getTeamName()
  {
    return teamName;
  }

  public void setTeamName(String teamName)
  {
    this.teamName = teamName;
  }

  public Location getLocation()
  {
    return location;
  }

  public void setLocation(Location location)
  {
    this.location = location;
  }

  public Long getId()
  {
    return id;
  }

  public void setId(Long id)
  {
    this.id = id;
  }
  public String getStatus()
  {
    boolean active = this.boards.stream().anyMatch(teamBoard -> teamBoard.getStatus().equals(KhojiDropdownStatus.ACTIVE.getKhojiDropdownStatus()));
    return active ? KhojiDropdownStatus.ACTIVE.getKhojiDropdownStatus() : KhojiDropdownStatus.CLOSED.getKhojiDropdownStatus();
  }
}
