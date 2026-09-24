/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.service;

import lombok.extern.log4j.Log4j2;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.handler.ConfigHandler;
import uk.co.uworx.khoji.agile.transform.ITransform;
import uk.co.uworx.khoji.data.api.IDataClient;

import java.util.HashMap;

/**
 * Class to handle loading of beans based on active tenant
 */
@Service
@Log4j2
public class TenantService
{
  private static final String CLOUD = "cloud";
  private ConfigHandler configHandler;
  public static final String DANISH_DATE_TRANSFORM = "DanishDateTransform";
  public static final String DISPLAY_NAME_TRANSFORM = "DisplayNameTransform";

  private final HashMap beansMap = new HashMap();

  public TenantService()
  {
  }

  //TODO: Remove this method when we have a proper databae table, for now (Cloud = 1) (Server =0)
  public Integer getDataSourceTenantId()
  {
    configHandler = BootApplicationContextProviderTenantService.getContext().getBean("configHandler", ConfigHandler.class);
    return StringUtils.equalsIgnoreCase(configHandler.TENANT_ID, CLOUD) ? 1 : 0;
  }

  public IDataClient getJiraDataClient()
  {
    return (IDataClient) getBean("JiraCloudClient");
  }

  public ITransform getTransform(String beanName)
  {
    String bean = null;
    switch (beanName)
    {
      case "DanishDateTransform":
        bean = "DanishDateStringTransform";
        break;
      case "DisplayNameTransform":
        bean = "DisplayNameTransformImpl";
        break;
      case "JiraResponseTransformer":
        bean = "JoltHelperServerImpl";
        break;
      case "JiraClient":
        bean = "JiraCloudClient";
        break;
      case "UpdatedDateTimeTransform":
        bean = "UpdatedDateTimeTransformImpl";
        break;
      default:
    }
    return (ITransform) getBean(bean);
  }

  public IDataClient getDataClient()
  {
    return (IDataClient) getBean("JiraCloudClient");
  }

  private Object getBean(String name)
  {
    configHandler = BootApplicationContextProviderTenantService.getContext().getBean("configHandler", ConfigHandler.class);
    if (beansMap.containsKey(name))
    {
      return beansMap.get(name);
    }
    else
    {
      try
      {
        log.info("Loading bean of {} for tenant {}", name, configHandler.TENANT_ID);
        Object bean = BootApplicationContextProviderTenantService.getContext().getBean(name);
        beansMap.put(name, bean);
        return bean;
      }
      catch (Exception exception)
      {
        log.error("Error loading tenant bean ", exception);
        return null;
      }
    }
  }
}
