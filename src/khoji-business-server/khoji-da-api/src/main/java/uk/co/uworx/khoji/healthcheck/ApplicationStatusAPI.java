/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.healthcheck;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

public interface ApplicationStatusAPI
{
  @GetMapping(value = "/ping")
  ResponseEntity<String> checkHealth();

  @GetMapping(value = "/ping/deep/v2")
  ResponseEntity<?> checkHealthDeepV2(@RequestParam(required = false) boolean showOnlyFailingHierarchy);
}
