package uk.co.uworx.khoji.agile.service.business;


import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import lombok.extern.log4j.Log4j2;
import org.apache.commons.collections4.CollectionUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.ObjectUtils;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.internal.model.Sync;
import uk.co.uworx.khoji.agile.internal.service.AccessLevelDataService;
import uk.co.uworx.khoji.agile.internal.service.RoleService;
import uk.co.uworx.khoji.agile.persistence.context.InstanceIdContext;
import uk.co.uworx.khoji.agile.persistence.context.TenantIdContext;
import uk.co.uworx.khoji.agile.persistence.model.AccessLevel;
import uk.co.uworx.khoji.agile.persistence.model.Feature;
import uk.co.uworx.khoji.agile.persistence.model.IdentityProvider;
import uk.co.uworx.khoji.agile.persistence.model.Instance;
import uk.co.uworx.khoji.agile.persistence.model.InstanceFeature;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;
import uk.co.uworx.khoji.agile.persistence.model.KhojiUser;
import uk.co.uworx.khoji.agile.persistence.model.KhojiUserStatus;
import uk.co.uworx.khoji.agile.persistence.model.Provider;
import uk.co.uworx.khoji.agile.persistence.model.Roles;
import uk.co.uworx.khoji.agile.persistence.model.UserAccess;
import uk.co.uworx.khoji.agile.persistence.model.UserAccessCredentials;
import uk.co.uworx.khoji.agile.persistence.model.UserSettings;
import uk.co.uworx.khoji.agile.persistence.model.Workspace;
import uk.co.uworx.khoji.agile.persistence.service.ConfigDataService;
import uk.co.uworx.khoji.agile.persistence.service.IdentityProviderDataService;
import uk.co.uworx.khoji.agile.persistence.service.InstanceDataService;
import uk.co.uworx.khoji.agile.persistence.service.InstanceFeatureDataService;
import uk.co.uworx.khoji.agile.persistence.service.InstanceUserDataService;
import uk.co.uworx.khoji.agile.persistence.service.KhojiUserDataService;
import uk.co.uworx.khoji.agile.persistence.service.TeamsDataService;
import uk.co.uworx.khoji.agile.persistence.service.UserAccessCredentialsDataService;
import uk.co.uworx.khoji.agile.persistence.service.UserAccessDataService;
import uk.co.uworx.khoji.agile.persistence.service.UserSettingsDataService;
import uk.co.uworx.khoji.agile.persistence.service.WorkspaceDataService;
import uk.co.uworx.khoji.agile.response.InstanceDetailResponse;
import uk.co.uworx.khoji.agile.service.TenantService;
import uk.co.uworx.khoji.agile.service.business.instance.SyncService;
import uk.co.uworx.khoji.security.subscription.ValidateUserSubscriptionService;

import java.security.Principal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static uk.co.uworx.khoji.security.helper.SecurityConstants.BEARER;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.HEADER_AUTHORIZATION;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.USER_ACCOUNT_ID_KEY;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.USER_EMAIL_KEY;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.USER_FULL_NAME;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.USER_PROFILE_PICTURE_SOURCE_URL;

@Log4j2
@Service
public class InstanceService
{
  @Autowired
  private WorkspaceDataService workspaceDataService;
  @Autowired
  private KhojiUserDataService khojiUserDataService;
  @Autowired
  private RoleService roleService;
  @Autowired
  private AccessLevelDataService accessLevelDataService;
  @Autowired
  private FeatureService featureService;
  @Autowired
  private IdentityProviderDataService identityProviderDataService;
  @Autowired
  private InstanceDataService instanceDataService;
  @Autowired
  private InstanceFeatureDataService instanceFeatureDataService;
  @Autowired
  private UserSettingsDataService userSettingsDataService;
  @Autowired
  private InstanceUserDataService instanceUserDataService;
  @Autowired
  private ValidateUserSubscriptionService validateUserSubscriptionService;
  @Autowired
  private ObjectMapper objectMapper;
  @Autowired
  private UserAccessDataService userAccessDataService;
  @Autowired
  private UserAccessCredentialsDataService userAccessCredentialsDataService;
  @Autowired
  private TeamsDataService teamsDataService;
  @Autowired
  private TenantService tenantService;
  @Autowired
  private UserService userService;
  @Autowired
  private ConfigDataService configDataService;
  @Autowired
  private SyncService syncService;

  @Transactional(rollbackOn = { Exception.class })
  public Instance createNewInstance(Instance instance, Principal principal)
  {
    try
    {
      log.info("About to create a new instance");
      Workspace workspace = workspaceDataService
              .fetchWorkspaceById(instance.getWorkspace().getId())
              .orElseThrow(() -> new ServiceException(ServiceError.W0404));

      KhojiUser khojiUser = khojiUserDataService
              .findByEmail(principal.getName())
              .orElseThrow(() -> new ServiceException(ServiceError.U0404));

      checkIfUserHasAlreadyRegisteredTheInstance(instance, workspace, khojiUser);

      UserSettings userSettings = getExistingUserSettingsOrDefault(principal);

      //TODO: This will work for atlassian signup only
      IdentityProvider identityProvider = identityProviderDataService.getIdentityProviderByUserId(khojiUser.getId());
      Map<String, String> userResponse = fetchUserDetails(identityProvider);

      Roles role = roleService.getRoleByCode("TM");
      AccessLevel accessLevel = accessLevelDataService.findByCode("TENANT_ADMIN");

      if(ObjectUtils.isEmpty(role)  || ObjectUtils.isEmpty(accessLevel))
      {
        log.error("Database entry not found against role||accessLevel");
        throw new ServiceException(ServiceError.G0000);
      }

      UserAccessCredentials userAccessCredentials = userAccessCredentialsDataService.createOrUpdate(
              new UserAccessCredentials(
                      khojiUser.getEmail(),
                      identityProvider.getSourceAccessToken(),
                      identityProvider.getSourceRefreshToken()
              )
      );

      log.debug("User access credentials created successfully");

      Instance newInstance = instanceDataService.createOrUpdate(
              new Instance(
                      instance.getTenantId(),
                      instance.getInstanceImageUrl(),
                      instance.getInstanceName(),
                      workspace,
                      Provider.JIRA.name(),
                      false
              )
      );

      log.debug("Instance created successfully");

      UserAccess userAccess = userAccessDataService.createOrUpdateUserAccess(
              new UserAccess(
                      khojiUser,
                      newInstance,
                      userAccessCredentials,
                      instanceUserDataService.saveOrUpdate(
                              new InstanceUser(
                                      userResponse.get(USER_FULL_NAME),
                                      userResponse.get(USER_ACCOUNT_ID_KEY),
                                      newInstance,
                                      role,
                                      KhojiUserStatus.JOINED,
                                      userResponse.get(USER_EMAIL_KEY),
                                      userResponse.get(USER_PROFILE_PICTURE_SOURCE_URL),
                                      accessLevel,
                                      userSettingsDataService.saveOrUpdate(
                                              new UserSettings(
                                                      userSettings.isWorklogEmailEnabled(),
                                                      userSettings.getWorklogEmailFrequency()
                                              )
                                      ),
                                      null,
                                      null
                              )
                      )
              )
      );

      log.debug("User access created successfully");

      featureService.unlockFeatureAgainstInstance(
              new InstanceFeature(
                      newInstance,
                      new Feature(
                              instance.getFeatureId(),
                              ""
                      )
              ),
              false,
              userAccess,
              principal
      );

      configDataService.setDefaultConfigsForInstance(newInstance.getId());

      return newInstance;
    }
    catch (Exception exception)
    {
      log.debug("Exception occurred while creating instance :", exception);
      if (exception instanceof ServiceException) throw exception;
      throw new ServiceException(ServiceError.G0000);
    }
  }

  private void checkIfUserHasAlreadyRegisteredTheInstance(Instance instance, Workspace workspace, KhojiUser khojiUser)
  {
    List<String> existingInstances = instanceDataService
            .findByWorkspace(workspace)
            .stream()
            .map(Instance::getTenantId)
            .toList();

    if (existingInstances.contains(instance.getTenantId()))
    {
      log.info(
              "Tenant is already registered in workspace for user, tenant Id: {}, workspaceId: {}, userId: {}",
              instance.getTenantId(),
              workspace.getId(),
              khojiUser.getId()
      );

      throw new ServiceException(ServiceError.I0409);
    }
  }

  private UserSettings getExistingUserSettingsOrDefault(Principal principal)
  {
    UserSettings userSettings;
    try
    {
      userSettings = userService.getUserSettingsByUserId(principal);
    }
    catch (ServiceException serviceException)
    {
      log.debug("First time user, using default settings");
      userSettings = new UserSettings(
              false,
              "DAILY"
      );
    }
    catch (Exception exception)
    {
      log.debug("failed to fetch the user settings, something wrong with system, ", exception);
      throw new ServiceException(ServiceError.G0000);
    }
    return userSettings;
  }

  public Instance getInstanceAgainstId(long id)
  {
    Instance instance = instanceDataService
            .findById(id, false)
            .orElseThrow(() -> new ServiceException(ServiceError.I0404));

    List<InstanceFeature> instanceFeatures = instanceFeatureDataService.findAllByInstance(instance);
    List<Feature> features = new ArrayList<>();

    if (CollectionUtils.isNotEmpty(instanceFeatures))
    {
      features = instanceFeatures.stream().map(InstanceFeature::getFeature).toList();
    }


    return new InstanceDetailResponse(instance, features);
  }

  public void deleteInstanceAndRelatedInformation(Long id)
  {
    Instance instance = instanceDataService
            .findById(id, ObjectUtils.isEmpty(id))
            .orElseThrow(() -> new ServiceException(ServiceError.I0404));

    teamsDataService.deleteTeamsByInstanceId(id);
    instanceDataService.deleteByInstanceId(id);

    try
    {
      syncService.deleteTenantSchema(
              ObjectUtils.isEmpty(id) ? InstanceIdContext.getInstanceId() : id
      );
    }
    catch (Exception exception)
    {
      log.error("Failed to delete tenant schema at sync service (id: {}).", id, exception);
    }
  }

  private Map<String, String> fetchUserDetails(IdentityProvider identityProvider)
  {
    HashMap<String, String> responseMap = new HashMap<>();
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    headers.set(HEADER_AUTHORIZATION, BEARER + identityProvider.getSourceAccessToken());
    validateUserSubscriptionService.fetchUserSourceProfileDetailsAndAccountId(
            headers,
            objectMapper,
            responseMap
    );

    if (responseMap.isEmpty()) throw new ServiceException(ServiceError.PS003);

    return responseMap;
  }

  public String fetchUserTimeZone(Principal principal, String accountId, UserAccessCredentials userAccessCredentials, String tenantId)
  {
    log.debug("About to fetch time zone against: {}", accountId);
    Optional<String> userTimeZoneResponse = tenantService.getDataClient().getUserTimeZone(principal, accountId, userAccessCredentials, tenantId);
    log.debug("Time zone fetched: {}", userTimeZoneResponse.orElse(null));
    return userTimeZoneResponse.orElse(null);
  }

  public void acceptInvite(Long instanceId, Principal principal)
  {
    // invite already accepted
    if (userAccessDataService.findByEmailAndInstanceId(principal.getName(), instanceId).isPresent())
    {
      throw new ServiceException(ServiceError.IN000);
    }

    Instance instance = instanceDataService
            .findById(instanceId, false)
            .orElseThrow(() -> new ServiceException(ServiceError.I0404));

    InstanceUser instanceUser = instanceUserDataService.findInstanceUserUsingEmailAndInstanceId(
            principal.getName(),
            instanceId
    );

    // user is revoked but trying to accept the invite
    if (instanceUser.getStatus().equals(KhojiUserStatus.REVOKED.name())) {
      throw new ServiceException(ServiceError.NA002);
    }

    KhojiUser khojiUser = khojiUserDataService
            .findByEmail(principal.getName())
            .orElseThrow(() -> new ServiceException(ServiceError.U0404));

    IdentityProvider identityProvider = identityProviderDataService
            .getIdentityProviderByUserEmail(principal.getName())
            .orElseThrow(() -> new ServiceException(ServiceError.IP000));

    UserAccessCredentials userAccessCredentials = userAccessCredentialsDataService
            .findByEmail(principal.getName())
            .orElse(
                    userAccessCredentialsDataService.createOrUpdate(
                            new UserAccessCredentials(
                                    principal.getName(),
                                    identityProvider.getSourceAccessToken(),
                                    identityProvider.getSourceRefreshToken()
                            )
                    )
            );

    Map<String, String> userResponse = fetchUserDetails(identityProvider);

    // user account id and email is not linked on jira
    if (!instanceUser.getAccountId().equals(userResponse.get(USER_ACCOUNT_ID_KEY)))
    {
      throw new ServiceException(ServiceError.NA001);
    }

    instanceUser.setStatus(KhojiUserStatus.JOINED.name());
    instanceUserDataService.saveOrUpdate(
            instanceUser
    );

    userAccessDataService.createOrUpdateUserAccess(
            new UserAccess(
                khojiUser,
                instance,
                userAccessCredentials,
                instanceUser
            )
    );
  }

  // not complete -> out of scope for now
  public void rejectInvite(Long instanceId, Principal principal)
  {
    InstanceUser instanceUser = instanceUserDataService.findInstanceUserUsingEmailAndInstanceId(
            principal.getName(),
            instanceId
    );

    instanceUser.setStatus(KhojiUserStatus.DENIED.name());
    instanceUserDataService.saveOrUpdate(
            instanceUser
    );
  }
}
