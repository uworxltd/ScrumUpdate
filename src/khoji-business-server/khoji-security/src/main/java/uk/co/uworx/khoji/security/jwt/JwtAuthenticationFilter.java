/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.security.jwt;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationToken;
import org.springframework.transaction.annotation.Transactional;
import uk.co.uworx.khoji.agile.BootApplicationContextProviderAgileConfig;
import uk.co.uworx.khoji.agile.persistence.model.IdentityProvider;
import uk.co.uworx.khoji.agile.persistence.model.KhojiUser;
import uk.co.uworx.khoji.agile.persistence.model.Provider;
import uk.co.uworx.khoji.agile.persistence.model.UserAccessCredentials;
import uk.co.uworx.khoji.agile.persistence.model.Workspace;
import uk.co.uworx.khoji.agile.persistence.service.IdentityProviderDataService;
import uk.co.uworx.khoji.agile.persistence.service.KhojiUserDataService;
import uk.co.uworx.khoji.agile.persistence.service.UserAccessCredentialsDataService;
import uk.co.uworx.khoji.agile.persistence.service.WorkspaceDataService;
import uk.co.uworx.khoji.security.helper.SecurityConstants;
import uk.co.uworx.khoji.security.helper.SecurityError;
import uk.co.uworx.khoji.security.subscription.ValidateUserSubscriptionService;

import java.io.IOException;
import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import static uk.co.uworx.khoji.security.helper.SecurityConstants.ACCESS_TOKEN_KEY;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.REFRESH_TOKEN;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.REFRESH_TOKEN_KEY;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.SPACE;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.SSO_CODE_SIGNUP;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.USER_ACCOUNT_ID_KEY;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.USER_EMAIL_KEY;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.USER_FIRST_NAME_KEY;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.USER_FULL_NAME;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.USER_PROFILE_PICTURE_SOURCE_URL;
import static uk.co.uworx.khoji.security.jwt.JwtAuthorizationFilter.decodeTokenAndCheckExpiryTime;

@Log4j2
// TODO: apply reversibility theory and separate concerns logic so that later we don't have to be
//       in a state, that we are usually in. 😑
public class JwtAuthenticationFilter extends UsernamePasswordAuthenticationFilter
{
  private final ValidateUserSubscriptionService validateUserSubscriptionService;
  private final UserDetailsService userDetailsService;
  private final KhojiUserDataService khojiUserDataService;
  private final IdentityProviderDataService identityProviderDataService;
  private final WorkspaceDataService workspaceDataService;

  public JwtAuthenticationFilter(
          AuthenticationManager authenticationManager,
          ValidateUserSubscriptionService validateUserSubscriptionService,
          KhojiUserDataService khojiUserDataService,
          IdentityProviderDataService identityProviderDataService,
          WorkspaceDataService workspaceDataService,
          UserDetailsService userDetailsService
  )
  {
    this.setAuthenticationManager(authenticationManager);
    this.validateUserSubscriptionService = validateUserSubscriptionService;
    this.khojiUserDataService = khojiUserDataService;
    this.identityProviderDataService = identityProviderDataService;
    this.workspaceDataService = workspaceDataService;
    this.userDetailsService = userDetailsService;
  }

  @Override
  protected void successfulAuthentication(
          HttpServletRequest request,
          HttpServletResponse response,
          FilterChain chain,
          Authentication authResult
  ) throws IOException
  {
    Map<String, Object> claims = new HashMap<>();
    HashMap<String, Object> responseBody = new HashMap<>();

    String username = ((UserDetails) authResult.getPrincipal()).getUsername();

    List<String> authorities = authResult
            .getAuthorities()
            .stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList());

    claims.put("authorities", authorities);

    String token = JwtTokenService.generateToken(username, claims);
    responseBody.put("token", token);
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    new ObjectMapper().writeValue(response.getWriter(), responseBody);
  }

  @Override
  protected void unsuccessfulAuthentication(
          HttpServletRequest request,
          HttpServletResponse response,
          AuthenticationException failed
  ) throws IOException, ServletException
  {
    if (failed instanceof LockedException)
    {
      response.addHeader(SecurityConstants.CUSTOM_ERROR, SecurityError.LOCKED_EXCEPTION.getErrorCode());
    }
    else if (failed instanceof BadCredentialsException || failed.getCause() instanceof BadCredentialsException)
    {
      response.addHeader(SecurityConstants.CUSTOM_ERROR, SecurityError.BAD_CREDENTIALS.getErrorCode());
    }
    else if (failed instanceof AuthenticationServiceException && failed.getMessage().equalsIgnoreCase("SE006"))
    {
      response.addHeader(SecurityConstants.CUSTOM_ERROR, SecurityError.UNINVITED_USER.getErrorCode());
    }
    else if (failed instanceof AuthenticationServiceException && failed.getMessage().equalsIgnoreCase("SE008"))
    {
      response.addHeader(SecurityConstants.CUSTOM_ERROR, SecurityError.ERROR_WITH_REFRESH_TOKEN.getErrorCode());
    }
    else if (failed instanceof AuthenticationServiceException && failed.getMessage().equalsIgnoreCase("SE009"))
    {
      log.debug("Adding error in response");
      response.addHeader(SecurityConstants.CUSTOM_ERROR, SecurityError.ERROR_WITH_SAME_EMAIL_LINKED_WITH_DIFFERENT_ACCOUNT.getErrorCode());
    }

    super.unsuccessfulAuthentication(request, response, failed);
  }

  /**
   * This method bypasses the standard Spring authentication, which usually requires a username and password.
   * It is designed to work with Atlassian OAuth.
   * <p>
   * - sourceCode: An SSO code that allows a user to register an account or log in.
   * - refreshToken: A login code (UUID) stored in the browser, which helps skip the consent page.
   * <p>
   * When a sourceCode is received, it fetches information from the source, including user access and refresh tokens,
   * profile information, and tenant information. If the tenant is not registered in Khoji, it first registers the tenant.
   * Then it checks if the user account exists to allow the user to log in or create an account. It also checks if access
   * is required when another user from the same tenant is already registered.
   * <p>
   * When a refreshToken is received, it fetches the information associated with that code. If the information is found,
   * it allows the user to log in. Otherwise, it returns an error, which navigates to the consent page. The refreshToken
   * is a UUID generated every time you log in and is stored in the browser.
   *
   * @param request  The HTTP request object.
   * @param response The HTTP response object.
   * @return The authentication result.
   * @throws AuthenticationException If authentication fails.
   */
  @Override
  @Transactional
  public Authentication attemptAuthentication(
          HttpServletRequest request,
          HttpServletResponse response
  ) throws AuthenticationException
  {
    String sourceCode = request.getHeader(SSO_CODE_SIGNUP);
    String refreshToken = request.getHeader(REFRESH_TOKEN);

    if (sourceCode != null)
    {
      HashMap<String, String> map = validateUserSubscriptionService.fetchAccessTokenAndTenantDetailsFromSSO_CODE(sourceCode);
      UserDetails userDetails;
      try
      {
        userDetails = userDetailsService.loadUserByUsername(map.get(USER_EMAIL_KEY));
        Optional<IdentityProvider> identityProvider = identityProviderDataService.getIdentityProviderByUserEmail(
                map.get(USER_EMAIL_KEY)
        );

        if (identityProvider.isPresent())
        {
          updateSourceToken(identityProvider.get(), map, response);
        }
        else
        {
          KhojiUser khojiUser = khojiUserDataService
                  .findByEmail(map.get(USER_EMAIL_KEY))
                  .orElse(null);

          response.setHeader(REFRESH_TOKEN, createIdentityProvider(map, khojiUser).getLoginCode());
          createWorkSpace(map, khojiUser);
        }
      }
      catch (BadCredentialsException badCredentialsException)
      {
        response.setHeader(REFRESH_TOKEN, createUserEntityAndIdentityProviderThenLinkWithWorkSpace(map).getLoginCode());
        userDetails = userDetailsService.loadUserByUsername(map.get(USER_EMAIL_KEY));
      }
      return new PreAuthenticatedAuthenticationToken(userDetails, "", userDetails.getAuthorities());
    }

    if (refreshToken != null && !refreshToken.equalsIgnoreCase("null"))
    {
      IdentityProvider identityProvider = identityProviderDataService.getIdentityProviderByLoginCode(refreshToken);

      if (identityProvider != null)
      {
        if (!decodeTokenAndCheckExpiryTime(identityProvider.getSourceRefreshToken()))
        {
          throw new AuthenticationServiceException("SE008");
        }

        HashMap<String, String> map = validateUserSubscriptionService.updatedToken(
                identityProvider.getSourceRefreshToken()
        );

        updateSourceToken(identityProvider, map, response);
        UserDetails userDetails = userDetailsService.loadUserByUsername(identityProvider.getUser().getEmail());
        return new PreAuthenticatedAuthenticationToken(userDetails, "", userDetails.getAuthorities());
      }
      else
      {
        throw new AuthenticationServiceException("SE008");
      }
    }

    throw new AuthenticationServiceException("SE008");
  }

  private void updateSourceToken(
          IdentityProvider identityProvider,
          HashMap<String, String> map,
          HttpServletResponse response
  )
  {
    identityProvider.setSourceAccessToken(map.get(ACCESS_TOKEN_KEY));
    identityProvider.setSourceRefreshToken(map.get(REFRESH_TOKEN_KEY));
    identityProvider.setLoginCode(UUID.randomUUID().toString());
    identityProviderDataService.createOrUpdateIdentityProvider(identityProvider);

    //TODO: this is done as it is valid for current use case we need to update it only for jira for now
    UserAccessCredentialsDataService userAccessCredentialsDataService = BootApplicationContextProviderAgileConfig
            .getContext()
            .getBean(UserAccessCredentialsDataService.class);

    Optional<UserAccessCredentials> userAccessCredential = userAccessCredentialsDataService.findByEmail(
            identityProvider
                    .getUser()
                    .getEmail()
    );

    if (userAccessCredential.isPresent())
    {
      userAccessCredential.get().setAccessToken(map.get(ACCESS_TOKEN_KEY));
      userAccessCredential.get().setRefreshToken(map.get(REFRESH_TOKEN_KEY));
      userAccessCredentialsDataService.createOrUpdate(userAccessCredential.get());
    }

    response.setHeader(REFRESH_TOKEN, identityProvider.getLoginCode());
  }

  private IdentityProvider createUserEntityAndIdentityProviderThenLinkWithWorkSpace(HashMap<String, String> map)
  {
    KhojiUser khojiUser = khojiUserDataService.createOrUpdateUser(
            new KhojiUser(
                    map.get(USER_EMAIL_KEY),
                    UUID.randomUUID().toString(),
                    map.get(USER_PROFILE_PICTURE_SOURCE_URL),
                    map.get(USER_FULL_NAME)
            )
    );

    IdentityProvider identityProvider = createIdentityProvider(map, khojiUser);
    createWorkSpace(map, khojiUser);

    sendWelcomeEmailToTenantAdmin(khojiUser.getEmail());
    return identityProvider;
  }

  private void createWorkSpace(HashMap<String, String> map, KhojiUser khojiUser)
  {
    workspaceDataService.createWorkspace(
            new Workspace(
                    map.get(USER_FIRST_NAME_KEY).split(SPACE)[0] + "'s space",
                    khojiUser
            )
    );
  }

  private void sendWelcomeEmailToTenantAdmin(String email)
  {
    try
    {
      Object adminServiceInstance = BootApplicationContextProviderAgileConfig
              .getContext()
              .getBean("adminService");

      Class<?> adminServiceClass = adminServiceInstance.getClass();
      Method sendEmailMethod = adminServiceClass.getMethod(
              "sendEmailToUser",
              String.class,
              String.class,
              String.class
      );
      sendEmailMethod.invoke(adminServiceInstance, email, null, "TENANT_ADMIN");
    }
    catch (Exception e)
    {
      logger.error("An error occurred while sending invite email to tenant admin, error: " + e);
    }
  }

  private IdentityProvider createIdentityProvider(HashMap<String, String> map, KhojiUser khojiUser)
  {
    return identityProviderDataService.createOrUpdateIdentityProvider(
            new IdentityProvider(
                    khojiUser,
                    Provider.JIRA,
                    map.get(USER_ACCOUNT_ID_KEY),
                    UUID.randomUUID().toString(),
                    map.get(ACCESS_TOKEN_KEY),
                    map.get(REFRESH_TOKEN_KEY)
            )
    );
  }
}
