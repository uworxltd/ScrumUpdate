/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.controller.stats;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uk.co.uworx.khoji.agile.handler.WorkLogHandler;
import uk.co.uworx.khoji.agile.internal.model.SummaryGeneration;
import uk.co.uworx.khoji.agile.persistence.dto.response.ScrumUpdateResponse;
import uk.co.uworx.khoji.agile.persistence.service.ScrumUpdatesDataService;
import uk.co.uworx.khoji.agile.request.GenerateAIWorkLogRequest;
import uk.co.uworx.khoji.agile.request.UserWorklogSummaryRequest;
import uk.co.uworx.khoji.agile.request.UserWorklogSummaryResponse;
import uk.co.uworx.khoji.agile.request.WorkLogModels;
import uk.co.uworx.khoji.agile.request.WorkLogRequest;
import uk.co.uworx.khoji.agile.response.GenerateAIWorkLogResponse;
import uk.co.uworx.khoji.agile.response.WorkLogResponse;
import uk.co.uworx.khoji.agile.service.business.PropertiesService;
import uk.co.uworx.khoji.security.annotations.HasAccessToInstanceWithPrivilege;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;


@CrossOrigin
@RestController
@Log4j2
public class WorkLogController
{
  @Value("${spring.profiles.active}")
  public String activeProfile;
  @Autowired
  private WorkLogHandler workLogHandler;
  @Autowired
  private PropertiesService propertiesService;
  @Autowired
  private ScrumUpdatesDataService scrumUpdatesDataService;

  @Operation(summary = "Work log summary for requested team")
  @PostMapping(
          value = "/getWorkLog",
          produces = MediaType.APPLICATION_JSON_VALUE
  )
  @HasAccessToInstanceWithPrivilege
  public ResponseEntity<WorkLogResponse> listWorkLog(@Valid @RequestBody WorkLogRequest workLogRequestParam, Principal principal)
  {
    return new ResponseEntity<>(workLogHandler.getWorkLog(workLogRequestParam, principal), HttpStatus.OK);
  }

  @Operation(summary = "Work Log summary for requested user")
  @PostMapping(
          value = "/getUserWorklogSummary",
          produces = MediaType.APPLICATION_JSON_VALUE
  )
  @HasAccessToInstanceWithPrivilege
  public ResponseEntity<UserWorklogSummaryResponse> getWorklogSummary(
          @Valid @RequestBody UserWorklogSummaryRequest request,
          Principal principal
  )
  {
    return new ResponseEntity<>(
            workLogHandler.getUserWorklogSummary(request, principal),
            HttpStatus.OK
    );
  }


  @Operation(summary = "Ping AI endpoint to prompt cache")
  @GetMapping(
          value = "/ping/cache/prompt",
          produces = MediaType.APPLICATION_JSON_VALUE
  )
  @HasAccessToInstanceWithPrivilege
  public ResponseEntity<Map<String, Boolean>> cachePromptForAI()
  {
    workLogHandler.pingKIAContainerForPromptCache();

    return new ResponseEntity<>(
            Map.of("PROMPT_CACHED", true),
            HttpStatus.OK
    );
  }


  @Operation(summary = "Post work logs")
  @PostMapping(
          value = "/post/worklogs",
          produces = MediaType.APPLICATION_JSON_VALUE
  )
  @HasAccessToInstanceWithPrivilege
  public ResponseEntity<WorkLogModels.Response> postWorklogs(
          @Valid @RequestBody WorkLogModels request,
          Principal principal
  )
  {
    return new ResponseEntity<>(
            workLogHandler.postWorklogs(request, principal, false),
            HttpStatus.OK
    );
  }

  @Operation(summary = "Edit work logs")
  @PostMapping(
          value = "/edit/worklogs",
          produces = MediaType.APPLICATION_JSON_VALUE
  )
  @HasAccessToInstanceWithPrivilege
  public ResponseEntity<WorkLogModels.Response> editWorkLogs(
          @Valid @RequestBody WorkLogModels request,
          Principal principal
  )
  {
    return new ResponseEntity<>(
            workLogHandler.postWorklogs(request, principal, true),
            HttpStatus.OK
    );
  }

  @Operation(summary = "delete work logs")
  @PostMapping(
          value = "/delete/worklogs",
          produces = MediaType.APPLICATION_JSON_VALUE
  )
  @HasAccessToInstanceWithPrivilege
  public ResponseEntity<WorkLogModels.DeletionResponse> deleteWorkLogs(
          @RequestBody WorkLogModels.DeletionRequest request,
          Principal principal
  )
  {
    return new ResponseEntity<>(
            workLogHandler.deleteWorkLogs(request, principal),
            HttpStatus.OK
    );
  }

  @Operation(summary = "Work Log generation with AI")
  @PostMapping(
          value = "/worklog/generate",
          produces = MediaType.APPLICATION_JSON_VALUE
  )
  @HasAccessToInstanceWithPrivilege
  public ResponseEntity<GenerateAIWorkLogResponse> generateWorkLogWithAI(
          @Valid @RequestBody GenerateAIWorkLogRequest request,
          Principal principal
  )
  {
    return new ResponseEntity<>(
            workLogHandler.generateWorkLogWithAI(
                    request,
                    principal
            ),
            HttpStatus.OK
    );
  }

  @Operation(summary = "Categorize Work Log categories with AI")
  @PostMapping(
          value = "/category/generate",
          produces = MediaType.APPLICATION_JSON_VALUE
  )
  @HasAccessToInstanceWithPrivilege
  public ResponseEntity<Object> generateWorkLogWithAI(
          @Valid @RequestBody Object request,
          Principal principal
  )
  {
    return new ResponseEntity<>(
            workLogHandler.generateIssueTypesCategoryWithAI(
                    request
            ),
            HttpStatus.OK
    );
  }

  @Operation(summary = "generate Summary based on the user WorkLog")
  @PostMapping(
          value = "/generate/current-summary",
          produces = MediaType.APPLICATION_JSON_VALUE
  )
  @HasAccessToInstanceWithPrivilege
  public ResponseEntity<SummaryGeneration.Response> generateSummaryBasedOnWorkLog(
          @RequestBody SummaryGeneration.Request request,
          Principal principal
  )
  {
      return new ResponseEntity<>(
              workLogHandler.getUserWorkLogSummaryFromAi(
                      principal,
                      request
              ),
              HttpStatus.OK
      );
  }

  @Operation(summary = "generate scrum updates based on meetings attended, activity, and blocker issues")
  @PostMapping(
          value = "/generate/scrum-updates",
          produces = MediaType.APPLICATION_JSON_VALUE
  )
  @HasAccessToInstanceWithPrivilege
  public ResponseEntity<SummaryGeneration.ScrumResponseKBS> generateScrumUpdates(
          @RequestBody SummaryGeneration.ScrumRequestKBS request,
          Principal principal
  )
  {
    return new ResponseEntity<>(
            workLogHandler.getUserScrumUpdates(
                    principal,
                    request
            ),
            HttpStatus.OK
    );
  }
}
