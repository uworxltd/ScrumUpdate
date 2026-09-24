package uk.co.uworx.khoji.agile.service.business.integration;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.log4j.Log4j2;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import uk.co.uworx.khoji.agile.persistence.context.InstanceIdContext;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;
import uk.co.uworx.khoji.agile.persistence.model.Integrations;
import uk.co.uworx.khoji.agile.persistence.model.UserAccess;
import uk.co.uworx.khoji.agile.persistence.repository.IntegrationsRepository;
import uk.co.uworx.khoji.agile.persistence.service.UserAccessDataService;
import uk.co.uworx.khoji.agile.service.TimeService;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.IllegalFormatException;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import static uk.co.uworx.khoji.agile.service.Constants.MS_CALENDAR_EMPTY_RESPONSE;
import static uk.co.uworx.khoji.agile.service.Constants.MS_CALENDAR_ERROR_KEY;
import static uk.co.uworx.khoji.agile.service.Constants.MS_CALENDAR_GENERIC_ERROR;
import static uk.co.uworx.khoji.agile.service.Constants.MS_CALENDAR_INTEGRATION;
import static uk.co.uworx.khoji.agile.service.Constants.MS_CALENDAR_REFRESH_TOKEN_EXPIRED_OR_CONSENT_REVOKED_ERROR;
import static uk.co.uworx.khoji.agile.service.Constants.MS_CALENDAR_VIEW;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.ACCESS_TOKEN_KEY;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.REFRESH_TOKEN_KEY;

@Service
@Log4j2
public class IntegrationsService
{
  @Value("${integrations.ms.oauth.client.id:}")
  public String msClientId;
  @Value("${integrations.ms.oauth.client.secret:}")
  public String msClientSecret;
  @Value("${integrations.ms.redirect.uri:}")
  public String msRedirectUri;
  @Value("${integrations.ms.scopes:openid profile User.Read Calendars.ReadBasic offline_access}")
  public String msGraphRequestedScopes;
  @Value("${integrations.ms.token.endpoint:https://login.microsoftonline.com/common/oauth2/v2.0/token}")
  public String msTokenEndpoint;
  @Value("${integrations.ms.calendar.events.url:https://graph.microsoft.com/v1.0/me/events?$select=subject,start,end&$filter=(start/dateTime ge '%s') and (end/dateTime lt '%s')}")
  public String msGraphCalendarEventsUrl;
  @Value("${integrations.ms.calendar.view.url:https://graph.microsoft.com/v1.0/me/calendarview?$select=subject,start,end,isCancelled&startdatetime=%s&enddatetime=%s}")
  public String msGraphCalendarViewUrl;
  @Value("${integrations.ms.refresh.token.lifetime:88}")
  public int msRefreshTokenLifetime;
  @Autowired
  private RestTemplate restTemplate;
  @Autowired
  private IntegrationsRepository integrationsRepository;
  @Autowired
  private UserAccessDataService userAccessDataService;
  @Autowired
  private TimeService timeService;

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

  public HttpStatus fetchAndStoreMSIdentityTokens(String accessCode, Principal principal)
  {
    try
    {
      Optional<Integrations> existingIntegration = getIntegration(principal);
      if (existingIntegration.isEmpty())
      {

        HttpEntity<MultiValueMap<String, String>> accessTokenRequest = constructAccessTokenRequest(accessCode);
        HashMap<String, String> accessAndRefreshToken = getAccessAndRefreshToken(accessTokenRequest);

        Optional<UserAccess> userAccessOptional = userAccessDataService
                .findByEmail(principal.getName())
                .stream()
                .filter(userAccess -> Objects.equals(userAccess.getInstance().getId(), InstanceIdContext.getInstanceId()))
                .findFirst();

        userAccessOptional.ifPresent(userAccess -> {
          Integrations.IntegrationsBuilder integrationsBuilder = Integrations.builder();
          integrationsRepository.save(
                  integrationsBuilder
                          .userAccess(userAccess)
                          .type(MS_CALENDAR_INTEGRATION)
                          .accessToken(accessAndRefreshToken.get(ACCESS_TOKEN_KEY))
                          .refreshToken(accessAndRefreshToken.get(REFRESH_TOKEN_KEY))
                          .refreshTokenCreatedAt(Instant.now())
                          .build()
          );
        });
      }
    }
    catch (Exception e)
    {
      log.error("Error while integrating Calendar", e);
    }

    return HttpStatus.OK;
  }

  public Map<String, Object> fetchMSCalendarIntegrationData(
          String startDate,
          String endDate,
          Integrations integration,
          InstanceUser instanceUser
  )
  {
    Map<String, Object> MS_CALENDAR_ERROR_KEY1 = refreshAADTokenIfRequired(integration);
    if (MS_CALENDAR_ERROR_KEY1 != null)
    {
      return MS_CALENDAR_ERROR_KEY1;
    }

    HttpEntity<MultiValueMap<String, String>> calendarEventsRequestEntity = this.getHeadersForMSGraphRequests(integration.getAccessToken(), instanceUser.getTimeZone());

    // Disabling this for now because calendar view is a superset of events (sort of)
//    List<Object> calendarEvents = fetchMSCalendarEvents(calendarEventsRequestEntity, startDate, timeService.incrementDateByOne(endDate));
    List<Object> calendarView = fetchMSCalendarView(calendarEventsRequestEntity, startDate, timeService.incrementDateByOne(endDate), null);

    if (calendarView == null)
    {
      log.error("Error occurred while trying to fetch data from calendar integration: {}.", integration.getId());
      return Map.of(MS_CALENDAR_ERROR_KEY, MS_CALENDAR_GENERIC_ERROR);
    }

    if (calendarView.isEmpty())
    {
      log.debug("Empty response received for calendar integration: {}.", integration.getId());
      return Map.of(MS_CALENDAR_ERROR_KEY, MS_CALENDAR_EMPTY_RESPONSE);
    }

    return Map.of(MS_CALENDAR_VIEW, calendarView);
  }

  public Map<String, Object> refreshAADTokenIfRequired(Integrations integration)
  {
    // Check 1: Refresh Token should have been created no more than 88 days ago (default expiry for Refresh token is 90 days)
    log.debug("Getting refresh token for ms teams");
    Instant refreshTokenCreatedAt = integration.getRefreshTokenCreatedAt();
    boolean hasRefreshTokenExpired = timeService.isOlderThan(refreshTokenCreatedAt, msRefreshTokenLifetime);
    if (hasRefreshTokenExpired)
    {
      log.debug("Refresh token for integration {} has expired.", integration.getId());
      return Map.of(MS_CALENDAR_ERROR_KEY, MS_CALENDAR_REFRESH_TOKEN_EXPIRED_OR_CONSENT_REVOKED_ERROR);
    }

    // Check 2: If access token has expired, use the refresh token to generate a new access token
    if (!decodeTokenAndCheckExpiryTime(integration.getAccessToken()))
    {
      try
      {
        log.debug("Trying to get updated access token from refresh token");
        this.fetchAndNewAccessTokenForUserUsingRefreshToken(integration);
      }
      catch (Exception e)
      {
        if (e.getMessage().contains("invalid_grant")) // find a better way
        {
          log.error("User has revoked consent or refresh token has expired for integration {}.", integration.getId());
          return Map.of(MS_CALENDAR_ERROR_KEY, MS_CALENDAR_REFRESH_TOKEN_EXPIRED_OR_CONSENT_REVOKED_ERROR);
        }
        log.error("Error occurred while trying to fetch access token for integration {}.", integration.getId());
        return Map.of(MS_CALENDAR_ERROR_KEY, MS_CALENDAR_GENERIC_ERROR);
      }
    }
    return null;
  }

  private List<Object> fetchMSCalendarEvents(HttpEntity<MultiValueMap<String, String>> request, String startDate, String endDate)
  {
    ResponseEntity<Map<String, Object>> calendarEventsResponse = restTemplate.exchange(
            String.format(msGraphCalendarEventsUrl, startDate, endDate),
            HttpMethod.GET,
            request,
            new ParameterizedTypeReference<Map<String, Object>>()
            {
            });

    if (calendarEventsResponse.getStatusCode() == HttpStatus.OK)
    {
      return (List<Object>) calendarEventsResponse.getBody().get("value");
    }
    return null;
  }

  private List<Object> fetchMSCalendarView(HttpEntity<MultiValueMap<String, String>> request, String startDate, String endDate, String skipToken)
  {
    try
    {
      String url = StringUtils.isEmpty(skipToken) ? String.format(msGraphCalendarViewUrl, startDate, endDate) : URLDecoder.decode(skipToken, StandardCharsets.UTF_8);

      Map<String, Object> calendarViewResponse = doGetRequest(request, url);

      if (!calendarViewResponse.isEmpty())
      {
        List<Object> currentView = (List<Object>) calendarViewResponse.get("value");
        String nextSkipToken = (String) calendarViewResponse.get("@odata.nextLink");

        if (nextSkipToken != null && !nextSkipToken.isEmpty())
        {
          List<Object> nextPage = fetchMSCalendarView(request, startDate, endDate, nextSkipToken);
          if (nextPage != null)
          {
            currentView.addAll(nextPage);
          }
        }

        return currentView;
      }
      return List.of();
    }
    catch (IllegalFormatException | RestClientException e)
    {
      log.error("Error while making HTTP request for next page: {}", e.getMessage());
      return null;
    }
  }

  private Map<String, Object> doGetRequest(HttpEntity<MultiValueMap<String, String>> request, String url)
  {
    ResponseEntity<Map<String, Object>> responseEntity = restTemplate.exchange(
            url,
            HttpMethod.GET,
            request,
            new ParameterizedTypeReference<>()
            {
            }
    );

    if (responseEntity.getStatusCode() == HttpStatus.OK && responseEntity.hasBody())
    {
      return responseEntity.getBody();
    }

    return Map.of();
  }

  private HttpEntity<MultiValueMap<String, String>> getHeadersForMSGraphRequests(String accessToken, String userTimeZone)
  {
    HttpHeaders graphHeaders = new HttpHeaders();
    graphHeaders.setBearerAuth(accessToken);
    if (userTimeZone != null)
    {
      graphHeaders.add("Prefer", String.format("outlook.timezone=\"%s\"", userTimeZone));
    }

    return new HttpEntity<>(null, graphHeaders);
  }

  private HttpEntity<MultiValueMap<String, String>> constructAccessTokenRequest(String accessCode)
  {
    // Prepare headers
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
    // Prepare body
    MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
    params.add("client_id", msClientId);
    params.add("scope", msGraphRequestedScopes);
    params.add("code", accessCode);
    params.add("redirect_uri", msRedirectUri);
    params.add("grant_type", "authorization_code");
    params.add("client_secret", msClientSecret);

    return new HttpEntity<>(params, headers);
  }

  private HttpEntity<MultiValueMap<String, String>> constructAccessTokenRequestUsingRefreshToken(String refreshToken)
  {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

    MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
    params.add("client_id", msClientId);
    params.add("scope", msGraphRequestedScopes);
    params.add("refresh_token", refreshToken);
    params.add("grant_type", "refresh_token");
    params.add("client_secret", msClientSecret);

    return new HttpEntity<>(params, headers);
  }

  private HashMap<String, String> getAccessAndRefreshToken(HttpEntity<MultiValueMap<String, String>> requestBody)
  {
    HashMap<String, String> response = new HashMap<>();

    ResponseEntity<String> responseEntity;
    try
    {
      responseEntity = restTemplate.postForEntity(msTokenEndpoint, requestBody, String.class);
      if (responseEntity.getStatusCode() == HttpStatus.OK)
      {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(responseEntity.getBody());
        response.put(ACCESS_TOKEN_KEY, root.path("access_token").textValue());
        response.put(REFRESH_TOKEN_KEY, root.path("refresh_token").textValue());
      }
      return response;
    }
    catch (RestClientException restClientException)
    {
      log.error(
              "failed to exchange token for the user, message: {}",
              restClientException.getMessage(),
              restClientException.getCause()
      );
      throw new RuntimeException(restClientException);
    }
    catch (JsonProcessingException e)
    {
      throw new RuntimeException(e);
    }
  }

  private void fetchAndNewAccessTokenForUserUsingRefreshToken(Integrations integration) throws JsonProcessingException
  {
    HttpEntity<MultiValueMap<String, String>> newAccessTokenRequestEntity = this.constructAccessTokenRequestUsingRefreshToken(integration.getRefreshToken());

    ResponseEntity<String> responseEntity;

    try
    {
      responseEntity = restTemplate.postForEntity(msTokenEndpoint, newAccessTokenRequestEntity, String.class);
      if (responseEntity.getStatusCode() == HttpStatus.OK)
      {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(responseEntity.getBody());

        String newAccessToken = root.path("access_token").textValue();
        String newRefreshToken = root.path("refresh_token").textValue();
        Instant newRefreshTokenCreatedAt = Instant.now();

        integration.setAccessToken(newAccessToken);
        integration.setRefreshToken(newRefreshToken);
        integration.setRefreshTokenCreatedAt(newRefreshTokenCreatedAt);

        integrationsRepository.save(integration);
        log.debug("Successfully got updated token and saved in db");
      }
    }
    catch (RestClientException restClientException)
    {
      log.error(
              "failed to exchange the token, with message {}",
              restClientException.getMessage(),
              restClientException.getCause()
      );
    }
  }

  /**
   * Calendar OAuth is configured only when the app registration is present.
   * Blank {@code INTEGRATIONS_MS_OAUTH_*} values must be treated as "not
   * connected", even if a leftover {@code ms-calendar} row exists.
   */
  public boolean isMsCalendarConfigured()
  {
    return StringUtils.isNotBlank(msClientId)
            && StringUtils.isNotBlank(msClientSecret)
            && StringUtils.isNotBlank(msRedirectUri);
  }

  public Optional<Integrations> getIntegration(Principal principal)
  {
    if (!isMsCalendarConfigured())
    {
      return Optional.empty();
    }

    Optional<UserAccess> userAccessOptional = userAccessDataService.findByEmail(
            principal.getName()
    ).stream().filter(userAccess ->
            Objects.equals(userAccess.getInstance().getId(), InstanceIdContext.getInstanceId())
    ).findFirst();

    if (userAccessOptional.isPresent())
    {
      Optional<Integrations> integrationOptional = integrationsRepository.findByUserAccessId(userAccessOptional.get().getId()).stream().findFirst();
      if (integrationOptional.isPresent())
      {
        return integrationOptional;
      }
    }

    return Optional.empty();
  }

  public void deleteIntegration(Integrations integration)
  {
    this.integrationsRepository.delete(integration);
  }

}
