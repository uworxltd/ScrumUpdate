/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.security.subscription;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.log4j.Log4j2;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

import static uk.co.uworx.khoji.security.helper.SecurityConstants.ACCESS_TOKEN_KEY;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.BEARER;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.HEADER_AUTHORIZATION;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.REFRESH_TOKEN_KEY;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.TENANT_ID_KEY;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.TENANT_NAME_KEY;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.TENANT_URL_KEY;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.USER_ACCOUNT_ID_KEY;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.USER_EMAIL_KEY;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.USER_FIRST_NAME_KEY;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.USER_FULL_NAME;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.USER_LAST_NAME_KEY;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.USER_PROFILE_PICTURE_SOURCE_URL;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.USER_TIME_ZONE_NAME_KEY;

/**
 * Validates a user against subscription service
 */
@Service
@Log4j2
public class ValidateUserSubscriptionServiceImpl implements ValidateUserSubscriptionService
{
  @Value("${jira.client.id}")
  private String jiraClientId;
  @Value("${jira.client.secret}")
  private String jiraClientSecret;
  @Value("${jira.client.redirect.uri:http://localhost:4241/login}")
  private String jiraClientRedirectUri;
  @Value("${source.auth.verification.endpoint:https://auth.atlassian.com/oauth/token}")
  private String sourceAuthInfoEndpoint;
  @Value("${source.profile.information.endpoint:https://api.atlassian.com/me}")
  private String sourceUrlProfileInfoEndpoint;
  @Value("${source.tenant.information.endpoint:https://api.atlassian.com/oauth/token/accessible-resources}")
  private String sourceTenantInfoEndpoint;

  private final RestTemplate restTemplate = new RestTemplate();

  @Override
  public HashMap<String, String> fetchAccessTokenAndTenantDetailsFromSSO_CODE(String code)
  {
    HashMap<String, String> map = new HashMap<>();
    ObjectMapper objectMapper = new ObjectMapper();

    fetchAccessAndRefreshTokenDetailsFromCode(code, objectMapper, map);

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    headers.set(HEADER_AUTHORIZATION, BEARER + map.get(ACCESS_TOKEN_KEY));
    HttpEntity<String> requestEntity = new HttpEntity<>(headers);

    fetchUserSourceProfileDetailsAndAccountId(headers, objectMapper, map);

    fetchTenantDetailsAndId(requestEntity, objectMapper, map);

    return map;
  }

  private void fetchTenantDetailsAndId(HttpEntity<String> requestEntity, ObjectMapper objectMapper, HashMap<String, String> map)
  {
    ResponseEntity<String> responseForOrg = fetchAccessibleResources(requestEntity, String.class);

    try
    {
      JsonNode jsonNode = objectMapper.readTree(responseForOrg.getBody());
      map.put(TENANT_URL_KEY, jsonNode.get(0).get("url").asText());
      map.put(TENANT_NAME_KEY, jsonNode.get(0).get("name").asText());
      map.put(TENANT_ID_KEY, jsonNode.get(0).get("id").asText());
    }
    catch (Exception e)
    {
      log.error("Exception occurred while fetching values from response: ", e);
      throw new ServiceException(ServiceError.G0000);
    }
  }

  public <R> ResponseEntity<R> fetchAccessibleResources(HttpEntity<String> requestEntity, Class<R> typeClass)
  {
    return restTemplate.exchange(
            sourceTenantInfoEndpoint,
            HttpMethod.GET,
            requestEntity,
            typeClass
    );
  }

  /**
   * USER firstname, lastname, email and account is stored
   * in map in this function
   *
   * @param headers
   * @param objectMapper
   * @param map
   */
  public void fetchUserSourceProfileDetailsAndAccountId(
          HttpHeaders headers,
          ObjectMapper objectMapper,
          HashMap<String, String> map
  )
  {
    ResponseEntity<String> profileResponse = restTemplate.exchange(
            sourceUrlProfileInfoEndpoint,
            HttpMethod.GET,
            new HttpEntity<>(null, headers),
            String.class
    );

    try
    {
      JsonNode jsonNode = objectMapper.readTree(profileResponse.getBody());
      String[] name = jsonNode.get("name").asText().split(" ");
      if (name.length > 1)
      {
        map.put(
                USER_FIRST_NAME_KEY,
                Arrays
                .stream(name, 0, name.length - 1)
                .collect(Collectors.joining(" "))
        );
        map.put(USER_LAST_NAME_KEY, name[name.length - 1]);
      }
      else if (name.length == 1)
      {
        map.put(USER_FIRST_NAME_KEY, name[0]);
        map.put(USER_LAST_NAME_KEY, "USER");
      }

      map.put(USER_FULL_NAME, jsonNode.get("name").asText());
      map.put(USER_EMAIL_KEY, jsonNode.get("email").asText());
      map.put(USER_PROFILE_PICTURE_SOURCE_URL, jsonNode.get("picture").asText());
      map.put(USER_ACCOUNT_ID_KEY, jsonNode.get("account_id").asText());
      if(jsonNode.has("zoneinfo"))
      {
        map.put(USER_TIME_ZONE_NAME_KEY, jsonNode.get("zoneinfo").asText());
      }
      else
      {
        map.put(USER_TIME_ZONE_NAME_KEY, "no zone");
      }

    }
    catch (Exception e)
    {
      log.error("Exception occurred while fetching values from response: ", e);
      throw new ServiceException(ServiceError.G0000);
    }
  }

  /**
   * ACCESS_TOKEN and REFRESH_TOKEN is set in map in this function
   *
   * @param code
   * @param objectMapper
   * @param map
   */
  private void fetchAccessAndRefreshTokenDetailsFromCode(String code, ObjectMapper objectMapper, HashMap<String, String> map)
  {
    ResponseEntity<String> responseEntity = restTemplate.exchange(
            sourceAuthInfoEndpoint,
            HttpMethod.POST,
            new HttpEntity<>(
                    getRequestBodyForAuthInformation(code),
                    new HttpHeaders()
            ),
            String.class
    );

    try
    {
      JsonNode jsonNode = objectMapper.readTree(responseEntity.getBody());
      map.put(ACCESS_TOKEN_KEY, jsonNode.get("access_token").asText());
      map.put(REFRESH_TOKEN_KEY, jsonNode.get("refresh_token").asText());
    }
    catch (Exception e)
    {
      log.error("Exception occurred while fetching values from response: ", e);
      throw new ServiceException(ServiceError.G0000);
    }
  }

  private Map<String, Object> getRequestBodyForAuthInformation(String code)
  {
    Map<String, Object> requestBody = new HashMap<>();
    requestBody.put("grant_type", "authorization_code");
    requestBody.put("client_id", jiraClientId);
    requestBody.put("client_secret", jiraClientSecret);
    requestBody.put("code", code);
    requestBody.put("redirect_uri", jiraClientRedirectUri);
    return requestBody;
  }

  @Override
  public HashMap<String, String> updatedToken(String refreshToken)
  {
    Map<String, Object> requestBody = new HashMap<>();
    HashMap<String, String> map = new HashMap<>();
    requestBody.put("grant_type", "refresh_token");
    requestBody.put("client_id", jiraClientId);
    requestBody.put("client_secret", jiraClientSecret);
    requestBody.put("refresh_token", refreshToken);

    try
    {
      ResponseEntity<String> responseEntity = restTemplate.exchange(
              sourceAuthInfoEndpoint,
              HttpMethod.POST,
              new HttpEntity<>(requestBody, new HttpHeaders()),
              String.class
      );

      ObjectMapper objectMapper = new ObjectMapper();

      JsonNode jsonNode = objectMapper.readTree(responseEntity.getBody());
      map.put(ACCESS_TOKEN_KEY, jsonNode.get("access_token").asText());
      map.put(REFRESH_TOKEN_KEY, jsonNode.get("refresh_token").asText());
    }
    catch (HttpClientErrorException.Unauthorized unauthorized)
    {
      throw new ServiceException(ServiceError.SE003);
    }
    catch (Exception e)
    {
      log.error("Exception occurred while fetching values from response: ", e);
      throw new AuthenticationServiceException("SE008");
    }
    return map;
  }
}
