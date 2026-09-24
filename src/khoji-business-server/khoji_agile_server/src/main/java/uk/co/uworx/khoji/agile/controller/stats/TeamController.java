/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.controller.stats;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.handler.TeamHandler;
import uk.co.uworx.khoji.agile.internal.model.TeamBoardDetail;

import java.util.ArrayList;
import java.util.Map;

@CrossOrigin
@RestController
public class TeamController
{
  @Autowired
  private TeamHandler teamHandler;

  @GetMapping(value = "/teamBoards", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<Object> listTeamBoardsWithTeamsAndMembers()
  {
    return new ResponseEntity<Object>(teamHandler.getCompleteTeamBoardsWithMembers(), HttpStatus.OK);
  }

  @GetMapping(value = "/teamNames", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<Object> listTeams()
  {
    return new ResponseEntity<Object>(teamHandler.getTeamNameList(), HttpStatus.OK);
  }

  @GetMapping(value = "/teamMembers", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<Object> getTeamMembers( @RequestParam("teamName") String teamName)
  {
    return new ResponseEntity<Object>(teamHandler.getTeamMembers(teamName), HttpStatus.OK);
  }

  @GetMapping(value = "/registeredTeams", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<Object> listRegisteredTeams( @RequestParam String username)
  {
    return new ResponseEntity<Object>(teamHandler.getTeamListAgainstAUser(username), HttpStatus.OK);
  }

  @GetMapping(value = "/registeredTeamsMembers", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<Object> listRegisteredTeamsMembers(@RequestParam String username)
  {
    return new ResponseEntity<Object>(teamHandler.getTeamMembersAgainstUser(username), HttpStatus.OK);
  }

  @GetMapping(
          value = "/registeredTeamBoards",
          produces = MediaType.APPLICATION_JSON_VALUE
  )
  public ResponseEntity<Object> listTeamBoardsWithTeamsAndMembers(
          @RequestParam String username,
          @RequestParam(required = false) String dateFrom,
          @RequestParam(required = false) String dateTo
  )
  {
    return new ResponseEntity<Object>(teamHandler.getCompleteTeamBoardsAgainstAUser(username, dateFrom, dateTo), HttpStatus.OK);
  }

  @GetMapping(value = "/registeredTeamBoardsMap", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<Map<String, TeamBoardDetail>> listTeamBoardsMap(@RequestParam String username)
  {
    return new ResponseEntity<>(teamHandler.getTeamBoardMap(username), HttpStatus.OK);
  }

  @GetMapping(value = "/teamBoardsMap", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<Map<String, TeamBoardDetail>> listTeamBoardsMap()
  {
    return new ResponseEntity<>(teamHandler.getTeamBoardMap(), HttpStatus.OK);
  }

  /**
   * To get the list of teams
   *
   * @return a ResponseEntity
   */
  @GetMapping(value = "/list/teams", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<Object> getTeamNamesList()
  {
    ArrayList<String> myTeamNamesList = new ArrayList<>(teamHandler.getTeamNameList());
    return new ResponseEntity<>(myTeamNamesList, HttpStatus.OK);
  }
}
