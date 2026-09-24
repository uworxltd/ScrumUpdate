/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.controller.stats;

import com.fasterxml.jackson.core.JsonProcessingException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.config.JiraConfig;
import uk.co.uworx.khoji.agile.constants.InstanceConfigs;
import uk.co.uworx.khoji.agile.context.BootApplicationContextProvider;
import uk.co.uworx.khoji.agile.handler.ConfigHandler;
import uk.co.uworx.khoji.agile.handler.WorkLogHandler;
import uk.co.uworx.khoji.agile.helper.WorkLogHourConfigService;
import uk.co.uworx.khoji.agile.internal.datamodel.KhojiIssueType;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.internal.helper.SecurityAccessLevel;
import uk.co.uworx.khoji.agile.internal.model.EvalConfig;
import uk.co.uworx.khoji.agile.internal.model.StatusCategoryConfig;
import uk.co.uworx.khoji.agile.persistence.model.Config;
import uk.co.uworx.khoji.agile.persistence.service.ConfigDataService;
import uk.co.uworx.khoji.agile.request.EvaluatorConfig;
import uk.co.uworx.khoji.agile.service.MappingService;
import uk.co.uworx.khoji.agile.service.TenantService;
import uk.co.uworx.khoji.security.annotations.HasAccessToInstanceWithPrivilege;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin
@RestController
public class ConfigController
{
  @Autowired
  private ConfigHandler configHandler;
  @Autowired
  private JiraConfig jiraConfig;
  @Autowired
  private WorkLogHandler workLogHandler;
  @Autowired
  private TenantService tenantService;
  @Autowired
  private MappingService mappingService;
  @Autowired
  private WorkLogHourConfigService workLogHourConfigService;
  @Autowired
  private ConfigDataService configDataService;

  @Value("${issueTypes.recentlyUsed:true}")
  public boolean showRecentlyUsedIssueTypes;

  @GetMapping(value = "/getKhojiConfig", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<Map<String, Object>> getKhojiConfigs()
  {
    return new ResponseEntity<>(
            configHandler.getAllConfig(),
            HttpStatus.OK
    );
  }

  @GetMapping(value = "/getConfigs", produces = MediaType.APPLICATION_JSON_VALUE)
  @HasAccessToInstanceWithPrivilege
  public ResponseEntity<Map<String, Object>> getConfigs(@RequestParam List<String> propKey)
  {
    Map<String, Object> propValues = new HashMap<>();
    ApplicationContext applicationContext = BootApplicationContextProvider.getContext();
    propKey.forEach(key -> {
      String value = applicationContext.getEnvironment().getProperty(key);
      if (value != null)
      {
        propValues.put(key, value);
      }
      if(InstanceConfigs.getAllConfigKeys().contains(key)) {
        try
        {
          propValues.put(key, getConfigFromDB(key));
        }
        catch (JsonProcessingException e)
        {
          throw new RuntimeException(e);
        }
      }
    });
    return new ResponseEntity<>(propValues, HttpStatus.OK);
  }

  private String getConfigFromDB(String propKey) throws JsonProcessingException
  {
    return configDataService.getConfigByInstanceId(propKey, null);
  }

  @GetMapping(value = "/getSourceIssueTypes", produces = MediaType.APPLICATION_JSON_VALUE)
  @HasAccessToInstanceWithPrivilege
  public ResponseEntity<List<KhojiIssueType>> getSourceIssueTypes(Principal principal) {
    List<KhojiIssueType> sourceIssueTypes = tenantService.getJiraDataClient().fetchIssueTypes(principal);
    if(showRecentlyUsedIssueTypes) {
      sourceIssueTypes = workLogHandler.updateIssueTypesWithRecentlyUsedInfo(sourceIssueTypes, principal);
    }
    return ResponseEntity.ok(sourceIssueTypes);
  }

  @HasAccessToInstanceWithPrivilege(
          privileges = {
                  SecurityAccessLevel.ADMIN
          }
  )
  @PostMapping(value = "/upsertConfigsInBatch", produces = MediaType.APPLICATION_JSON_VALUE)
//  TODO: for now using the existing function but update the logic so that we can remove redundant calls to db and eval
//  TODO: upsert in batch endpoint exists in eval
//  TODO: saveAll exists in JPA repositories
  public ResponseEntity<Map<String,String>> upsertConfigsInBatch(@RequestBody List<EvaluatorConfig> evaluatorConfigs)
  {
    evaluatorConfigs.forEach(cfg -> {
      try
      {
        upsertConfig(cfg);
      }
      catch (Exception e)
      {
        throw new ServiceException(ServiceError.G0000);
      }
    });

    return new ResponseEntity<>(
            Map.of("status", "PROCESSED", "configId", "KBS"),
            HttpStatus.OK
    );
  }

  /***
   * This endpoint act as a intermediate between V11 and evaluator service
   * @param evaluatorConfig
   * @return
   */
  @HasAccessToInstanceWithPrivilege(
          privileges = {
                  SecurityAccessLevel.ADMIN
          }
  )
  @PostMapping(value = "/upsertConfig", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<Object> upsertConfig(@RequestBody EvaluatorConfig evaluatorConfig) throws JsonProcessingException
  {
    if(InstanceConfigs.getAllConfigKeys().contains(evaluatorConfig.getPropKey()))
    {
      updateTenantConfigInDatabaseAgainstPropKey(evaluatorConfig.getPropKey(), evaluatorConfig.getPropValue());
    }
    return new ResponseEntity<>(Map.of("status", "PROCESSED", "configId", "KBS"), HttpStatus.OK);
  }

  private void updateTenantConfigInDatabaseAgainstPropKey(String propKey, String propValue)
  {
    Config config = new Config();
    config.setPropKey(propKey);
    config.setPropValue(propValue);
    configDataService.saveOrUpdateConfig(config);
  }

  @GetMapping(value = "/statusCategoryConfigs", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<Object> listStatusConfigs()
  {
    return new ResponseEntity<Object>(new StatusCategoryConfig(jiraConfig.inferStatus), HttpStatus.OK);
  }

  @GetMapping(value = "/systemConfigs")
  public ResponseEntity<Map<String, String>> getSystemConfigs() {
    Map<String, String> configMap = new HashMap<>();
    configMap.put("payment.source.url", configHandler.fetchPaymentSourceUrl());
    return new ResponseEntity<>(configMap, HttpStatus.OK);
  }

  @GetMapping(value = "/billingConfigs")
  public ResponseEntity<Map<String, String>> getBillingConfigs() {
    return new ResponseEntity<>(configHandler.getBillingConfigs(), HttpStatus.OK);
  }
}
