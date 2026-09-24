package uk.co.uworx.khoji.agile.persistence.service;

import com.fasterxml.jackson.core.type.TypeReference;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.internal.helper.JsonDeSerializer;
import uk.co.uworx.khoji.agile.persistence.dto.TeamDTO;
import uk.co.uworx.khoji.agile.persistence.model.Teams;
import uk.co.uworx.khoji.agile.persistence.projection.TeamProjection;
import uk.co.uworx.khoji.agile.persistence.repository.TeamsRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Log4j2
public class TeamsDataService
{
  @Autowired
  private TeamsRepository teamsRepository;

  public List<TeamDTO> fetchAllTeams(Long instanceId)
  {
    return teamsRepository
            .findTeamsByInstanceId(instanceId)
            .stream()
            .map(
                    this::mapToDTO
            )
            .toList();
  }

  public void deleteTeamsAgainstIds(List<Long> ids)
  {
    teamsRepository.deleteTeamsByIds(ids);
  }

  public List<String> getTeamNamesAgainstTeamIds(List<Long> teamIds)
  {
    if (CollectionUtils.isEmpty(teamIds))
    {
      return new ArrayList<>();
    }

    return teamsRepository
            .findSimpleTeamsFromIds(teamIds)
            .stream()
            .map(Teams::getName)
            .toList();
  }

  public List<TeamDTO> fetchTeamsAgainstTeamIds(List<Long> teamIds)
  {
    return teamsRepository
            .findTeamsFromIdsByInstanceId(teamIds, null)
            .stream()
            .map(
                    this::mapToDTO
            )
            .toList();
  }

  public List<TeamDTO> fetchTeamsAgainstTeamName(List<String> teamName)
  {
    return teamsRepository
            .findTeamsFromNameByInstanceId(teamName, null)
            .stream()
            .map(
                    this::mapToDTO
            )
            .toList();
  }

  public Teams createOrUpdateTeam(Teams team)
  {
    return teamsRepository.save(team);
  }

  public Teams findSimpleTeamById(Long teamId)
  {
    Optional<Teams> team = teamsRepository.findSimpleTeamFromIdByInstanceId(teamId, null);
    if (team.isPresent()) return team.get();
    throw new ServiceException(ServiceError.T0404);
  }

  public List<Teams> findAllSimpleTeamsByInstanceId(Long instanceId)
  {
    return teamsRepository.findAllByInstanceId(instanceId);
  }

  public List<Teams> findSimpleTeamsByIds(List<Long> teamIds)
  {
    return teamsRepository.findSimpleTeamsFromIds(teamIds);
  }

  private TeamDTO mapToDTO(TeamProjection projection) {
    TeamDTO dto = new TeamDTO();
    dto.setId(projection.getId());
    dto.setTeamName(projection.getTeamName());
    dto.setMembers(new JsonDeSerializer().deserializeJson(projection.getMembers(), new TypeReference<>() {}));
    dto.setSupervisors(new JsonDeSerializer().deserializeJson(projection.getSupervisors(), new TypeReference<>() {}));

    return dto;
  }

  public void deleteTeamsByInstanceId(Long instanceId)
  {
    teamsRepository.deleteTeamsByInstanceId(instanceId);
  }
}
