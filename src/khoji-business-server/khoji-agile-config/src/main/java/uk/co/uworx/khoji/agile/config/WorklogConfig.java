/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import uk.co.uworx.khoji.agile.constant.Constants;

import java.util.HashMap;
import java.util.Map;

@Component
public class WorklogConfig {
    @Value("${worklog.default.days:5.0}")
    public double defaultWorkLogDays;

    @Value("${worklog.email.period.workLogSecondDaysSubtract:3}")
    public int workLogSecondDaysSubtract;

    @Value("${worklog.summaries.generation.enabled:true}")
    public boolean workLogSummariesGenerationEnabled;

    @Value("${worklog.email.main.velocity.teams.template:workLogEmailTemplateMainForTeams.vm}")
    public String workLogEmailTemplateMainForTeams;

    @Value("${worklog.email.collectiveOthers.team.velocity.template:workLogEmailTemplateOthersTeamCollective.vm}")
    public String workLogCollectiveOthersTemsWiseVelocityEmailTemplate;

    @Value("${worklog.email.job.cronExpression:0+45+05+?+*+MON-FRI}")
    public String workLogCronExpression;

    @Value("${worklog.summaries.generation.job.cronExpression:0+0+13+?+*+SUN+*}")
    public String workLogSummariesGenerationCronExpression;

    @Value("${worklog.email.createFile:true}")
    public boolean workLogEmailCreateFile;

    @Value("${worklog.email.summaryView.enabled:false}")
    public boolean workLogEmailSummaryViewEnabled;

    @Value("#{${worklog.percentage.threshold:{\"Normal\":\"99.99\",\"Medium\":\"75\"}}}")
    public Map<String, Double> worklogThresholds = new HashMap<>();

    @Value("#{${rag.color.codes:{\"GREEN\":\"#428A36\",\"AMBER\":\"#E7BA1A\",\"RED\": \"#B92A1C\"}}}")
    public Map<String, String> ragColorCodes = new HashMap<>();

    @Value("#{${worklog.rag.slider.config:{\"isRedStartingColor\": true}}}")
    public Map<String, Boolean> worklogSliderConfig;

    @Value("${worklog.email.showDays:false}")
    public boolean workLogEmailShowDays;

    @Value("${allow.global.team.access:false}")
    public boolean globalTeamAccessEnabled;


    @Value("${worklog.tenant:Jira}")
    public String workLogTenant;

    @Value("${issueTypes.recentUsage.periodDays:7}")
    public Integer recentUsagePeriodDays;

    public Map<String, String> getWorklogThresholdsColors()
    {
      Map<String, String> worklogThresholdColors = new HashMap<>();

      worklogThresholdColors.put(Constants.MEDIUM_THRESHOLD, ragColorCodes.get(Constants.AMBER));
      if (worklogSliderConfig.get(Constants.IS_RED_STARTING_COLOR))
      {
        worklogThresholdColors.put(Constants.NORMAL_THRESHOLD, ragColorCodes.get(Constants.GREEN));
        worklogThresholdColors.put(Constants.LOW_THRESHOLD, ragColorCodes.get(Constants.RED));
      }
      else
      {
        worklogThresholdColors.put(Constants.NORMAL_THRESHOLD, ragColorCodes.get(Constants.RED));
        worklogThresholdColors.put(Constants.LOW_THRESHOLD, ragColorCodes.get(Constants.GREEN));
      }

      return worklogThresholdColors;
    }

    /**
     * @return the colorCode
     */
    public String getColorCode(double percentage) {
        if (percentage > worklogThresholds.get(Constants.NORMAL_THRESHOLD)) {
            return getWorklogThresholdsColors().get(Constants.NORMAL_THRESHOLD);
        } else if (percentage > worklogThresholds.get(Constants.MEDIUM_THRESHOLD)) {
            return getWorklogThresholdsColors().get(Constants.MEDIUM_THRESHOLD);
        }
        return getWorklogThresholdsColors().get(Constants.LOW_THRESHOLD);
    }
}
