/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.response;

import uk.co.uworx.khoji.agile.internal.model.Team;

import java.util.List;

public class TeamBoardsResponse
{
  String teamBoard;
  List<Team> teams;

  public TeamBoardsResponse(String teamBoard, List<Team> teams)
  {
    super();
    this.teamBoard = teamBoard;
    this.teams = teams;
  }

  /**
   * Default constructor for mapping
   */
  public TeamBoardsResponse()
  {
  }

  /**
   * @return the teamBoard
   */
  public String getTeamBoard()
  {
    return teamBoard;
  }

  /**
   * @param teamBoard the teamBoard to set
   */
  public void setTeamBoard(String teamBoard)
  {
    this.teamBoard = teamBoard;
  }

  /**
   * @return the teams
   */
  public List<Team> getTeams()
  {
    return teams;
  }

  /**
   * @param teams the teams to set
   */
  public void setTeams(List<Team> teams)
  {
    this.teams = teams;
  }
}
