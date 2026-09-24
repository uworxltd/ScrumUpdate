/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.data.api;


import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import uk.co.uworx.khoji.agile.internal.datamodel.KhojiIssueType;
import uk.co.uworx.khoji.agile.internal.model.Issue;
import uk.co.uworx.khoji.agile.internal.model.IssueWorklog;
import uk.co.uworx.khoji.agile.internal.model.SourceSystem;
import uk.co.uworx.khoji.agile.internal.model.SummaryGeneration;
import uk.co.uworx.khoji.agile.internal.model.WorkLog;
import uk.co.uworx.khoji.agile.internal.model.request.DataClientRequest;
import uk.co.uworx.khoji.agile.internal.model.request.WorkLogDataClientRequest;
import uk.co.uworx.khoji.agile.legacy.models.SourceUser;
import uk.co.uworx.khoji.agile.persistence.model.UserAccessCredentials;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Data client for Khoji
 */
public interface IDataClient
{
  List<Issue> searchIssuesUsingPost(DataClientRequest request, Principal principal);
  <T> List<T> searchIssuesUsingPost(
          TypeReference typeReference,
          DataClientRequest request,
          String requiredFields,
          boolean expandChangeLog,
          Principal principal
  );
  List<Issue> getWorkLogData(WorkLogDataClientRequest workLogDataClientRequest, Principal principal);
  <T> List<T> getWorkLogData(TypeReference typeReference, WorkLogDataClientRequest workLogDataClientRequest, Principal principal);
  List<IssueWorklog> getWorkLogForGivenKeys(List<String> keys, WorkLogDataClientRequest workLogDataClientRequest, Principal principal);
  <T> List<T> getWorkLogForGivenKeys(TypeReference typeReference, List<String> keys, String worklogTenant, WorkLogDataClientRequest workLogDataClientRequest, Principal principal);
  /**
   * fetch the users from jira using the given details
   *
   * @param sourceSystem the url and authentication
   * @return the projects
   */
  List<SourceUser> fetchUsers(SourceSystem sourceSystem, Principal principal, boolean filterInactiveUsers);
  /**
   * Method to fetch all issue types from Jira
   *
   * @return list of Issue types
   */
  List<KhojiIssueType> fetchIssueTypes(Principal principal);
  <T> List<T> getWorkLogIssuesWithLimitedInformation(TypeReference typeReference, WorkLogDataClientRequest workLogDataClientRequest, Principal principal);
  Optional<String> getUserTimeZone(Principal principal, String accountId, UserAccessCredentials userAccessCredentials, String tenantId);

  /**
   * this method either logs or edits workLog on jira
   * @param issueIdOrKey issue on which to log work
   * @param commentText comment String
   * @param started date on which to log
   * @param timeSpentSeconds how much time to log in seconds
   * @param timeZone to avoid issues with users time
   * @param principal users authentication Principal retrieved from token
   * @param workLogId this will decide if this is edit request or log request, if provided it will edit it, otherwise log it
   * @return ResponseEntity of WorkLog Model
   */
  ResponseEntity<WorkLog> logOrEditWorkLogOnJira(
          String issueIdOrKey,
          String commentText,
          LocalDateTime started,
          double timeSpentSeconds,
          String timeZone,
          Principal principal,
          String workLogId
  );

  HttpStatusCode deleteWorkLogAgainstId(
          Principal principal,
          String workLogId,
          String issueId
  );

  HttpStatusCode isValidJiraIssueId(String issueId, Principal principal);
  List<Map<String, Object>> fetchUserActivity(String accountId, String requestedDate, String userName, Principal principal, AtomicBoolean isThereDataInJira, boolean fetchDefaultTickets, boolean fetchForScrumUpdate);
  List<Map<String, Object>> getIssuesWithSearchQuery(String query, Principal principal);
  void getLastWeekActivity(Principal principal, SummaryGeneration.Request request);
  Map<String, Object> getIssueDetail(String issueKey, Principal principal);
}
