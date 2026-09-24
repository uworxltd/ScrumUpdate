package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public class Sync
{
  public record SyncParameters(
          String job_type,
          Parameters parameters,
          Integer priority,
          String created_by
  ) {
    public SyncParameters withPriority(Integer newPriority) {
      return new SyncParameters(job_type, parameters, newPriority, created_by);
    }

    public SyncParameters withCreatedBy(String newCreatedBy) {
      return new SyncParameters(job_type, parameters, priority, newCreatedBy);
    }

    public record Parameters(
            String jql,
            List<Integer> sprint_ids,
            List<String> sprint_states,
            Boolean include_comments,
            Boolean include_changelog,
            Boolean include_subtasks
    ) {}
  }


  public record StatusResponse(String jobId, String status, String jobType, String progress, String createdAt, String startedAt, String completedAt) {}

  public record TenantStatusResponse(String tenant_id, String status) {}

  public record JobStatusResponse(
          String job_id,
          String status,
          Boolean successful,
          Boolean failed,
          String result,
          String traceback,
          String date_done,
          Boolean is_workflow,
          String workflow_resolution,
          List<String> child_task_statuses,
          Integer child_count,
          String job_type,
          Instant created_at,
          Instant started_at,
          Instant completed_at,
          String created_by,
          String parameters,
          String results,
          String error_message,
          Integer retry_count,
          Integer progress
  ) {}

  public record JobSubmissionResponse(
          String job_id,
          String status,
          String message,
          String submitted_at
  ) {}

  public record SyncJob(
          String job_id,
          String job_type,
          String status,
          SyncParameters.Parameters parameters,
          LocalDateTime created_at,
          LocalDateTime started_at,
          LocalDateTime completed_at,
          String created_by,
          int retry_count,
          Integer duration_seconds,
          boolean is_running,
          boolean can_retry
  ) {}

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record TenantInfo(
          @JsonProperty("tenant_id") String tenantId,
          @JsonProperty("exists") boolean exists,
          @JsonProperty("existence_sources") ExistenceSources existenceSources,
          @JsonProperty("sync_history") SyncHistory syncHistory,
          @JsonProperty("current_activity") CurrentActivity currentActivity,
          @JsonProperty("tenant_state") String tenantState,
          @JsonProperty("onboarding_complete") boolean onboardingComplete,
          @JsonProperty("has_data") boolean hasData,
          @JsonProperty("needs_sync") boolean needsSync,
          @JsonProperty("sync_recommendation") SyncRecommendation syncRecommendation,
          @JsonProperty("created_at") String createdAt,
          @JsonProperty("error") String error
  ) {}

  public record ExistenceSources(
          @JsonProperty("tenant_record_exists") boolean tenantRecordExists,
          @JsonProperty("schema_exists") boolean schemaExists,
          @JsonProperty("schema_name") String schemaName
  ) {}

  public record SyncHistory(
          @JsonProperty("has_ever_synced") boolean hasEverSynced,
          @JsonProperty("first_sync_date") String firstSyncDate,
          @JsonProperty("last_sync_date") String lastSyncDate,
          @JsonProperty("last_successful_sync_date") String lastSuccessfulSyncDate,
          @JsonProperty("total_jobs") int totalJobs,
          @JsonProperty("successful_jobs") int successfulJobs,
          @JsonProperty("failed_jobs") int failedJobs,
          @JsonProperty("success_rate_percent") double successRatePercent,
          @JsonProperty("consecutive_failures") int consecutiveFailures
  ) {}

  public record CurrentActivity(
          @JsonProperty("has_active_jobs") boolean hasActiveJobs,
          @JsonProperty("active_job_count") int activeJobCount,
          @JsonProperty("active_jobs") List<String> activeJobs
  ) {}

  public record SyncRecommendation(
          @JsonProperty("action") String action,
          @JsonProperty("reason") String reason,
          @JsonProperty("priority") String priority,
          @JsonProperty("message") String message
  ) {}

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record SprintInfo(
          @JsonProperty("sprint_id") Integer sprintId,
          @JsonProperty("sprint_name") String sprintName,
          @JsonProperty("board_id") Integer boardId,
          @JsonProperty("board_name") String boardName,
          @JsonProperty("state") String state,
          @JsonProperty("start_date") LocalDateTime startDate,
          @JsonProperty("end_date") LocalDateTime endDate,
          @JsonProperty("complete_date") LocalDateTime completeDate,
          @JsonProperty("goal") String goal,
          @JsonProperty("created_at") LocalDateTime createdAt,
          @JsonProperty("updated_at") LocalDateTime updatedAt,
          @JsonProperty("last_synced_at") LocalDateTime lastSyncedAt,
          @JsonProperty("total_story_points") Double totalStoryPoints,
          @JsonProperty("resolved_story_points") Double resolvedStoryPoints
  ) {}

  public static class Start
  {
    @AllArgsConstructor
    @NoArgsConstructor
    @Getter
    @Setter
    public static class Request
    {
      String job_type;
      Parameters parameters;
      int priority;
      String created_by;

      @Getter
      @Setter
      @AllArgsConstructor
      @NoArgsConstructor
      public static class Parameters
      {
        String jql;
        List<String> sprint_states;
        boolean include_comments;
        boolean include_changelog;
        boolean include_subtasks;
      }
    }

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Response
    {
      String startedAt;   // present if in_progress | failed
      String initiatedBy; // "system" | userId; tells if it was manual
    }
  }
}
