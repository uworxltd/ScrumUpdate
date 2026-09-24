/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.handler;

import jakarta.annotation.PostConstruct;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;
import uk.co.uworx.khoji.agile.BootApplicationContextProviderAgileConfig;
import uk.co.uworx.khoji.agile.config.JiraConfig;
import uk.co.uworx.khoji.agile.config.KhojiUsersConfig;
import uk.co.uworx.khoji.agile.config.PaymentSubscriptionConfig;
import uk.co.uworx.khoji.agile.config.WorklogConfig;

import java.util.HashMap;
import java.util.Map;

@Component
@Log4j2
public class ConfigHandler
{
  @Autowired
  private ApplicationContext applicationContext;
  private WorklogConfig worklogConfig;
  private JiraConfig jiraConfig;
  private KhojiUsersConfig khojiUsersConfig;
  private PaymentSubscriptionConfig paymentSubscriptionConfig;
  @Value("${version:khoji-cloud}")
  public String version;
  @Value("${includeInActiveTeamsInResponse:true}")
  public boolean includeInActiveTeamsInResponse;
  @Value("${khoji.liquid.snippets.directory:classpath:liquid/snippets/}")
  public String defaultIncludesDirectory;
  @Value("${khoji.liquid.templates:classpath:liquid/}")
  public String templatesDirectory;
  @Value("${khoji.tenantId:cloud}")
  public String TENANT_ID;
  @Value("${jms.email.queue:direct:khojiEmailQueue}")
  public String jmsEmailQueue;
  @Value("#{${feature.flag:{}}}")
  public Map<String, Boolean> featureFlagMap = new HashMap<String, Boolean>();
  @Value("${khoji.dataSource:Jira}")
  public String KHOJI_DATA_SOURCE;
  @Value("${khoji.signup.support.email:hello@scrumupdate.com}")
  public String supportEmail;
  @Value("${unassignedWorklogLegendsCount:5}")
  public Integer unassignedWorklogLegendsCount;
  @Value("${khoji-healthcheck.json}")
  public String khojiHealthcheckConfig;
  @Value("${syncUsersWithSource:true}")
  public boolean syncUsersWithSource;
  @Value("${syncUsersWithSourceCronExpression:0 0 0 * * ?}")
  public String syncUsersWithSourceCronExpression;

  public ConfigHandler()
  {
  }

  public Map<String, Object> getAllConfig()
  {
    Map<String, Object> properties = new HashMap<>();
    properties.put("workLogDefaultDays", worklogConfig.defaultWorkLogDays);
    properties.put("version", version);
    properties.put("defaultKhojiRole", khojiUsersConfig.defaultKhojiRole);
    properties.put("paymentSite", paymentSubscriptionConfig.getPaymentSite());
    properties.put("lastNumberOfDaysForRecentIssueTypes", worklogConfig.recentUsagePeriodDays);

    return properties;
  }

  public Map<String, String> getBillingConfigs() {
    return Map.of("paymentSite", paymentSubscriptionConfig.getPaymentSite());
  }


  public Map<String, Object> fetchKhojiComponentsAndLimitations(Map<String, Object> properties)
  {
    log.debug("KBP removed; components and limitations no longer fetched from billing processor");
    return properties;
  }

  @PostConstruct
  public void init()
  {
    BootApplicationContextProviderAgileConfig.setContext(applicationContext);
    if (applicationContext != null)
    {
      this.jiraConfig = BootApplicationContextProviderAgileConfig.getContext().getBean("jiraConfig", JiraConfig.class);
      this.worklogConfig = BootApplicationContextProviderAgileConfig.getContext().getBean("worklogConfig", WorklogConfig.class);
      this.khojiUsersConfig = BootApplicationContextProviderAgileConfig.getContext().getBean("khojiUsersConfig", KhojiUsersConfig.class);
      this.paymentSubscriptionConfig = BootApplicationContextProviderAgileConfig.getContext().getBean("paymentSubscriptionConfig", PaymentSubscriptionConfig.class);
    }
  }

  public String fetchPaymentSourceUrl()
  {
    log.debug("KBP removed; payment source url is no longer available");
    return null;
  }
}
