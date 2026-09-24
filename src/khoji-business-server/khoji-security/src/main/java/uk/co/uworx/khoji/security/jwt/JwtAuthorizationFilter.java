/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.security.jwt;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import uk.co.uworx.khoji.agile.BootApplicationContextProviderAgileConfig;
import uk.co.uworx.khoji.agile.config.KhojiUsersConfig;
import uk.co.uworx.khoji.agile.internal.helper.SecurityAccessLevel;
import uk.co.uworx.khoji.agile.persistence.model.IdentityProvider;
import uk.co.uworx.khoji.agile.persistence.model.UserAccessCredentials;
import uk.co.uworx.khoji.agile.persistence.service.IdentityProviderDataService;
import uk.co.uworx.khoji.agile.persistence.service.UserAccessCredentialsDataService;
import uk.co.uworx.khoji.security.helper.SecurityConstants;
import uk.co.uworx.khoji.security.helper.SecurityError;
import uk.co.uworx.khoji.security.subscription.ValidateUserSubscriptionService;
import uk.co.uworx.khoji.security.subscription.ValidateUserSubscriptionServiceImpl;

import java.io.IOException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

import static uk.co.uworx.khoji.security.helper.SecurityConstants.ACCESS_TOKEN_KEY;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.BASIC;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.BEARER;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.CUSTOM_ERROR;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.HEADER_AUTHORIZATION;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.PASSWORD;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.REFRESH_TOKEN_KEY;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.SECURITY_ROLE_APP;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.USERNAME;

@Log4j2
public class JwtAuthorizationFilter extends BasicAuthenticationFilter
{
  private final UserDetailsService userDetailsService;
  private static ValidateUserSubscriptionService validateUserSubscriptionService;

  private static final String[] SUBSCRIPTION_WHITELIST_URLS_FOR_BASIC_AUTH = {
          "/invite-tenant-admin",
          "/ping",
          "/ping/deep",
          "/ping/deep/v2",
          "/getAllActiveTenantsInfo"
  };

  public JwtAuthorizationFilter(
          AuthenticationManager authenticationManager,
          UserDetailsService userDetailsService,
          ValidateUserSubscriptionServiceImpl validateUserSubscriptionService
  )
  {
    super(authenticationManager);
    this.userDetailsService = userDetailsService;
    JwtAuthorizationFilter.validateUserSubscriptionService = validateUserSubscriptionService;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws IOException, ServletException
  {
    String token = request.getHeader(HEADER_AUTHORIZATION);
    if (checkIfFilterIsValidForThisUrl(request, token))
    {
      SecurityContextHolder.getContext().setAuthentication(null);
      chain.doFilter(request, response);
      return;
    }

    boolean isBasicAuth = isAuthorizationHeader(token, BASIC);
    boolean isBearerAuth = isAuthorizationHeader(token, BEARER);
    Claims claims;
    UserDetails userDetails = null;
    List<String> authorities = new ArrayList<>();
    String username = null;

    if (isBearerAuth)
    {
      if (!isJwtVerified(response, token))
      {
        return;
      }
      claims = JwtTokenService.getClaimsFromToken(token);
      username = claims.getSubject();
      try
      {
        userDetails = userDetailsService.loadUserByUsername(username);
      }
      catch (BadCredentialsException badCredentialsException)
      {
        setExpiredTokenAndStatus(request, response);
        return;
      }
      authorities = getUserAuthorities(userDetails);
    }

    if (isBasicAuth)
    {
      username = getUsernameIfBasicAuthIsValid(token);
      if (username == null)
      {
        setNullAuthentication(response);
        return;
      }
      authorities.add(SECURITY_ROLE_APP);
    }

    List<SimpleGrantedAuthority> roleList = new ArrayList<>();
    if (authorities != null && !authorities.isEmpty())
    {
      roleList = authorities.stream().map(SimpleGrantedAuthority::new).collect(Collectors.toList());
    }

    if (skipSubscriptionValidationForBasicAuthEndpoint(request, isBasicAuth))
    {
      SecurityContextHolder
              .getContext()
              .setAuthentication(
                      new UsernamePasswordAuthenticationToken(
                              username,
                              null,
                              roleList
                      )
              );

      chain.doFilter(request, response);
      return;
    }

    if (username != null)
    {
      IdentityProviderDataService identityProviderDataService = BootApplicationContextProviderAgileConfig
              .getContext()
              .getBean(IdentityProviderDataService.class);

      Optional<IdentityProvider> identityProvider = identityProviderDataService.getIdentityProviderByUserEmail(username);

      if (identityProvider.isPresent())
      {
        if (!decodeTokenAndCheckExpiryTime(identityProvider.get().getSourceAccessToken()))
        {
          HashMap<String, String> map = validateUserSubscriptionService.updatedToken(
                  identityProvider.get().getSourceRefreshToken()
          );

          identityProvider.get().setSourceAccessToken(map.get(ACCESS_TOKEN_KEY));
          identityProvider.get().setSourceRefreshToken(map.get(REFRESH_TOKEN_KEY));
          identityProviderDataService.createOrUpdateIdentityProvider(identityProvider.get());

          //TODO: this is done as it is valid for current use case we need to update it only for jira for now
          UserAccessCredentialsDataService userAccessCredentialsDataService = BootApplicationContextProviderAgileConfig
                  .getContext()
                  .getBean(UserAccessCredentialsDataService.class);

          Optional<UserAccessCredentials> userAccessCredential = userAccessCredentialsDataService.findByEmail(
                  identityProvider
                          .get()
                          .getUser()
                          .getEmail()
          );

          if (userAccessCredential.isPresent())
          {
            userAccessCredential.get().setAccessToken(map.get(ACCESS_TOKEN_KEY));
            userAccessCredential.get().setRefreshToken(map.get(REFRESH_TOKEN_KEY));
            userAccessCredentialsDataService.createOrUpdate(userAccessCredential.get());
          }
        }
      }
    }

    SecurityContextHolder
            .getContext()
            .setAuthentication(
                    new UsernamePasswordAuthenticationToken(
                            username,
                            null,
                            roleList
                    )
            );

    chain.doFilter(request, response);
  }

  public static boolean decodeTokenAndCheckExpiryTime(String token)
  {
    try
    {
      String[] chunks = token.split("\\.");
      Base64.Decoder decoder = Base64.getUrlDecoder();
      String payload = new String(decoder.decode(chunks[1]));
      ObjectMapper objectMapper = new ObjectMapper();
      JsonNode jsonNode = objectMapper.readTree(payload);
      String expStr = jsonNode.get("exp").toString();
      Instant instant = Instant.ofEpochSecond(Long.parseLong(expStr));
      ZonedDateTime tokenExpiry = ZonedDateTime.ofInstant(instant, ZoneId.of("UTC"));
      ZonedDateTime currentDateTime = ZonedDateTime.now(ZoneId.of("UTC"));

      return tokenExpiry.isAfter(currentDateTime);
    }
    catch (Exception exception)
    {
      log.error("Exception occurred while decoding token: ", exception);
      return false;
    }
  }

  private boolean checkIfFilterIsValidForThisUrl(HttpServletRequest request, String token)
  {
    return token == null ||
           (!isAuthorizationHeader(token, BEARER) && !isAuthorizationHeader(token, BASIC)) ||
           JwtTokenService.isUrlAWhiteListUrl(request.getRequestURI());
  }

  private boolean skipSubscriptionValidationForBasicAuthEndpoint(HttpServletRequest request, boolean isBasicAuth)
  {
    return isBasicAuth && Arrays.asList(SUBSCRIPTION_WHITELIST_URLS_FOR_BASIC_AUTH).contains(request.getRequestURI());
  }

  private boolean isAuthorizationHeader(String token, String type)
  {
    return token.startsWith(type);
  }

  private boolean isJwtVerified(HttpServletResponse response, String token) throws IOException
  {
    try
    {
      JwtTokenService.verifyToken(token);
      return true;
    }
    catch (JwtException e)
    {
      setNullAuthentication(response);
      response.setContentType(MediaType.APPLICATION_JSON_VALUE);
      if (e instanceof ExpiredJwtException)
      {
        response.setHeader(SecurityConstants.HEADER_JWT_EXPIRED, SecurityConstants.HEADER_JWT_EXPIRED_VALUE);
      }
      new ObjectMapper().writeValue(response.getWriter(), e.getMessage());
      return false;
    }
  }

  private String getUsernameIfBasicAuthIsValid(String token)
  {
    try
    {
      String extractedUsername = JwtTokenService.extractKeyFromDecodedToken(token, USERNAME);
      return isConfiguredBasicAuthValid(extractedUsername, JwtTokenService.extractKeyFromDecodedToken(token, PASSWORD)) ? extractedUsername : null;
    }
    catch (Exception exception)
    {
      return null;
    }
  }

  private boolean isConfiguredBasicAuthValid(String username, String password)
  {
    KhojiUsersConfig khojiUsersConfig = BootApplicationContextProviderAgileConfig.getContext().getBean("khojiUsersConfig", KhojiUsersConfig.class);
    if (!StringUtils.hasLength(khojiUsersConfig.basicAuthUsername) || !StringUtils.hasLength(khojiUsersConfig.basicAuthPassword))
    {
      return false;
    }
    return Objects.equals(username, khojiUsersConfig.basicAuthUsername) && Objects.equals(password, khojiUsersConfig.basicAuthPassword);
  }

  private static void setNullAuthentication(HttpServletResponse response)
  {
    SecurityContextHolder.getContext().setAuthentication(null);
    response.setStatus(401);
  }

  /**
   * Sets expired token and status in the response
   * headers if the request contains
   * "Authorization" header
   *
   * @param request  where "Authorization" header exists
   * @param response where expired token and status will be set
   */
  public static void setExpiredTokenAndStatus(HttpServletRequest request, HttpServletResponse response)
  {
    String token = request.getHeader(HEADER_AUTHORIZATION);
    if (token != null)
    {
      response.setHeader(HEADER_AUTHORIZATION, JwtTokenService.getNewExpiredToken(token));
      response.setStatus(401);
    }
  }

  private  List<String> getUserAuthorities(UserDetails userDetails)
  {
    return userDetails
            .getAuthorities()
            .stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList());
  }
}
