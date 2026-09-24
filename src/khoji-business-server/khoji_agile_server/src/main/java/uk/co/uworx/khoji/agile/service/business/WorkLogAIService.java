package uk.co.uworx.khoji.agile.service.business;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.log4j.Log4j2;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.ObjectUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.internal.model.AiWorklogErrorCode;
import uk.co.uworx.khoji.agile.internal.model.SummaryGeneration;
import uk.co.uworx.khoji.agile.persistence.context.InstanceIdContext;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUserConfig;
import uk.co.uworx.khoji.agile.persistence.model.ScrumUpdateAudit;
import uk.co.uworx.khoji.agile.persistence.model.WorkLogAudit;
import uk.co.uworx.khoji.agile.persistence.service.ConfigDataService;
import uk.co.uworx.khoji.agile.persistence.service.InstanceUserConfigDataService;
import uk.co.uworx.khoji.agile.persistence.service.ScrumUpdateAuditDataService;
import uk.co.uworx.khoji.agile.persistence.service.WorkLogAuditDataService;
import uk.co.uworx.khoji.agile.request.GenerateAIWorkLogRequest;
import uk.co.uworx.khoji.agile.response.ActivityRequest;
import uk.co.uworx.khoji.agile.response.ScrumUpdateRequest;
import uk.co.uworx.khoji.agile.response.GenerateAIWorkLogResponse;
import uk.co.uworx.khoji.agile.response.UserActivityData;
import uk.co.uworx.khoji.agile.response.UserActivityInformation;
import uk.co.uworx.khoji.agile.response.WorkLogAIDetails;

import java.security.Principal;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

import static uk.co.uworx.khoji.agile.internal.model.AiWorklogErrorCode.ND001;
import static uk.co.uworx.khoji.agile.internal.model.AiWorklogErrorCode.ND002;
import static uk.co.uworx.khoji.agile.internal.model.AiWorklogErrorCode.ND003;
import static uk.co.uworx.khoji.agile.internal.model.AiWorklogErrorCode.ND004;
import static uk.co.uworx.khoji.agile.internal.model.AiWorklogErrorCode.ND005;
import static uk.co.uworx.khoji.agile.internal.model.AiWorklogErrorCode.ND007;
import static uk.co.uworx.khoji.agile.service.jobs.WorkLogSummariesGenerationJob.WORKLOG_GENERATION_KEY;

@Log4j2
@Service
public class WorkLogAIService
{
  @Autowired
  protected RestTemplate restTemplate;

  @Autowired
  private InstanceUserConfigDataService instanceUserConfigDataService;

  @Autowired
  private WorkLogAuditDataService  workLogAuditDataService;

  @Autowired
  private ScrumUpdateAuditDataService scrumUpdateAuditDataService;

  @Autowired
  private ObjectMapper objectMapper;

  @Autowired
  private IssueService issueService;

  @Autowired
  private ConfigDataService configDataService;

  @Autowired
  private PropertiesService propertiesService;

  @Value("${khoji.insights.ai.base.url:http://localhost:4245}")
  public String aiAppBaseUrl;

  public GenerateAIWorkLogResponse fetchWorkLogFromAI(
          List<UserActivityData> userActivityDataList,
          InstanceUser instanceUser,
          GenerateAIWorkLogRequest generateWorkLogRequest,
          AtomicBoolean isAnyActivityOnSource,
          HashMap<String, String> errorMap,
          boolean integrationPresent,
          Principal principal
  )
  {
    String uniqueIdentifier = UUID.randomUUID().toString();

    InstanceUserConfig instanceUserSummaryConfig = instanceUserConfigDataService.findByKeyAndByInstanceUserId(
            WORKLOG_GENERATION_KEY,
            instanceUser.getId()
    );

    ActivityRequest activityRequest = new ActivityRequest(
            generateWorkLogRequest.getRequestedDate(),
            generateWorkLogRequest.getHoursToGenerate(),
            new UserActivityInformation(
                    instanceUser.getId(),
                    instanceUser.getRole().getName()
            ),
            userActivityDataList,
            Collections.emptyMap(),
            uniqueIdentifier,
            ObjectUtils.isEmpty(instanceUserSummaryConfig) ? "" : instanceUserSummaryConfig.getValue()
    );
    try
    {
      // Pre-emptively return error response before sending request to KIA
      GenerateAIWorkLogResponse error = checkIfAnyErrorOccurs(errorMap, integrationPresent);
      if (error != null)
      {
        return error;
      }

      log.debug("About to fetch data AI, {}", new ObjectMapper().writeValueAsString(activityRequest));
      WorkLogAudit workLogAudit = null;
      boolean storageAllowed = configDataService.isDataStorageAllowed(null);

      //store that entry in a variable
      log.debug("[SCRUM-TIMER] AI generate-worklogs start uid={}", uniqueIdentifier);
      long aiStart = System.currentTimeMillis();
      ResponseEntity<LinkedHashMap> response = restTemplate
              .exchange(
                      aiAppBaseUrl + "/generate-worklogs",
                      HttpMethod.POST,
                      new HttpEntity<Object>(
                              activityRequest,
                              getRequestHeadersForAI()
                      ),
                      new ParameterizedTypeReference<>() {}
              );
      long aiEnd = System.currentTimeMillis();
      int respSize = response.getBody() != null ? objectMapper.writeValueAsString(response.getBody()).length() : 0;
      log.debug("[SCRUM-TIMER] AI generate-worklogs completed uid={} took={}ms respSize={}bytes", uniqueIdentifier, aiEnd - aiStart, respSize);

      LinkedHashMap responseBody = response.getBody();
      if (responseBody.containsKey("generated_output") && responseBody.containsKey("processed_input"))
      {
        log.debug("Data fetched successfully from AI application");
        String generatedOutputString = objectMapper.writeValueAsString(responseBody.get("generated_output"));
        if (storageAllowed) {

          workLogAudit = new WorkLogAudit(
                  uniqueIdentifier,
                  generateWorkLogRequest.getRequestedDate(),
                  instanceUser.getFullName(),
                  instanceUser.getId()
          );
          workLogAuditDataService.createOrUpdateWorkLogAudit(workLogAudit);

          workLogAudit.setGeneratedOutput(generatedOutputString);

          String processedInputString = objectMapper.writeValueAsString(responseBody.get("processed_input"));
          workLogAudit.setProcessedInput(processedInputString);

          workLogAuditDataService.createOrUpdateWorkLogAudit(workLogAudit);
        }
        GenerateAIWorkLogResponse generateAIWorkLogResponse = objectMapper.readValue(generatedOutputString, GenerateAIWorkLogResponse.class);

        Double totalHours = generateAIWorkLogResponse.getData().stream().mapToDouble(WorkLogAIDetails::getTime).sum();

        generateAIWorkLogResponse.setData(generateAIWorkLogResponse.getData().stream()
                .filter(workLog -> issueService.doesIssueExistOnSource(workLog.getKey(), principal).isValid())
                .toList());

        if (CollectionUtils.isNotEmpty(generateAIWorkLogResponse.getData()) && generateAIWorkLogResponse.getData().stream().mapToDouble(WorkLogAIDetails::getTime).sum() == 0) {
          generateAIWorkLogResponse.getData().get(0).setTime(totalHours);
        }

        generateAIWorkLogResponse.setUniqueIdentifier(uniqueIdentifier);

        Map<String, String> issueSummaries = getIssuesSummaries(userActivityDataList);

        generateAIWorkLogResponse
              .getData()
              .forEach(issue -> issue.setTaskTitle(issueSummaries.containsKey(issue.getKey()) ? issueSummaries.get(issue.getKey()) : StringUtils.EMPTY));

        if(generateAIWorkLogResponse.getData().isEmpty()) {
          log.error("No worklog response generated by AI");
          errorMap.put(ND002.name(), ND002.getErrorCode());
        }

        error = checkIfAnyErrorOccurs(errorMap, integrationPresent);
        if (error != null)
        {
          return error;
        }

        return generateAIWorkLogResponse;
      }
    }
    catch (Exception exception)
    {
      log.error("Error while fetching or mapping response from AI application: {}", String.valueOf(exception));
      throw new ServiceException(ServiceError.AI001);
    }

    return null;
  }

  public Object generateCategoryFromAI(Object request)
  {
    try
    {
      ResponseEntity<LinkedHashMap> response = restTemplate
              .exchange(
                      aiAppBaseUrl + "/categorize-issuetypes",
                      HttpMethod.POST,
                      new HttpEntity<>(
                              request,
                              getRequestHeadersForAI()
                      ),
                      new ParameterizedTypeReference<>() {}
              );

      return response.getBody();
    }
    catch (Exception exception)
    {
      log.error("Error occurred while fetching response from AI: {}", exception.toString());
      return new ServiceException(ServiceError.AI001);
    }
  }

  public void pingKIAContainerForPromptCaching()
  {
    try
    {
      ResponseEntity<Object> response = restTemplate
              .exchange(
                      aiAppBaseUrl + "/cache-prompt",
                      HttpMethod.GET,
                      new HttpEntity<>(
                              getRequestHeadersForAI()
                      ),
                      new ParameterizedTypeReference<>()
                      {
                      }
              );

      log.debug("Prompt cache request is successful");
    }
    catch (Exception exception)
    {
      log.error("Error occurred while caching prompt from AI: {}", exception.toString());
      throw new ServiceException(ServiceError.AI001);
    }
  }

  public SummaryGeneration.ScrumResponseKBS getUserScrumUpdate(
          SummaryGeneration.ScrumRequestKBS requestKBS,
          List<UserActivityData> userActivityData,
          HashMap<String, String> errorMap,
          InstanceUser instanceUser
  )
  {
    String uniqueIdentifier = UUID.randomUUID().toString();
    ScrumUpdateAudit scrumUpdateAudit = null;
    boolean storageAllowed = configDataService.isDataStorageAllowed(null);

    try
    {
      List<Boolean> anyHasData = userActivityData.stream().map(ad -> ObjectUtils.isNotEmpty(ad.getData())).toList();

//      if (!anyHasData.contains(true))
//      {
//        return new SummaryGeneration.ScrumResponseKBS(
//                "There is no data to be processed by AI"
//        );
//      }

        ScrumUpdateRequest activityRequest = new ScrumUpdateRequest(
              requestKBS.getYesterdayDate(),
              requestKBS.getTodayDate(),
              8D,
              new UserActivityInformation(
                      instanceUser.getId(),
                      instanceUser.getRole().getName()
              ),
              userActivityData,
              Collections.emptyMap(),
              uniqueIdentifier,
              ""
      );

      // Create initial audit entry if storage is allowed
      if (storageAllowed) {
        scrumUpdateAudit = new ScrumUpdateAudit(
                uniqueIdentifier,
                requestKBS.getYesterdayDate(),
                requestKBS.getTodayDate(),
                instanceUser.getFullName(),
                instanceUser.getId()
        );
        scrumUpdateAuditDataService.createOrUpdateScrumUpdateAudit(scrumUpdateAudit);
      }

      log.debug("[SCRUM-TIMER] AI scrum-update start uid={}", uniqueIdentifier);
      long aiStart = System.currentTimeMillis();
      ResponseEntity<SummaryGeneration.ScrumResponseKBS> response = restTemplate.exchange(
              aiAppBaseUrl + "/scrum-update",
              HttpMethod.POST,
              new HttpEntity<>(
                      activityRequest,
                      getRequestHeadersForAI()
              ),
              SummaryGeneration.ScrumResponseKBS.class
      );
      long aiEnd = System.currentTimeMillis();
      int respSize = response.getBody() != null ? objectMapper.writeValueAsString(response.getBody()).length() : 0;
      log.debug("[SCRUM-TIMER] AI scrum-update completed uid={} took={}ms respSize={}bytes", uniqueIdentifier, aiEnd - aiStart, respSize);

      SummaryGeneration.ScrumResponseKBS responseBody = response.getBody();

      // Update audit entry with input and output if storage is allowed
      if (storageAllowed && scrumUpdateAudit != null) {
        String generatedOutputString = objectMapper.writeValueAsString(responseBody);
        scrumUpdateAudit.setGeneratedOutput(generatedOutputString);

        String processedInputString = objectMapper.writeValueAsString(activityRequest);
        scrumUpdateAudit.setProcessedInput(processedInputString);

        scrumUpdateAuditDataService.createOrUpdateScrumUpdateAudit(scrumUpdateAudit);
      }

      return responseBody;
    }
    catch (Exception e)
    {
        throw new ServiceException(ServiceError.AI001);
    }
  }

  public SummaryGeneration.Response getWorkLogSummary(
          SummaryGeneration.Request request,
          SummaryGeneration.Type type
  )
  {
    try
    {
      ResponseEntity<SummaryGeneration.Response> response = restTemplate.exchange(
              getSummaryGenerationEndpoint(type),
              HttpMethod.POST,
              new HttpEntity<>(
                      request,
                      getRequestHeadersForAI()
              ),
              SummaryGeneration.Response.class
      );

      return response.getBody();
    }
    catch (Exception e)
    {
      log.error("failed to retrieve the activity for user", e);
      throw e;
    }
  }

  private String getSummaryGenerationEndpoint(SummaryGeneration.Type type)
  {
    return switch (type)
    {
      case PERSONALIZATION, CURRENT_WEEKLY_WORK_LOG_SUMMARY ->
        aiAppBaseUrl + "/weekly-retro";
      default -> throw new ServiceException(ServiceError.EP501);
    };
  }

  /**
   * Sequence in this method matters a lot.
   * The error map is populated from behind and based
   * on combination error is thrown with message
   *
   * @param errorMap map with enum error code and error messages
   * @param integrationPresent MS Teams integration
   */
  private GenerateAIWorkLogResponse checkIfAnyErrorOccurs(HashMap<String, String> errorMap, boolean integrationPresent)
  {
    // error from Jira and no calendar integration
    if(errorMap.containsKey(ND003.name()) && !integrationPresent)
    {
      return new GenerateAIWorkLogResponse(
              AiWorklogErrorCode.ND003.name(),
              AiWorklogErrorCode.ND003.getErrorCode(),
              null,
              null
      );
    }
    //error from calendar
    if((errorMap.containsKey(ND005.name())))
    {
      return new GenerateAIWorkLogResponse(
              AiWorklogErrorCode.ND005.name(),
              AiWorklogErrorCode.ND005.getErrorCode(),
              null,
              null
      );
    }
    //When no activity from Jira and calendar
    if(errorMap.containsKey(ND001.name()) && errorMap.containsKey(ND007.name()))
    {
      return new GenerateAIWorkLogResponse(
              AiWorklogErrorCode.ND006.name(),
              AiWorklogErrorCode.ND006.getErrorCode(),
              null,
              null
      );
    }
    //when no activity on Jira and no calendar
    if((errorMap.containsKey(ND001.name())) && !integrationPresent)
    {
      return new GenerateAIWorkLogResponse(
              AiWorklogErrorCode.ND001.name(),
              AiWorklogErrorCode.ND001.getErrorCode(),
              null,
              null
      );
    }
    //When no work log is generated by AI and no integrationPresent
    if(errorMap.containsKey(ND002.name()) && !integrationPresent)
    {
      return new GenerateAIWorkLogResponse(
              AiWorklogErrorCode.ND001.name(),
              AiWorklogErrorCode.ND001.getErrorCode(),
              null,
              null
      );
    }
    //When no work log is generated by AI
    if(errorMap.containsKey(ND002.name()))
    {
      return new GenerateAIWorkLogResponse(
              AiWorklogErrorCode.ND002.name(),
              AiWorklogErrorCode.ND002.getErrorCode(),
              null,
              null
      );
    }
    //There is token problem
    if ((errorMap.containsKey(ND004.name())) && integrationPresent)
    {
      return new GenerateAIWorkLogResponse(
              AiWorklogErrorCode.ND004.name(),
              AiWorklogErrorCode.ND004.getErrorCode(),
              null,
              null
      );

    }
    return null;
  }

  private HttpHeaders getRequestHeadersForAI()
  {
      HttpHeaders httpHeaders = new HttpHeaders();
      String tenantId = InstanceIdContext.getInstanceId().toString();
      log.debug("Building KGS headers with tenant ID: {}", tenantId);
      httpHeaders.add("x-tenant", tenantId);
      return httpHeaders;
  }

  private Map<String, String> getIssuesSummaries(List<UserActivityData> userActivityDataList){
    List<HashMap<String, Object>> issues = userActivityDataList.stream()
            .filter(a -> a.getData() != null)
            .flatMap(a -> ((List<HashMap<String, Object>>) a.getData()).stream())
            .collect(Collectors.toList());

    // Remove duplicates and return map of issue key -> issue title
    Map<String, String> uniqueIssuesMap = Collections.synchronizedMap(new HashMap<>());
    issues.parallelStream().forEach(issue -> {
      if (issue.containsKey("key")) {
        String key = issue.get("key").toString();
        if (StringUtils.isNotEmpty(key) && !uniqueIssuesMap.containsKey(key)) {
          uniqueIssuesMap.put(key, ((HashMap<String, String>) issue.get("fields")).get("summary"));
        }
      }
    });

    return uniqueIssuesMap;
  }
}

