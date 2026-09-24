package uk.co.uworx.khoji.agile.controller.admin;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.log4j.Log4j2;
import org.apache.commons.collections4.CollectionUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.controller.admin.api.OnboardingAPI;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.internal.helper.SecurityAccessLevel;
import uk.co.uworx.khoji.agile.internal.model.Member;
import uk.co.uworx.khoji.agile.internal.model.ProjectSourceUser;
import uk.co.uworx.khoji.agile.internal.model.SourceAndKhojiUsersTeam;
import uk.co.uworx.khoji.agile.internal.model.TeamOnboarding;
import uk.co.uworx.khoji.agile.persistence.dto.TeamDTO;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;
import uk.co.uworx.khoji.agile.persistence.model.Teams;
import uk.co.uworx.khoji.agile.persistence.repository.UserAccessRepository;
import uk.co.uworx.khoji.agile.persistence.service.InstanceDataService;
import uk.co.uworx.khoji.agile.persistence.service.InstanceUserDataService;
import uk.co.uworx.khoji.agile.persistence.service.KhojiUserDataService;
import uk.co.uworx.khoji.agile.persistence.service.TeamMembersDataService;
import uk.co.uworx.khoji.agile.persistence.service.TeamsDataService;
import uk.co.uworx.khoji.agile.service.AdminService;
import uk.co.uworx.khoji.security.annotations.HasAccessToInstanceWithPrivilege;

import java.security.Principal;
import java.util.ArrayList;
import java.util.List;

@RestController
@Tag(name = "Khoji For Agile", description = "Operations to handle Onboarding APIs in Khoji For Agile")
@Validated
@Log4j2
public class OnboardingAPIImpl implements OnboardingAPI
{
  @Autowired
  private UserAccessRepository userAccessRepository;
  @Autowired
  private AdminService adminService;
  @Autowired
  private KhojiUserDataService khojiUserDataService;
  @Autowired
  private TeamsDataService teamsDataService;
  @Autowired
  private TeamMembersDataService teamMembersDataService;
  @Autowired
  private InstanceDataService instanceDataService;
  @Autowired
  private InstanceUserDataService instanceUserDataService;

  @Override
  @Transactional
  @HasAccessToInstanceWithPrivilege(
          privileges = {
                  SecurityAccessLevel.ADMIN
          }
  )
  public TeamDTO saveTeamAndSourceUsers(TeamOnboarding teamOnboarding, Principal principal)
  {
    List<InstanceUser> userList = createOrUpdateSourceUsers(teamOnboarding.getSourceUsers(), principal);
    try
    {
      Teams team = teamsDataService.findSimpleTeamById(teamOnboarding.getTeamId());
      teamMembersDataService.deleteAllMembersAndSupervisorsFromTeam(team.getId(), false);
      team.setName(teamOnboarding.getTeamName());
      teamsDataService.createOrUpdateTeam(team);

      return updateTeamWithMembers(userList, team, new ArrayList<>());
    }
    catch (Exception exception)
    {
      if (exception instanceof ServiceException) throw exception;
      log.error("Failed while updating the team: ", exception);
      throw new ServiceException(ServiceError.T0414);
    }
  }

  private List<InstanceUser> createOrUpdateSourceUsers(List<ProjectSourceUser> projectSourceUsers, Principal principal)
  {
    return adminService.createOrUpdateSourceUsers(
            projectSourceUsers,
            principal.getName(),
            null
    );
  }

  @Override
  @Transactional(
          rollbackFor = {
                  Exception.class
          }
  )
  @HasAccessToInstanceWithPrivilege(
          privileges = {
                  SecurityAccessLevel.ADMIN
          }
  )
  public TeamDTO saveTeamWithSourceUsersAndKhojiUsers(
          SourceAndKhojiUsersTeam sourceAndKhojiUsersTeam,
          Principal principal
  )
  {
    try
    {
      List<InstanceUser> userList = new ArrayList<>();
      List<InstanceUser> superVisors = new ArrayList<>();

      if (CollectionUtils.isNotEmpty(sourceAndKhojiUsersTeam.getSourceUsers()))
      {
        userList.addAll(
                createOrUpdateSourceUsers(sourceAndKhojiUsersTeam.getSourceUsers(), principal)
        );
      }

      if (CollectionUtils.isNotEmpty(sourceAndKhojiUsersTeam.getKhojiUsers()))
      {
        userList.addAll(
                instanceUserDataService.findInstanceUserUsingAccountListAndInstanceId(
                                sourceAndKhojiUsersTeam
                                        .getKhojiUsers()
                                        .stream()
                                        .map(ProjectSourceUser::getAccountId)
                                        .toList(),
                        null
                        )
                        .stream()
                        .toList()
        );
      }

      if (CollectionUtils.isNotEmpty(sourceAndKhojiUsersTeam.getSupervisors()))
      {
        superVisors.addAll(
                instanceUserDataService
                        .findInstanceUserUsingAccountListAndInstanceId(
                                sourceAndKhojiUsersTeam
                                        .getSupervisors()
                                        .stream()
                                        .map(Member::getAccountId)
                                        .toList(),
                                null
                        )
                        .stream()
                        .toList()
        );
      }


      Teams team;
      if (sourceAndKhojiUsersTeam.getTeamId() != null)
      {
        // update team
        team = teamsDataService.findSimpleTeamById(sourceAndKhojiUsersTeam.getTeamId());
        teamMembersDataService.deleteAllMembersAndSupervisorsFromTeam(team.getId(), true);
        team.setName(sourceAndKhojiUsersTeam.getTeamName());
        teamsDataService.createOrUpdateTeam(team);
      }
      else
      {
        // create team
        team = teamsDataService.createOrUpdateTeam(
                new Teams(
                        sourceAndKhojiUsersTeam.getTeamName(),
                        instanceDataService
                                .findById(null, true)
                                .orElseThrow(() -> new ServiceException(ServiceError.I1000))
                )
        );

      }
      return updateTeamWithMembers(userList, team, superVisors);
    }
    catch (Exception exception)
    {
      if (exception instanceof ServiceException)
      {
        throw exception;
      }

      log.error("Failed while updating/creating the team: ", exception);
      throw new ServiceException(ServiceError.T0414);
    }
  }

  @Override
  @HasAccessToInstanceWithPrivilege(
          privileges = {
                  SecurityAccessLevel.ADMIN
          }
  )
  public List<InstanceUser> saveOrUpdateSourceUsers(List<ProjectSourceUser> sourceUsers, Principal principal)
  {
    try
    {
      return adminService.createOrUpdateSourceUsers(
              sourceUsers,
              principal.getName(),
              null
      );
    }
    catch (Exception exception)
    {
      if (exception instanceof ServiceException)
      {
        throw exception;
      }
      log.error("Exception occurred while saving the source users: ", exception);
      throw new ServiceException(ServiceError.PS0111);
    }
  }

  private TeamDTO updateTeamWithMembers(List<InstanceUser> userList, Teams team, List<InstanceUser> superVisors)
  {
    teamMembersDataService.addMembersToTeam(
            userList
                    .stream()
                    .map(u -> teamMembersDataService.getTeamMember(u, team))
                    .toList()
    );

    teamMembersDataService.addSupervisorsToTeam(
            superVisors
                    .stream()
                    .map(u -> teamMembersDataService.getTeamSupervisor(u, team))
                    .toList()
    );

    return teamsDataService
            .fetchTeamsAgainstTeamIds(List.of(team.getId()))
            .stream()
            .findFirst()
            .orElseThrow(() -> new ServiceException(ServiceError.T0404));
  }
}