/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.service;

import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.persistence.context.InstanceIdContext;
import uk.co.uworx.khoji.agile.persistence.context.TenantIdContext;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;
import uk.co.uworx.khoji.agile.persistence.model.Integrations;
import uk.co.uworx.khoji.agile.request.GenerateAIWorkLogRequest;
import uk.co.uworx.khoji.agile.service.business.integration.IntegrationsService;

import java.security.Principal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
@Log4j2
public class WorkLogAsyncService
{
  @Autowired
  private TenantService tenantService;
  @Autowired
  private IntegrationsService integrationsService;

  private static final ThreadLocal<String> instanceId = new ThreadLocal<>();


  @Async
  public CompletableFuture<Map<String, Object>> getTeamsCalendarDataAsync(
          Optional<Integrations> integrationOptional,
          InstanceUser instanceUser,
          Long instanceId,
          String tenantId,
          String dateFrom,
          String dateTo
  )
  {
    InstanceIdContext.setInstanceId(instanceId.toString());
    TenantIdContext.setTenantId(tenantId);
    try
    {
      long t0 = System.currentTimeMillis();
      log.debug(
              "[SCRUM-TIMER] Running teams data fetch thread: {}, integration present: {}",
              Thread.currentThread().getName(),
              integrationOptional.isPresent()
      );

      if (integrationOptional.isPresent())
      {
        Map<String, Object> calendarIntegrationData = integrationsService.fetchMSCalendarIntegrationData(
                dateFrom,
                dateTo,
                integrationOptional.get(),
                instanceUser
        );
        long t1 = System.currentTimeMillis();
        log.debug("[SCRUM-TIMER] getTeamsCalendarDataAsync completed thread={} took={}ms", Thread.currentThread().getName(), t1 - t0);
        return CompletableFuture.completedFuture(calendarIntegrationData);
      }
      log.debug("[SCRUM-TIMER] Skipping teams data fetch thread: {}", Thread.currentThread().getName());
      return CompletableFuture.completedFuture(new HashMap<>());
    }
    finally
    {
      InstanceIdContext.clear();
      TenantIdContext.clear();
    }
  }

  @Async
  public CompletableFuture<Object> getDefaultTicketsAsync(
          GenerateAIWorkLogRequest generateWorkLogRequest,
          Principal principal,
          Optional<Integrations> integrationOptional,
          InstanceUser instanceUser,
          Long instanceId,
          String tenantId
  )
  {
    InstanceIdContext.setInstanceId(instanceId.toString());
    TenantIdContext.setTenantId(tenantId);
    try
    {
      long t0 = System.currentTimeMillis();
      if (integrationOptional.isPresent())
      {
        log.debug("[SCRUM-TIMER] getDefaultTicketsAsync start account={} thread={}", generateWorkLogRequest.getAccountId(), Thread.currentThread().getName());
        Object defaultTicketsResponseBody = tenantService
                .getDataClient()
                .fetchUserActivity(
                        generateWorkLogRequest.getAccountId(),
                        generateWorkLogRequest.getRequestedDate(),
                        instanceUser.getFullName(),
                        principal,
                        null,
                        true,
                        false
                );
        long t1 = System.currentTimeMillis();
        log.debug("[SCRUM-TIMER] getDefaultTicketsAsync completed account={} thread={} took={}ms", generateWorkLogRequest.getAccountId(), Thread.currentThread().getName(), t1 - t0);
        return CompletableFuture.completedFuture(defaultTicketsResponseBody);
      }
      log.debug("[SCRUM-TIMER] Skipping default tickets data fetch thread: {}", Thread.currentThread().getName());
      return CompletableFuture.completedFuture(new ArrayList<>());
    }
    finally
    {
      InstanceIdContext.clear();
      TenantIdContext.clear();
    }
  }

  @Async
  public CompletableFuture<Object> getUserActivityAsync(
          GenerateAIWorkLogRequest generateWorkLogRequest,
          Principal principal,
          InstanceUser instanceUser,
          AtomicBoolean isThereAnyErrorFromJira,
          Long instanceId,
          String tenantId
  )
  {
    InstanceIdContext.setInstanceId(instanceId.toString());
    TenantIdContext.setTenantId(tenantId);
    try
    {
      long t0 = System.currentTimeMillis();
      log.debug("[SCRUM-TIMER] getUserActivityAsync start account={} thread={}",
              generateWorkLogRequest.getAccountId(), Thread.currentThread().getName());
      Object activityResponseBody = tenantService
              .getDataClient()
              .fetchUserActivity(
                      generateWorkLogRequest.getAccountId(),
                      generateWorkLogRequest.getRequestedDate(),
                      instanceUser.getFullName(),
                      principal,
                      isThereAnyErrorFromJira,
                      false,
                      true
              );
      long t1 = System.currentTimeMillis();
      int issueCount = (activityResponseBody instanceof java.util.List) ? ((java.util.List<?>) activityResponseBody).size() : -1;
      log.debug("[SCRUM-TIMER] getUserActivityAsync completed account={} thread={} issueCount={} took={}ms",
              generateWorkLogRequest.getAccountId(), Thread.currentThread().getName(), issueCount, t1 - t0);
      return CompletableFuture.completedFuture(activityResponseBody);
    }
    finally
    {
      InstanceIdContext.clear();
      TenantIdContext.clear();
    }
  }
}
