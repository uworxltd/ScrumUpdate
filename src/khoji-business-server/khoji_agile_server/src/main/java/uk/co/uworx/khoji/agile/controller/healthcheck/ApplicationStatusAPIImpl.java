/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.controller.healthcheck;

import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.healthcheck.ApplicationStatusAPI;
import uk.co.uworx.khoji.security.annotations.AuthorizationApplicationLevelAPIs;


@RestController
public class ApplicationStatusAPIImpl implements ApplicationStatusAPI
{
  @Autowired
  private ApplicationStatusServiceV2 applicationStatusServiceV2;

  /**
   * @return Application Status of KBS
   */
  @AuthorizationApplicationLevelAPIs
  @Override
  public ResponseEntity<String> checkHealth()
  {
    return new ResponseEntity<>("success", HttpStatus.OK);
  }
  
  @AuthorizationApplicationLevelAPIs
  @Override
  public ResponseEntity<?> checkHealthDeepV2(boolean showOnlyFailingHierarchy)
  {
    return applicationStatusServiceV2.checkHealthForAllServices(showOnlyFailingHierarchy);
  }
}
