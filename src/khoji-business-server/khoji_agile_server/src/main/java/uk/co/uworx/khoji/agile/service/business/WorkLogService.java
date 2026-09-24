package uk.co.uworx.khoji.agile.service.business;

import com.fasterxml.jackson.core.type.TypeReference;
import lombok.extern.log4j.Log4j2;
import org.apache.commons.collections4.CollectionUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.config.WorklogConfig;
import uk.co.uworx.khoji.agile.helper.WorkLogHourConfigService;
import uk.co.uworx.khoji.agile.internal.datamodel.KhojiIssueType;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.internal.model.DaysPercentDistribution;
import uk.co.uworx.khoji.agile.internal.model.Issue;
import uk.co.uworx.khoji.agile.internal.model.TeamWorkLog;
import uk.co.uworx.khoji.agile.internal.model.WorkLog;
import uk.co.uworx.khoji.agile.internal.model.WorkLogDistribution;
import uk.co.uworx.khoji.agile.internal.model.WorkLogEmailModel;
import uk.co.uworx.khoji.agile.internal.model.WorklogDistributionConfig;
import uk.co.uworx.khoji.agile.internal.model.request.WorkLogDataClientRequest;
import uk.co.uworx.khoji.agile.persistence.context.InstanceIdContext;
import uk.co.uworx.khoji.agile.persistence.dto.MemberDTO;
import uk.co.uworx.khoji.agile.persistence.dto.TeamDTO;
import uk.co.uworx.khoji.agile.persistence.service.ConfigDataService;
import uk.co.uworx.khoji.agile.request.WorkLogRequest;
import uk.co.uworx.khoji.agile.response.Member;
import uk.co.uworx.khoji.agile.service.CommonService;
import uk.co.uworx.khoji.agile.service.Constants;
import uk.co.uworx.khoji.agile.service.MappingService;
import uk.co.uworx.khoji.agile.service.TenantService;
import uk.co.uworx.khoji.agile.service.TimeService;

import java.security.Principal;
import java.text.DecimalFormat;
import java.text.SimpleDateFormat;
import java.util.AbstractMap;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import static uk.co.uworx.khoji.agile.constant.Constants.AMBER;
import static uk.co.uworx.khoji.agile.constant.Constants.GREEN;
import static uk.co.uworx.khoji.agile.constant.Constants.IS_RED_STARTING_COLOR;
import static uk.co.uworx.khoji.agile.constant.Constants.LOW_THRESHOLD;
import static uk.co.uworx.khoji.agile.constant.Constants.MEDIUM_THRESHOLD;
import static uk.co.uworx.khoji.agile.constant.Constants.NORMAL_THRESHOLD;
import static uk.co.uworx.khoji.agile.constant.Constants.RED;
import static uk.co.uworx.khoji.agile.constants.InstanceConfigs.WORKLOG_DISTRIBUTION_JSON;
import static uk.co.uworx.khoji.agile.constants.InstanceConfigs.WORKLOG_PERCENTAGE_THRESHOLD;
import static uk.co.uworx.khoji.agile.handler.WorkLogHandler.DECIMAL_FORMAT;
import static uk.co.uworx.khoji.agile.handler.WorkLogHandler.WORKLOG_COLUMN;
import static uk.co.uworx.khoji.agile.service.Constants.DECIMAL_FORMAT_PATTERN;

/**
 * Service layer for calculating work log
 * business stats
 */
@Service
@Log4j2
public class WorkLogService
{
  @Autowired
  private TenantService tenantService;
  @Autowired
  private MappingService mappingService;
  @Autowired
  private CommonService commonService;
  @Autowired
  private TimeService timeService;
  @Autowired
  private WorkLogHourConfigService workLogHourConfigService;
  @Autowired
  private WorklogConfig worklogConfig;
  @Autowired
  private ConfigDataService configDataService;

  /**
   * Populates team work log stats
   * work log percentage against each member in a team
   *
   * @param workLogRequestParam request param
   * @param distributionMap     map
   * @param teamsRequested      teams
   * @param principal
   * @return
   */
  public List<TeamWorkLog> getWorkLogStats(
          WorkLogRequest workLogRequestParam,
          Map<String, WorklogDistributionConfig> distributionMap,
          List<TeamDTO> teamsRequested,
          Principal principal)
  {
    Map<String, List<String>> accountIdTeamnamemap = getAccountIdToTeamNamesMap(teamsRequested);

    if (CollectionUtils.isNotEmpty(teamsRequested))
    {
      List<Issue> issues = getWorkLogIssuesFromSource(teamsRequested, workLogRequestParam.getDateFrom(), workLogRequestParam.getDateTo(), false, principal);

      List<TeamWorkLog> workLogList = new ArrayList<>();
      initializeWorkLogModel(teamsRequested, null, workLogList, distributionMap, workLogRequestParam);

      List<WorkLog> allWorkLogs = new ArrayList<>();
      Map<String, KhojiIssueType> issueIdToIssueTypeMap = new HashMap<>();
      //Stream is expensive
      for (Issue issue : issues)
      {
        if (issue.getWorklog() != null)
        {
          allWorkLogs.addAll(issue.getWorklog().getWorklogs());
          KhojiIssueType issueType = issue.getIssueType();
          for (WorkLog workLog : issue.getWorklog().getWorklogs())
          {
            issueIdToIssueTypeMap.putIfAbsent(workLog.getIssueId(), issueType);
          }
        }
      }

      allWorkLogs
              .stream()
              .filter(wl -> workLogDateValid(workLogRequestParam, wl.getStarted()))
              .forEach(workLog -> {
                List<String> team = new ArrayList<>();
                String accountId = workLog.getAuthor().getAccountId();

                if (workLog.getAuthor() != null)
                {
                  team = accountIdTeamnamemap.get(workLog.getAuthor().getAccountId());
                }

                if (CollectionUtils.isNotEmpty(team))
                {
                  for (String teamName : team)
                  {
                    TeamWorkLog workPackage = getWorkLogObject(Collections.singletonList(teamName), workLogList);
                    if (workPackage != null)
                    {
                      Member member = null;
                      if (accountId != null)
                      {
                        member = workPackage.getMemberByAccountId(workLog.getAuthor().getAccountId());
                      }

                      if (member != null)
                      {
                        double workLogMinutes = Double.parseDouble(DECIMAL_FORMAT.format(Double.parseDouble(workLog.getTimeSpentSeconds()) / 60));
                        member.setTotalWorkLog(member.getTotalWorkLog() + workLogMinutes);
                        member.setTotalWorkLog(Double.parseDouble(DECIMAL_FORMAT.format(member.getTotalWorkLog())));
                        addLogToDistribution(
                                member,
                                issueIdToIssueTypeMap.get(workLog.getIssueId()),
                                workLogMinutes,
                                workPackage.getOthersDistrMeta(),
                                distributionMap
                        );
                      }
                    }
                  }
                }
              }
      );

      return workLogList;
    }
    else
    {
      return new ArrayList<>();
    }
  }

  /**
   * Fetches work log threshold from DB
   *
   * @return map
   */
  public Map<String, Double> getTenantSpecificWorkLogThreshold()
  {
    String workLogThreshold = configDataService.getConfigByInstanceId(WORKLOG_PERCENTAGE_THRESHOLD, InstanceIdContext.getInstanceId());
    if (workLogThreshold.isEmpty())
    {
//      log.error("WORK_LOG_PERCENTAGE_THRESHOLD config not found against the tenant: {}", TenantContext.getTenantIdentification());
      throw new ServiceException(ServiceError.G0000);
    }
    return mappingService.readJsonFromProp(workLogThreshold, new TypeReference<>()
    {
    });
  }

  /**
   * Fetches work log category distribution from DB
   *
   * @return map
   */
  public Map<String, WorklogDistributionConfig> getTenantSpecificWorkLogDistribution()
  {
    String worklogDistributionConfig = configDataService.getConfigByInstanceId(WORKLOG_DISTRIBUTION_JSON, null);
    if (worklogDistributionConfig != null)
    {
      try
      {
        return commonService.readJsonFromProp(worklogDistributionConfig, new TypeReference<>()
        {
        });
      }
      catch (Exception exception)
      {
        log.error("Exception occured while fetching/mapping work log distribution from db: ", exception);
        return new HashMap<>();
      }
    }
    return new HashMap<>();
  }

  /**
   * Calculate and populate percentage in team
   * and each member
   *
   * @param workLogRequestParam
   * @param workLogs
   */
  public void calculatePercentages(WorkLogRequest workLogRequestParam, List<TeamWorkLog> workLogs)
  {
    double workingDays = timeService.getNumberOfWorkingDays(workLogRequestParam);
    for (TeamWorkLog workLog : workLogs)
    {
      double totalPercentages = 0;
      for (Member member : workLog.getMembers())
      {
        member.setTotalWorkLogInDays(getWorkLogDays(member.getTotalWorkLogInHours()));
        member.setPercentage(getPercentageCompletedWorkLog(member.getTotalWorkLogInHours(), workingDays));
        member.setTotalAvailableDays(timeService.getNumberOfWorkingDays(workLogRequestParam));
        member.setTotalWorkLog(Double.parseDouble(DECIMAL_FORMAT.format(member.getTotalWorkLogInHours())));
        totalPercentages += member.getPercentage();
        for (String dist : member.getWorkLogDistribution().getValues().keySet())
        {
          DaysPercentDistribution daysPercentDistribution = (DaysPercentDistribution) member.getWorkLogDistribution().getValues().get(dist);
          // this comment is here so that no one else gets confused as much as i did, variable names are not correct
          // daysPercentDistribution.getTotalDaysSpent() -> minutes -> inner part
          // daysPercentDistribution.setTotalDaysSpent -> hours -> after dividing by 60 and then setting
          daysPercentDistribution.setTotalDaysSpent(daysPercentDistribution.getTotalDaysSpent() / 60);
          daysPercentDistribution.setPercentage(getPercentageCompletedWorkLog(daysPercentDistribution.getTotalDaysSpent(), workingDays));

          double inDays = timeService.getTimeInDays(daysPercentDistribution.getTotalDaysSpent());
          daysPercentDistribution.setTotalDaysSpent(inDays);
        }
        double housrSpentOnOthers = 0.00;
        for (String dist : member.getWorkLogDistribution().getOthers().keySet())
        {
          DaysPercentDistribution daysPercentDistribution = (DaysPercentDistribution) member.getWorkLogDistribution().getOthers().get(dist);
          // this comment is here so that no one else gets confused as much as i did, variable names are not correct
          // daysPercentDistribution.getTotalDaysSpent() -> minutes -> inner part
          // daysPercentDistribution.setTotalDaysSpent -> hours -> after dividing by 60 and then setting
          daysPercentDistribution.setTotalDaysSpent(daysPercentDistribution.getTotalDaysSpent() / 60);
          daysPercentDistribution.setPercentage(getPercentageCompletedWorkLog(daysPercentDistribution.getTotalDaysSpent(), workingDays));
          housrSpentOnOthers += daysPercentDistribution.getTotalDaysSpent();
          double inDays = timeService.getTimeInDays(daysPercentDistribution.getTotalDaysSpent());
          daysPercentDistribution.setTotalDaysSpent(inDays);
        }
        member.setOthersPercentage(getPercentageCompletedWorkLog(housrSpentOnOthers, workingDays));
      }
      workLog.getMembers().sort(Comparator.comparingDouble(Member::getPercentage));
      workLog.setPercentage(
              workLog.getMembers() != null &&
              !workLog.getMembers().isEmpty()
                            ? Double.parseDouble(
                                    DECIMAL_FORMAT.format(totalPercentages / workLog.getMembers().size())
                            )
                            : 0.0
      );
    }
    workLogs.sort(Comparator.comparingDouble(TeamWorkLog::getPercentage));
  }

  /**
   * Sets the total distribution in percentage for each task type for each team
   *
   * @param workLogs the list of team work logs
   */
  public void setTotalPercentages(List<TeamWorkLog> workLogs, Map<String, WorklogDistributionConfig> distributionMap)
  {
    for (TeamWorkLog teamWorkLog : workLogs)
    {
      HashMap<String, Double> percentageDistributions = new HashMap<>();
      for (String mainCategory : distributionMap.keySet())
      {
        percentageDistributions.put(mainCategory, getTotalPercentageForTaskType(mainCategory, teamWorkLog));
      }

      percentageDistributions.put(Constants.TASK_TYPE_OTHERS, getTotalPercentageForTaskType(Constants.TASK_TYPE_OTHERS, teamWorkLog));
      for (String othersInfo : teamWorkLog.getOthersDistrMeta())
      {
        percentageDistributions.put(othersInfo, getTotalPercentageForOtherTaskTypes(othersInfo, teamWorkLog));
      }
      teamWorkLog.setTotalsPercentages(percentageDistributions);
    }
  }

  /**
   * Prepares metadata for every team others tasks
   *
   * @param workLogs
   */
  public void addOthersTaskToMembersDistribution(List<TeamWorkLog> workLogs, Map<String, Double> worklogThresholds)
  {
    for (var teamWorkLog : workLogs)
    {
      var othersDistrMeta = teamWorkLog.getOthersDistrMeta();

      for (var member : teamWorkLog.getMembers())
      {
        var missingTasks = othersDistrMeta.stream()
                .filter(task -> member.getWorkLogDistribution().getOthers().keySet().stream()
                        .noneMatch(existingTask -> existingTask.equals(task)))
                .toList();

        addMissingTasksToOthersDistribution(member, missingTasks);
        member.setThresholdColor(getColorCode(member.getPercentage(), worklogThresholds));
      }

      teamWorkLog.setThresholdColor(getColorCode(teamWorkLog.getPercentage(), worklogThresholds));
    }
  }

  /**
   * Sets the total distribution in days for each task type for each team
   *
   * @param workLogs the list of team work logs
   */
  public void setTotalDays(List<TeamWorkLog> workLogs, Map<String, WorklogDistributionConfig> distributionMap)
  {
    for (TeamWorkLog teamWorkLog : workLogs)
    {
      HashMap<String, Double> daysDistributions = new HashMap<>();
      daysDistributions.put(WORKLOG_COLUMN, getTotalDaysForTeam(teamWorkLog));
      for (String mainCategory : distributionMap.keySet())
      {
        daysDistributions.put(mainCategory, getTotalDaysForTaskType(null, mainCategory, teamWorkLog));
      }

      double totalDaysOnAllOtherTasks = 0;
      if (CollectionUtils.isNotEmpty(teamWorkLog.getMembers()))
      {
        for (String otherTaskType : teamWorkLog.getMembers().get(0).getWorkLogDistribution().getOthers().keySet())
        {
          double totalDaysForTaskType = getTotalDaysForTaskType(Constants.TASK_TYPE_OTHERS, otherTaskType, teamWorkLog);
          totalDaysOnAllOtherTasks += totalDaysForTaskType;
          daysDistributions.put(otherTaskType, totalDaysForTaskType);
        }
      }

      daysDistributions.put(Constants.TASK_TYPE_OTHERS, totalDaysOnAllOtherTasks);
      teamWorkLog.setTotalsDays(daysDistributions);
    }
  }

  public double getSummary(List<TeamWorkLog> workLogs)
  {
    double workLogAvg = 0;
    double totalWorkLog = 0;
    for (TeamWorkLog workLog : workLogs)
    {
      workLogAvg++;
      totalWorkLog += workLog.getPercentage();
    }
    return (int) (totalWorkLog / workLogAvg);
  }

  public Map<String, String> getWorkLogThresholdsColors()
  {
    Map<String, String> worklogThresholdColors = new HashMap<>();

    worklogThresholdColors.put(
            MEDIUM_THRESHOLD,
            worklogConfig.ragColorCodes.get(AMBER)
    );

    if (worklogConfig.worklogSliderConfig.get(IS_RED_STARTING_COLOR))
    {
      worklogThresholdColors.put(
              NORMAL_THRESHOLD,
              worklogConfig.ragColorCodes.get(GREEN)
      );
      worklogThresholdColors.put(
              LOW_THRESHOLD,
              worklogConfig.ragColorCodes.get(RED)
      );
    }
    else
    {
      worklogThresholdColors.put(
              NORMAL_THRESHOLD,
              worklogConfig.ragColorCodes.get(RED)
      );
      worklogThresholdColors.put(
              LOW_THRESHOLD,
              worklogConfig.ragColorCodes.get(GREEN)
      );
    }

    return worklogThresholdColors;
  }

  ////////////////////////////////////////////////

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

  public List<Issue> getWorkLogIssuesFromSource(List<TeamDTO> teams, String dateFrom, String dateTo, boolean fetchOnlyIssueTypes, Principal principal)
  {
    var teamMembers = teams
            .stream()
            .flatMap(team -> team.getMembers().stream())
            .distinct()
            .toList();

    var activeMembersAccountIds = getMembersAccountIdsCopy(teamMembers);

    if (activeMembersAccountIds.isEmpty())
    {
      return List.of();
    }

    List<Issue> issues = fetchOnlyIssueTypes ?
            tenantService.getDataClient().getWorkLogIssuesWithLimitedInformation(
                    new TypeReference<List<Issue>>()
                    {
                    },
                    getWorkLogDataClientRequest(
                            dateFrom,
                            dateTo,
                            activeMembersAccountIds,
                            teamMembers,
                            worklogConfig.workLogTenant
                    ),
                    principal
            ) :
            tenantService.getDataClient().getWorkLogData(
                    getWorkLogDataClientRequest(
                            dateFrom,
                            dateTo,
                            activeMembersAccountIds,
                            teamMembers,
                            worklogConfig.workLogTenant
                    ),
                    principal
            );

    return issues.stream().distinct().toList();
  }

  private void initializeWorkLogModel(
          List<TeamDTO> teams,
          HashMap<String, HashSet<MemberDTO>> totalTeamsAndMembers,
          List<TeamWorkLog> workLog,
          Map<String, WorklogDistributionConfig> distributionMap,
          WorkLogRequest workLogRequestParam
  )
  {
    var membersInMultipleTeam = areMembersInMultipleTeams(teams);

    teams.forEach(team -> {
      var tlog = new TeamWorkLog();
      tlog.setTeamName(team.getTeamName());

      var members = team.getMembers().stream().map(member -> {
        var mem = new Member();
        mem.setName(member.getFullName());
        mem.setEmail(member.getMemberEmail());
        mem.setAccountId(member.getAccountId());
        mem.setTotalWorkLog(0);
        mem.setInMultipleTeams(membersInMultipleTeam.get(member.getAccountId()));

        var obj = new WorkLogDistribution();
        distributionMap.keySet().forEach(key ->
                obj.getValues().put(key, new DaysPercentDistribution())
        );
        mem.setWorkLogDistribution(obj);
        return mem;
      }).toList();

      tlog.getMembers().addAll(members);
      tlog.setTotalAvailableDays(members.size() * timeService.getNumberOfWorkingDays(workLogRequestParam));
      workLog.add(tlog);
    });
  }

  /**
   * add the task to member work log distribution
   *
   * @param member       the member
   * @param issueType    The task type
   * @param totalMinutes the minutes spent on this task
   * @param othersList   others tasks list
   */
  private void addLogToDistribution(
          Member member,
          KhojiIssueType issueType,
          Double totalMinutes,
          List<String> othersList,
          Map<String, WorklogDistributionConfig> distributionMap
  )
  {
    DaysPercentDistribution workDistr = null;
    if (getDistributionType(issueType.getId(), distributionMap).equalsIgnoreCase("Others"))
    {
      workDistr = (DaysPercentDistribution) member.getWorkLogDistribution().getOthers().get(issueType.getName());
      if (workDistr == null)
      {
        workDistr = new DaysPercentDistribution();
        member.getWorkLogDistribution().getOthers().put(issueType.getName(), workDistr);
      }
      workDistr.setTotalDaysSpent(Double.parseDouble(DECIMAL_FORMAT.format(workDistr.getTotalDaysSpent() + totalMinutes)));
      if (!othersList.contains(issueType.getName()))
      {
        othersList.add(issueType.getName());
      }
    }
    else
    {
      workDistr = (DaysPercentDistribution) member.getWorkLogDistribution().getValues().get(getDistributionType(issueType.getId(), distributionMap));
      workDistr.setTotalDaysSpent(Double.parseDouble(DECIMAL_FORMAT.format(workDistr.getTotalDaysSpent() + totalMinutes)));
    }
  }

  private Map<String, List<String>> getAccountIdToTeamNamesMap(List<TeamDTO> teams)
  {
    return teams.stream()
            .flatMap(team -> team.getMembers().stream()
                    .map(member -> new AbstractMap.SimpleEntry<>(member.getAccountId(), team.getTeamName())))
            .collect(Collectors.groupingBy(
                    Map.Entry::getKey,
                    Collectors.mapping(Map.Entry::getValue, Collectors.toList())
            ));
  }

//  private List<String> getMembersAccountIdsCopy(List<uk.co.uworx.khoji.agile.internal.model.Member> members)
//  {
//    return CollectionUtils.isNotEmpty(members) ?
//            members.stream().map(uk.co.uworx.khoji.agile.internal.model.Member::getAccountId).collect(Collectors.toList())
//            : new ArrayList<>();
//  }

  private List<String> getMembersAccountIdsCopy(List<MemberDTO> members)
  {
    return CollectionUtils.isNotEmpty(members) ?
            members.stream().map(MemberDTO::getAccountId).collect(Collectors.toList())
            : new ArrayList<>();
  }

  private WorkLogDataClientRequest getWorkLogDataClientRequest(String dateFrom, String dateTo, List<String> members, List<MemberDTO> memberList, String worklogTenant)
  {
    return new WorkLogDataClientRequest(members, dateFrom, dateTo, tenantService.getDataSourceTenantId(), memberList, worklogTenant);
  }

  private HashMap<String, Boolean> areMembersInMultipleTeams(List<TeamDTO> teams)
  {
    var accountIdCounts = teams.stream()
            .flatMap(team -> team.getMembers().stream())
            .collect(Collectors.groupingBy(
                    MemberDTO::getAccountId,
                    Collectors.summingInt(member -> 1)
            ));
    var accountIdInMultipleTeams = new HashMap<String, Boolean>();
    accountIdCounts.forEach((accountId, count) ->
            accountIdInMultipleTeams.put(accountId, count > 1)
    );
    return accountIdInMultipleTeams;
  }

  private String getDistributionType(String value, Map<String, WorklogDistributionConfig> worklogDistribution)
  {
    Optional<Map.Entry<String, WorklogDistributionConfig>> worklogCategory = worklogDistribution.entrySet().stream()
            .filter(entry -> {
              List<String> distributions = entry.getValue().getIssueTypes().stream()
                      .map(KhojiIssueType::getId)
                      .toList();
              return distributions.contains(value);
            }).findFirst();

    if (worklogCategory.isPresent())
    {
      return worklogCategory.get().getKey();
    }
    return "Others";
  }

  private TeamWorkLog getWorkLogObject(List<String> team, List<TeamWorkLog> workLogList)
  {
    return workLogList.stream()
            .filter(workLog -> team.contains(workLog.getTeamName()))
            .findFirst()
            .orElse(null);
  }

  private double getWorkLogDays(double workLogInHours)
  {
    return workLogInHours / (workLogHourConfigService.getConfigValueByTenantId());
  }

  private double getPercentageCompletedWorkLog(double workLog, double days)
  {
    try
    {
      double result = Double.parseDouble(DECIMAL_FORMAT.format(workLog / (days * workLogHourConfigService.getConfigValueByTenantId()) * 100));
      if (Double.isNaN(result))
      {
        return 0;
      }
      return result;
    }
    catch (Exception exception)
    {
      return 0;
    }
  }

  /**
   * returns individual percentage for specific task type of a team
   *
   * @param taskType    the task type
   * @param teamWorkLog the complete work log of team members
   * @return the total percentage for task
   */
  private double getTotalPercentageForTaskType(String taskType, TeamWorkLog teamWorkLog)
  {
    double totalPercentage = 0.00;
    for (Member member : teamWorkLog.getMembers())
    {
      if (taskType.equalsIgnoreCase(Constants.TASK_TYPE_OTHERS))
      {
        totalPercentage += member.getOthersPercentage();
      }
      else
      {
        DaysPercentDistribution daysPercentDistribution = (DaysPercentDistribution) member.getWorkLogDistribution().getValues().get(taskType);
        totalPercentage += daysPercentDistribution.getPercentage();
      }
    }
    totalPercentage = CollectionUtils.isNotEmpty(teamWorkLog.getMembers()) ?
            Double.parseDouble(DECIMAL_FORMAT.format(totalPercentage / teamWorkLog.getMembers().size())) : 0.0;
    return totalPercentage;
  }

  private double getTotalPercentageForOtherTaskTypes(String taskType, TeamWorkLog teamWorkLog)
  {
    double totalPercentage = 0.00;
    for (Member member : teamWorkLog.getMembers())
    {
      DaysPercentDistribution daysPercentDistribution = (DaysPercentDistribution) member.getWorkLogDistribution().getOthers().get(taskType);
      totalPercentage += daysPercentDistribution != null ? daysPercentDistribution.getPercentage() : 0;
    }
    totalPercentage = CollectionUtils.isNotEmpty(teamWorkLog.getMembers()) ?
            Double.parseDouble(DECIMAL_FORMAT.format(totalPercentage / teamWorkLog.getMembers().size())) : 0.0;
    return totalPercentage;
  }

  /**
   * Adds missing tasks to member's other distribution
   *
   * @param member       the member
   * @param missingTasks the tasks to add
   */
  private void addMissingTasksToOthersDistribution(Member member, List<String> missingTasks)
  {
    for (String task : missingTasks)
    {
      DaysPercentDistribution distribution = new DaysPercentDistribution();
      distribution.setTotalDaysSpent(0);
      distribution.setPercentage(0);
      member.getWorkLogDistribution().getOthers().put(task, distribution);
    }
  }

  //TODO: can be refactored
  private String getColorCode(double percentage, Map<String, Double> worklogThresholds)
  {
    if (percentage > worklogThresholds.get(NORMAL_THRESHOLD))
    {
      return getWorkLogThresholdsColors().get(NORMAL_THRESHOLD);
    }
    else if (percentage > worklogThresholds.get(MEDIUM_THRESHOLD))
    {
      return getWorkLogThresholdsColors().get(MEDIUM_THRESHOLD);
    }
    return getWorkLogThresholdsColors().get(LOW_THRESHOLD);
  }

  private double getTotalDaysForTeam(TeamWorkLog teamWorkLog)
  {
    double totalDays = 0.00;
    for (Member member : teamWorkLog.getMembers())
    {
      totalDays += member.getTotalWorkLogInDays();
    }
    totalDays = Double.parseDouble(DECIMAL_FORMAT.format(totalDays));
    return totalDays;
  }

  /**
   * returns individual days for specific task type of a team
   *
   * @param taskType    the task type
   * @param teamWorkLog the complete work log of team members
   * @return the total days for task
   */
  private double getTotalDaysForTaskType(String distributionType, String taskType, TeamWorkLog teamWorkLog)
  {
    var totalDays = 0.00;
    for (Member member : teamWorkLog.getMembers())
    {
      DaysPercentDistribution daysPercentDistribution;
      if (distributionType != null && distributionType.equalsIgnoreCase(Constants.TASK_TYPE_OTHERS))
      {
        daysPercentDistribution = (DaysPercentDistribution) member.getWorkLogDistribution().getOthers().get(taskType);
      }
      else
      {
        daysPercentDistribution = (DaysPercentDistribution) member.getWorkLogDistribution().getValues().get(taskType);
      }
      totalDays += daysPercentDistribution.getTotalDaysSpent();
    }
    totalDays = Double.parseDouble(DECIMAL_FORMAT.format(totalDays));
    return totalDays;
  }

  /**
   * returns total work logged days for an individual email model
   * @param workLog email model to check
   * @return sum of all work logged days
   */
  public double getTotalWorkLoggedDays(WorkLogEmailModel workLog)
  {
    Map<String, Double> workLogMap = new HashMap<>();
    workLog.getMainResponses().stream().flatMap(
            sub -> sub.getSubWorkLogResponses().stream()
    ).forEach(response -> {
      String entity = response.getEntity();
      if (!workLogMap.containsKey(entity) || !response.isPartOfMultipleTeam())
      {
        workLogMap.merge(entity, response.getWorkLogInDays(), Double::sum);
      }
    });
    return workLogMap.values().stream().mapToDouble(Double::doubleValue).sum();
  }
}
