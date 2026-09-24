/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.handler;

import jakarta.annotation.PostConstruct;
import lombok.extern.log4j.Log4j2;
import org.apache.velocity.Template;
import org.apache.velocity.VelocityContext;
import org.apache.velocity.app.Velocity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import uk.co.uworx.khoji.agile.config.EmailConfig;
import uk.co.uworx.khoji.agile.config.WorklogConfig;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.internal.model.DaysPercentDistribution;
import uk.co.uworx.khoji.agile.internal.model.WorkLogEmailModel;
import uk.co.uworx.khoji.agile.internal.model.WorklogDistributionConfig;
import uk.co.uworx.khoji.agile.persistence.context.InstanceIdContext;
import uk.co.uworx.khoji.agile.persistence.model.Instance;
import uk.co.uworx.khoji.agile.persistence.service.ConfigDataService;
import uk.co.uworx.khoji.agile.persistence.service.InstanceDataService;
import uk.co.uworx.khoji.agile.response.WorkLogAuditEmailResponse;
import uk.co.uworx.khoji.agile.service.WorkLogMessageProcessor;
import uk.co.uworx.khoji.agile.service.business.WorkLogService;

import java.io.StringWriter;
import java.net.URLEncoder;
import java.text.DecimalFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;
import java.util.stream.Collectors;

import static uk.co.uworx.khoji.agile.constant.Constants.AMBER;
import static uk.co.uworx.khoji.agile.constant.Constants.NORMAL_THRESHOLD;
import static uk.co.uworx.khoji.agile.constant.Constants.RED;
import static uk.co.uworx.khoji.agile.constant.Constants.WORKLOG_RAG_THRESHOLD_KEY;
import static uk.co.uworx.khoji.agile.constants.InstanceConfigs.OTHER_WORKLOG_PERCENTAGE_THRESHOLD;
import static uk.co.uworx.khoji.agile.constants.InstanceConfigs.WORKLOG_MAIN_CATEGORIES_ALIAS;
import static uk.co.uworx.khoji.agile.constants.InstanceConfigs.WORKLOG_OTHER_CATEGORIES_ALIAS;
import static uk.co.uworx.khoji.agile.service.Constants.MEDIUM_THRESHOLD;

@Component
@Log4j2
public class VelocityTemplateHandler
{
  private final static String TEMPLATES_DIRECTORY = "templates/";
  public static String KHOJI_LOGO_WITH_TEXT = "images/scrumupdate-logo-400x400-v2.png";
  public static String KHOJI_LOGO_WITHOUT_TEXT = "images/scrumupdate-logo-400x400-v2.png";
  private final String RED_RGB = "rgb(220, 20, 60)";
  private final String AMBER_RGB = "rgb(255, 215, 0)";
  private final String GREEN_RGB = "rgb(50, 205, 50)";

  @Autowired
  private WorklogConfig worklogConfig;
  @Autowired
  private EmailConfig emailConfig;
  @Autowired
  ConfigHandler configHandler;
  @Autowired
  private InstanceDataService instanceDataService;
  @Autowired
  private ConfigDataService configDataService;
  @Autowired
  private WorkLogService workLogService;

  private Template workLogEmailTemplateMainForTeams;
  private Template inviteUserEmailTemplate;
  private Template inviteTenantAdminEmailTemplate;
  private Template userRevokedEmailTemplate;
  private Template userRequestAccessEmailTemplate;
  private Template enableAccessEmailTemplate;
  private Template workLogReminderEmailVelocityTemplate;

  @Autowired
  private WorkLogMessageProcessor processor;

  @PostConstruct
  public void init()
  {
    Properties p = new Properties();
    p.setProperty("resource.loaders", "class");
    p.setProperty("resource.loader.class.class", "org.apache.velocity.runtime.resource.loader.ClasspathResourceLoader");
    Velocity.init(p);
    workLogEmailTemplateMainForTeams = Velocity.getTemplate(TEMPLATES_DIRECTORY + worklogConfig.workLogEmailTemplateMainForTeams);
    inviteUserEmailTemplate = Velocity.getTemplate(TEMPLATES_DIRECTORY + emailConfig.inviteUserEmailVelocityTemplate);
    inviteTenantAdminEmailTemplate = Velocity.getTemplate(TEMPLATES_DIRECTORY + emailConfig.inviteTenantAdminEmailVelocityTemplate);
    enableAccessEmailTemplate = Velocity.getTemplate(TEMPLATES_DIRECTORY + emailConfig.enableAccessEmailVelocityTemplate);
    userRevokedEmailTemplate = Velocity.getTemplate(TEMPLATES_DIRECTORY + emailConfig.userRevokedEmailVelocityTemplate);
    userRequestAccessEmailTemplate = Velocity.getTemplate(TEMPLATES_DIRECTORY + emailConfig.userRequestedUserEmailVelocityTemplate);
    workLogReminderEmailVelocityTemplate = Velocity.getTemplate(TEMPLATES_DIRECTORY + "workLogReminderEmailTemplate.vm");
  }

  public String convertOthersWorklogsToHTML(WorkLogEmailModel workLog)
  {
    try
    {
      InstanceIdContext.setInstanceId(workLog.getInstanceId().toString());

      Instance instance = instanceDataService
              .findById(null, true)
              .orElseThrow(() -> new ServiceException(ServiceError.I0404));

      VelocityContext context = new VelocityContext();

      double totalWorkLoggedPercentages = processor.calculateCumulativePercentage(workLog);
      double workLoggedTotalDays = workLogService.getTotalWorkLoggedDays(workLog);
      Map<String, DaysPercentDistribution> resultMap = getValuesForHashmap(workLog);
      final double[] totalTimeInOthers = {0.0};
      workLog
              .getColsInMainCategory()
              .forEach(val -> {
                DaysPercentDistribution d = resultMap.get(val);
                if (d != null)
                {
                  totalTimeInOthers[0] += d.getTotalDaysSpent();
                }
              });

      double totalTimeInOthersDays = totalTimeInOthers[0];
      double summarizedPercentageOthers = Double.parseDouble(
              new DecimalFormat("#.##")
                      .format(100 - (totalTimeInOthersDays / workLoggedTotalDays * 100))
      );

      context.put("nameOfUser", processor.getFullNameFromEmail(workLog.getEmail()));
      context.put("emailFrequency", processor.getUserEmailFrequency(workLog.getEmail()));
      context.put("teams", workLog.getName().replace(",",", "));
      context.put("app", instance.getInstanceName());
      context.put("owner", instance.getWorkspace().getOwner().getFullName());
      // Restricting to 2 decimal places
      context.put("CumulativeWorkLogPercentage", String.format("%.2f", totalWorkLoggedPercentages));
      context.put("OthersCategoryTotalWorkLogPercentage", String.format("%.2f", summarizedPercentageOthers));
      context.put("commulativeWorkInDays", String.format("%.2f", workLoggedTotalDays));
      context.put("otherCategoriesWorklogInDays", String.format("%.2f", workLoggedTotalDays - totalTimeInOthersDays));
      context.put("showDays", true);
      context.put("worklogs", getTeamsData(workLog));
      context.put("otherWorkLogsCategories", getWorkLogInOtherCategories(workLog));
      context.put("colorCode", worklogConfig.getColorCode(workLog.getSummary()));
      context.put("days", worklogConfig.workLogSecondDaysSubtract);
      context.put("workLogFromDate", convertDateToReadableFormat(workLog.getDateFrom()));
      context.put("workLogToDate", convertDateToReadableFormat(workLog.getDateTo()));
      context.put("summary", workLog.getSummary());
      context.put("summaryDays", workLog.getTotalSummaryDays(workLog.getColsInMainCategory()));
      context.put("mainCategoryCols", workLog.getColsInMainCategory());
      context.put("summaryPercentageMainCategory", workLog.getSummarizedAveragePercentageMapForCols(workLog.getColsInMainCategory()));
      context.put("summaryDaysMainCategory", workLog.getDaysSumMap(workLog.getColsInMainCategory()));
      context.put("summaryOther", getSummarizedAvgPercentageOthers(workLog.getResponses()));
      context.put("summaryOtherDays", workLog.getTotalSummaryDays(workLog.getColsInOthers()));
      context.put("mainCategoryHeaderColSpan", worklogConfig.workLogEmailShowDays ? workLog.getColsInMainCategory().size() * 2 : workLog.getColsInMainCategory().size());
      context.put("workLogMainCategoryKeys", getWorklogDistribution().keySet());
      context.put("otherCols", workLog.getColsInOthers());
      context.put("khojiUrl", String.format(emailConfig.khojiTimelogUrl, workLog.getInstanceId(), URLEncoder.encode(workLog.getName(), "UTF-8").replace("%2C", ","), workLog.getDateFrom(), workLog.getDateTo()));
      context.put("UnsubscribeFromEmailkhojiUrl", emailConfig.unsubscribeFromWorklogEmail);
      context.put("isOthersCategoryExist", workLog.isOtherCategoryExist());
      HashMap<String, Double> cumulativeRagThreshold = processor.getUpdatedRagStatusFromConfig(WORKLOG_RAG_THRESHOLD_KEY);
      context.put("CumulativeWorkLogPercentageColorCode", getRGBForTeamRagPercentage(totalWorkLoggedPercentages, cumulativeRagThreshold));
      HashMap<String, Double> othersRagThreshold = processor.getUpdatedRagStatusFromConfig(OTHER_WORKLOG_PERCENTAGE_THRESHOLD);
      context.put("OthersCategoryTotalWorkLogPercentageColorCode", getRGBForOthersRagPercentage(summarizedPercentageOthers, othersRagThreshold));
      context.put("rag", getRGBNameAgainstPercentage(summarizedPercentageOthers));
      context.put("mainCategoryAlias", configDataService.getConfigByInstanceId(WORKLOG_MAIN_CATEGORIES_ALIAS, null));
      context.put("othersCategoryAlias", configDataService.getConfigByInstanceId(WORKLOG_OTHER_CATEGORIES_ALIAS, null));
      context.put("cumulativePercentage", totalWorkLoggedPercentages);
      context.put("logoWithText", KHOJI_LOGO_WITH_TEXT);
      context.put("templateToInclude", TEMPLATES_DIRECTORY + worklogConfig.workLogCollectiveOthersTemsWiseVelocityEmailTemplate);
      log.debug("Gathered content for worklog email for user having email {}", workLog.getEmail());

      StringWriter writer = new StringWriter();
      workLogEmailTemplateMainForTeams.merge(context, writer);
      return writer.toString();
    }
    catch (Exception exception)
    {
      log.error("Error While Generating Velocity Template", exception);
    }
    return null;
  }

  private Map<String, DaysPercentDistribution> getValuesForHashmap(WorkLogEmailModel workLog)
  {
    var list = workLog
            .getMainResponses()
            .stream()
            .flatMap(sub -> sub.getSubWorkLogResponses().stream())
            .collect(
                    Collectors.toMap(
                            WorkLogAuditEmailResponse::getEntity,
                            Function.identity(),
                            (existing, replacement) -> existing.isPartOfMultipleTeam() ? existing : replacement
                    )
            )
            .values()
            .stream()
            .toList();

    Map<String, DaysPercentDistribution> mergedMap = new HashMap<>();
    for (WorkLogAuditEmailResponse response : list) {
      Map<String, DaysPercentDistribution> distributionDetails = response.getDistributionDetails();
      for (Map.Entry<String, DaysPercentDistribution> entry : distributionDetails.entrySet()) {
        var taskCategory = entry.getKey();
        DaysPercentDistribution newDistribution = entry.getValue();
        mergedMap.merge(taskCategory, newDistribution, (existing, newEntry) -> {
          existing.setTotalDaysSpent(existing.getTotalDaysSpent() + newEntry.getTotalDaysSpent());
          existing.setPercentage(existing.getPercentage() + newEntry.getPercentage());
          return existing;
        });
      }
    }
    return mergedMap;
  }

  public String convertWorkLogReminderToEmailHTML(String memberName, String supervisorName, String tenantName, String ownerName, String workLogUrl, String dateFrom, String dateTo, String customText, String supportEmail) {
    try {
      VelocityContext context = new VelocityContext();
      StringWriter writer = new StringWriter();

      context.put("memberName", memberName);
      context.put("supervisorName", supervisorName);
      context.put("tenantName", tenantName);
      context.put("ownerName", ownerName);
      context.put("workLogUrl", workLogUrl);
      context.put("dateFrom", dateFrom);
      context.put("dateTo", dateTo);
      context.put("customText", customText);
      context.put("supportEmail", supportEmail);

      workLogReminderEmailVelocityTemplate.merge(context, writer);

      return writer.toString();
    } catch (Exception exception) {
      log.error("An error occurred while creating HTML for the worklog reminder. Error Details: {}", exception.getMessage());
    }
    return null;
  }

  private String convertDateToReadableFormat(String value) {
    SimpleDateFormat fromFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.ENGLISH);
    SimpleDateFormat monthYearFormat = new SimpleDateFormat("MMMM yyyy", Locale.ENGLISH);
    Calendar c = Calendar.getInstance();
    StringBuilder readableDate = new StringBuilder();

    try {
      Date date = fromFormat.parse(value);
      c.setTime(date);
      int day = c.get(Calendar.DAY_OF_MONTH);

      readableDate.append(day).append(getDayOfMonthSuffix(day)).append(" ");
      readableDate.append(monthYearFormat.format(date));
    } catch (ParseException e) {
      log.error(e);
    }

    return readableDate.toString();
  }

  private static String getDayOfMonthSuffix(int day) {
    if (day >= 11 && day <= 13) {
      return "th";
    }
    return switch (day % 10)
    {
      case 1 -> "st";
      case 2 -> "nd";
      case 3 -> "rd";
      default -> "th";
    };
  }

  private HashMap<String, DaysPercentDistribution> getWorkLogInOtherCategories(WorkLogEmailModel workLogEmailModel)
  {
    AtomicReference<Double> totalWorklogged = new AtomicReference<>(0.00);
    HashMap<String, DaysPercentDistribution> otherWorkLog = new HashMap<>();
    for (WorkLogAuditEmailResponse team : workLogEmailModel.getResponses())
    {
      workLogEmailModel.getColsInOthers().forEach(col -> {
        DaysPercentDistribution daysPercentDistribution = new DaysPercentDistribution(0, 0);
        if (otherWorkLog.containsKey(col))
        {
          daysPercentDistribution = otherWorkLog.get(col);
        }
        if (team.getDistributionDetails().get(col) != null)
        {
          totalWorklogged.updateAndGet(v -> v + team.getDistributionDetails().get(col).getTotalDaysSpent());
          daysPercentDistribution.setTotalDaysSpent(daysPercentDistribution.getTotalDaysSpent() + team.getDistributionDetails().get(col).getTotalDaysSpent());
        }
        otherWorkLog.put(col, daysPercentDistribution);
      });
    }

    otherWorkLog.forEach((key, value) -> {
      DecimalFormat df = new DecimalFormat("#0.00");
      value.setPercentage(Double.parseDouble(df.format(value.getTotalDaysSpent() / totalWorklogged.get() * 100)));
      value.setTotalDaysSpent(Double.parseDouble(df.format(value.getTotalDaysSpent())));
      otherWorkLog.put(key, value);
    });

    List<Map.Entry<String, DaysPercentDistribution>> entryList = new ArrayList<>(otherWorkLog.entrySet());
    // Sort the entryList based on the totalDaysSpent value
    entryList.sort(Comparator.comparingDouble(e -> e.getValue().getTotalDaysSpent()));
    LinkedHashMap<String, DaysPercentDistribution> sortedMap = new LinkedHashMap<>();
    Collections.reverse(entryList);
    int index = 0;
    //Getting only top 5 values
    for (Map.Entry<String, DaysPercentDistribution> entry : entryList)
    {
      if (index == 5)
      {
        break;
      }
      sortedMap.put(entry.getKey(), entry.getValue());
      index++;
    }

    return sortedMap;
  }

  /**
   * Returns RGB for Others Category RAG
   * Criteria:
   * - if RAG below MEDIUM: AMBER
   * - otherwise: RED
   *
   * @param percentage   percentage for Others RAG
   * @param ragThreshold rag thresholds
   * @return RGB color code
   */
  private String getRGBForOthersRagPercentage(double percentage, HashMap<String, Double> ragThreshold)
  {
    if (percentage < ragThreshold.get(MEDIUM_THRESHOLD))
    {
      return AMBER_RGB;
    }
    return RED_RGB;
  }

  public String getRGBNameAgainstPercentage(double percentage)
  {
    HashMap<String, Double> ragThreshold = processor.getUpdatedRagStatusFromConfig(OTHER_WORKLOG_PERCENTAGE_THRESHOLD);
    if (percentage < ragThreshold.get(MEDIUM_THRESHOLD))
    {
      return AMBER;
    }
    return RED;
  }

  /**
   * Returns RGB for Team RAG
   * Criteria:
   * - if RAG below MEDIUM: RED
   * - if RAG above MEDIUM & below NORMAL: AMBER
   * - if RAG above NORMAL: GREEN
   *
   * @param percentage   percentage for teams RAG
   * @param ragThreshold thresholds
   * @return RGB color code
   */
  private String getRGBForTeamRagPercentage(double percentage, HashMap<String, Double> ragThreshold)
  {
    if (percentage < Double.parseDouble(String.valueOf(ragThreshold.get(MEDIUM_THRESHOLD))))
    {
      return RED_RGB;
    }
    else if (percentage < Double.parseDouble(String.valueOf(ragThreshold.get(NORMAL_THRESHOLD))) && percentage > Double.parseDouble(String.valueOf(ragThreshold.get(MEDIUM_THRESHOLD))))
    {
      return AMBER_RGB;
    }
    return GREEN_RGB;
  }

  public double getSummarizedOthersPercentage(WorkLogEmailModel workLog)
  {
    return processor.calculateOthersCategoryPercentage(new ArrayList<>(List.of(workLog)));
  }

  private List<HashMap<String, Object>> getTeamsData(WorkLogEmailModel workLogEmailModel)
  {
    Set<String> others = workLogEmailModel.getColsInOthers();
    List<HashMap<String, Object>> teamsWorklog = new ArrayList<>();
    for (WorkLogAuditEmailResponse workLogAuditEmailResponse : workLogEmailModel.getResponses())
    {
      HashMap<String, Object> hashMap = new HashMap<>();
      hashMap.put("entity", workLogAuditEmailResponse.getEntity());
      hashMap.put("workLog", workLogAuditEmailResponse.getWorkLog());
      hashMap.put("colorCode", workLogAuditEmailResponse.getColorCode());
      hashMap.put("getTotalOtherDays", workLogAuditEmailResponse.getTotalOtherDays(others));
      hashMap.put("other", getOthersPercentage(workLogAuditEmailResponse, others));
      teamsWorklog.add(hashMap);
    }

    //sorting if values of two keys are same then sort them alphabetically otherwise sort values in descending order
    teamsWorklog.sort(new Comparator<HashMap<String, Object>>()
    {
      @Override
      public int compare(HashMap<String, Object> map1, HashMap<String, Object> map2)
      {
        double value1 = (double) map1.get("workLog");
        double value2 = (double) map2.get("workLog");

        // If the values are the same, sort alphabetically by keys
        if (value1 == value2)
        {
          List<String> keys1 = new ArrayList<>(map1.keySet());
          List<String> keys2 = new ArrayList<>(map2.keySet());
          Collections.sort(keys1);
          Collections.sort(keys2);
          return keys1.get(0).compareTo(keys2.get(0));
        }

        // Otherwise, sort by values in descending order
        return Double.compare(value2, value1);
      }
    });

    //Getting top 5 results
    if (teamsWorklog.size() >= 5)
    {
      teamsWorklog = teamsWorklog.subList(0, 5);
    }
    else
    {
      teamsWorklog = teamsWorklog.subList(0, teamsWorklog.size());
    }

    return teamsWorklog;
  }

  private double getOthersPercentage(WorkLogAuditEmailResponse response, Set<String> others)
  {
    double total = 0.00, other = 0.00;

    for (String key : response.getDistributionDetails().keySet())
    {
      total += response.getDistributionDetails().get(key).getTotalDaysSpent();
      if (others.contains(key))
      {
        other += response.getDistributionDetails().get(key).getTotalDaysSpent();
      }
    }

    if (other == 0)
    {
      return 0;
    }

    DecimalFormat df = new DecimalFormat("#0.00");
    return Double.parseDouble(df.format((other / total) * 100));
  }

  public String convertInviteUserToEmailHTML(
          String invitedUser,
          String invitee,
          String signUpUrl,
          boolean isUserTenantAdmin,
          String supportEmail,
          String appName
  )
  {
    try
    {
      VelocityContext context = new VelocityContext();
      StringWriter writer = new StringWriter();

      context.put("signUpUrl", signUpUrl);
      context.put("supportEmail", supportEmail);
      context.put("logoWithText", KHOJI_LOGO_WITH_TEXT);
      context.put("logoWithoutText", KHOJI_LOGO_WITHOUT_TEXT);
      context.put("invitedUser", invitedUser);
      updateEmailTemplateForInvitation(isUserTenantAdmin, context, writer, invitee, appName);

      return writer.toString();
    }
    catch (Exception exception)
    {
      log.error("An error occurred while creating HTML for the user invitation. Error Details: ", exception);
    }
    return null;
  }

  private void updateEmailTemplateForInvitation(
          boolean isUserTenantAdmin,
          VelocityContext context,
          StringWriter writer,
          String invitee,
          String appName
  )
  {
    if (isUserTenantAdmin)
    {
      inviteTenantAdminEmailTemplate.merge(context, writer);
    }
    else
    {
      context.put("invitee", invitee);
      context.put("appName", appName);
      inviteUserEmailTemplate.merge(context, writer);
    }
  }


  public String convertRequestedEmailContextToEmailHTML(String userFullName, String accountId, String profileUrl)
  {
    try
    {
      VelocityContext context = new VelocityContext();
      context.put("requestedUserFullName", userFullName);
      context.put("enableAccessForUserUrl", getRequestedAccessUrl(accountId));
      context.put("profileUrl", profileUrl + "/jira/people/" + accountId);
      context.put("logoWithText", KHOJI_LOGO_WITH_TEXT);
      context.put("logoWithoutText", KHOJI_LOGO_WITHOUT_TEXT);
      context.put("support", configHandler.supportEmail);

      StringWriter writer = new StringWriter();
      userRequestAccessEmailTemplate.merge(context, writer);
      return writer.toString();
    }
    catch (Exception exception)
    {
      log.error("An error occurred while creating HTML for the user invitation. Error Details: ", exception);
    }
    return null;
  }

  private String getRequestedAccessUrl(String requestAccessUrl)
  {
    return String.format(emailConfig.khojiRequestAccessUrl, requestAccessUrl);
  }

  /**
   * Render the context for user
   * revoked email
   *
   * @param name      of user
   * @param accountId of user
   * @param loginUrl  of khoji
   * @return rendered email model
   */
  public String convertRevokedUserToEmailHTML(String name, String accountId, String loginUrl)
  {
    try
    {
      VelocityContext context = new VelocityContext();
      context.put("name", name);
      context.put("accountIdOfUser", accountId);
      context.put("loginUrl", loginUrl);
      context.put("logoWithText", KHOJI_LOGO_WITH_TEXT);
      context.put("logoWithoutText", KHOJI_LOGO_WITHOUT_TEXT);
      context.put("support", configHandler.supportEmail);

      StringWriter writer = new StringWriter();
      userRevokedEmailTemplate.merge(context, writer);
      return writer.toString();
    }
    catch (Exception exception)
    {
      log.error("An error occurred while creating HTML for the user invitation. Error Details: ", exception);
    }
    return null;
  }

  public String convertEnableAccessForUSerToEmailHTML(String invitee, String loginUrl)
  {
    try
    {
      VelocityContext context = new VelocityContext();
      context.put("invitee", invitee);
      context.put("loginUrl", loginUrl);
      context.put("logoWithText", KHOJI_LOGO_WITH_TEXT);
      context.put("logoWithoutText", KHOJI_LOGO_WITHOUT_TEXT);
      context.put("support", configHandler.supportEmail);

      StringWriter writer = new StringWriter();
      enableAccessEmailTemplate.merge(context, writer);
      return writer.toString();
    }
    catch (Exception exception)
    {
      log.error("An error occurred while creating HTML for the user invitation. Error Details: {}", exception.getMessage());
    }
    return null;
  }

  private int getSummarizedAvgPercentageOthers(List<WorkLogAuditEmailResponse> responses)
  {
    int total = responses.size();
    int value = 0;
    for (WorkLogAuditEmailResponse member : responses)
    {
      value += member.getOther();
    }

    return value / total;
  }

  private Map<String, WorklogDistributionConfig> getWorklogDistribution()
  {
//    Optional<TenantConfigs> worklogDistributionConfig = tenantConfigsRepository.findByPropKey(WORKLOG_DISTRIBUTION_JSON);
//    if (worklogDistributionConfig.isPresent())
//    {
//      try
//      {
//        return commonService.readJsonFromProp(worklogDistributionConfig.get().getPropValue(), new TypeReference<>()
//        {
//        });
//      }
//      catch (Exception exception)
//      {
//        return new HashMap<>();
//      }
//    }
    return new HashMap<>();
  }
}
