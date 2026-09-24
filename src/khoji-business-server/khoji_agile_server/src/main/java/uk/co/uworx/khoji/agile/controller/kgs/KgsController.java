package uk.co.uworx.khoji.agile.controller.kgs;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.handler.WorkLogHandler;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.persistence.model.Integrations;
import uk.co.uworx.khoji.agile.persistence.model.KhojiUser;
import uk.co.uworx.khoji.agile.persistence.model.UserAccess;
import uk.co.uworx.khoji.agile.persistence.service.KhojiUserDataService;
import uk.co.uworx.khoji.agile.persistence.service.UserAccessDataService;
import uk.co.uworx.khoji.agile.request.WorkLogModels;
import uk.co.uworx.khoji.agile.service.business.integration.IntegrationsService;
import uk.co.uworx.khoji.agile.service.jira.JiraTokenRefreshService;
import uk.co.uworx.khoji.security.annotations.AuthorizationApplicationLevelAPIs;
import uk.co.uworx.khoji.security.annotations.HasAccessToInstanceWithPrivilege;
import uk.co.uworx.khoji.security.jwt.JwtTokenService;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping(value = "/kgs")
public class KgsController
{
  private final UserDetailsService userDetailsService;
  private final KhojiUserDataService khojiUserDataService;
  private final JiraTokenRefreshService jiraTokenRefreshService;
  private final UserAccessDataService userAccessDataService;
  private final WorkLogHandler workLogHandler;
  private final IntegrationsService integrationsService;

  public KgsController(
          UserDetailsService userDetailsService,
          KhojiUserDataService khojiUserDataService,
          JiraTokenRefreshService jiraTokenRefreshService,
          UserAccessDataService userAccessDataService,
          WorkLogHandler workLogHandler,
          IntegrationsService integrationsService
  )
  {
    this.userDetailsService = userDetailsService;
    this.khojiUserDataService = khojiUserDataService;
    this.jiraTokenRefreshService = jiraTokenRefreshService;
    this.userAccessDataService = userAccessDataService;
    this.workLogHandler = workLogHandler;
    this.integrationsService = integrationsService;
  }

  @GetMapping("/get-token-against-email")
  @AuthorizationApplicationLevelAPIs
  public ResponseEntity<Map<String, String>> getTokenAgainstEmail(@RequestParam String email)
  {
    try
    {
      UserDetails userDetails = userDetailsService.loadUserByUsername(email);
      String token = JwtTokenService.generateToken(
              userDetails.getUsername(),
              Map.of(
                      "authorities",
                      userDetails.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList()
              )
      );

      return ResponseEntity.ok(Map.of("token", token));
    }
    catch (Exception e)
    {
      return ResponseEntity.badRequest().body(Map.of("status", "failed"));
    }
  }

  @GetMapping("/get-aad-token")
  public ResponseEntity<Map<String, Object>> getAADToken(Principal principal)
  {
    try
    {
      Integrations integrations = integrationsService
              .getIntegration(principal)
              .orElseThrow(() -> new ServiceException(ServiceError.AAD404));

      Map<String, Object> integrationTokenError = integrationsService.refreshAADTokenIfRequired(integrations);

      if (integrationTokenError != null && !integrationTokenError.isEmpty())
      {
        return ResponseEntity.internalServerError().body(integrationTokenError);
      }

      return ResponseEntity.ok(Map.of("token", integrations.getAccessToken()));
    }
    catch (ServiceException serviceException)
    {
      throw serviceException;
    }
    catch (Exception e)
    {
      return ResponseEntity.badRequest().body(Map.of("status", "failed"));
    }
  }

  @GetMapping("/get-updated-jira-access-token")
  public ResponseEntity<Map<String, String>> getUpdatedJiraAccessToken(Principal principal)
  {
    UserAccess userAccess = userAccessDataService
            .findByEmailAndInstanceId(
                    principal.getName(),
                    null
            )
            .orElseThrow(() -> new ServiceException(ServiceError.UA404));

    jiraTokenRefreshService.updateTokenIfRequired(userAccess);

    // move to DTO and for now the bot requires only these 2 to work
    return ResponseEntity.ok(
            Map.of(
                    "token", userAccess.getUserAccessCredentials().getAccessToken(),
                    "jiraCloudTenantId", userAccess.getInstance().getTenantId(),
                    "tenantName", userAccess.getInstance().getInstanceName()
            )
    );
  }

  @GetMapping("/link-user-with-teams")
  public ResponseEntity<Map<String, String>> linkUserWithTeams(Principal principal, @RequestParam String userId)
  {
    KhojiUser user = khojiUserDataService
            .findByEmail(principal.getName())
            .orElseThrow(() -> new ServiceException(ServiceError.U0404));

    user.setMsftTeamsAadObjectId(userId);

    khojiUserDataService.createOrUpdateUser(user);

    return ResponseEntity.ok(Map.of("message", "success"));
  }


  @Operation(summary = "Post work logs")
  @PostMapping(
          value = "/post/worklogs",
          produces = MediaType.APPLICATION_JSON_VALUE
  )
  @HasAccessToInstanceWithPrivilege
  public ResponseEntity<WorkLogModels.Response> postWorklogs(
          @Valid @RequestBody WorkLogModels.KGSPostWorkLogsRequest request,
          Principal principal
  )
  {
    return new ResponseEntity<>(
            workLogHandler.postWorklogs(
                    new WorkLogModels(request),
                    principal,
                    false
            ),
            HttpStatus.OK
    );
  }
}
