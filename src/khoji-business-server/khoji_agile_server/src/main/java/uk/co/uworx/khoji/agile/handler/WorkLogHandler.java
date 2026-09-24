/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.handler;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.log4j.Log4j2;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import uk.co.uworx.khoji.agile.config.WorklogConfig;
import uk.co.uworx.khoji.agile.helper.WorkLogHourConfigService;
import uk.co.uworx.khoji.agile.internal.datamodel.KhojiIssueType;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.internal.model.AiWorklogErrorCode;
import uk.co.uworx.khoji.agile.internal.model.InstanceUserDetails;
import uk.co.uworx.khoji.agile.internal.model.Issue;
import uk.co.uworx.khoji.agile.internal.model.KhojiUserStatus;
import uk.co.uworx.khoji.agile.internal.model.SummaryGeneration;
import uk.co.uworx.khoji.agile.internal.model.Team;
import uk.co.uworx.khoji.agile.internal.model.TeamWorkLog;
import uk.co.uworx.khoji.agile.internal.model.User;
import uk.co.uworx.khoji.agile.internal.model.UserStatus;
import uk.co.uworx.khoji.agile.internal.model.WorkLog;
import uk.co.uworx.khoji.agile.internal.model.WorkLogCategory;
import uk.co.uworx.khoji.agile.internal.model.WorklogDistributionConfig;
import uk.co.uworx.khoji.agile.internal.model.request.DataClientRequest;
import uk.co.uworx.khoji.agile.internal.model.request.DataClientRequestType;
import uk.co.uworx.khoji.agile.internal.model.request.IssueDataClientRequest;
import uk.co.uworx.khoji.agile.internal.model.request.WorkLogDataClientRequest;
import uk.co.uworx.khoji.agile.internal.service.MemberService;
import uk.co.uworx.khoji.agile.internal.service.UserService;
import uk.co.uworx.khoji.agile.persistence.context.InstanceIdContext;
import uk.co.uworx.khoji.agile.persistence.context.TenantIdContext;
import uk.co.uworx.khoji.agile.persistence.dto.MemberDTO;
import uk.co.uworx.khoji.agile.persistence.dto.TeamDTO;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;
import uk.co.uworx.khoji.agile.persistence.model.Integrations;
import uk.co.uworx.khoji.agile.persistence.model.UserAccess;
import uk.co.uworx.khoji.agile.persistence.model.WorkLogAudit;
import uk.co.uworx.khoji.agile.persistence.repository.IntegrationsRepository;
import uk.co.uworx.khoji.agile.persistence.service.ConfigDataService;
import uk.co.uworx.khoji.agile.persistence.service.UserAccessDataService;
import uk.co.uworx.khoji.agile.persistence.service.WorkLogAuditDataService;
import uk.co.uworx.khoji.agile.request.GenerateAIWorkLogRequest;
import uk.co.uworx.khoji.agile.request.PostWorklogRequest;
import uk.co.uworx.khoji.agile.request.UserWorklogSummaryLoggedTimeInDays;
import uk.co.uworx.khoji.agile.request.UserWorklogSummaryRequest;
import uk.co.uworx.khoji.agile.request.UserWorklogSummaryResponse;
import uk.co.uworx.khoji.agile.request.WorkLogModels;
import uk.co.uworx.khoji.agile.request.WorkLogRequest;
import uk.co.uworx.khoji.agile.response.GenerateAIWorkLogResponse;
import uk.co.uworx.khoji.agile.response.Member;
import uk.co.uworx.khoji.agile.response.UserActivityData;
import uk.co.uworx.khoji.agile.response.WorkLogResponse;
import uk.co.uworx.khoji.agile.service.TenantService;
import uk.co.uworx.khoji.agile.service.TimeService;
import uk.co.uworx.khoji.agile.service.WorkLogAsyncService;
import uk.co.uworx.khoji.agile.service.business.InstanceUserService;
import uk.co.uworx.khoji.agile.service.business.TeamsService;
import uk.co.uworx.khoji.agile.service.business.WorkLogAIService;
import uk.co.uworx.khoji.agile.service.business.WorkLogService;
import uk.co.uworx.khoji.agile.service.business.integration.IntegrationsService;

import java.security.Principal;
import java.text.DecimalFormat;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

import static uk.co.uworx.khoji.agile.service.Constants.MS_CALENDAR_EMPTY_RESPONSE;
import static uk.co.uworx.khoji.agile.service.Constants.MS_CALENDAR_ERROR_KEY;
import static uk.co.uworx.khoji.agile.service.Constants.MS_CALENDAR_GENERIC_ERROR;
import static uk.co.uworx.khoji.agile.service.Constants.MS_CALENDAR_REFRESH_TOKEN_EXPIRED_OR_CONSENT_REVOKED_ERROR;
import static uk.co.uworx.khoji.agile.service.Constants.MS_CALENDAR_VIEW;
import static uk.co.uworx.khoji.agile.service.Constants.MS_CALENDAR_VIEW_KEY;

@Component
@Log4j2
public class WorkLogHandler
{
  public final static String WORKLOG_COLUMN = "Worklog";
  public static final DecimalFormat DECIMAL_FORMAT = new DecimalFormat("#.##");
  @Value("${issueTypes.recentUsage.periodDays:7}")
  public Integer recentUsagePeriodDays;
  @Autowired
  private TenantService tenantService;
  @Autowired
  private TeamHandler teamHandler;
  private MemberService memberService;
  private UserService userService;
  @Autowired
  private InstanceUserService instanceUserService;
  @Autowired
  private WorkLogHourConfigService workLogHourConfigService;
  @Autowired
  private WorkLogService workLogService;
  @Autowired
  private WorkLogAIService workLogAIService;
  @Autowired
  private WorklogConfig worklogConfig;
  @Autowired
  private TeamsService teamsService;
  @Autowired
  private TimeService timeService;
  @Autowired
  private IntegrationsService integrationsService;
  @Autowired
  private UserAccessDataService userAccessDataService;
  @Autowired
  private IntegrationsRepository integrationsRepository;
  @Autowired
  private WorkLogAuditDataService workLogAuditDataService;
  @Autowired
  private ConfigDataService configDataService;
  @Autowired
  private WorkLogAsyncService workLogAsyncService;

  private static double getTotalLoggedTimeInSeconds(List<UserWorklogSummaryLoggedTimeInDays> loggedTimeInDays)
  {
    return loggedTimeInDays
            .stream()
            .flatMap(e -> e.getData().stream().flatMap(wi -> wi.getWorkLogItems().stream()))
            .mapToDouble(UserWorklogSummaryLoggedTimeInDays.BreakDown.WorkLogItem::getTimeSpentInSeconds)
            .sum();
  }

  private static List<UserWorklogSummaryLoggedTimeInDays> createListOfSummaryResponsesFromMap(
          Map<String, List<UserWorklogSummaryLoggedTimeInDays.BreakDown>> aggregatedWorklogsMap
  )
  {
    return aggregatedWorklogsMap
            .entrySet()
            .stream()
            .map(entry -> new UserWorklogSummaryLoggedTimeInDays(entry.getKey(), entry.getValue()))
            .toList();
  }

  public UserWorklogSummaryResponse getUserWorklogSummary(UserWorklogSummaryRequest request, Principal principal)
  {
    InstanceUserDetails instanceUserDetails = instanceUserService.getInstanceUserDetails(principal, request.getTimeZone());

    if (instanceUserDetails == null)
    {
      log.error("No user found against account id: {}", request.getAccountId());
      throw new ServiceException(ServiceError.IU001);
    }

    List<String> members = new ArrayList<>();
    members.add(request.getAccountId());

    List<Issue> issues = tenantService.getDataClient().getWorkLogData(
            getWorkLogDataClientRequest(
                    request.getStartDate(),
                    request.getEndDate(),
                    members,
                    null,
                    worklogConfig.workLogTenant
            ),
            principal
    );

    List<UserWorklogSummaryLoggedTimeInDays> loggedTimeInDays = getLoggedTimeInDays(
            issues,
            instanceUserDetails.getTimeZone(),
            request.getStartDate(),
            request.getEndDate(),
            request.getAccountId()
    );

    double totalLoggedTimeInSeconds = getTotalLoggedTimeInSeconds(loggedTimeInDays);
    double totalAvailableSeconds = getTotalAvailableSeconds(request , instanceUserDetails.getTimeZone());
    double worklogPercentage = (totalLoggedTimeInSeconds / totalAvailableSeconds) * 100;

    return new UserWorklogSummaryResponse(
            worklogPercentage,
            totalAvailableSeconds,
            totalLoggedTimeInSeconds,
            loggedTimeInDays,
            workLogHourConfigService.getWorklogHoursPerDay(),
            workLogService.getTenantSpecificWorkLogThreshold(),
            workLogService.getWorkLogThresholdsColors()
    );
  }

  public void pingKIAContainerForPromptCache()
  {
      workLogAIService.pingKIAContainerForPromptCaching();
  }

  public GenerateAIWorkLogResponse generateWorkLogWithAI(
          GenerateAIWorkLogRequest generateWorkLogRequest,
          Principal principal
  )
  {
    HashMap<String, String> errorMap = new HashMap<>();

    InstanceUser instanceUser;
    // if request is from kgs add accountId of principal user and hours to generate as well
    if (StringUtils.isEmpty(generateWorkLogRequest.getAccountId()))
    {
      instanceUser = instanceUserService.getInstanceUserAgainstPrincipal(
              principal,
              null
      );
      generateWorkLogRequest.setAccountId(instanceUser.getAccountId());
      // overrides the value sent by KGS, if logic is shifted there remove it from here,
      // this is a quick fix and should be this way ig?
      generateWorkLogRequest.setHoursToGenerate(workLogHourConfigService.getWorklogHoursPerDay());
    }
    else
    {
      instanceUser = instanceUserService.getInstanceUserWithAccountId(
              generateWorkLogRequest.getAccountId()
      );
    }


    log.debug("About to fetch response for user: {}", instanceUser.getAccountId());

    AtomicBoolean isThereAnyErrorFromJira = new AtomicBoolean(false);
    Optional<Integrations> integrationOptional = integrationsService.getIntegration(principal);

    CompletableFuture<Object> userActivityFuture = workLogAsyncService.getUserActivityAsync(
            generateWorkLogRequest,
            principal,
            instanceUser,
            isThereAnyErrorFromJira,
            InstanceIdContext.getInstanceId(),
            TenantIdContext.getTenantId()
    );

    CompletableFuture<Object> defaultTicketsFuture = workLogAsyncService.getDefaultTicketsAsync(
            generateWorkLogRequest,
            principal,
            integrationOptional,
            instanceUser,
            InstanceIdContext.getInstanceId(),
            TenantIdContext.getTenantId()
    );

    CompletableFuture<Map<String, Object>> calendarDataFuture = workLogAsyncService.getTeamsCalendarDataAsync(
            integrationOptional,
            instanceUser,
            InstanceIdContext.getInstanceId(),
            TenantIdContext.getTenantId(),
            generateWorkLogRequest.getRequestedDate(),
            generateWorkLogRequest.getRequestedDate()
    );

    try
    {
      Object activityResponseBody = userActivityFuture.get();
      Object defaultTicketsResponseBody = defaultTicketsFuture.get();
      Map<String, Object> calendarIntegrationData = calendarDataFuture.get();
      return getGenerateAIWorkLogResponse(
              generateWorkLogRequest,
              principal,
              activityResponseBody,
              errorMap,
              defaultTicketsResponseBody,
              isThereAnyErrorFromJira,
              instanceUser,
              integrationOptional,
              calendarIntegrationData
      );

    }
    catch (Exception e)
    {
      log.error("Error occurred while getting parallel response: {}", e.toString());
      throw new ServiceException(ServiceError.AI001);
    }
  }

  private GenerateAIWorkLogResponse getGenerateAIWorkLogResponse(
          GenerateAIWorkLogRequest generateWorkLogRequest,
          Principal principal,
          Object activityResponseBody,
          HashMap<String, String> errorMap,
          Object defaultTicketsResponseBody,
          AtomicBoolean isThereAnyErrorFromJira,
          InstanceUser instanceUser,
          Optional<Integrations> integrationOptional,
          Map<String, Object> calendarIntegrationData
  )
  {
    List<UserActivityData> userActivityDataList = generateUserActivityObject(
            activityResponseBody,
            errorMap,
            defaultTicketsResponseBody,
            isThereAnyErrorFromJira,
            instanceUser,
            integrationOptional,
            calendarIntegrationData
    );


    return workLogAIService.fetchWorkLogFromAI(
            userActivityDataList,
            instanceUser,
            generateWorkLogRequest,
            isThereAnyErrorFromJira,
            errorMap,
            integrationOptional.isPresent(),
            principal
    );
  }

  private List<UserActivityData> generateUserActivityObject(
          Object activityResponseBody,
          HashMap<String, String> errorMap,
          Object defaultTicketsResponseBody,
          AtomicBoolean isThereAnyErrorFromJira,
          InstanceUser instanceUser,
          Optional<Integrations> integrationOptional,
          Map<String, Object> calendarIntegrationData
  )
  {
    if (activityResponseBody instanceof ArrayList<?> && ((ArrayList<?>) activityResponseBody).isEmpty())
    {
      errorMap.put(AiWorklogErrorCode.ND001.name(), AiWorklogErrorCode.ND001.getErrorCode());
    }

    try
    {
      // User activity payload log commented to reduce log volume. Uncomment below line to see full payload:
      // log.debug("User activity: {}", new ObjectMapper().writeValueAsString(activityResponseBody));
    }
    catch (Exception exception)
    {
      log.error("Failed to log user activity event");
    }

    try
    {
      log.debug("Default ticket events: {}", new ObjectMapper().writeValueAsString(defaultTicketsResponseBody));
    }
    catch (Exception exception)
    {
      log.error("Failed to log default ticket event");
    }

    if (isThereAnyErrorFromJira.get())
    {
      errorMap.put(AiWorklogErrorCode.ND003.name(), AiWorklogErrorCode.ND003.getErrorCode());
    }

    List<UserActivityData> userActivityDataList = new ArrayList<>();

    userActivityDataList.add(
            new UserActivityData(
                    "Jira",
                    instanceUser.getFullName(),
                    activityResponseBody
            )
    );

    userActivityDataList.add(
            new UserActivityData(
                    "defaults",
                    instanceUser.getFullName(),
                    defaultTicketsResponseBody
            )
    );

    if (integrationOptional.isPresent())
    {
      if (calendarIntegrationData.containsKey(MS_CALENDAR_ERROR_KEY))
      {
        String error = (String) calendarIntegrationData.get(MS_CALENDAR_ERROR_KEY);
        if (StringUtils.equals(error, MS_CALENDAR_REFRESH_TOKEN_EXPIRED_OR_CONSENT_REVOKED_ERROR))
        {
          errorMap.put(AiWorklogErrorCode.ND004.name(), AiWorklogErrorCode.ND004.getErrorCode());
          // Delete existing integration
          integrationsService.deleteIntegration(integrationOptional.get());
        }
        else if (StringUtils.equals(error, MS_CALENDAR_GENERIC_ERROR))
        {
          errorMap.put(AiWorklogErrorCode.ND005.name(), AiWorklogErrorCode.ND005.getErrorCode());
        }
        else if (StringUtils.equals(error, MS_CALENDAR_EMPTY_RESPONSE))
        {
          errorMap.put(AiWorklogErrorCode.ND007.name(), AiWorklogErrorCode.ND007.getErrorCode());
        }
      }

      try
      {
        log.debug("MS Teams events: {}", new ObjectMapper().writeValueAsString(calendarIntegrationData));
      }
      catch (Exception exception)
      {
        log.error("Failed to log teams event {}", exception.toString());
      }

      userActivityDataList.add(
              new UserActivityData(
                      MS_CALENDAR_VIEW_KEY,
                      instanceUser.getFullName(),
                      calendarIntegrationData.get(MS_CALENDAR_VIEW)
              )
      );
    }
    else
    {
      userActivityDataList.add(
              new UserActivityData(
                      MS_CALENDAR_VIEW_KEY,
                      instanceUser.getFullName(),
                      null
              )
      );
    }

    return userActivityDataList;
  }

  public Object generateIssueTypesCategoryWithAI(Object request)
  {
    return workLogAIService.generateCategoryFromAI(request);
  }

  private double getTotalAvailableSeconds(UserWorklogSummaryRequest request, String timeZone)
  {
    double numberOfWorkingDays = timeService.getNumberOfWorkingDaysExcludingFutureDate(new WorkLogRequest(new ArrayList<>(), request.getStartDate(), request.getEndDate(), false), timeZone);
    return numberOfWorkingDays * workLogHourConfigService.getWorklogHoursPerDay() * 3600;
  }

  private List<UserWorklogSummaryLoggedTimeInDays> getLoggedTimeInDays(
          List<Issue> issues,
          String userTimeZone,
          String startDateString,
          String endDateString,
          String accountId
  )
  {
    List<WorkLog> flattenedWorklogs = issues
            .stream()
            .flatMap(issueWorklog -> issueWorklog.getWorklog().getWorklogs().stream())
            .filter(workLog -> workLog.getAuthor().getAccountId().equals(accountId))
            .toList();

    //TODO: refactor
    Map<String, String> sourceIssueIdToIssueKeyMap = issues
            .stream()
            .collect(Collectors.toMap(Issue::getSourceId, Issue::getId));

    Map<String, String> sourceIssueIdToIssueSummaryMap = issues
            .stream()
            .collect(Collectors.toMap(Issue::getSourceId, Issue::getName));

    Map<String, String> sourceIssueIdToIssueTypeMap = issues
            .stream()
            .collect(Collectors.toMap(
                    Issue::getSourceId,
                    issue -> issue.getIssueType().getName()
            ));


    if (userTimeZone != null)
    {
      log.debug("About to convert UTC time into: {}", userTimeZone);
    }

    List<WorkLog> worklogsPerUserTimezone = userTimeZone != null ?
                                            adjustWorklogsPerUserTimeZone(flattenedWorklogs, userTimeZone) :
                                            flattenedWorklogs;

    Map<String, List<UserWorklogSummaryLoggedTimeInDays.BreakDown>> aggregatedWorklogsMap = createAggregateWorkLogMapAgainstDates(
            worklogsPerUserTimezone,
            sourceIssueIdToIssueKeyMap,
            sourceIssueIdToIssueSummaryMap,
            sourceIssueIdToIssueTypeMap,
            startDateString,
            endDateString
    );

    fillMissingDates(aggregatedWorklogsMap, startDateString, endDateString);

    Map<String, List<UserWorklogSummaryLoggedTimeInDays.BreakDown>> processedWorkLogsMap = sortWorkLogsByDates(
            aggregatedWorklogsMap
    );

    return createListOfSummaryResponsesFromMap(processedWorkLogsMap);
  }

  private List<WorkLog> adjustWorklogsPerUserTimeZone(List<WorkLog> flattenedWorklogs, String userTimeZone)
  {
    return flattenedWorklogs.stream().map(worklog -> {
      ZonedDateTime original = ZonedDateTime.parse(
              worklog.getStarted(),
              DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSZ")
      );
      ZonedDateTime converted = original.withZoneSameInstant(ZoneId.of(userTimeZone));
      WorkLog.WorkLogBuilder workLogBuilder = worklog.toBuilder();
      return workLogBuilder.started(converted.toString()).build();

    }).toList();
  }

  private Map<String, List<UserWorklogSummaryLoggedTimeInDays.BreakDown>> createAggregateWorkLogMapAgainstDates(
          List<WorkLog> flattenedWorkLogs,
          Map<String, String> sourceIssueIdToIssueKeyMap,
          Map<String, String> sourceIssueIdToIssueSummaryMap,
          Map<String, String> sourceIssueIdToIssueTypeMap,
          String startDate,
          String endDate
  )
  {
    Map<String, List<WorkLog>> groupedWorkLogs = flattenedWorkLogs
            .stream()
            .collect(
                    Collectors.groupingBy(wl -> wl.getStarted().split("T")[0])
            );

    removeOutOfRangeDates(groupedWorkLogs, startDate, endDate);

    Map<String, List<UserWorklogSummaryLoggedTimeInDays.BreakDown>> breakDownsByDate = new HashMap<>();

    for (Map.Entry<String, List<WorkLog>> entry: groupedWorkLogs.entrySet())
    {
      Map<String, List<UserWorklogSummaryLoggedTimeInDays.BreakDown.WorkLogItem>> groupedByIssueId = entry
              .getValue()
              .stream()
              .collect(
                      Collectors.groupingBy(
                              WorkLog::getIssueId,
                              Collectors.mapping(
                                      UserWorklogSummaryLoggedTimeInDays.BreakDown.WorkLogItem::new,
                                      Collectors.toList()
                              )
                      )
              );

      for(Map.Entry<String, List<UserWorklogSummaryLoggedTimeInDays.BreakDown.WorkLogItem>> item: groupedByIssueId.entrySet())
      {
        breakDownsByDate.computeIfAbsent(entry.getKey(), e -> new ArrayList<>()).add(
                new UserWorklogSummaryLoggedTimeInDays.BreakDown(
                        sourceIssueIdToIssueKeyMap.get(item.getKey()),
                        sourceIssueIdToIssueTypeMap.get(item.getKey()),
                        sourceIssueIdToIssueSummaryMap.get(item.getKey()),
                        item.getValue()
                )
        );
      }
    }

    return breakDownsByDate;
  }

  private Map<String, List<UserWorklogSummaryLoggedTimeInDays.BreakDown>> sortWorkLogsByDates(
          Map<String, List<UserWorklogSummaryLoggedTimeInDays.BreakDown>> map
  )
  {
    return new TreeMap<>(map);
  }

  private void removeOutOfRangeDates(
          Map<String, List<WorkLog>> map,
          String startDateString,
          String endDateString
  )
  {
    LocalDate startDate = LocalDate.parse(startDateString);
    LocalDate endDate = LocalDate.parse(endDateString);
    map
            .entrySet()
            .removeIf(worklogEntry ->
                              LocalDate.parse(worklogEntry.getKey()).isAfter(endDate) ||
                              LocalDate.parse(worklogEntry.getKey()).isBefore(startDate)
            );
  }

  private void fillMissingDates(
          Map<String, List<UserWorklogSummaryLoggedTimeInDays.BreakDown>> map,
          String startDateString,
          String endDateString
  )
  {
    LocalDate startDate = LocalDate.parse(startDateString);
    LocalDate endDate = LocalDate.parse(endDateString);
    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1))
    {
      String dateString = date.format(formatter);
      if (!map.containsKey(dateString))
      {
        map.put(dateString, new ArrayList<>());
      }
    }
  }

  public WorkLogResponse getWorkLog(WorkLogRequest workLogRequestParam, Principal principal)
  {
    WorkLogResponse workLogResponse = new WorkLogResponse();
    workLogResponse.setDateFrom(workLogRequestParam.getDateFrom());
    workLogResponse.setDateTo(workLogRequestParam.getDateTo());
    if (workLogRequestParam.isStats())
    {
      Set<Member> uniqueMembers;
      // This is only fetched once per request from DB
      Map<String, Double> colorMap = workLogService.getTenantSpecificWorkLogThreshold();
      Map<String, WorklogDistributionConfig> workLogDistributionmap = workLogService.getTenantSpecificWorkLogDistribution();

      List<TeamDTO> teamsRequested = teamsService.getTeamsByName(workLogRequestParam.getTeams());
      List<TeamWorkLog> workLogs = workLogService.getWorkLogStats(workLogRequestParam, workLogDistributionmap, teamsRequested, principal);
      uniqueMembers = getUniqueMembersOfAllSelectedTeams(workLogs);

      workLogService.calculatePercentages(workLogRequestParam, workLogs);
      workLogService.setTotalPercentages(workLogs, workLogDistributionmap);
      workLogService.addOthersTaskToMembersDistribution(workLogs, colorMap);
      workLogService.setTotalDays(workLogs, workLogDistributionmap);
      workLogResponse.setWorkAudit(workLogs);
      workLogResponse.setSummary(workLogService.getSummary(workLogs));
      workLogResponse.setMemberCount(uniqueMembers.size());
      workLogResponse.setTotalAvailableDays(getTotalAvailableDaysOfAllSelectedTeams(uniqueMembers));
      workLogResponse.setThresholdPercentage(colorMap);
      workLogResponse.setThresholdColors(workLogService.getWorkLogThresholdsColors());
      setColumnsList(workLogs, workLogDistributionmap);
      workLogResponse.setMainCategoryCols(getMainCategoryCols(workLogDistributionmap));
      workLogResponse.setOtherCategoryCols(getOtherCategoryCols(workLogs));
    }
    return workLogResponse;
  }

  /**
   * Method used in work log email processor
   * Defines if other column exist or all issue types
   * are categorized
   *
   * @param data
   * @return
   */
  public boolean doesOtherColumnExist(List<TeamWorkLog> data)
  {
    boolean result = false;
    if (data != null)
    {
      for (TeamWorkLog team : data)
      {
        if (
                team != null && team.getOthersDistrMeta() != null &&
                !team.getOthersDistrMeta().isEmpty()
        )
        {
          return true;
        }
      }
    }
    return result;
  }

  /**
   * Method to get uncategorized work log columns from
   * the calculated work logs
   *
   * @param workLogs
   * @return
   */
  private Set<String> getOtherCategoryCols(List<TeamWorkLog> workLogs)
  {
    Set<String> otherCategoryCols = new HashSet<>();
    for (TeamWorkLog workLog : workLogs)
    {
      otherCategoryCols.addAll(workLog.getOthersDistrMeta());
    }

    return otherCategoryCols;
  }

  /**
   * Method to get Main work log columns from
   * the calculated work logs
   *
   * @return
   */
  private List<WorkLogCategory> getMainCategoryCols(Map<String, WorklogDistributionConfig> distributionMap)
  {
    return distributionMap.entrySet().stream().map(entry -> {
      List<String> mainCategorySubList = entry.getValue().getIssueTypes().stream().map(KhojiIssueType::getName)
              .toList();
      return new WorkLogCategory(entry.getKey(), mainCategorySubList);
    }).toList();
  }

  private void setColumnsList(List<TeamWorkLog> workLogs, Map<String, WorklogDistributionConfig> distributionMap)
  {
    for (TeamWorkLog teamWorkLog : workLogs)
    {
      List<String> columns = new ArrayList<>();
      columns.add(WORKLOG_COLUMN);
      columns.addAll(distributionMap.keySet());

      teamWorkLog.setColumnsNames(columns);
    }
  }

  private KhojiIssueType getMissingTaskId(Issue issue, Principal principal)
  {
    DataClientRequest dataClientRequest = new DataClientRequest(null,
            new IssueDataClientRequest(Collections.singletonList(issue.getId()), Integer.toString(tenantService.getDataSourceTenantId())),
            DataClientRequestType.ISSUE_BY_ID);

    List<Issue> issueWithType = tenantService.getDataClient().searchIssuesUsingPost(dataClientRequest, principal);

    return issueWithType.get(0).getIssueType();
  }

  private void sortWorkLogs(List<Issue> issues)
  {
    issues.stream().forEach(issue -> {
      if (issue.getWorklog() != null)
      {
        issue.getWorklog().getWorklogs().sort(new Comparator<WorkLog>()
        {
          @Override
          public int compare(WorkLog o1, WorkLog o2)
          {
            return Integer.compare(o1.hashCode(), o2.hashCode());
          }
        });
      }
    });
  }

  private void sortIssues(List<Issue> issues)
  {
    issues.sort(new Comparator<Issue>()
    {
      @Override
      public int compare(Issue o1, Issue o2)
      {
        return o1.getId().compareTo(o2.getId());
      }
    });
  }

  private boolean workLogDateValid(WorkLogRequest workLogRequestParam, String created)
  {
    try
    {
      SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
      Date dateFrom = sdf.parse(workLogRequestParam.getDateFrom());
      Date dateTo = sdf.parse(workLogRequestParam.getDateTo());
      Date dateCreated = sdf.parse(created);

      if (dateCreated.compareTo(dateFrom) >= 0 && dateCreated.compareTo(dateTo) <= 0)
      {
        return true;
      }

    }
    catch (Exception exception)
    {
      log.error("Error occurred in parsing workLog date. Complete Exception is : ", exception);
    }
    return false;
  }

  /**
   * This method returns the list of issues with work log data.
   * The worklog.tenant property defines from where to fetch data (Tempo or Jira)
   * By default it will fetch data from Jira.
   * This method fetches data on the basis on users Jira account id, we have no implementation
   * supporting data fetching with email id as well
   *
   * @param teams    for which time log is requested
   * @param dateFrom
   * @param dateTo
   * @return list of issues with work log
   */
  public List<Issue> getWorkLog(List<String> teams, String dateFrom, String dateTo, boolean fetchOnlyIssueTypes, Principal principal)
  {
    List<uk.co.uworx.khoji.agile.internal.model.Member> teamMembers = new ArrayList<>();
    List<Long> teamIds = getTeamIds(teams);

    for (Long team : teamIds)
    {
      teamMembers.addAll(memberService.getActiveMemberInTeamForGivenDateRange(team, dateFrom, dateTo));
    }

    List<User> workLogUsers = getWorkLogUsers(teamMembers);

    List<User> activeUsers = userService.getActiveUsers(workLogUsers);
    List<User> revokedUsers = userService.getRevokedUsers(workLogUsers);

    List<String> activeMembersEmails = getMembersAccountIds(activeUsers);

    List<Issue> issues = new ArrayList<>();
    if (CollectionUtils.isNotEmpty(activeMembersEmails))
    {
      issues.addAll(
              fetchOnlyIssueTypes ?
                      tenantService.getDataClient().getWorkLogIssuesWithLimitedInformation(
                              new TypeReference<List<Issue>>()
                              {
                              },
                              getWorkLogDataClientRequest(
                                      dateFrom,
                                      dateTo,
                                      activeMembersEmails,
                                      teamHandler.getAllTeamMemberObjectsDTO(teams),
                                      worklogConfig.workLogTenant
                              ),
                              principal
                      ) :
                      tenantService.getDataClient().getWorkLogData(
                              getWorkLogDataClientRequest(
                                      dateFrom,
                                      dateTo,
                                      activeMembersEmails,
                                      teamHandler.getAllTeamMemberObjectsDTO(teams),
                                      worklogConfig.workLogTenant
                              ),
                              principal
                      )
      );
    }
    if (CollectionUtils.isNotEmpty(revokedUsers))
    {
      for (User user : revokedUsers)
      {
        List<UserStatus> userStatuses = user.getUserStatuses();
        for (UserStatus userStatus : userStatuses)
        {
          if (!(KhojiUserStatus.REVOKED.equals(userStatus.getStatus())) && userStatusValidDateRange(dateFrom, dateTo, userStatus))
          {
            issues.addAll(
                    tenantService.getDataClient().getWorkLogData(
                            getWorkLogDataClientRequest(
                                    userStatus.getStartDate().format(DateTimeFormatter.ISO_LOCAL_DATE),
                                    userStatus.getEndDate().format(DateTimeFormatter.ISO_LOCAL_DATE),
                                    Collections.singletonList(user.getMember().getMemberEmail()),
                                    teamHandler.getAllTeamMemberObjectsDTO(teams),
                                    worklogConfig.workLogTenant
                            ),
                            principal
                    )
            );
          }
        }
      }
    }
    return issues.stream().distinct().collect(Collectors.toList());
  }

  private boolean userStatusValidDateRange(String dateFromRequest, String dateToRequest, UserStatus userStatus)
  {
    try
    {
      SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
      Date dateFrom = sdf.parse(dateFromRequest);
      Date dateTo = sdf.parse(dateToRequest);
      Date userStatusDateFrom = sdf.parse(userStatus.getStartDate().format(DateTimeFormatter.ISO_LOCAL_DATE));
      Date userStatusDateTo = sdf.parse(userStatus.getEndDate().format(DateTimeFormatter.ISO_LOCAL_DATE));

      if (userStatusDateFrom.compareTo(dateTo) <= 0 && userStatusDateTo.compareTo(dateFrom) >= 0)
      {
        return true;
      }

    }
    catch (Exception exception)
    {
      log.error("Error occurred in parsing userStatus. Complete Exception is : ", exception);
    }
    return false;
  }

  /**
   * This method fetches the work log against team members
   * if account id is present.
   *
   * @param members
   * @return list of users
   */
  private List<User> getWorkLogUsers(List<uk.co.uworx.khoji.agile.internal.model.Member> members)
  {
    List<User> workLogUsers = new ArrayList<>();
    members.forEach(member -> {
      Optional<User> teamUser = userService.findByMember(member);
      if (teamUser.isPresent() && teamUser.get().getMember().getAccountId() != null)
      {
        workLogUsers.add(teamUser.get());
      }
    });
    return workLogUsers;
  }

  private List<Long> getTeamIds(List<String> teams)
  {
    List<Team> teamObjects = teamHandler.getTeams(teams);
    return teamObjects != null ? teamObjects.stream().map(Team::getId).collect(Collectors.toList()) : new ArrayList<>();
  }

  //TODO: remove this and use from service
  public WorkLogDataClientRequest getWorkLogDataClientRequest(String dateFrom, String dateTo, List<String> members, List<MemberDTO> memberList, String worklogTenant)
  {
    return new WorkLogDataClientRequest(members, dateFrom, dateTo, tenantService.getDataSourceTenantId(), memberList, worklogTenant);
  }

  public List<String> getMembersAccountIds(List<User> users)
  {
    return CollectionUtils.isNotEmpty(users) ? users.stream().map(user -> user.getMember().getAccountId()).collect(Collectors.toList()) : new ArrayList<>();
  }

  public List<KhojiIssueType> getWorkLogIssueTypes(WorkLogRequest workLogRequestParam, Principal principal, List<TeamDTO> teams)
  {
    List<Issue> issues = workLogService.getWorkLogIssuesFromSource(teams, workLogRequestParam.getDateFrom(), workLogRequestParam.getDateTo(), false, principal);
    List<KhojiIssueType> issueType = new ArrayList<>();
    for (Issue issue : issues)
    {
      issueType.add(issue.getIssueType() != null ? issue.getIssueType() : getMissingTaskId(issue, principal));
    }
    return issueType;
  }

  public List<KhojiIssueType> updateIssueTypesWithRecentlyUsedInfo(List<KhojiIssueType> sourceIssueTypes, Principal principal)
  {
    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    String dateToString = LocalDate.now().format(formatter);
    String dateFromString = LocalDate.now().minusDays(recentUsagePeriodDays).format(formatter);

    List<TeamDTO> teamsDetail = teamHandler.getAllTeamsDetailsAsList();
    WorkLogRequest workLogRequest = new WorkLogRequest(null, dateFromString, dateToString, true);

    List<KhojiIssueType> recentlyUsedIssueTypesList = getWorkLogIssueTypes(workLogRequest, principal, teamsDetail);
    Set<KhojiIssueType> recentlyUsedIssueTypes = new HashSet<>(recentlyUsedIssueTypesList);

    for (KhojiIssueType issueType : sourceIssueTypes)
    {
      issueType.setRecentlyUsed(recentlyUsedIssueTypes.contains(issueType));
    }
    return sourceIssueTypes;
  }

  private Set<Member> getUniqueMembersOfAllSelectedTeams(List<TeamWorkLog> workLogs)
  {
    Set<Member> members = new HashSet<>();
    for (TeamWorkLog workLog : workLogs)
    {
      members.addAll(workLog.getMembers());
    }
    return members;
  }

  private double getTotalAvailableDaysOfAllSelectedTeams(Set<Member> members)
  {
    double totalAvailable = 0;
    for (Member member : members)
    {
      totalAvailable += member.getTotalAvailableDays();
    }
    return totalAvailable;
  }


  public WorkLogModels.Response postWorklogs(
          WorkLogModels request,
          Principal principal,
          boolean edit
  )
  {
    InstanceUser instanceUser = instanceUserService.getInstanceUserAgainstPrincipal(principal, request.getTimeZone());
    if (configDataService.isDataStorageAllowed(null)) {
      addToWorkLogAuditDb(request, edit);
    }
    List<WorkLogModels.Response.SubmissionDetail> submissionDetails = new ArrayList<>();
    for (PostWorklogRequest worklogRequest : request.getWorklogs())
    {
      ResponseEntity<WorkLog> response = tenantService
              .getDataClient()
              .logOrEditWorkLogOnJira(
                      worklogRequest.getTicketId(),
                      worklogRequest.getComment(),
                      worklogRequest.getStartedAt(),
                      worklogRequest.getTimelogInSeconds(),
                      instanceUser.getTimeZone(),
                      principal,
                      edit ? worklogRequest.getWorkLogId() : null
              );

      boolean successfulPost = HttpStatus.valueOf(response.getStatusCode().value()).is2xxSuccessful();

      submissionDetails.add(
              new WorkLogModels.Response.SubmissionDetail(
                      worklogRequest.getTicketId(),
                      successfulPost,
                      worklogRequest.getTimelogInSeconds() / 3600,
                      successfulPost ? response.getBody().getWorkLogId() : null,
                      worklogRequest.getComment()
              )
      );
    }

    return new WorkLogModels.Response(
            submissionDetails
    );
  }

  private void addToWorkLogAuditDb(WorkLogModels request, boolean edit)
  {
    if (!edit)
    {
      try {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        String requestString = objectMapper.writeValueAsString(request);
        WorkLogAudit workLogAudit = workLogAuditDataService.findByUniqueIdentifier(request.getUniqueIdentifier());
        if( workLogAudit != null){
          workLogAudit.setSubmittedRequest(requestString);
          workLogAuditDataService.createOrUpdateWorkLogAudit(workLogAudit);
        }
      }
      catch (Exception exception){
        log.error("Failed to convert / save WorklogAudit object: {}", exception.toString());
      }
    }
  }

  public WorkLogModels.DeletionResponse deleteWorkLogs(
          WorkLogModels.DeletionRequest request,
          Principal principal
  )
  {
    List<WorkLogModels.DeletionResponse.DeletionDetails> deletionDetails = new ArrayList<>();
    // TODO: There exists an endpoint for bulk delete in jira but that is experimental,
    //  and the details provided are not sufficient, we can use that once that is stable
    request
            .getDetails()
            .forEach(requestDetails -> {
              HttpStatusCode response = tenantService
                      .getDataClient()
                      .deleteWorkLogAgainstId(
                              principal,
                              requestDetails.getWorkLogId(),
                              requestDetails.getIssueId()
                      );


              deletionDetails.add(
                      new WorkLogModels.DeletionResponse.DeletionDetails(
                              HttpStatus.valueOf(response.value()).is2xxSuccessful(),
                              requestDetails.getWorkLogId(),
                              requestDetails.getIssueId()
                      )
              );
            });

    return new WorkLogModels.DeletionResponse(
            deletionDetails
    );
  }

  public void getLastWeekOrDateRangeActivity(Principal principal, SummaryGeneration.Request request)
  {
    tenantService.getDataClient().getLastWeekActivity(principal, request);
  }

  public SummaryGeneration.Response getUserWorkLogSummaryFromAi(
          Principal principal,
          SummaryGeneration.Request request
  )
  {
    UserAccess userAccess = userAccessDataService
            .findByEmailAndInstanceId(principal.getName(), null)
            .orElseThrow(() -> new ServiceException(ServiceError.UA404));

   SummaryGeneration.Request requestParams = SummaryGeneration
           .Request
           .builder()
           .dateRange(request.getDateRange())
           .userName(userAccess.getInstanceUser().getFullName())
           .userRole(userAccess.getInstanceUser().getRole().getName())
           .accountId(userAccess.getInstanceUser().getAccountId())
           .issues(new ArrayList<>())
           .build();

   log.debug("Finding activity for user in given date range");
   this.getLastWeekOrDateRangeActivity(principal, requestParams);
   log.debug("Found {} of issues, sending call to KIA for AI magic", requestParams.getIssues().size());

   return workLogAIService.getWorkLogSummary(
           requestParams,
           SummaryGeneration.Type.CURRENT_WEEKLY_WORK_LOG_SUMMARY
   );
  }

  public SummaryGeneration.ScrumResponseKBS getUserScrumUpdates(
          Principal principal,
          SummaryGeneration.ScrumRequestKBS requestKBS
  )
  {
    UserAccess userAccess = userAccessDataService
                                    .findByEmailAndInstanceId(principal.getName(), null)
                                    .orElseThrow(() -> new ServiceException(ServiceError.UA404));

    AtomicBoolean isThereAnyErrorFromJira = new AtomicBoolean(false);

    CompletableFuture<Object> userActivityFuture = workLogAsyncService.getUserActivityAsync(
            new GenerateAIWorkLogRequest(
                    userAccess.getInstanceUser().getAccountId(),
                    LocalDate
                            .parse(requestKBS.getYesterdayDate())
                            .format(DateTimeFormatter.ofPattern("yyyy-MM-dd")),
                    0D
            ),
            principal,
            userAccess.getInstanceUser(),
            isThereAnyErrorFromJira,
            InstanceIdContext.getInstanceId(),
            TenantIdContext.getTenantId()
    );

    Optional<Integrations> integrations = integrationsService.getIntegration(principal);

    CompletableFuture<Map<String, Object>> calendarDataFuture = workLogAsyncService.getTeamsCalendarDataAsync(
            integrations,
            userAccess.getInstanceUser(),
            InstanceIdContext.getInstanceId(),
            TenantIdContext.getTenantId(),
            LocalDate.parse(requestKBS.getYesterdayDate()).format(DateTimeFormatter.ofPattern("yyyy-MM-dd")),
            LocalDate.parse(requestKBS.getTodayDate()).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
    );

    try
    {
      long scrumStart = System.currentTimeMillis();
      String scrumUid = java.util.UUID.randomUUID().toString();
      log.debug("[SCRUM-TIMER] start getUserScrumUpdates account={} uid={} today={} yesterday={} instance={}",
              userAccess.getInstanceUser().getAccountId(), scrumUid, requestKBS.getTodayDate(), requestKBS.getYesterdayDate(), InstanceIdContext.getInstanceId());

      Object activityResponseBody = userActivityFuture.get();
      long afterActivity = System.currentTimeMillis();
      log.debug("[SCRUM-TIMER] userActivity fetch completed account={} uid={} took={}ms",
              userAccess.getInstanceUser().getAccountId(), scrumUid, afterActivity - scrumStart);

      Map<String, Object> calendarIntegrationData = calendarDataFuture.get();
      long afterCalendar = System.currentTimeMillis();
      log.debug("[SCRUM-TIMER] calendar fetch completed account={} uid={} took={}ms (since start) ",
              userAccess.getInstanceUser().getAccountId(), scrumUid, afterCalendar - scrumStart);

      HashMap<String, String> errorMap = new HashMap<>();

      int activityIssueCount = (activityResponseBody instanceof java.util.List) ? ((java.util.List<?>) activityResponseBody).size() : -1;
      log.debug("[SCRUM-TIMER] data processing start account={} uid={} jiraIssueCount={} calendarKeys={}",
              userAccess.getInstanceUser().getAccountId(), scrumUid, activityIssueCount, calendarIntegrationData.keySet());

      long processingStart = System.currentTimeMillis();
      List<UserActivityData> userActivityDataList = generateUserActivityObject(
        activityResponseBody,
        errorMap,
        new ArrayList<>(),
        isThereAnyErrorFromJira,
        userAccess.getInstanceUser(),
        integrations,
        calendarIntegrationData
      );
      long processingEnd = System.currentTimeMillis();
      log.debug("[SCRUM-TIMER] data processing completed account={} uid={} took={}ms errors={}",
              userAccess.getInstanceUser().getAccountId(), scrumUid, processingEnd - processingStart, errorMap.keySet());

      long aiStart = System.currentTimeMillis();
      SummaryGeneration.ScrumResponseKBS response = workLogAIService.getUserScrumUpdate(
              requestKBS,
              userActivityDataList,
              errorMap,
              userAccess.getInstanceUser()
      );
      long aiEnd = System.currentTimeMillis();
      log.debug("[SCRUM-TIMER] ai call completed account={} uid={} took={}ms total={}ms",
              userAccess.getInstanceUser().getAccountId(), scrumUid, aiEnd - aiStart, aiEnd - scrumStart);

      return response;
    }
    catch (Exception e)
    {
      log.error("[SCRUM-TIMER] Error occurred while making parallel requests: {}", e.toString());
      throw new ServiceException(ServiceError.AI001);
    }
  }
}
