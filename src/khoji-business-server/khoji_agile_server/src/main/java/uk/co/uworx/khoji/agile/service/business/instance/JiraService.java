package uk.co.uworx.khoji.agile.service.business.instance;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.persistence.model.IdentityProvider;
import uk.co.uworx.khoji.agile.persistence.service.IdentityProviderDataService;
import uk.co.uworx.khoji.agile.persistence.service.InstanceUserDataService;
import uk.co.uworx.khoji.agile.persistence.service.UserAccessDataService;
import uk.co.uworx.khoji.agile.response.AccessibleResources;
import uk.co.uworx.khoji.agile.stats.provider.jira.exception.SourceSystemServiceException;
import uk.co.uworx.khoji.security.subscription.ValidateUserSubscriptionService;

import java.security.Principal;
import java.util.List;
import java.util.Optional;

import static uk.co.uworx.khoji.security.helper.SecurityConstants.BEARER;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.HEADER_AUTHORIZATION;

@Log4j2
@Service
public class JiraService
{
  @Autowired
  private ValidateUserSubscriptionService validateUserSubscriptionService;
  @Autowired
  private IdentityProviderDataService identityProviderDataService;
  @Autowired
  private UserAccessDataService userAccessDataService;
  @Autowired
  private InstanceUserDataService instanceUserDataService;

  public AccessibleResources getAccessibleResources(Principal principal)
  {
    Optional<IdentityProvider> identityProvider = identityProviderDataService.getIdentityProviderByUserEmail(
            principal.getName()
    );

    if (identityProvider.isPresent())
    {
      HttpHeaders headers = new HttpHeaders();
      headers.setContentType(MediaType.APPLICATION_JSON);
      headers.set(HEADER_AUTHORIZATION, BEARER + identityProvider.get().getSourceAccessToken());
      HttpEntity<String> requestEntity = new HttpEntity<>(headers);

      try {
        ResponseEntity<String> responseBody = validateUserSubscriptionService.fetchAccessibleResources(
                requestEntity,
                String.class
        );

        ObjectMapper objectMapper = new ObjectMapper();
        String responseBodyString = responseBody.getBody();

        // Parse the JSON string to a List of JiraResourcesResponse
        List<AccessibleResources.JiraResourcesResponse> resourcesResponses = objectMapper.readValue(
                responseBodyString,
                new TypeReference<>() {}
        );

        if (resourcesResponses.isEmpty())
        {
          throw new SourceSystemServiceException(
                  new ServiceException(ServiceError.AR404),
                  SourceSystemServiceException.SourceSystem.JIRA
          );
        }

        //getting all accessible instances ids for given user
        List<String> instanceIds = userAccessDataService
                .findByEmail(principal.getName())
                .stream()
                .filter(
                        userAccess -> userAccess
                                .getInstance()
                                .getWorkspace()
                                .getOwner()
                                .getEmail()
                                .equalsIgnoreCase(principal.getName())
                )
                .map(userAccess -> userAccess.getInstance().getTenantId())
                .toList();

        resourcesResponses.forEach(
                resource -> resource.setAlreadyRegistered(instanceIds.contains(resource.getId()))
        );

        List<String> accessibleResourceTenantIds = resourcesResponses
                .stream()
                .map(AccessibleResources.Resources::getId)
                .toList();

        List<AccessibleResources.InvitedInstances> invitedInstances = instanceUserDataService
                .findAllInstanceUsersByInstanceUserEmail(
                        principal.getName()
                )
                .stream()
                .filter(iu -> userAccessDataService.findByInstanceUser(iu).isEmpty())
                .map(iu -> new AccessibleResources.InvitedInstances(iu.getInstance()))
                .peek(
                        invitedInstance -> invitedInstance.setErrorCode(
                                accessibleResourceTenantIds.contains(invitedInstance.getId()) ?
                                "" :
                                "NA000"
                        )
                )
                .toList();

        return new AccessibleResources(
                resourcesResponses,
                invitedInstances
        );
      }
      catch (SourceSystemServiceException e)
      {
        throw e;
      }
      catch (Exception e)
      {
        log.error("Exception occurred while fetching resources: ", e);
        throw new ServiceException(ServiceError.PS0112);
      }
    }
    throw new ServiceException(ServiceError.IP000);
  }
}
