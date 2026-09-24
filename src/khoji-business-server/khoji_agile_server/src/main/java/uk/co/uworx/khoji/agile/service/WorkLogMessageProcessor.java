/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.service;

import com.fasterxml.jackson.core.type.TypeReference;
import jakarta.transaction.Transactional;
import lombok.extern.log4j.Log4j2;
import org.apache.camel.Exchange;
import org.apache.camel.Processor;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.ObjectUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import uk.co.uworx.khoji.agile.config.WorklogConfig;
import uk.co.uworx.khoji.agile.context.BootApplicationContextProvider;
import uk.co.uworx.khoji.agile.handler.WorkLogHandler;
import uk.co.uworx.khoji.agile.internal.model.DaysPercentDistribution;
import uk.co.uworx.khoji.agile.internal.model.EmailFrequency;
import uk.co.uworx.khoji.agile.internal.model.TeamWorkLog;
import uk.co.uworx.khoji.agile.internal.model.WorkLogCategory;
import uk.co.uworx.khoji.agile.internal.model.WorkLogEmailModel;
import uk.co.uworx.khoji.agile.internal.model.WorkLogModel;
import uk.co.uworx.khoji.agile.internal.model.WorklogDistributionConfig;
import uk.co.uworx.khoji.agile.persistence.context.InstanceIdContext;
import uk.co.uworx.khoji.agile.persistence.context.TenantIdContext;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;
import uk.co.uworx.khoji.agile.persistence.model.KhojiUserStatus;
import uk.co.uworx.khoji.agile.persistence.service.ConfigDataService;
import uk.co.uworx.khoji.agile.persistence.service.IdentityProviderDataService;
import uk.co.uworx.khoji.agile.persistence.service.InstanceFeatureDataService;
import uk.co.uworx.khoji.agile.persistence.service.InstanceUserDataService;
import uk.co.uworx.khoji.agile.persistence.service.TeamMembersDataService;
import uk.co.uworx.khoji.agile.persistence.service.TeamsDataService;
import uk.co.uworx.khoji.agile.persistence.service.UserAccessCredentialsDataService;
import uk.co.uworx.khoji.agile.persistence.service.UserAccessDataService;
import uk.co.uworx.khoji.agile.request.WorkLogRequest;
import uk.co.uworx.khoji.agile.response.Member;
import uk.co.uworx.khoji.agile.response.WorkLogAuditEmailResponse;
import uk.co.uworx.khoji.agile.response.WorkLogResponse;
import uk.co.uworx.khoji.agile.service.business.WorkLogService;
import uk.co.uworx.khoji.agile.service.jira.JiraTokenRefreshService;
import uk.co.uworx.khoji.security.subscription.ValidateUserSubscriptionService;

import java.text.DecimalFormat;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import static uk.co.uworx.khoji.agile.constants.InstanceConfigs.OTHERS_WORKLOG_EMAIL_SUBSCRIPTION_THRESHOLD;
import static uk.co.uworx.khoji.agile.constants.InstanceConfigs.WORKLOG_DISTRIBUTION_JSON;
import static uk.co.uworx.khoji.agile.controller.stats.EmailController.DATE_FROM;
import static uk.co.uworx.khoji.agile.controller.stats.EmailController.FREQUENCY;
import static uk.co.uworx.khoji.agile.controller.stats.EmailController.TO_DATE;
import static uk.co.uworx.khoji.agile.controller.stats.EmailController.USER_NAME;

@Component("WorkLogMessageProcessor")
@Log4j2
public class WorkLogMessageProcessor implements Processor
{
  private static final String NORMAL = "Normal";
  private static final String MEDIUM = "Medium";
  @Autowired
  private CommonService commonService;
  @Autowired
  private WorkLogHandler workLogHandler;
  @Autowired
  private WorkLogService workLogService;
  @Autowired
  private UserAccessDataService userAccessDataService;
  @Autowired
  private TeamsDataService teamsDataService;
  @Autowired
  private TeamMembersDataService teamMembersDataService;
  @Autowired
  private InstanceFeatureDataService instanceFeatureDataService;
  @Autowired
  private InstanceUserDataService instanceUserDataService;
  @Autowired
  private ConfigDataService configDataService;
  @Autowired
  private MappingService mappingService;
  @Autowired
  private JiraTokenRefreshService jiraTokenRefreshService;

  /**
   * This method is triggered by both the work log cron job and the /email/triggerWorkLogEmail endpoint.
   *
   * When an API request is received, the Tenant Context is set accordingly.
   * However, in the case of a cron job, no tenant is set by default.
   *
   * Initially, all user settings are fetched from the database without
   * considering the tenant. When it comes to calculating or fetching data
   * from the source or database, the tenant is set within the code. After
   * the calculation for a particular user is complete, the tenant context is cleared.
   *
   * @param exchange The exchange parameter.
   * @throws Exception If an error occurs during the process.
   */

  @Transactional
  public void process(Exchange exchange) throws Exception
  {
    log.debug("Work log email feature flag is enabled");
    String email = !isExchangeForEmailAndDatesEmpty(exchange) ? getFromExchange(exchange, USER_NAME) : null;
    String dateFrom = !isExchangeForEmailAndDatesEmpty(exchange) ? getFromExchange(exchange, DATE_FROM) : null;
    String toDate = !isExchangeForEmailAndDatesEmpty(exchange) ? getFromExchange(exchange, TO_DATE) : null;
    EmailFrequency emailFrequency = !isExchangeForEmailAndDatesEmpty(exchange) ? EmailFrequency.valueOf(getFromExchange(exchange, FREQUENCY)) : null;

    List<WorkLogModel> usersWorklogModelList = userAccessDataService
            .findAll()
            .stream()
            .map(
                    userAccess -> new WorkLogModel(
                            userAccess,
                            teamsDataService.getTeamNamesAgainstTeamIds(
                                    teamMembersDataService.getInstanceUserTeamsIds(
                                                    userAccess.getInstanceUser().getId(),
                                                    true,
                                                    false
                                    )
                            )
                    )
            )
            .toList();

    log.debug(
            "All users fetched for work log emails: {}",
            usersWorklogModelList
                    .stream()
                    .map(WorkLogModel::getName)
                    .collect(Collectors.joining(","))
    );

    if (email != null)
    {
      usersWorklogModelList = usersWorklogModelList
              .stream()
              .filter(x -> x.getEmail().equalsIgnoreCase(email))
              .toList();
    }

    if (CollectionUtils.isNotEmpty(usersWorklogModelList))
    {
      List<WorkLogEmailModel> listOfPeopleToSendEmail = new ArrayList<>();

      List<WorkLogEmailModel> modelsWithUncheckedRags = getUpdatedWorkLogEmailModelBasedOnFrequencyAndCurrentDay(
              usersWorklogModelList,
              toDate,
              dateFrom
      );

      log.debug(
              "Users with matching frequency criteria: {}",
              modelsWithUncheckedRags
                      .stream()
                      .map(WorkLogEmailModel::getName)
                      .collect(Collectors.joining(","))
      );

      modelsWithUncheckedRags.removeIf(uncheckedModel -> workLogService.getTotalWorkLoggedDays(uncheckedModel) == 0.0);

      checkIfOthersWorkLogThresholdCriteriaMatches(modelsWithUncheckedRags, listOfPeopleToSendEmail);

      log.debug("Users with matching others criteria: {}", listOfPeopleToSendEmail.stream().map(WorkLogEmailModel::getName).collect(Collectors.joining(",")));

      if (!listOfPeopleToSendEmail.isEmpty())
      {
        log.info("WorkLog gathered. Forwarding it to next router");
        exchange.getMessage().setBody(listOfPeopleToSendEmail);
      }
      else
      {
        log.info("No person found with matching criteria so skipping next processing");
        exchange.getMessage().setBody(null);
      }
    }
  }

  /**
   * It sets the tenant and then validates if user
   * criteria is matching or not
   *
   * @param modelsWithUncheckedRags
   * @param listOfPeopleToSendEmail
   */
  private void checkIfOthersWorkLogThresholdCriteriaMatches(
          List<WorkLogEmailModel> modelsWithUncheckedRags,
          List<WorkLogEmailModel> listOfPeopleToSendEmail
  )
  {
    for (WorkLogEmailModel model : modelsWithUncheckedRags)
    {
      InstanceIdContext.setInstanceId(model.getInstanceId().toString());
      double othersWorklogEmailSubscriptionThreshold = getOthersWorklogSubscriptionThreshold();
      double summarizedPercentageOthers = calculateOthersCategoryPercentage(new ArrayList<>(Collections.singletonList(model)));
      if (summarizedPercentageOthers >= othersWorklogEmailSubscriptionThreshold)
      {
        listOfPeopleToSendEmail.add(model);
      }
      InstanceIdContext.clear();
    }
  }

  private double getOthersWorklogSubscriptionThreshold()
  {
    try {
      return Double.parseDouble(
              configDataService.getConfigByInstanceId(OTHERS_WORKLOG_EMAIL_SUBSCRIPTION_THRESHOLD, null)
      );
    } catch (Exception e)
    {
      return Double.parseDouble(
              Objects.requireNonNull(
                      BootApplicationContextProvider
                                             .getContext()
                                             .getEnvironment()
                                             .getProperty(OTHERS_WORKLOG_EMAIL_SUBSCRIPTION_THRESHOLD)
              )
      );
    }
  }

  /**
   * The methods calculates the previous working day. It only recognize Saturday and Sunday as non -working days.
   *
   * @return The previous X working day
   */
  public static LocalDate getLastGivenWorkingDay(int days)
  {
    LocalDate date = LocalDate.now();
    int subtractedDays = 0;
    while (subtractedDays < days)
    {
      date = date.minusDays(1);
      if (!(date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY))
      {
        ++subtractedDays;
      }
    }
    return date;
  }

  private boolean isExchangeForEmailAndDatesEmpty(Exchange exchange)
  {
    return exchange.getIn().getBody(Map.class) == null;
  }

  private String getFromExchange(Exchange exchange, String attribute)
  {
    if ((exchange.getIn().getBody() instanceof Map) && exchange.getIn().getBody(Map.class).containsKey(attribute))
    {
      return exchange.getIn().getBody(Map.class).get(attribute).toString();
    }
    return null;
  }

  /***
   * Getting updated value from config
   * @return
   */
  public HashMap<String, Double> getUpdatedRagStatusFromConfig(String key)
  {
    return mappingService.readJsonFromProp(
            configDataService.getConfigByInstanceId(key, null),
            new TypeReference<>(){}
    );
  }

  /**
   * Fetch full name for user against email
   *
   * @param email email for user
   * @return username
   */
  public String getFullNameFromEmail(String email)
  {
    InstanceUser instanceUser = instanceUserDataService.findInstanceUserUsingEmailAndInstanceId(email, null);
    return instanceUser.getFullName();
  }

  /**
   * Fetch User's email frequency as set in user_settings
   *
   * @param email email for user
   * @return EmailFrequency enum instance
   */
  @Transactional
  public EmailFrequency getUserEmailFrequency(String email)
  {
    InstanceUser instanceUser = instanceUserDataService.findInstanceUserUsingEmailAndInstanceId(email, null);
    return EmailFrequency.valueOf(instanceUser.getUserSettings().getWorklogEmailFrequency());
  }

  public double calculateCumulativePercentage(WorkLogEmailModel models)
  {
    Map<String, Double> workLogMap = new HashMap<>();
    models
            .getMainResponses()
            .stream()
            .flatMap(
                    sub -> sub.getSubWorkLogResponses().stream()
            )
            .forEach(response -> {
              String entity = response.getEntity();
              if (!workLogMap.containsKey(entity) || !response.isPartOfMultipleTeam())
              {
                workLogMap.merge(entity, response.getWorkLog(), Double::sum);
              }
            });

    return Double.parseDouble(
            new DecimalFormat("#.##")
                    .format(workLogMap
                            .values()
                            .stream()
                            .mapToDouble(Double::doubleValue)
                            .sum() / workLogMap.size()
                    )
    );
  }

  /***
   * Method to calculate others category percentage
   * @param models
   * @return othersCategoryPercentage
   */
  public double calculateOthersCategoryPercentage(List<WorkLogEmailModel> models)
  {
    HashMap<String, Double> otherWorklogCategories = new HashMap<>();
    double totalWorklogInDays = 0.00;
    double totalWorkloggedInOthers = 0.00;
    for (WorkLogEmailModel model : models)
    {
      Set<String> othersCategories = model.getColsInOthers();
      for (WorkLogAuditEmailResponse workLogAuditEmailResponse : model.getResponses())
      {
        for (Map.Entry<String, DaysPercentDistribution> distribution : workLogAuditEmailResponse.getDistributionDetails().entrySet())
        {
          String category = distribution.getKey();
          double daysSpent = distribution.getValue().getTotalDaysSpent();
          totalWorklogInDays += daysSpent;
          if (othersCategories.contains(category))
          {
            otherWorklogCategories.merge(category, daysSpent, Double::sum);
            totalWorkloggedInOthers += daysSpent;
          }
        }
      }
    }

    if (totalWorkloggedInOthers == 0)
    {
      return 0;
    }

    return (totalWorkloggedInOthers / totalWorklogInDays) * 100;
  }

  /**
   * Checks if user is active and  frequency matches
   *
   * @param workLogModels
   * @param toDate
   * @param dateFrom
   * @return
   */
  private List<WorkLogEmailModel> getUpdatedWorkLogEmailModelBasedOnFrequencyAndCurrentDay(
          List<WorkLogModel> workLogModels,
          String toDate,
          String dateFrom
  )
  {
    LocalDate currentDate = LocalDate.now();
    List<WorkLogEmailModel> updatedListOfUsersToSendEmail = new ArrayList<>();

    try
    {
      workLogModels.forEach(
              user -> {
                if (
                        KhojiUserStatus.JOINED.name().equalsIgnoreCase(user.getUserStatus()) &&
                        user.isEmailWorkLog()
                        && !CollectionUtils.isEmpty(user.getTeams())
                )
                {
                  if (
                          user.getWorklogEmailFrequency().equals(EmailFrequency.MONTHLY) &&
                          isFirstDayOfMonth(currentDate)
                  )
                  {
                    WorkLogEmailModel worklogModel = populateModelToSendEmail(
                            getYesterdayDate(),
                            getFirstWorkingDayOfPreviousMonth(currentDate).toString(),
                            user
                    );

                    if (ObjectUtils.isNotEmpty(worklogModel))
                    {
                      updatedListOfUsersToSendEmail.add(worklogModel);
                    }
                  }
                  else if (
                          user.getWorklogEmailFrequency().equals(EmailFrequency.WEEKLY) &&
                          isFirstDayOfWeek(currentDate)
                  )
                  {
                    WorkLogEmailModel worklogModel = populateModelToSendEmail(
                            getYesterdayDate(),
                            getDateForPreviousMonday(currentDate).toString(),
                            user
                    );

                    if (ObjectUtils.isNotEmpty(worklogModel))
                    {
                      updatedListOfUsersToSendEmail.add(worklogModel);
                    }
                  }
                  else if (user.getWorklogEmailFrequency().equals(EmailFrequency.DAILY))
                  {
                    WorkLogEmailModel worklogModel = populateModelToSendEmail(
                            getYesterdayDate(),
                            getYesterdayDate(),
                            user
                    );

                    if (ObjectUtils.isNotEmpty(worklogModel))
                    {
                      updatedListOfUsersToSendEmail.add(worklogModel);
                    }
                  }
                  else if (StringUtils.isNotEmpty(dateFrom) && StringUtils.isNotEmpty(toDate))
                  {
                    WorkLogEmailModel worklogModel = populateModelToSendEmail(toDate, dateFrom, user);
                    if (ObjectUtils.isNotEmpty(worklogModel))
                    {
                      updatedListOfUsersToSendEmail.add(worklogModel);
                    }
                  }
                }
              }
      );
    }catch (Exception exception)
    {
      log.debug("Exception occurred while creating work log models for email: ", exception);
    }

    return updatedListOfUsersToSendEmail;
  }

  private WorkLogEmailModel populateModelToSendEmail(
          String toDate,
          String dateFrom,
          WorkLogModel user
  )
  {
    log.debug("Fetching workLog for user for email: {}", user.getName());

    WorkLogResponse resp = getWorkLogResponseForEmail(
            dateFrom,
            toDate != null ? toDate : getYesterdayDate(),
            user
    );

    InstanceIdContext.clear();
    TenantIdContext.clear();

    WorkLogEmailModel emailModel = null;

    if (ObjectUtils.isNotEmpty(resp) && CollectionUtils.isNotEmpty(resp.getWorkAudit()))
    {
      List<TeamWorkLog> workLogs = resp.getWorkAudit();
      List<WorkLogCategory> workLogCategories = resp.getMainCategoryCols();

      emailModel = new WorkLogEmailModel(
              user.getEmail(),
              user.getUserAccess().getInstance().getId(),
              getTeamName(user),
              getCurrentDate(),
              populateWorkLogModel(workLogs, user.getUserAccess().getInstance().getId()),
              ((int) resp.getSummary()),
              dateFrom,
              toDate != null ? toDate : getYesterdayDate(),
              resp.getOtherCategoryCols(),
              workLogCategories
                      .stream()
                      .map(WorkLogCategory::getName)
                      .collect(Collectors.toCollection(LinkedHashSet::new)),
              workLogHandler.doesOtherColumnExist(workLogs),
              resp
                      .getWorkAudit()
                      .stream()
                      .map(TeamWorkLog::getTotalsDays)
                      .collect(Collectors.toList()),
              resp
                      .getMainCategoryCols()
                      .stream()
                      .map(WorkLogCategory::getName)
                      .collect(Collectors.toList())
      );
    }
    return emailModel;
  }

  private LocalDate getFirstWorkingDayOfPreviousMonth(LocalDate date)
  {
    date = date.minusMonths(1);
    LocalDate firstDateOfMonth = date.withDayOfMonth(1);
    DayOfWeek dayOfWeek = firstDateOfMonth.getDayOfWeek();
    if (dayOfWeek == DayOfWeek.SATURDAY)
    {
      return firstDateOfMonth.plusDays(2);
    }
    else if (dayOfWeek == DayOfWeek.SUNDAY)
    {
      return firstDateOfMonth.plusDays(1);
    }
    return firstDateOfMonth;
  }

  /**
   * Gets LocalDate for previous Monday based on provided date using temporal adjusters
   *
   * @param date
   * @return date for previous Monday
   */
  public LocalDate getDateForPreviousMonday(LocalDate date)
  {
    return date.with(TemporalAdjusters.previous(DayOfWeek.MONDAY));
  }

  /**
   * Checks if current date is the first day of the week, Assumes Monday is the first day
   *
   * @param currentDate
   * @return
   */
  public boolean isFirstDayOfWeek(LocalDate currentDate)
  {
    return currentDate.getDayOfWeek() == DayOfWeek.MONDAY;
  }

  /**
   * Checks if current date is the first day of the month
   *
   * @param currentDate
   * @return
   */
  public boolean isFirstDayOfMonth(LocalDate currentDate)
  {
    return currentDate.getDayOfMonth() == 1;
  }

  private String getYesterdayDate()
  {
    return getLastGivenWorkingDay(1).toString();
  }

  private List<WorkLogAuditEmailResponse> populateWorkLogModel(List<TeamWorkLog> workLogs, Long instanceId)
  {
    if(CollectionUtils.isNotEmpty(workLogs))
    {
      return getMultipleTeamsNestedModel(workLogs, instanceId);
    }

    return null;
  }

  private List<WorkLogAuditEmailResponse> getMultipleTeamsNestedModel(List<TeamWorkLog> workLogs, Long instanceId)
  {
    log.info("Generating Multiple Teams Model In Nested Mode");
    List<WorkLogAuditEmailResponse> teamsModel = getMultipleTeamsSummaryViewModel(workLogs, instanceId);
    List<WorkLogAuditEmailResponse> emailModel = new ArrayList<>();
    int index = 0;
    for (TeamWorkLog workLog : workLogs)
    {
      List<WorkLogAuditEmailResponse> singeTeamList = getSingleTeamViewModel(workLog);
      if (CollectionUtils.isEmpty(singeTeamList))
      {
        teamsModel.remove(index);
      }
      else
      {
        teamsModel.get(index).setSubWorkLogResponses(singeTeamList);
        emailModel.add(teamsModel.get(index));
        index++;
      }

    }

    return emailModel;
  }

  private List<WorkLogAuditEmailResponse> getSingleTeamViewModel(TeamWorkLog workLog)
  {
    List<WorkLogAuditEmailResponse> emailModel = new ArrayList<>();
    ArrayList<Member> members = workLog.getMembers();
    for (Member member : members)
    {
      Map<String, DaysPercentDistribution> workLogDistributionDetails = new HashMap<>();
      for (String key : member.getWorkLogDistribution().getOthers().keySet())
      {
        workLogDistributionDetails.put(key, (DaysPercentDistribution) member.getWorkLogDistribution().getOthers().get(key));
      }

      for (String key : member.getWorkLogDistribution().getValues().keySet())
      {
        workLogDistributionDetails.put(key, (DaysPercentDistribution) member.getWorkLogDistribution().getValues().get(key));
      }

      emailModel.add(
              new WorkLogAuditEmailResponse(
                      member.getName(),
                      member.getPercentage(),
                      (int) (member.getOthersPercentage()),
                      workLogDistributionDetails,
                      member.isInMultipleTeams(),
                      member.getTotalWorkLogInDays()
              )
      );
    }
    return emailModel;
  }

  private List<WorkLogAuditEmailResponse> getMultipleTeamsSummaryViewModel(List<TeamWorkLog> workLogs, Long instanceId)
  {
    List<WorkLogAuditEmailResponse> emailModel = new ArrayList<>();
    for (TeamWorkLog workLog : workLogs)
    {
      Map<String, DaysPercentDistribution> workLogDistributionDetails = getWorkLogDistributionDetailsForMultipleTeamsSummaryView(
              workLog,
              instanceId
      );
      emailModel
              .add(new WorkLogAuditEmailResponse(workLog.getTeamName(),
                      workLog.getPercentage(),
                      getTeamLevelWorkLogDistributionAvg(workLog, Constants.TASK_TYPE_OTHERS),
                      workLogDistributionDetails));
    }
    return emailModel;
  }

  private Map<String, DaysPercentDistribution> getWorkLogDistributionDetailsForMultipleTeamsSummaryView(
          TeamWorkLog teamWorkLog,
          Long instanceId
  )
  {
    Map<String, DaysPercentDistribution> workLogDistributionDetails = new HashMap<>();
    for (String key : getWorklogDistribution(instanceId).keySet())
    {
      DaysPercentDistribution daysPercentDistribution = getDaysDistributionFromMap(teamWorkLog.getTotalsDays(), teamWorkLog.getTotalsPercentages(), key);
      workLogDistributionDetails.put(key, daysPercentDistribution);
    }

    for (String otherTask : teamWorkLog.getOthersDistrMeta())
    {
      workLogDistributionDetails.put(otherTask,
              getDaysDistributionFromMap(teamWorkLog.getTotalsDays(),
                      teamWorkLog.getTotalsPercentages(),
                      otherTask));
    }

    return workLogDistributionDetails;
  }

  private DaysPercentDistribution getDaysDistributionFromMap(HashMap<String, Double> hashMapDays,
                                                             HashMap<String, Double> hashMapPercentage, String key)
  {
    return new DaysPercentDistribution(hashMapDays.get(key), hashMapPercentage.get(key));
  }

  private int getTeamLevelWorkLogDistributionAvg(TeamWorkLog worklog, String key)
  {
    int total = worklog.getMembers().size();
    int value = 0;
    for (Member member : worklog.getMembers())
    {
      if (key.equalsIgnoreCase(Constants.TASK_TYPE_OTHERS))
      {
        value += (int) member.getOthersPercentage();
      }
      else
      {
        DaysPercentDistribution daysPercentDistribution = (DaysPercentDistribution) member.getWorkLogDistribution().getValues().get(key);
        value += daysPercentDistribution != null ? (int) daysPercentDistribution.getPercentage() : 0;
      }
    }
    return total != 0 ? value / total : 0;
  }

  private String getTeamName(WorkLogModel object)
  {
    try
    {
      if (CollectionUtils.isNotEmpty(object.getTeams()))
      {
        return String.join(",", object.getTeams());
      }
    }
    catch (Exception e)
    {
      log.error("Exception occurred while resolving team name in message processor. Details: ", e);
    }

    return null;
  }

  /**
   * This method is specific to work log email
   * and this is triggered by a cron job that's
   * why token is also updated here
   *
   * @param fromDate
   * @param toDate
   * @param workLogModel
   * @return
   */
  private WorkLogResponse getWorkLogResponseForEmail(String fromDate, String toDate, WorkLogModel workLogModel)
  {
    try
    {
      InstanceIdContext.setInstanceId(
              workLogModel
                      .getUserAccess()
                      .getInstance()
                      .getId()
                      .toString()
      );

      TenantIdContext.setTenantId(
              workLogModel
                      .getUserAccess()
                      .getInstance()
                      .getTenantId()
      );

      if (!instanceFeatureDataService.checkIfFeatureIsUnlockedAgainstInstance(
              3L,
              workLogModel
                      .getUserAccess()
                      .getInstance()
                      .getId()
      ))
      {
        return null;
      }

      jiraTokenRefreshService.updateTokenIfRequired(workLogModel.getUserAccess());

      return workLogHandler.getWorkLog(
              getWorkLogReqeuest(workLogModel, fromDate, toDate),
              () -> workLogModel.getUserAccess().getInstanceUser().getEmail()
      );
    }
    catch (Exception exception)
    {
      log.error(
              "Exception occurred while resolving work log in message processor. Instance Id: {}",
              workLogModel.getUserAccess().getInstance().getId(),
              exception
      );
    }
    return null;
  }

  private WorkLogRequest getWorkLogReqeuest(WorkLogModel requested, String fromDate, String toDate)
  {
    if (requested.getTeams().contains("All"))
    {
      List<String> teams = new ArrayList<>();
      teams.add("All");
      return new WorkLogRequest(teams, fromDate, toDate, true);
    }
    else
    {
      List<String> teamsSorted = new ArrayList<>(requested.getTeams());
      Collections.sort(teamsSorted);
      return new WorkLogRequest(teamsSorted, fromDate, toDate, true);
    }
  }

  private String getCurrentDate()
  {
    return LocalDate.now().toString();
  }

  private Map<String, WorklogDistributionConfig> getWorklogDistribution(Long instanceId)
  {
    return commonService.readJsonFromProp(
            configDataService.getConfigByInstanceId(WORKLOG_DISTRIBUTION_JSON, instanceId),
            new TypeReference<>(){}
    );
  }
}
