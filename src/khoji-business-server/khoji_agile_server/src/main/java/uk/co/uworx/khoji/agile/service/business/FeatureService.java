package uk.co.uworx.khoji.agile.service.business;


import jakarta.transaction.Transactional;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.internal.model.Sync;
import uk.co.uworx.khoji.agile.persistence.context.InstanceIdContext;
import uk.co.uworx.khoji.agile.persistence.context.TenantIdContext;
import uk.co.uworx.khoji.agile.persistence.model.Feature;
import uk.co.uworx.khoji.agile.persistence.model.Instance;
import uk.co.uworx.khoji.agile.persistence.model.InstanceFeature;
import uk.co.uworx.khoji.agile.persistence.model.KhojiUser;
import uk.co.uworx.khoji.agile.persistence.model.TeamMembers;
import uk.co.uworx.khoji.agile.persistence.model.TeamSupervisor;
import uk.co.uworx.khoji.agile.persistence.model.Teams;
import uk.co.uworx.khoji.agile.persistence.model.UserAccess;
import uk.co.uworx.khoji.agile.persistence.service.InstanceDataService;
import uk.co.uworx.khoji.agile.persistence.service.InstanceFeatureDataService;
import uk.co.uworx.khoji.agile.persistence.service.KhojiFeatureDataService;
import uk.co.uworx.khoji.agile.persistence.service.KhojiUserDataService;
import uk.co.uworx.khoji.agile.persistence.service.TeamMembersDataService;
import uk.co.uworx.khoji.agile.persistence.service.TeamsDataService;
import uk.co.uworx.khoji.agile.persistence.service.UserAccessDataService;
import uk.co.uworx.khoji.agile.service.business.instance.SyncService;

import java.security.Principal;
import java.util.ArrayList;
import java.util.List;

@Log4j2
@Service
public class FeatureService
{
  @Autowired
  private KhojiFeatureDataService khojiFeatureDataService;
  @Autowired
  private InstanceDataService instanceDataService;
  @Autowired
  private InstanceFeatureDataService instanceFeatureDataService;
  @Autowired
  private TeamsDataService teamsDataService;
  @Autowired
  private TeamMembersDataService teamMembersDataService;
  @Autowired
  private UserAccessDataService userAccessDataService;
  @Autowired
  private KhojiUserDataService khojiUserDataService;
  @Autowired
  private SyncService syncService;


  public List<Feature> getAllAvailableFeatures()
  {
    return khojiFeatureDataService.getAllAvailableFeatures();
  }

  @Transactional(rollbackOn = Exception.class)
  public InstanceFeature unlockFeatureAgainstInstance(
          InstanceFeature instanceFeature,
          boolean fetchDataFromDb,
          UserAccess createdUserAccess,
          Principal principal
  )
  {
    log.debug("About to unlock feature for user: {}", principal.getName());

    Instance instance = fetchDataFromDb ?
            instanceDataService
                    .findById(instanceFeature.getInstance().getId(), false)
                    .orElseThrow(() -> new ServiceException(ServiceError.I0404)) :
            instanceFeature.getInstance();

    Feature feature = khojiFeatureDataService
            .getFeatureById(instanceFeature.getFeature().getId())
            .orElseThrow(() -> new ServiceException(ServiceError.F0404));

    KhojiUser khojiUser = fetchDataFromDb ?
                          khojiUserDataService
                                  .findByEmail(principal.getName())
                                  .orElseThrow(() -> new ServiceException(ServiceError.U0404)) :
                          null;

    UserAccess userAccess = fetchDataFromDb ?
                            userAccessDataService
                                    .findByUserIdAndInstanceId(
                                            khojiUser.getId(),
                                            null
                                    )
                                    .orElseThrow(() -> new ServiceException(ServiceError.G0000)) :
                            createdUserAccess;

    if (instanceFeatureDataService.checkIfFeatureIsUnlockedAgainstInstance(feature.getId(), instance.getId()))
    {
      log.error("Feature already unlocked");
      throw new ServiceException(ServiceError.FE100);
    }

    InstanceFeature newInstancefeature = new InstanceFeature(
            instance,
            feature
    );

    if (
            newInstancefeature
                    .getFeature()
                    .getId()
                    .equals(2L)
    )
    {
      log.debug("Creating team against user: {}", principal.getName());
      Teams team = teamsDataService.createOrUpdateTeam(
              new Teams(
                      userAccess
                              .getInstanceUser()
                              .getFullName()
                              .split(" ")[0] + "'s Team - " + instance.getInstanceName(),
                      instance
              )
      );

      log.debug("Team created successfully with name: {}", team.getName());
      List<TeamMembers> teamMembersList = new ArrayList<>();
      List<TeamSupervisor> teamSupervisorList = new ArrayList<>();

      teamMembersList.add(
              teamMembersDataService.getTeamMember(userAccess.getInstanceUser(), team)
      );

      teamSupervisorList.add(
              teamMembersDataService.getTeamSupervisor(userAccess.getInstanceUser(), team)
      );

      teamMembersDataService.addMembersToTeam(teamMembersList);
      teamMembersDataService.addSupervisorsToTeam(teamSupervisorList);
      log.debug("Members added in team: {}", teamMembersList.size());
      log.debug("Supervisors added in team: {}", teamSupervisorList.size());

      InstanceIdContext.setInstanceId(String.valueOf(userAccess.getInstance().getId()));
      TenantIdContext.setTenantId(userAccess.getInstance().getTenantId());
    }

    return instanceFeatureDataService.saveOrUpdate(newInstancefeature);
  }
}
