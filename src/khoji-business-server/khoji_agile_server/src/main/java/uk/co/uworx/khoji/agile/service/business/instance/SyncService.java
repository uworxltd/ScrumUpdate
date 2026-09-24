package uk.co.uworx.khoji.agile.service.business.instance;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import uk.co.uworx.khoji.agile.config.SyncConfigs;
import uk.co.uworx.khoji.agile.internal.error.BusinessError;
import uk.co.uworx.khoji.agile.internal.error.BusinessException;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.internal.model.Sync;
import uk.co.uworx.khoji.agile.persistence.context.InstanceIdContext;
import uk.co.uworx.khoji.agile.persistence.model.IdentityProvider;
import uk.co.uworx.khoji.agile.persistence.model.KhojiUser;
import uk.co.uworx.khoji.agile.persistence.service.ConfigDataService;
import uk.co.uworx.khoji.agile.persistence.service.IdentityProviderDataService;
import uk.co.uworx.khoji.agile.persistence.service.InstanceDataService;
import uk.co.uworx.khoji.agile.persistence.service.KhojiUserDataService;

import java.net.URI;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

@Service
@Log4j2
public class SyncService
{
  private final RestTemplate restTemplate;
  private final SyncConfigs syncConfigs;
  private final KhojiUserDataService khojiUserDataService;
  private final IdentityProviderDataService identityProviderDataService;
  private final InstanceDataService instanceDataService;
  private final ConfigDataService configDataService;
  private final Map<String, String> runningJobs = new HashMap<>();
  @Value("${jira.client.id}")
  private String jiraClientId;
  @Value("${jira.client.secret}")
  private String jiraClientSecret;
  @Value("${sync.payload}")
  private String syncPayloadJson;
  @Value("${proactive.sync.parameters}")
  private String proactiveSyncParametersJson;
  @Value("${sprints.list.sync.parameters}")
  private String sprintsListSyncParametersJson;

  public SyncService(
          RestTemplate restTemplate,
          SyncConfigs syncConfigs,
          KhojiUserDataService khojiUserDataService,
          IdentityProviderDataService identityProviderDataService,
          InstanceDataService instanceDataService,
          ConfigDataService configDataService
  )
  {
    this.restTemplate = restTemplate;
    this.syncConfigs = syncConfigs;
    this.khojiUserDataService = khojiUserDataService;
    this.identityProviderDataService = identityProviderDataService;
    this.instanceDataService = instanceDataService;
    this.configDataService = configDataService;
  }

  public Sync.JobSubmissionResponse submitSyncJob(
          Sync.SyncParameters syncParameters,
          String principal
  )
  {
    try
    {
      // Try short circuit if similar job exists
      Sync.JobSubmissionResponse existingJob = findLatestMatchingJob(syncParameters, principal);
      if (existingJob != null)
      {
        return existingJob;
      }

      UserSyncContext userContext = buildUserSyncContext(principal);
      Sync.SyncParameters body = parseBuildSyncRequest(syncParameters);
      HttpHeaders headers = buildSyncHeaders(userContext);

      ResponseEntity<Sync.JobSubmissionResponse> response = restTemplate.exchange(
              syncConfigs.getKssBaseUrl() + syncConfigs.getSyncStartEndPoint(),
              HttpMethod.POST,
              new HttpEntity<>(body, headers),
              new ParameterizedTypeReference<>()
              {
              }
      );
      return response.getBody();
    }
    catch (Exception e)
    {
      throw new ServiceException(ServiceError.KSS100);
    }
  }

  private Sync.JobSubmissionResponse findLatestMatchingJob(Sync.SyncParameters syncParameters, String principal)
  {
    List<Sync.SyncJob> runningJobs = this.fetchTenantJobsByStatusAndType("running", syncParameters.job_type(), principal);
    List<Sync.SyncJob> pendingJobs = this.fetchTenantJobsByStatusAndType("pending", syncParameters.job_type(), principal);
    if (!runningJobs.isEmpty() || !pendingJobs.isEmpty())
    {
      Optional<Sync.SyncJob> matchingJobOptional = Stream.of(runningJobs, pendingJobs)
        .flatMap(Collection::stream)
        .filter(job -> syncParameters.parameters().equals(job.parameters()))
        .max(Comparator.comparing(Sync.SyncJob::created_at));

      if (matchingJobOptional.isPresent()) {
        Sync.SyncJob latestJob = matchingJobOptional.get();
        return new Sync.JobSubmissionResponse(latestJob.job_id(), latestJob.status(), null, latestJob.created_at().toString());
      }
    }
    return null;
  }

  private List<Sync.SyncJob> fetchTenantJobsByStatusAndType(String status, String type, String principal)
  {
    try
    {
      HttpHeaders headers = this.getHttpHeadersForSync();

      // build the status and job_type query params
      URI uri = UriComponentsBuilder
        .fromHttpUrl(syncConfigs.getKssBaseUrl())
        .path(syncConfigs.getSyncJobsEndpoint())
        .queryParamIfPresent("status", Optional.ofNullable(status))
        .queryParamIfPresent("job_type", Optional.ofNullable(type))
        .build()
        .encode()
        .toUri();

      ResponseEntity<List<Sync.SyncJob>> response = restTemplate.exchange(
        uri,
        HttpMethod.GET,
        new HttpEntity<>(null, headers),
        new ParameterizedTypeReference<>()
        {
        }
      );
      return response.getBody();
    }
    catch (Exception e)
    {
      throw new RuntimeException(e);
    }
  }

  public void deleteTenantSchema(Long instanceId) throws RestClientException
  {
    try
    {
      String instanceIdStr = String.valueOf(instanceId);
      Map<String, ?> requestBody = Map.of(
              "confirmation_token", instanceIdStr,
              "force", false,
              "create_backup", false
      );
      executeKssRequest(
              syncConfigs.getTenantSchemaDeleteEndpoint().replace("%s", instanceIdStr),
              HttpMethod.DELETE,
              requestBody,
              new ParameterizedTypeReference<>()
              {
              },
              new HttpHeaders()
      );
    }
    catch (HttpClientErrorException.Conflict restClientException)
    {
      log.debug("Schema doesnt exist, so skipping deletion");
    }
  }

  public Sync.StatusResponse getSyncStatus(String jobId)
  {
    try {
      return executeKssRequest(
              String.format(syncConfigs.getSyncStatusEndPoint(), jobId),
              HttpMethod.GET,
              null,
              new ParameterizedTypeReference<Sync.StatusResponse>() {}
      );
    } catch (Exception e) {
      throw new RuntimeException("Failed to fetch sync status", e);
    }
  }

  public <T> List<T> searchSyncJobsByType(String sprintId, String type) {
    HttpHeaders headers = this.getHttpHeadersForSync();

    // Build the URI with UriComponentsBuilder
    URI uri = UriComponentsBuilder
            .fromHttpUrl(syncConfigs.getKssBaseUrl())
            .path("/api/jobs/search")
            .queryParam("search_term", "{\"sprint_ids\": [" + sprintId + "]}")
            .queryParam("job_type", type)
            .build()
            .encode()
            .toUri();

    return restTemplate.exchange(
            uri,
            HttpMethod.GET,
            new HttpEntity<>(null, headers),
            new ParameterizedTypeReference<List<T>>() {}
    ).getBody();
  }

  public Sync.Start.Response startSync(String principalName)
  {
    try
    {
      UserSyncContext userContext = buildUserSyncContext(principalName);
      Sync.Start.Request request = buildSyncRequest(principalName, syncPayloadJson);
      HttpHeaders httpHeaders = buildSyncHeaders(userContext);

      Sync.JobSubmissionResponse jobSubmissionResponse = executeKssRequest(
              syncConfigs.getSyncStartEndPoint(),
              HttpMethod.POST,
              request,
              Sync.JobSubmissionResponse.class,
              httpHeaders
      );

      Sync.Start.Response syncTriggerResponse = new Sync.Start.Response(
              jobSubmissionResponse.submitted_at(),
              principalName
      );

      log.debug("SyncTriggerResponse: " + syncTriggerResponse);
      return syncTriggerResponse;
    }
    catch (Exception e)
    {
      throw new RuntimeException(e);
    }
  }

  public Sync.Start.Response startProActiveSync(String principalName)
  {
    try
    {
      UserSyncContext userSyncContext = buildUserSyncContext(principalName);
      Sync.Start.Request request = buildSyncRequest(principalName, this.proactiveSyncParametersJson);
      HttpHeaders httpHeaders = buildSyncHeaders(userSyncContext);

      Sync.JobSubmissionResponse jobSubmissionResponse = executeKssRequest(
              syncConfigs.getSyncStartEndPoint(),
              HttpMethod.POST,
              request,
              Sync.JobSubmissionResponse.class,
              httpHeaders
      );

      Sync.Start.Response syncTriggerResponse = new Sync.Start.Response(
              jobSubmissionResponse.submitted_at(),
              principalName
      );

      log.debug("ProactiveSprintsSyncTriggerResponse: " + syncTriggerResponse);
      return syncTriggerResponse;
    }
    catch (Exception e)
    {
      throw new RuntimeException(e);
    }
  }

  public Sync.JobSubmissionResponse syncSprintsList(String principalName)
  {
    try
    {
      UserSyncContext userSyncContext = buildUserSyncContext(principalName);
      Sync.Start.Request request = buildSyncRequest(principalName, this.sprintsListSyncParametersJson);
      HttpHeaders httpHeaders = buildSyncHeaders(userSyncContext);

      Sync.JobSubmissionResponse jobSubmissionResponse = executeKssRequest(
              syncConfigs.getSyncStartEndPoint(),
              HttpMethod.POST,
              request,
              Sync.JobSubmissionResponse.class,
              httpHeaders
      );

      Sync.Start.Response syncTriggerResponse = new Sync.Start.Response(
              jobSubmissionResponse.submitted_at(),
              principalName
      );

      log.debug("SprintsListSyncTriggerResponse: " + syncTriggerResponse);
      return jobSubmissionResponse;
    }
    catch (Exception e)
    {
      throw new RuntimeException(e);
    }
  }

  public HttpHeaders getHttpHeadersForSync()
  {
    HttpHeaders httpHeaders = new HttpHeaders();
    httpHeaders.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
    httpHeaders.setContentType(MediaType.APPLICATION_JSON);
    httpHeaders.add("X-Tenant-ID", String.valueOf(InstanceIdContext.getInstanceId()));

    return httpHeaders;
  }

  private <T> T executeKssRequest(
          String endpoint,
          HttpMethod method,
          Object requestBody,
          ParameterizedTypeReference<T> responseType
  )
  {
    return executeKssRequest(endpoint, method, requestBody, responseType, getHttpHeadersForSync());
  }

  private <T> T executeKssRequest(
          String endpoint,
          HttpMethod method,
          Object requestBody,
          Class<T> responseType,
          HttpHeaders headers
  )
  {
    ResponseEntity<T> responseEntity = restTemplate.exchange(
            syncConfigs.getKssBaseUrl() + endpoint,
            method,
            new HttpEntity<>(requestBody, headers),
            responseType
    );
    return responseEntity.getBody();
  }

  private <T> T executeKssRequest(
          String endpoint,
          HttpMethod method,
          Object requestBody,
          ParameterizedTypeReference<T> responseType,
          HttpHeaders headers
  )
  {
    ResponseEntity<T> responseEntity = restTemplate.exchange(
            syncConfigs.getKssBaseUrl() + endpoint,
            method,
            new HttpEntity<>(requestBody, headers),
            responseType
    );
    return responseEntity.getBody();
  }

  // TODO: Consolidate with analytics service - Waqas
  private <T> ResponseEntity<T> executeGet(String url, HttpHeaders headers, ParameterizedTypeReference<T> type)
          throws RestClientException
  {
    try
    {
      return restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(null, headers), type);
    }
    catch (RestClientException re)
    {
      log.error("rest call failed to url {}", url, re);
      throw re;
    }
  }

  public List<Sync.SprintInfo> fetchTenantSprints() throws ServiceException
  {
    try
    {
      ResponseEntity<List<Sync.SprintInfo>> resp = executeGet(
              syncConfigs.getKssBaseUrl() + syncConfigs.getTenantSprintsEndpoint(),
              getHttpHeadersForSync(),
              new ParameterizedTypeReference<List<Sync.SprintInfo>>()
              {
              }
      );
      return resp.getBody();
    }
    catch (RestClientException rce)
    {
      log.error("error fetching tenant sprints", rce);
      throw new ServiceException(ServiceError.KX400, rce);
    }
  }

//  private Sync.Status buildSyncStatusResponse(Map<String, Object> responseMap)
//  {
//    Sync.Status response = new Sync.Status(true,null, null, null, null, null);
//
//    HashMap<String, Object> currentActivity = (HashMap<String, Object>) responseMap.get("current_activity");
//    Object progressObj = currentActivity.get("progress_message");
//    String progressMessage = (progressObj != null) ? progressObj.toString() : "";
//    response.setProgressTracking(progressMessage);
//
//    HashMap<String, Object> recommendation = (HashMap<String, Object>) responseMap.get("sync_recommendation");
//    String action = recommendation.get("action").toString();
//
//    if (StringUtils.equals(action, "full_sync"))
//    {
//      return response;
//    }
//    else if (StringUtils.equals(action, "proactive_sync"))
//    {
//      List<Sync.SprintInfo> sprints = fetchTenantSprints();
//      if (!sprints.isEmpty()) {
//        response.setStatus("select_target_sprint");
//        return response;
//      }
//      response.setStatus(action);
//      return response;
//    }
//    else if (StringUtils.equals(action, "select_target_sprint"))
//    {
//      response.setStatus(action);
//      return response;
//    }
//    else if (StringUtils.equals(action, "none"))
//    {
//      response.setFirstTimeSync(false);
//      response.setStatus("success");
//      HashMap<String, String> syncHistory = (HashMap<String, String>) responseMap.get("sync_history");
//      String lastSuccessfulSyncDate = syncHistory.get("last_successful_sync_date");
//      response.setLastSyncedAt(lastSuccessfulSyncDate);
//      response.setProgressTracking("");
//      return response;
//    }
//    else if (StringUtils.equals(action, "wait"))
//    {
//      response.setStatus("running");
//      return response;
//    }
//
//    return null;
//  }

  private UserSyncContext buildUserSyncContext(String principalName)
  {
    KhojiUser khojiUser = khojiUserDataService
            .findByEmail(principalName)
            .orElseThrow(() -> new ServiceException(ServiceError.U0404));

    IdentityProvider identityProvider = identityProviderDataService.getIdentityProviderByUserId(khojiUser.getId());
    String tenantId = instanceDataService
            .findById(null, true)
            .orElseThrow(() -> new ServiceException(ServiceError.G0100))
            .getTenantId();

    return new UserSyncContext(tenantId, principalName, identityProvider.getSourceAccessToken(), identityProvider.getProviderAccountId());
  }

  private Sync.Start.Request buildSyncRequest(String principalName, String syncPayloadJson)
  {
    try
    {
      ObjectMapper objectMapper = new ObjectMapper();
      //      String proActiveSprintId = this.configDataService.getConfigByInstanceId(InstanceConfigs.SPRINT_ANALYTICS_TARGET_SPRINT, InstanceIdContext.getInstanceId());
//      if (StringUtils.isNotBlank(proActiveSprintId))
//      {
//        request.getParameters().setJql(proActiveSprintId);
//      }
      return objectMapper.readValue(syncPayloadJson, Sync.Start.Request.class);
    }
    catch (JsonProcessingException e)
    {
      throw new RuntimeException(e);
    }
  }

  private Sync.SyncParameters parseBuildSyncRequest(Sync.SyncParameters parameters)
  {
    try
    {
      // TODO: The intention here is to use a default value for the job parameters which is tenant-specific if only the parameters have not been provided by the FE
      // If we do the above, the payload jsons should be coming from tenant specific config
      // This function should preferably return only the SyncParameters.Parameters type
      String jobType = parameters.job_type();
      Sync.SyncParameters.Parameters jobParams = parameters.parameters();

      if (jobType != null && jobParams == null) {

        ObjectMapper mapper = new ObjectMapper();

        return switch (jobType) {
          case "sprints_list_sync" -> mapper.readValue(sprintsListSyncParametersJson, Sync.SyncParameters.class);
          case "recent_activity_issues" -> mapper.readValue(syncPayloadJson, Sync.SyncParameters.class);
          default -> null;
        };
      }
      else
      {
        return parameters.withPriority(5).withCreatedBy("orchestrator");
      }
    }
    catch (JsonProcessingException e)
    {
      throw new RuntimeException(e);
    }
  }

  private HttpHeaders buildSyncHeaders(UserSyncContext userContext)
  {
    HttpHeaders httpHeaders = getHttpHeadersForSync();
    httpHeaders.add("X-Tenant-Source-Tenant-ID", userContext.tenantId());
    httpHeaders.add("X-Tenant-Username", userContext.email());
    httpHeaders.add("X-Tenant-Api-Token", userContext.apiToken());
    httpHeaders.add("X-Tenant-Source-Account-ID", userContext.accountId());
    return httpHeaders;
  }

  private record UserSyncContext(String tenantId, String email, String apiToken, String accountId)
  {
  }
}
