/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.controller.stats;

import lombok.extern.log4j.Log4j2;
import org.apache.camel.builder.RouteBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import uk.co.uworx.khoji.agile.config.EmailConfig;
import uk.co.uworx.khoji.agile.config.JiraConfig;
import uk.co.uworx.khoji.agile.config.SwaggerConfig;
import uk.co.uworx.khoji.agile.config.WorklogConfig;
import uk.co.uworx.khoji.agile.controller.healthcheck.ApplicationStatusServiceV2;
import uk.co.uworx.khoji.agile.handler.ConfigHandler;
import uk.co.uworx.khoji.agile.internal.model.HealthCheckConfig;
import uk.co.uworx.khoji.agile.service.business.PropertiesService;

import static uk.co.uworx.khoji.agile.service.business.PropertiesService.SOURCE_USER_CRON_EXPRESSION;
import static uk.co.uworx.khoji.agile.service.business.PropertiesService.WORKLOG_EMAIL_CRON_EXPRESSION;
import static uk.co.uworx.khoji.agile.service.business.PropertiesService.WORKLOG_SUMMARIES_GENERATION_CRON_EXPRESSION;

@Component
@Log4j2
public class CamelRouter extends RouteBuilder implements ApplicationRunner
{
  public static final String SYNC_USERS_ROUTE_ID = "syncUsersWithSource";
  @Autowired
  private WorklogConfig worklogConfig;
  @Autowired
  private JiraConfig jiraConfig;
  @Autowired
  private SwaggerConfig swaggerConfig;
  @Autowired
  private EmailConfig emailConfig;
  @Autowired
  private ConfigHandler configHandler;
  @Autowired
  private ApplicationStatusServiceV2 applicationStatusServiceV2;
  @Autowired
  private PropertiesService propertiesService;

  @Override
  public void configure() throws Exception
  {
    log.info("Khoji Server version: {}", swaggerConfig.version);
    HealthCheckConfig healthCheckConfig = applicationStatusServiceV2.getHealthCheckConfig();

    updateCronJobForUserSyncing(
            propertiesService.getValueAgainstKeyOrDefault(
                    SOURCE_USER_CRON_EXPRESSION,
                    configHandler.syncUsersWithSourceCronExpression
            )
    );

    updateCronJobForWorkLogEmail(
            propertiesService.getValueAgainstKeyOrDefault(
                    WORKLOG_EMAIL_CRON_EXPRESSION,
                    worklogConfig.workLogCronExpression
            )
    );

    updateCronJobForWorkLogSummaries(
            propertiesService.getValueAgainstKeyOrDefault(
                    WORKLOG_SUMMARIES_GENERATION_CRON_EXPRESSION,
                    worklogConfig.workLogSummariesGenerationCronExpression
            )
    );

    if (jiraConfig.dataReportingApiSyncEnabled)
    {
      from("quartz://dataReportingSyncTimer?cron=" + jiraConfig.dataReportingApiSyncCron)
              .setBody(simple("Timer fired at ${header.firedTime}"))
              .process("UserDataReportingSync");
    }

    if (emailConfig.isConfigured())
    {
      from(configHandler.jmsEmailQueue).process("EmailProcessor");
    }
    else
    {
      log.warn("Email not configured (EMAIL_FROM/EMAIL_HOST/EMAIL_USERNAME/EMAIL_PASSWORD missing) — email queue consumer and worklog email disabled");
    }

    if (healthCheckConfig != null && healthCheckConfig.isPushEnabled())
    {
      from("timer://healthCheckTimer?period=" + healthCheckConfig.getPushFrequencyInSeconds() + "s").process("PushHealthCheck");
    }
  }

  private void updateCronJobForWorkLogEmail(String cron)
  {
    if (emailConfig.isConfigured())
    {
      from("quartz://emailTimer?cron=" + cron)
              .setBody(simple("Timer fired at ${header.firedTime}"))
              .process("WorkLogMessageProcessor")
              .choice()
              .when(body().isNotNull())
              .process("WorkLogHTMLConverter")
              .otherwise()
              .log("No person Found to send email, skipping");

      from(EmailController.DIRECT_SWAGGER_CAMEL_ROUTE)
              .process("WorkLogMessageProcessor")
              .choice()
              .when(body().isNotNull())
              .process("WorkLogHTMLConverter")
              .otherwise()
              .log("No person Found to send email, skipping");
    }
  }

  public void updateCronJobForUserSyncing(String cron)
  {
    if (configHandler.syncUsersWithSource)
    {
      from("quartz://syncUsersWithSource?cron=" + cron)
              .setBody((simple("Timer fired at ${header.firedTime}")))
              .process("SourceUsersSyncingJob");
    }
  }

  private void updateCronJobForWorkLogSummaries(String cron)
  {
    if (worklogConfig.workLogSummariesGenerationEnabled)
    {
      from("quartz://workLogSummariesGeneration?cron=" + cron)
              .setBody(simple("Timer fired at ${header.firedTime}"))
              .process("WorkLogSummariesGenerationJob");
    }
  }

  @Override
  public void run(ApplicationArguments args) throws Exception {}
}
