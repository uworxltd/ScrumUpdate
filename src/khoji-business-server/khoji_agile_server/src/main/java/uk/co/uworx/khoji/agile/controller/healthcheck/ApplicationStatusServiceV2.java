/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.controller.healthcheck;

import com.fasterxml.jackson.core.type.TypeReference;
import lombok.extern.log4j.Log4j2;
import org.apache.commons.collections4.CollectionUtils;
import org.json.JSONException;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.ObjectUtils;
import org.springframework.web.client.RestTemplate;
import uk.co.uworx.khoji.agile.BootApplicationContextProviderAgileConfig;
import uk.co.uworx.khoji.agile.handler.ConfigHandler;
import uk.co.uworx.khoji.agile.internal.model.HealthCheckConfig;
import uk.co.uworx.khoji.agile.internal.model.HealthCheckService;
import uk.co.uworx.khoji.agile.internal.model.HealthCheckServiceParentObject;
import uk.co.uworx.khoji.agile.internal.service.RoleService;
import uk.co.uworx.khoji.agile.service.MappingService;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@Log4j2
public class ApplicationStatusServiceV2
{
  private static final String JIRA = "jira";
  private static final String V_11 = "v11";
  private static final String POSTGRESQL = "postgresql";
  private static final String JIRA_PLUGIN = "jiraPlugin";

  @Autowired
  private RoleService roleService;
  private Map<String, String> servicesConfigMap;
  @Autowired
  private MappingService mappingService;

  public ResponseEntity<HealthCheckServiceParentObject> checkHealthForAllServices(boolean showOnlyFailingHierarchy)
  {
    HealthCheckService postgresQL = testServiceAvailability(POSTGRESQL, "");

    if (!postgresQL.getHttpStatusCode().is2xxSuccessful())
    {
      return new ResponseEntity<>(
              new HealthCheckServiceParentObject(List.of(postgresQL)),
              HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    buildUrlsForServices();

    List<HealthCheckService> results = new ArrayList<>(
            servicesConfigMap
                    .keySet()
                    .parallelStream()
                    .map((serviceKey) -> testServiceAvailability(serviceKey, servicesConfigMap.get(serviceKey)))
                    .filter(service -> !ObjectUtils.isEmpty(service))
                    .toList()
    );

    results.add(postgresQL);

    List<HealthCheckService> failingServices = results
            .stream()
            .filter(result -> !HttpStatus.valueOf(result.getHttpStatusCode().value()).is2xxSuccessful())
            .toList();

    List<HttpStatus> httpStatuses = failingServices
            .stream()
            .map(HealthCheckService::getHttpStatusCode)
            .toList();

    if (showOnlyFailingHierarchy)
    {
      results = failingServices;
    }

    if (CollectionUtils.isNotEmpty(httpStatuses))
    {
      return new ResponseEntity<>(new HealthCheckServiceParentObject(results), HttpStatus.SERVICE_UNAVAILABLE);
    }
    return new ResponseEntity<>(new HealthCheckServiceParentObject(results), HttpStatus.OK);
  }

  private void buildUrlsForServices()
  {
    servicesConfigMap = new HashMap<>();
    HealthCheckConfig healthCheckConfig = getHealthCheckConfig();

    boolean v11Excluded = healthCheckConfig
            .getHealthCheckExclusions()
            .contains(V_11);

    boolean jiraPluginExcluded = healthCheckConfig
            .getHealthCheckExclusions()
            .contains(JIRA_PLUGIN);

    if (!jiraPluginExcluded) {
      servicesConfigMap.put(JIRA_PLUGIN, "https://" + healthCheckConfig.getPluginBaseUrl() + "/health");
    }

    if (!v11Excluded)
    {
      var url = "https://" + healthCheckConfig.getVmSubDomain() + "/login";
      log.debug("Angular Health Check URL: {}", url);
      servicesConfigMap.put(V_11, url);
    }

    log.debug("These services are in exclusion and wont be checked in heart beat: {}", healthCheckConfig.getHealthCheckExclusions());
  }

  private HealthCheckService testServiceAvailability(String serviceKey, String serviceUrl)
  {
    return switch (serviceKey)
    {
      case V_11, JIRA_PLUGIN -> callFrontEndServiceAPI(serviceKey, serviceUrl);
      case JIRA -> callServiceAPIAndMapToHealthCheckModel(
              serviceKey,
              serviceUrl,
              HttpMethod.GET,
              new HttpEntity<String>(null, null)
      );

      case POSTGRESQL -> checkPOSTGRESQLService();
      default -> new HealthCheckService("unknown");
    };
  }

  private HealthCheckService checkPOSTGRESQLService()
  {
    HealthCheckService healthCheckService = new HealthCheckService(POSTGRESQL);
    try
    {
      roleService.getRoles();
    }
    catch (Exception exception)
    {
      log.error("Call to service with url {} failed", POSTGRESQL);
      healthCheckService.setHttpStatusCode(HttpStatus.SERVICE_UNAVAILABLE);
      healthCheckService.setStatus(exception.getMessage());
      return healthCheckService;
    }
    return healthCheckService;
  }

  private HealthCheckService callServiceAPIAndMapToHealthCheckModel(
          String serviceKey,
          String serviceUrl,
          HttpMethod httpMethod,
          HttpEntity httpEntity
  )
  {
    ResponseEntity<String> response;
    HealthCheckService healthCheckService = new HealthCheckService(serviceKey);
    RestTemplate restTemplate = new RestTemplate();
    try
    {
      response = restTemplate.exchange(serviceUrl, httpMethod, httpEntity, String.class);
    }
    catch (Exception exception)
    {
      log.error("Call to service {} with url {} failed", serviceKey, serviceUrl);
      healthCheckService.setHttpStatusCode(HttpStatus.SERVICE_UNAVAILABLE);
      healthCheckService.setStatus(exception.getMessage());
      return healthCheckService;
    }
    healthCheckService.setHttpStatusCode(HttpStatus.valueOf(response.getStatusCode().value()));
    return healthCheckService;
  }

  private HealthCheckService callFrontEndServiceAPI(String serviceKey, String serviceUrl)
  {
    HttpURLConnection connection = null;
    HealthCheckService healthCheckService = new HealthCheckService(serviceKey);

    try
    {
      URL url = new URL(serviceUrl);
      connection = (HttpURLConnection) url.openConnection();
      connection.setRequestMethod("GET");
      if (connection.getResponseCode() == HttpURLConnection.HTTP_OK)
      {
        if (serviceKey.equals(JIRA_PLUGIN)) {
          processJiraPluginResponse(connection, healthCheckService);
        }
        return healthCheckService;
      }

      log.error("Call to service {} with url {} failed with response code {}", serviceKey, serviceUrl, connection.getResponseCode());
      healthCheckService.setHttpStatusCode(HttpStatus.SERVICE_UNAVAILABLE);
      healthCheckService.setStatus("Call to service failed");
      return healthCheckService;
    }
    catch (Exception exception)
    {
      log.error("Call to service {} with url {} failed", serviceKey, serviceUrl, exception.getCause());
      healthCheckService.setHttpStatusCode(HttpStatus.SERVICE_UNAVAILABLE);
      healthCheckService.setStatus(exception.getMessage());
      return healthCheckService;
    }
    finally
    {
      if (connection != null)
      {
        connection.disconnect();
      }
    }
  }

  private void processJiraPluginResponse(
          HttpURLConnection connection,
          HealthCheckService healthCheckService
  ) throws IOException, JSONException
  {
    // Read the response
    BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
    StringBuilder response = new StringBuilder();
    String line;
    while ((line = reader.readLine()) != null) {
      response.append(line);
    }
    reader.close();

    // Process the response JSON
    JSONObject jsonResponse = new JSONObject(response.toString());
    double uptime = jsonResponse.getDouble("uptime");

    // Save the response data to healthCheckService or process it as needed
    healthCheckService.setUptime(uptime);
  }


  public HealthCheckConfig getHealthCheckConfig()
  {
    ConfigHandler configHandler = BootApplicationContextProviderAgileConfig
            .getContext()
            .getBean("configHandler", ConfigHandler.class);

    return mappingService.readJsonFromProp(configHandler.khojiHealthcheckConfig, new TypeReference<>() {});
  }
}
