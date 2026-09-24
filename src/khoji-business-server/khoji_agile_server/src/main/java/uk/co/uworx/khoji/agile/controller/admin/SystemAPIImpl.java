/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.controller.admin;

import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.controller.admin.api.SystemAPI;
import uk.co.uworx.khoji.agile.service.business.PropertiesService;
import uk.co.uworx.khoji.security.annotations.AuthorizationApplicationLevelAPIs;

import java.util.HashMap;
import java.util.Map;

import static uk.co.uworx.khoji.agile.service.business.PropertiesService.SOURCE_USER_CRON_EXPRESSION;
import static uk.co.uworx.khoji.agile.service.business.PropertiesService.WORKLOG_EMAIL_CRON_EXPRESSION;
import static uk.co.uworx.khoji.agile.service.business.PropertiesService.WORKLOG_SUMMARIES_GENERATION_CRON_EXPRESSION;

@RestController
@Tag(name = "Khoji For Agile", description = "Operations to handle System configs in Khoji For Agile")
@Validated
@Profile("dev")
@AuthorizationApplicationLevelAPIs
public class SystemAPIImpl implements SystemAPI
{
  @Autowired
  private Environment environment;
  @Autowired
  private PropertiesService propertiesService;

  @Override
  public ResponseEntity<Map<String, String>> getAllSystemProperties()
  {
    Map<String, String> propertiesMap = new HashMap<>();

    String[] keys = {
            "base.url",
            "EMAIL_HOST",
            "jira.client.id",
            "recaptcha.secret",
            "jira.client.secret",
            "spring.sql.init.mode",
            "spring.datasource.url",
            "EMAIL_USERNAME",
            "EMAIL_PASSWORD",
            "jira.client.redirect.uri",
            "integrations.ms.oauth.client.id",
            "spring.datasource.username",
            "spring.datasource.password",
            "khoji.insights.ai.base.url",
            "integrations.ms.redirect.uri",
            "integrations.ms.oauth.client.secret",
            "spring.datasource.hikari.minimumIdle",
            "spring.datasource.hikari.maxLifetime",
            "spring.datasource.hikari.maximumPoolSize",
            "worklog.summaries.generation.job.cronExpression"
    };

    for (String key : keys) {
      String value = environment.getProperty(key);
      propertiesMap.put(key, value != null ? value : "Not Defined");
    }

    return new ResponseEntity<>(propertiesMap, HttpStatus.OK);
  }

  @Override
  public ResponseEntity<String> runXMinWorkLog(String cron)
  {
    propertiesService.changeCronExpression(WORKLOG_EMAIL_CRON_EXPRESSION,cron);
    return new ResponseEntity<>("Worklog email cron updated,  please restart the server", HttpStatus.OK);
  }

  @Override
  public ResponseEntity<String> runXMinWorkLogSummaryGeneration(String cron)
  {
    propertiesService.changeCronExpression(WORKLOG_SUMMARIES_GENERATION_CRON_EXPRESSION, cron);
    return new ResponseEntity<>("Worklog email cron updated,  please restart the server", HttpStatus.OK);
  }

  @Override
  public ResponseEntity<String> runXMinUserSync(String cron)
  {
    propertiesService.changeCronExpression(SOURCE_USER_CRON_EXPRESSION,cron);
    return new ResponseEntity<>("User cron updated,  please restart the server", HttpStatus.OK);
  }

  @Override
  public ResponseEntity<String> setLogLevel(String level)
  {
    propertiesService.setLogLevel("uk.co.uworx", level);
    return new ResponseEntity<>("Log level updated, proceed without restart", HttpStatus.OK);
  }

  @Override
  public ResponseEntity<String> resetDatabase()
  {
    propertiesService.resetToDefaultProperties();
    return new ResponseEntity<>("Properties shifted to default, please restart the server", HttpStatus.OK);
  }
}
