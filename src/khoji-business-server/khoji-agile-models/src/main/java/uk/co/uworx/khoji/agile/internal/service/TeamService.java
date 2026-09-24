/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.service;

import org.springframework.transaction.annotation.Transactional;
import uk.co.uworx.khoji.agile.internal.model.Location;
import uk.co.uworx.khoji.agile.internal.model.Member;
import uk.co.uworx.khoji.agile.internal.model.MemberAPIResponse;
import uk.co.uworx.khoji.agile.internal.model.Team;
import uk.co.uworx.khoji.agile.internal.model.TeamBoard;
import uk.co.uworx.khoji.agile.internal.model.User;
import uk.co.uworx.khoji.agile.internal.model.request.ActiveMembersRequest;
import uk.co.uworx.khoji.agile.internal.model.request.BulkSupervisorsAllocationRequest;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

public interface TeamService
{
  @Transactional
  Team createTeam(Team team, String loggedInUser, String loggedInUserIp);

  List<Team> getTeams(boolean includeAllAsATeam);

  Team findById(long id);

  Optional<Team> findbyTeamName(String teamName);

  @Transactional
  Team updateName(Long teamId, String team, String loggedInUser, String loggedInUserIp, Location location);

  @Transactional
  Team addMember(List<Member> member, Long teamID, String loggedInUser, String loggedInUserIp);
  
  @Transactional
  Team addSupervisor(Team team);
  
  @Transactional
  void updateSupervisorsInBulk(BulkSupervisorsAllocationRequest bulkSupervisorsAllocationRequest);

  @Transactional
  Team addBoard(List<TeamBoard> board, Long teamID, String loggedInUser, String loggedInUserIp);

  @Transactional
  void deleteMember(Long member, Long teamID, String loggedInUser, String loggedInUserIp);

  @Transactional
  void deleteBoard(Long boardID, Long teamID, String loggedInUser, String loggedInUserIp);

  @Transactional
  void deleteTeams(List<Long> ids, String loggedInUser, String loggedInUserIp);

  @Transactional
  Team updateTeam(Team team, String loggedInUser, String loggedInUserIp, boolean changeSupervisorsState);

  @Transactional
  void deleteAllTeamsAndBoards();

  boolean doesAllTeamsExists(List<Long> ids);

  List<Team> getTeamsByLocation(Long location);

  Set<User> getUsersFromAllTeams();

  Map<Long, List<Member>> getAllTeamMembers(String username, String clientIp, ActiveMembersRequest activeMembersRequest);

  void removeRevokedMemberFromAllTeams(User user);

  List<Team> findTeamsByName(List<String> teamName);
}
