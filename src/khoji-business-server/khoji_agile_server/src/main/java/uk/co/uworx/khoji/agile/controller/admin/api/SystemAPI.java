/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.controller.admin.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Map;

@CrossOrigin
@Tag(
        name = "Khoji For Agile",
        description = "Operations to handle system API in Khoji For Agile"
)
public interface SystemAPI
{
  @Operation(summary = "Get system properties values")
  @GetMapping(value = "/system/properties")
  ResponseEntity<Map<String,String>> getAllSystemProperties();

  @Operation(summary = "Run X-Min Work Log Email based on cron expression")
  @GetMapping(value = "/runXMinWorkLog")
  ResponseEntity<String> runXMinWorkLog(@RequestParam(name = "cron") String cron);

  @Operation(summary = "Run X-Min Work Log summary generation based on cron expression")
  @GetMapping(value = "/runXMinWorkLogSummaryGeneration")
  ResponseEntity<String> runXMinWorkLogSummaryGeneration(@RequestParam(name = "cron") String cron);

  @Operation(summary = "Run X-Min User Sync based on cron expression")
  @GetMapping(value = "/runXMinUserSync")
  ResponseEntity<String> runXMinUserSync(@RequestParam(name = "cron") String cron);

  @Operation(summary = "Set log level")
  @GetMapping(value = "/logLevel")
  ResponseEntity<String> setLogLevel(@RequestParam(name = "level") String level);

  @Operation(summary = "Reset database")
  @GetMapping(value = "/reset/properties")
  ResponseEntity<String> resetDatabase();
}
