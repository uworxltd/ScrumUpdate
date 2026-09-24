/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.helper;

import jakarta.annotation.PostConstruct;
import lombok.extern.log4j.Log4j2;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.persistence.context.InstanceIdContext;
import uk.co.uworx.khoji.agile.persistence.service.ConfigDataService;

import java.util.concurrent.ConcurrentHashMap;

import static uk.co.uworx.khoji.agile.constants.InstanceConfigs.WORKLOG_DAY_HOUR;

@Service
@Log4j2
public class WorkLogHourConfigService
{
  /**
   * ConcurrentHashMap is designed to handle concurrent access by multiple threads safely.
   * This means multiple threads can read and write to the map simultaneously without causing
   * inconsistent data or exceptions.
   */

  @Autowired
  private ConfigDataService configDataService;

  private final ConcurrentHashMap<String, Double> workLogConfigMap = new ConcurrentHashMap<>();

  @PostConstruct
  public void loadConfigurations()
  {
    log.debug("Populating work Log hours for all tenants");
//    TenantConfigsRepository tenantConfigsRepository = BootApplicationContextProviderAgileConfig.getContext().getBean(TenantConfigsRepository.class);
//    List<TenantConfigs> tenantConfigs = tenantConfigsRepository.findAll();
//
//    tenantConfigs = tenantConfigs.stream().filter(
//            config -> config.getPropKey().equalsIgnoreCase(WORKLOG_DAY_HOUR)
//    ).toList();
//
//    tenantConfigs.forEach(config ->
//            workLogConfigMap.put(config.getTenantId().getTenantId(),
//                    Double.parseDouble(config.getPropValue())));
//    log.debug("Added for {} tenants", tenantConfigs.size());
  }

  public Double getConfigValueByTenantId()
  {
    return getWorklogHoursPerDay();
  }

  public void updateConfigValue(String key, Double value)
  {
    workLogConfigMap.put(key, value);
  }

  public void removeFromMap(String tenantId)
  {
    workLogConfigMap.remove(tenantId);
  }

  public double getWorklogHoursPerDay(){
    String worklogHours = configDataService.getConfigByInstanceId(WORKLOG_DAY_HOUR, InstanceIdContext.getInstanceId());
    if(StringUtils.isEmpty(worklogHours)) {
      log.error("%s is null for instance %s", WORKLOG_DAY_HOUR, InstanceIdContext.getInstanceId());
      throw new ServiceException(ServiceError.G0000);
    }

    return Double.parseDouble(worklogHours);
  }

}
