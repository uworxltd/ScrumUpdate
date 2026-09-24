package uk.co.uworx.khoji.agile.persistence.service;

import org.apache.commons.collections4.CollectionUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;
import uk.co.uworx.khoji.agile.persistence.model.TeamMembers;
import uk.co.uworx.khoji.agile.persistence.model.TeamSupervisor;
import uk.co.uworx.khoji.agile.persistence.model.Teams;
import uk.co.uworx.khoji.agile.persistence.repository.TeamMembersRepository;
import uk.co.uworx.khoji.agile.persistence.repository.TeamSupervisorRepository;

import java.util.ArrayList;
import java.util.List;

@Service
public class TeamMembersDataService
{
  @Autowired
  private TeamMembersRepository teamMembersRepository;
  @Autowired
  private TeamSupervisorRepository teamSupervisorRepository;

  public List<Long> getInstanceUserTeamsIds(Long userId, boolean superVisor, boolean teamMember)
  {
    List<Long> teamIds = new ArrayList<>();
    if (teamMember) teamIds.addAll(teamMembersRepository.findTeamIdsUserIsPartOf(userId));
    if (superVisor) teamIds.addAll(teamSupervisorRepository.findTeamIdsUserIsPartOf(userId));
    return teamIds.stream().distinct().toList();
  }

  public void deleteAllMembersAndSupervisorsFromTeam(Long teamId, boolean deleteSupervisors)
  {
    teamMembersRepository.deleteAllByTeamId(teamId);
    if(deleteSupervisors) teamSupervisorRepository.deleteAllByTeamId(teamId);
  }

  public void deleteAllMembersAndSupervisorsFromTeams(List<Long> teamIds, boolean deleteSupervisors)
  {
    teamMembersRepository.deleteAllByTeamIds(teamIds);
    if(deleteSupervisors) teamSupervisorRepository.deleteAllByTeamIds(teamIds);
  }

  public List<TeamMembers> addMembersToTeam(List<TeamMembers> teamMembersList)
  {
    if (CollectionUtils.isEmpty(teamMembersList)) return new ArrayList<>();
    return teamMembersList
            .stream()
            .map(teamMembers -> teamMembersRepository.save(teamMembers))
            .toList();

  }

  public void removeRevokedUserFromTeams(Long userId)
  {
    teamMembersRepository.deleteAllByUserId(userId);
    teamSupervisorRepository.deleteAllByUserId(userId);
  }

  public TeamMembers getTeamMember(InstanceUser khojiUser, Teams teams)
  {
    return new TeamMembers(
            teams.getId(),
            khojiUser.getId()
    );
  }

  public List<TeamSupervisor> addSupervisorsToTeam(List<TeamSupervisor> teamSupervisorList)
  {
    if (CollectionUtils.isEmpty(teamSupervisorList)) return new ArrayList<>();

    return teamSupervisorList
            .stream()
            .map(teamMembers -> teamSupervisorRepository.save(teamMembers))
            .toList();

  }

  public TeamSupervisor getTeamSupervisor(InstanceUser khojiUser, Teams teams)
  {
    return new TeamSupervisor(
            teams.getId(),
            khojiUser.getId()
    );
  }
}
