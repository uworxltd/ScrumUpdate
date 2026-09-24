/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.service.business;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.internal.model.InstanceUserDetails;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;
import uk.co.uworx.khoji.agile.persistence.model.Integrations;
import uk.co.uworx.khoji.agile.persistence.model.UserAccess;
import uk.co.uworx.khoji.agile.persistence.service.InstanceUserConfigDataService;
import uk.co.uworx.khoji.agile.persistence.service.InstanceUserDataService;
import uk.co.uworx.khoji.agile.persistence.service.UserAccessDataService;
import uk.co.uworx.khoji.agile.service.TenantService;
import uk.co.uworx.khoji.agile.service.TimeService;
import uk.co.uworx.khoji.agile.service.business.integration.IntegrationsService;

import java.security.Principal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Log4j2
@Service
public class InstanceUserService
{
  public static final String LEAVES = "LEAVES";
  public final ObjectMapper objectMapper = new ObjectMapper();
  @Autowired
  private InstanceUserDataService instanceUserDataService;
  @Autowired
  private InstanceUserConfigDataService instanceUserConfigDataService;
  @Autowired
  private IntegrationsService integrationsService;
  @Autowired
  private TimeService timeService;
  @Autowired
  private TenantService tenantService;
  @Autowired
  private UserAccessDataService userAccessDataService;

  public void saveUserPreferences(HashMap<String, HashMap<String, Object>> userPreference, Principal principal)
  {
    InstanceUser instanceUser = instanceUserDataService
            .findInstanceUserUsingEmailAndInstanceId(
                    principal.getName(),
                    null
            );

    saveInstanceUserConfig(userPreference, LEAVES, "ticketId",instanceUser);
  }

  private void saveInstanceUserConfig(HashMap<String, HashMap<String, Object>> userPreference, String key, String subKey, InstanceUser instanceUser)
  {
    try
    {
      if (userPreference.containsKey(key))
      {
        instanceUserConfigDataService.saveInstanceUserConfig(
                key,
                userPreference.get(key).get(subKey) instanceof String ? (String) userPreference.get(key).get(subKey) :
                        objectMapper.writeValueAsString(
                                userPreference.get(key).get(subKey)
                        ),
                instanceUser
        );
      }
      else
      {
        log.error("Config key not found against user: {}, {}", key, instanceUser.getId());
      }
    }
    catch (Exception exception)
    {
      log.error("Failed to save user config");
      throw new ServiceException(ServiceError.IUC001);
    }
  }

  public InstanceUserDetails getInstanceUserDetails(Principal principal, String timeZone)
  {
    InstanceUser instanceUser = getInstanceUserAgainstPrincipal(principal, timeZone);
    HashMap<String, String> instanceUserConfigs  = instanceUserConfigDataService
            .convertListToHashMap(
                    instanceUserConfigDataService
                            .getAllInstanceUserConfigs(
                                    instanceUser
                            )
    );

    Optional<Integrations> userCalendarIntegration = integrationsService.getIntegration(principal);
    boolean calendarIntegration = false;
    boolean calendarTokenValid = false;
    if (userCalendarIntegration.isPresent())
    {
      calendarIntegration = true;
      calendarTokenValid = !timeService.isOlderThan(
              userCalendarIntegration.get().getRefreshTokenCreatedAt(),
              integrationsService.msRefreshTokenLifetime
      );
    }

    return new InstanceUserDetails(
            calendarIntegration,
            calendarTokenValid,
            instanceUser.getAccountId(),
            instanceUser.getFullName(),
            instanceUser.getTimeZone(),
            Map.of(
                    LEAVES, instanceUserConfigs.get(LEAVES) == null ? "" : instanceUserConfigs.get(LEAVES)
            )
    );
  }


  public InstanceUser getInstanceUserWithAccountId(String accountId)
  {
    InstanceUser instanceUser = instanceUserDataService
            .findInstanceUserUsingAccountAndInstanceId(accountId, null);

    if (instanceUser == null)
    {
      log.error("Instance user not found against account Id: {}", accountId);
      throw new ServiceException(ServiceError.IU001);
    }

    return instanceUser;
  }

  // Use this method in favour of the above method if user's timezone is required
  public InstanceUser getInstanceUserAgainstPrincipal(Principal principal, String timeZone)
  {
    InstanceUser instanceUser = instanceUserDataService
            .findInstanceUserUsingEmailAndInstanceId(principal.getName(), null);

    if (instanceUser == null)
    {
      log.error("Instance user not found against email: {}", principal.getName());
      throw new ServiceException(ServiceError.IU001);
    }
    instanceUser.setTimeZone(timeZone == null ? fetchInstanceUserTimezone(principal, instanceUser) : timeZone);

    return instanceUser;
  }

  private String fetchInstanceUserTimezone(Principal principal, InstanceUser instanceUser)
  {
    Optional<UserAccess> userAccessOptional = userAccessDataService.findByEmailAndInstanceId(principal.getName(), null);
    if (userAccessOptional.isPresent())
    {
      log.debug("About to fetch time zone against: {}", instanceUser.getAccountId());
      Optional<String> userTimeZoneResponse = tenantService.getDataClient().getUserTimeZone(principal, instanceUser.getAccountId(), userAccessOptional.get().getUserAccessCredentials(), instanceUser.getInstance().getTenantId());
      log.debug("Time zone fetched: {}", userTimeZoneResponse.orElse(null));
      return userTimeZoneResponse.orElse(null);
    }
    return null;
  }

}
