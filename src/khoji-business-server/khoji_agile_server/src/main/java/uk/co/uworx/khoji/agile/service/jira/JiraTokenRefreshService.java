package uk.co.uworx.khoji.agile.service.jira;

import lombok.extern.log4j.Log4j2;
import org.apache.commons.lang3.ObjectUtils;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.persistence.model.IdentityProvider;
import uk.co.uworx.khoji.agile.persistence.model.UserAccess;
import uk.co.uworx.khoji.agile.persistence.service.IdentityProviderDataService;
import uk.co.uworx.khoji.agile.persistence.service.UserAccessCredentialsDataService;
import uk.co.uworx.khoji.security.subscription.ValidateUserSubscriptionService;

import java.util.Map;

import static uk.co.uworx.khoji.security.helper.SecurityConstants.ACCESS_TOKEN_KEY;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.REFRESH_TOKEN_KEY;
import static uk.co.uworx.khoji.security.jwt.JwtAuthorizationFilter.decodeTokenAndCheckExpiryTime;


@Service
@Log4j2
public class JiraTokenRefreshService
{
  private final ValidateUserSubscriptionService validateUserSubscriptionService;
  private final UserAccessCredentialsDataService userAccessCredentialsDataService;
  private final IdentityProviderDataService identityProviderDataService;

  public JiraTokenRefreshService(
          ValidateUserSubscriptionService validateUserSubscriptionService,
          UserAccessCredentialsDataService userAccessCredentialsDataService,
          IdentityProviderDataService identityProviderDataService
  )
  {
    this.validateUserSubscriptionService = validateUserSubscriptionService;
    this.userAccessCredentialsDataService = userAccessCredentialsDataService;
    this.identityProviderDataService = identityProviderDataService;
  }

  public void updateTokenIfRequired(UserAccess userAccess)
  {
    // Step-3.1: check if token is expired
    if (!decodeTokenAndCheckExpiryTime(userAccess.getUserAccessCredentials().getAccessToken()))
    {
      log.debug("Updating token for user {}", userAccess.getUser().getId());

      // Step-3.2: if expired update the token
      Map<String, String> credentialDetails = this.validateUserSubscriptionService.updatedToken(
              userAccess.getUserAccessCredentials().getRefreshToken()
      );

      // Step-3.4: update the Object
      userAccess.getUserAccessCredentials().setAccessToken(credentialDetails.get(ACCESS_TOKEN_KEY));
      userAccess.getUserAccessCredentials().setRefreshToken(credentialDetails.get(REFRESH_TOKEN_KEY));

      // Step-3.3: save in db
      this.userAccessCredentialsDataService.createOrUpdate(userAccess.getUserAccessCredentials());

      // Step-3.5: update identity provider entries
      IdentityProvider identityProvider = this.identityProviderDataService.getIdentityProviderByUserEmail(
              userAccess.getUser().getEmail()
      ).orElse(null);

      if (ObjectUtils.isNotEmpty(identityProvider))
      {
        identityProvider.setSourceRefreshToken(credentialDetails.get(REFRESH_TOKEN_KEY));
        identityProvider.setSourceAccessToken(credentialDetails.get(ACCESS_TOKEN_KEY));
        this.identityProviderDataService.createOrUpdateIdentityProvider(identityProvider);
      }

      log.debug("Updated token for user {}", userAccess.getUser().getId());
    }
  }
}
