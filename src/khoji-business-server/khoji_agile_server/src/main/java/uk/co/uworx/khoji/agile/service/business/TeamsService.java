package uk.co.uworx.khoji.agile.service.business;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uk.co.uworx.khoji.agile.persistence.dto.MemberDTO;
import uk.co.uworx.khoji.agile.persistence.dto.TeamDTO;
import uk.co.uworx.khoji.agile.persistence.service.TeamMembersDataService;
import uk.co.uworx.khoji.agile.persistence.service.TeamsDataService;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class TeamsService
{
  @Autowired
  private TeamsDataService teamsDataService;
  @Autowired
  private TeamMembersDataService teamMembersDataService;

  public List<TeamDTO> getAllTeams()
  {
    return teamsDataService.fetchAllTeams(null);
  }

  public Map<Long, List<MemberDTO>> getTeamsAgainstIds(List<Long> teamIds)
  {
    List<TeamDTO> teams = teamsDataService.fetchTeamsAgainstTeamIds(teamIds);
    return teams
            .stream()
            .collect(
                    Collectors.toMap(
                            TeamDTO::getId,
                            TeamDTO::getMembers
                    )
            );
  }

  @Transactional
  public void deleteTeamsByIds(List<Long> ids)
  {
    teamMembersDataService.deleteAllMembersAndSupervisorsFromTeams(ids, true);
    teamsDataService.deleteTeamsAgainstIds(ids);
  }

  public List<TeamDTO> getTeamsByName(List<String> teamNames)
  {
    return teamsDataService.fetchTeamsAgainstTeamName(teamNames);
  }
}
