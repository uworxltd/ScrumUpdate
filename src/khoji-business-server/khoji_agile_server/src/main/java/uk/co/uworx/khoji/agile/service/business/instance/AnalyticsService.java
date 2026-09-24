package uk.co.uworx.khoji.agile.service.business.instance;

import lombok.extern.log4j.Log4j2;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import uk.co.uworx.khoji.agile.config.KASConfigs;
import uk.co.uworx.khoji.agile.config.SyncConfigs;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.internal.model.Sync;
import uk.co.uworx.khoji.agile.persistence.context.InstanceIdContext;
import uk.co.uworx.khoji.agile.persistence.model.Config;
import uk.co.uworx.khoji.agile.persistence.model.Instance;
import uk.co.uworx.khoji.agile.persistence.service.ConfigDataService;
import uk.co.uworx.khoji.agile.persistence.service.InstanceDataService;
import uk.co.uworx.khoji.agile.persistence.service.InstanceDataService;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static uk.co.uworx.khoji.agile.constants.InstanceConfigs.SPRINT_ANALYTICS_TARGET_SPRINT;

@Service
@Log4j2
public class AnalyticsService {
  private final KASConfigs kasConfigs;
  private final SyncConfigs syncConfigs;
  private final RestTemplate restTemplate;
  private final SyncService syncService;
  private final ConfigDataService configDataService;
  private final InstanceDataService instanceDataService;

  public AnalyticsService(
          KASConfigs kasConfigs,
          SyncConfigs syncConfigs,
          RestTemplate restTemplate,
          SyncService syncService,
          ConfigDataService configDataService,
          InstanceDataService instanceDataService
  )
  {
    this.kasConfigs = kasConfigs;
    this.syncConfigs = syncConfigs;
    this.restTemplate = restTemplate;
    this.syncService = syncService;
    this.configDataService = configDataService;
    this.instanceDataService = instanceDataService;
  }

  public ResponseEntity<?> getAnalyticsData(String teamId, String analyticsType) throws ServiceException
  {
    String sprintId = this.configDataService.getConfigByInstanceId(
            SPRINT_ANALYTICS_TARGET_SPRINT,
            null
    );

    Instance instance = instanceDataService
            .findById(null, true)
            .orElseThrow(() -> new ServiceException(ServiceError.I0404));

    String instanceUrl = "https://" + instance.getInstanceName() + ".atlassian.net/browse/";

    if (analyticsType == null || analyticsType.trim().isEmpty())
    {
      analyticsType = "sprint_insight";
    }
    else
    {
      analyticsType = analyticsType.toLowerCase();
    }

    return fetchAnalyticsData(
            buildKasUrlForSprint(
                    analyticsType,
                    Map.of(
                            "sprint_id", sprintId,
                            "team_name", teamId,
                            "jira_browse_base", instanceUrl
                    )
            ),
            sprintId
    );
  }

  /**
   * Get sprint static summary data from analytics service.
   * Calls the sprint_static_summary metric to get formatted data for the static summary card.
   */
  public ResponseEntity<?> getSprintStaticSummary(String sprintId) throws ServiceException {
    return fetchAnalyticsData(buildKasUrlForSprint("sprint_static_summary", sprintId), sprintId);
  }

  /**
   * Get sprint status changes data from analytics service.
   * Calls the sprint_status_changes metric to get status change information for the static summary card.
   */
  public ResponseEntity<?> getSprintStatusChanges(String sprintId) throws ServiceException {
    return fetchAnalyticsData(buildKasUrlForSprint("sprint_status_changes", sprintId), sprintId);
  }

  public ResponseEntity<?> getSprintVelocityBurndown(String sprintId) throws ServiceException {
    return fetchAnalyticsData(buildKasUrlForSprint("sprint_velocity_burndown", sprintId), sprintId);
  }

  /**
   * Get sprint team pulse data from analytics service.
   * Calls the sprint_team_pulse metric to get team health and velocity data.
   */
  public ResponseEntity<?> getSprintTeamPulse(String sprintId) throws ServiceException {
    return fetchAnalyticsData(buildKasUrlForSprint("sprint_team_pulse", sprintId), sprintId);
  }

  /**
   * Get epic progress data from analytics service.
   * Calls the sprint_epic_fetch metric to get epic names and basic information for a sprint.
   */
  public ResponseEntity<?> getEpicFetch(String sprintId) throws ServiceException {
    return fetchAnalyticsData(buildKasUrlForSprint("sprint_epic_fetch", sprintId), sprintId);
  }

  /**
   * Get sprint signals data from analytics service.
   * Calls the sprint_signals metric to get AI-based blockers and insights.
   * @deprecated Use getSprintSignalsJira or getSprintSignalsHuman instead
   */
  @Deprecated
  public ResponseEntity<?> getSprintSignals(String sprintId, String source) throws ServiceException {
    return fetchAnalyticsData(buildKasUrlForSprint("sprint_signals", Map.of(
      "sprint_id", sprintId,
      "source", source)), sprintId);
  }

  /**
   * Get JIRA-only sprint signals (optimized, no AI processing).
   * Fast response with just data-driven insights.
   */
  public ResponseEntity<?> getSprintSignalsJira(String sprintId) throws ServiceException {
    return fetchAnalyticsData(buildKasUrlForSprint("sprint_signals_jira", sprintId), sprintId);
  }

  /**
   * Get AI-enhanced sprint signals with human intuition.
   * Includes LLM processing for deeper insights (slower but more comprehensive).
   */
  public ResponseEntity<?> getSprintSignalsHuman(String sprintId) throws ServiceException {
    return fetchAnalyticsData(buildKasUrlForSprint("sprint_signals_human", sprintId), sprintId);
  }

  /**
   * Get AI-powered insights for a specific ticket.
   * Analyzes ticket timeline, status changes, and provides actionable recommendations.
   * @param issueKey The JIRA issue key (e.g., KFX-123)
   * @return ResponseEntity with ticket insights including what went wrong and recommended actions
   * @throws ServiceException if REST call fails
   */
  public ResponseEntity<?> getTicketInsights(String issueKey) throws ServiceException {
    return fetchAnalyticsData(buildKasUrlForSprint("sprint_epic_ticket_insights", Map.of("issue_key", issueKey)), issueKey);
  }

  /**
   * Get AI-powered insights for a specific epic.
   * Analyzes epic progress, risks, and provides actionable recommendations.
   * @param epicKey The JIRA epic key (e.g., KFX-284)
   * @param sprintId The sprint ID for context
   * @return ResponseEntity with epic insights including progress, risks, and recommendations
   * @throws ServiceException if REST call fails
   */
  public ResponseEntity<?> getEpicInsights(String epicKey, String sprintId) throws ServiceException {
    return fetchAnalyticsData(buildKasUrlForSprint("sprint_epic_insights", Map.of("epic_key", epicKey, "sprint_id", sprintId)), sprintId);
  }

  /**
   * Generalized method to fetch analytics data from the analytics service.
   * Handles common tasks: sync job validation, header preparation, URL building, and REST execution.
   *
   * @param kasUrl   The metric absolute path including query strings
   * @param sprintId The sprint ID to fetch data for
   * @return ResponseEntity with analytics data or NO_CONTENT if no sync jobs found
   * @throws ServiceException if REST call fails
   */
  private ResponseEntity<?> fetchAnalyticsData(String kasUrl, String sprintId) throws ServiceException {
    try {
      HttpHeaders kasHeaders = buildKasHeaders();
      
      ResponseEntity<?> response = executeGet(kasUrl, kasHeaders, new ParameterizedTypeReference<>() {
      });
      
      return response;
    } catch (RestClientException rce) {
      log.error("Error while making external call to analytics service for {}", kasUrl, rce);
      throw new ServiceException(ServiceError.KX400, rce);
    }
  }

  public List<Sync.SprintInfo> fetchTenantSprints() throws ServiceException {
    try {
      ResponseEntity<List<Sync.SprintInfo>> resp = executeGet(
              syncConfigs.getKssBaseUrl() + syncConfigs.getTenantSprintsEndpoint(),
              syncService.getHttpHeadersForSync(),
              new ParameterizedTypeReference<List<Sync.SprintInfo>>() {
              }
      );
      return resp.getBody();
    } catch (RestClientException rce) {
      log.error("error fetching tenant sprints", rce);
      throw new ServiceException(ServiceError.KX400, rce);
    }
  }

  public String setTargetSprintForSprintAnalytics(String sprintId) {
    try {
      Config targetSprintConfig = new Config(
              InstanceIdContext.getInstanceId(),
              SPRINT_ANALYTICS_TARGET_SPRINT,
              sprintId
      );
      return this.configDataService.saveOrUpdateConfig(targetSprintConfig).getPropValue();
    } catch (Exception e) {
      log.error("Failed to set target sprint config for sprint analytics: {}", e.getMessage());
      throw new RuntimeException(e);
    }
  }

  private HttpHeaders buildKasHeaders() {
    HttpHeaders httpHeaders = new HttpHeaders();
    String tenantId = InstanceIdContext.getInstanceId().toString();
    log.debug("Building KAS headers with tenant ID: {}", tenantId);
    httpHeaders.add("x-tenant", tenantId);
    return httpHeaders;
  }

private String buildKasUrlForSprint(String metric, Map<String, String> map) {
  return kasConfigs.getCompleteEndpointFor(metric, map);
}

private String buildKasUrlForSprint(String metric, String sprintId) {
  return buildKasUrlForSprint(metric, Map.of("sprint_id", sprintId));
}

  private <T> ResponseEntity<T> executeGet(String url, HttpHeaders headers, ParameterizedTypeReference<T> type)
    throws RestClientException {
    try {
      return restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(null, headers), type);
    } catch (RestClientException re) {
      log.error("rest call failed to url {}", url, re);
      throw re;
    }
  }

  private <T> ResponseEntity<T> executeGetForObject(String url, HttpHeaders headers, Class<T> clazz)
    throws RestClientException {
    try {
      return restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(null, headers), clazz);
    } catch (RestClientException re) {
      log.error("rest call failed to url {}", url, re);
      throw re;
    }
  }
}