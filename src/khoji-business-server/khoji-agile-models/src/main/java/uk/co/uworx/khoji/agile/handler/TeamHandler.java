/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.handler;

import jakarta.transaction.Transactional;
import lombok.extern.log4j.Log4j2;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import uk.co.uworx.khoji.agile.config.WorklogConfig;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.internal.model.KhojiDropdownStatus;
import uk.co.uworx.khoji.agile.internal.model.Member;
import uk.co.uworx.khoji.agile.internal.model.Team;
import uk.co.uworx.khoji.agile.internal.model.TeamBoard;
import uk.co.uworx.khoji.agile.internal.model.TeamBoardDetail;
import uk.co.uworx.khoji.agile.internal.model.TeamResponseModel;
import uk.co.uworx.khoji.agile.internal.model.User;
import uk.co.uworx.khoji.agile.internal.service.MemberService;
import uk.co.uworx.khoji.agile.internal.service.TeamService;
import uk.co.uworx.khoji.agile.internal.service.UserService;
import uk.co.uworx.khoji.agile.persistence.dto.MemberDTO;
import uk.co.uworx.khoji.agile.persistence.dto.TeamDTO;
import uk.co.uworx.khoji.agile.persistence.service.TeamsDataService;
import uk.co.uworx.khoji.agile.response.RegisteredTeamsResponse;
import uk.co.uworx.khoji.agile.response.TeamBoardsResponse;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@Transactional
@Log4j2
public class TeamHandler
{
  public static final String ALL_TEAMS = "All";
  private static final String DELIMITER = ",";

  @Autowired
  private ConfigHandler configHandler;
  @Autowired
  private TeamsDataService teamsDataService;

  private TeamService teamService;
  private UserService userService;
  private MemberService memberService;
  @Autowired
  private WorklogConfig worklogConfig;

  /**
   * Returns the list of team members for the given team name
   *
   * @param teamName the team name
   * @return a list of strings
   */
  public List<String> getTeamMembers(String teamName)
  {
    if (ALL_TEAMS.equals(teamName))
    {
      return new ArrayList<>(getMemberOfTeams(teamService.getTeams(false)));
    }

    List<Team> teams = getMatchingTeams(teamName);

    return getMemberOfTeams(teams);
  }

  /**
   * Returns a map of teamBoard, team & members for the given team name
   *
   * @return the teamBoardResponse
   */
  public List<TeamBoardsResponse> getCompleteTeamBoardsWithMembers()
  {
    List<TeamBoardsResponse> teamBoardsResponse = new ArrayList<>();

    List<Team> teamsList = teamService.getTeams(false);
    for (Team team : teamsList)
    {
      if (team.getTeamName().equals("All"))
      {
        continue;
      }
      String teamName = team.getTeamName();
      String teamBoard = String.join(DELIMITER, getTeamBoardsOfTeams(Collections.singletonList(team)));
      List<Team> teams = new ArrayList<>();
      teams.add(getTeamWithMembers(teamName));
      teamBoardsResponse.add(new TeamBoardsResponse(teamBoard, teams));
    }

    return teamBoardsResponse;
  }

  /**
   * Return the team against a team name
   *
   * @param teamName the team name
   * @return the team
   */
  public Team getTeamWithMembers(String teamName)
  {
    Team teamWithMembers = new Team();

    List<Team> teams = getMatchingTeams(teamName);

    if (CollectionUtils.isNotEmpty(teams) && teams.size() == 1)
    {
      teamWithMembers = teams.getFirst();
    }

    return teamWithMembers;
  }

  /**
   * Get teams for the given team names
   *
   * @param teamNames the team names
   * @return the list of teams
   */
  @Transactional
  public List<Team> getTeams(List<String> teamNames)
  {
    List<Team> teams = null;

    if (CollectionUtils.isNotEmpty(teamNames))
    {
      teams = new ArrayList<>();

      for (String teamName : teamNames)
      {
        teams.addAll(getMatchingTeams(teamName));
      }
    }

    return teams;
  }

  /**
   * @return the set of team members
   */
  public Set<String> getTeamNameList()
  {
    return teamService.getTeams(false).stream().map(Team::getTeamName).collect(Collectors.toSet());
  }

  /**
   * To get a list of teams
   *
   * @return a list of strings
   */
  public List<String> getAllTeamsAsList()
  {
    return teamService.getTeams(false).stream().map(Team::getTeamName).collect(Collectors.toList());
  }

  public List<TeamDTO> getAllTeamsDetailsAsList(){
    return teamsDataService.fetchAllTeams(null);
  }

  private List<String> getMemberOfTeams(List<Team> teams)
  {
    List<String> teamMembers = new ArrayList<>();

    for (Team team : teams)
    {
      for (Member teamMember : team.getMember())
      {
        teamMembers.add(teamMember.getMemberEmail());
      }
    }

    return teamMembers;
  }

  private List<String> getTeamBoardsOfTeams(List<Team> teams)
  {
    List<String> teamBoards = new ArrayList<>();

    for (Team team : teams)
    {
      Team teamData = teamService.findById(team.getId());

      for (TeamBoard teamBoard : teamData.getBoards())
      {
        if (teamBoard.getBoardName() != null)
        {
          teamBoards.add(teamBoard.getBoardName());
        }
      }
    }

    if (!CollectionUtils.isEmpty(teamBoards))
    {
      teamBoards.sort(String.CASE_INSENSITIVE_ORDER);
    }

    return teamBoards;
  }

  private List<Team> getMatchingTeams(String teamName)
  {
    Optional<Team> team = teamService.findbyTeamName(teamName);
    if (team.isPresent())
    {
      return Arrays.asList(team.get());
    }
    return null;
  }

  private List<TeamDTO> getMatchingTeamsDTO(String teamName)
  {
    List<TeamDTO> team = teamsDataService.fetchTeamsAgainstTeamName(Collections.singletonList(teamName));
    if (CollectionUtils.isNotEmpty(team))
    {
      return team;
    }
    return new ArrayList<>();
  }

  public List<RegisteredTeamsResponse> getTeamListAgainstAUser(String userName)
  {
    List<RegisteredTeamsResponse> registeredTeamsResponses = new ArrayList<>();
    Set<String> teamsNames = Collections.emptySet();
    try
    {
      List<String> registeredTeams = getTeamsAgainstUser(userName);
      if (registeredTeams.contains(ALL_TEAMS))
      {
        teamsNames = getTeamNameList();
        teamsNames.remove("All");
      }
      else
      {
        teamsNames = new HashSet<>(registeredTeams);
      }
      List<Team> teamList = getTeams(new ArrayList<>(teamsNames));
      for (Team team : teamList)
      {
        String teamActiveStatus = team.getStatus();
        RegisteredTeamsResponse registeredTeamsResponse = new RegisteredTeamsResponse();
        registeredTeamsResponse.setTeamName(team.getTeamName());
        registeredTeamsResponse.setStatus(teamActiveStatus);
        if (configHandler.includeInActiveTeamsInResponse)
        {
          registeredTeamsResponses.add(registeredTeamsResponse);
        }
        else if (teamActiveStatus.equals(KhojiDropdownStatus.ACTIVE.getKhojiDropdownStatus()))
        {
          registeredTeamsResponses.add(registeredTeamsResponse);
        }
      }

      sortRegisteredTeamsResponseList(registeredTeamsResponses);
    }
    catch (ServiceException serviceException)
    {
      throw serviceException;
    }
    catch (Exception exception)
    {
      log.error("exception occurred while getting teamList against user: {}", userName, exception);
    }
    return registeredTeamsResponses;
  }

  private void sortRegisteredTeamsResponseList(List<RegisteredTeamsResponse> registeredTeamsResponses)
  {
    Collections.sort(registeredTeamsResponses, Comparator.comparing(RegisteredTeamsResponse::getTeamName));
    Collections.sort(registeredTeamsResponses, Comparator.comparing(RegisteredTeamsResponse::getStatus).reversed());
  }

  public List<String> getTeamMembersAgainstUser(String userName)
  {
    List<String> teamMembers = new ArrayList<String>();
    try
    {
      List<String> registeredTeams = getTeamsAgainstUser(userName);
      if (registeredTeams.contains(ALL_TEAMS))
      {
        teamMembers = getTeamMembers(ALL_TEAMS);
      }
      else
      {
        for (String registeredTeam : registeredTeams)
        {
          teamMembers.addAll(getTeamMembers(registeredTeam));
        }
      }
    }
    catch (Exception exception)
    {
      log.error("exception occurred while getting teamMembers against user: {}", userName, exception);
    }
    return teamMembers;
  }

  public List<String> getTeamsAgainstUser(String userName)
  {
    Optional<User> user = userService.findByUsername(userName);
    if (user.isPresent())
    {
      List<String> data = new ArrayList<>();
      List<String> userteams = new ArrayList<>();

      if (worklogConfig.globalTeamAccessEnabled)
      {
        List<Team> dbTeams = teamService.getTeams(false);
        userteams = dbTeams.stream().map(
                Team::getTeamName
        ).collect(Collectors.toList());
      }
      else
      {
        userteams = userService.getuserAccessTeams(user.get());
      }

      List<String> memberTeams = getMemberAssignedTeams(user, userteams);

      if (memberTeams != null)
      {
        data.addAll(memberTeams);
      }
      if (userteams != null)
      {
        data.addAll(userteams);
      }
      data = data.stream().distinct().collect(Collectors.toList());
      return data;
    }
    else
    {
      throw new ServiceException(ServiceError.T0407);
    }
  }

  private List<String> getMemberAssignedTeams(Optional<User> user, List<String> userteams)
  {
    List<String> memberTeams = null;
    try
    {
      memberTeams = memberService.getTeamsAssignedToMember(user.get().getMember().getId());
    }
    catch (ServiceException exception)
    {
      log.error("Teams not found for member ", exception);
    }
    finally
    {
      if (memberTeams == null && (userteams == null || userteams.isEmpty()))
      {
        throw new ServiceException(ServiceError.M0900);
      }
    }
    return memberTeams;
  }

  public List<TeamResponseModel> getCompleteTeamBoardsAgainstAUser(String username, String dateFrom, String dateTo)
  {
    List<String> registeredTeams = getTeamsAgainstUser(username);
    List<Team> registeredTeamsModel = new ArrayList<>();
    List<TeamResponseModel> teamResponseModel = new ArrayList<>();
    if (registeredTeams != null)
    {
      if (registeredTeams.contains(ALL_TEAMS))
      {
        registeredTeamsModel.addAll(teamService.getTeams(false));
      }
      else
      {
        for (String registeredTeam : registeredTeams)
        {
          Optional<Team> teamOptionalList = teamService.findbyTeamName(registeredTeam);
          if (teamOptionalList.isPresent())
          {
            registeredTeamsModel.add(teamOptionalList.get());
          }
        }
      }
    }

    sortTeamsList(registeredTeamsModel);

    if (!configHandler.includeInActiveTeamsInResponse)
    {
      registeredTeamsModel.forEach(team -> teamResponseModel.add(new TeamResponseModel(team.getId(), team.getTeamName(), team.getBoards(), team.getLocation())));
      return teamResponseModel.stream().filter(team -> team.getStatus().equals(KhojiDropdownStatus.ACTIVE.getKhojiDropdownStatus())).collect(Collectors.toList());
    }

    registeredTeamsModel.forEach(team -> teamResponseModel.add(new TeamResponseModel(team.getId(), team.getTeamName(), team.getBoards(), team.getLocation())));
    return teamResponseModel;
  }

  private void sortTeamsList(List<Team> teamList)
  {
    Collections.sort(teamList, Comparator.comparing(Team::getTeamName));
    Collections.sort(teamList, Comparator.comparing(Team::getStatus).reversed());
  }

  private HashMap<String, TeamBoardDetail> getTeamBoardMapForAllTeams()
  {
    HashMap<String, TeamBoardDetail> teamBoardMap = new HashMap<>();

    teamBoardMap = getTeamBoardMapForGivenTeams(teamService.getTeams(false));

    return teamBoardMap;
  }

  /**
   * @return the team board map for all teams
   */
  public Map<String, TeamBoardDetail> getTeamBoardMap()
  {
    HashMap<String, TeamBoardDetail> teamBoardMap = new HashMap<>();

    teamBoardMap = getTeamBoardMapForGivenTeams(teamService.getTeams(false));

    return sortTeamBoardMap(teamBoardMap);
  }

  private Map<String, TeamBoardDetail> sortTeamBoardMap(Map<String, TeamBoardDetail> teamBoardDetailMap)
  {
    Comparator<Map.Entry<String, TeamBoardDetail>> activeTeamComparator = (teamBoard1, teamBoard2) -> {
      return (-1 * Boolean.compare(teamBoard1.getValue().getStatus().equals(KhojiDropdownStatus.ACTIVE.getKhojiDropdownStatus()), teamBoard2.getValue().getStatus().equals(KhojiDropdownStatus.ACTIVE.getKhojiDropdownStatus())));
    };
    Comparator<Map.Entry<String, TeamBoardDetail>> nameBasedComparator = (teamBoard1, teamBoard2) -> {
      String[] team1 = teamBoard1.getKey().split("-");
      String[] team2 = teamBoard2.getKey().split("-");
      if (team1[0].equals(team2[0]))
      {
        return teamBoard1.getKey().compareTo(teamBoard2.getKey());
      }

      return team1[0].compareTo(team2[0]);
    };
    List<Map.Entry<String, TeamBoardDetail>> sortingListForActiveEntries = new ArrayList<>(teamBoardDetailMap.entrySet());
    Collections.sort(sortingListForActiveEntries, nameBasedComparator);
    Collections.sort(sortingListForActiveEntries, activeTeamComparator);
    Map<String, TeamBoardDetail> sortedTeamBoardMap = new LinkedHashMap<>(sortingListForActiveEntries.size());
    for (Map.Entry<String, TeamBoardDetail> entry : sortingListForActiveEntries)
    {
      sortedTeamBoardMap.put(entry.getKey(), entry.getValue());
    }
    return sortedTeamBoardMap;
  }

  public Map<String, TeamBoardDetail> getTeamBoardMap(String username)
  {
    HashMap<String, TeamBoardDetail> teamBoardMap = new HashMap<>();
    List<String> registeredTeams = getTeamsAgainstUser(username);
    if (registeredTeams != null && registeredTeams.size() != 0)
    {
      if (registeredTeams.contains(ALL_TEAMS))
      {
        teamBoardMap = getTeamBoardMapForAllTeams();
      }
      else
      {
        List<Team> teamList = getTeams(registeredTeams);
        teamBoardMap = getTeamBoardMapForGivenTeams(teamList);
      }
    }
    else 
    {
      return teamBoardMap;
    }

    return sortTeamBoardMap(teamBoardMap);
  }

  private HashMap<String, TeamBoardDetail> getTeamBoardMapForGivenTeams(List<Team> teams)
  {
    HashMap<String, TeamBoardDetail> teamBoardMap = null;
    if (CollectionUtils.isNotEmpty(teams))
    {
      teamBoardMap = new HashMap<>();
      for (Team team : teams)
      {
        Team teamByID = teamService.findById(team.getId());
        for (TeamBoard teamBoard : teamByID.getBoards())
        {
          TeamBoardDetail teamBoardDetail = getTeamBoardDetail(teamBoard, team.getTeamName());
          if (configHandler.includeInActiveTeamsInResponse)
          {
            teamBoardMap.put(getTeamBoardMapKey(teamBoard, team.getTeamName()), teamBoardDetail);
          }
          else if (teamBoardDetail.getStatus().equals(KhojiDropdownStatus.ACTIVE.getKhojiDropdownStatus()))
          {
            teamBoardMap.put(getTeamBoardMapKey(teamBoard, team.getTeamName()), teamBoardDetail);
          }
        }
      }
    }
    return teamBoardMap;
  }

  private String getTeamBoardMapKey(TeamBoard teamBoard, String teamName)
  {
    String key = null;

    if (teamBoard != null && StringUtils.isNotEmpty(teamBoard.getBoardName()))
    {
      key = teamName + " - " + teamBoard.getBoardName();
    }
    return key;
  }

  private TeamBoardDetail getTeamBoardDetail(TeamBoard teamBoard, String teamName)
  {
    TeamBoardDetail teamBoardDetail = null;

    if (teamBoard != null && StringUtils.isNotEmpty(teamBoard.getBoardName()))
    {
      teamBoardDetail = new TeamBoardDetail();
      teamBoardDetail.setTeamName(teamName);
      teamBoardDetail.setTeamBoardName(teamBoard.getBoardName());
      teamBoardDetail.setStatus(teamBoard.getStatus());
      teamBoardDetail.setDateCreated(teamBoard.getDateStarted());
      teamBoardDetail.setDateDesolved(teamBoard.getDateDissolved());
      teamBoardDetail.setBoardType(teamBoard.getType());
      teamBoardDetail.setTeamBoardId(teamBoard.getBoardID());
    }
    return teamBoardDetail;
  }

  public List<Member> getAllTeamMemberObjects(List<String> teams)
  {
    List<Member> membersList = new ArrayList<>();
    for (String teamName : teams)
    {
      if (ALL_TEAMS.equals(teamName))
      {
        membersList.addAll(getAllMembersOfTeam(teamService.getTeams(false)));
        return membersList;
      }
      else
      {
        membersList.addAll(getAllMembersOfTeam(getMatchingTeams(teamName)));
      }
    }
    return membersList;
  }

  public List<MemberDTO> getAllTeamMemberObjectsDTO(List<String> teams)
  {
    List<MemberDTO> membersList = new ArrayList<>();
    for (String teamName : teams)
    {
      membersList.addAll(getAllMembersOfTeamDTO(getMatchingTeamsDTO(teamName)));
    }
    return membersList;
  }

  private List<Member> getAllMembersOfTeam(List<Team> teams)
  {
    List<Member> teamMembersList = new ArrayList<>();
    for (Team team : teams)
    {
      teamMembersList.addAll(team.getMember());
    }
    return teamMembersList;
  }

  private List<MemberDTO> getAllMembersOfTeamDTO(List<TeamDTO> teams)
  {
    List<MemberDTO> teamMembersList = new ArrayList<>();
    for (TeamDTO team : teams)
    {
      teamMembersList.addAll(team.getMembers());
    }
    return teamMembersList;
  }

  public List<Team> findTeamsByName(List<String> teamNames)
  {
    return teamService.findTeamsByName(teamNames);
  }
}
