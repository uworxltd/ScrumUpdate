package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public class SummaryGeneration
  {
    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Response
    {
      String message;
      String summary;
    }

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class Request
    {
      String userName;
      String userRole;
      List<String> dateRange;
      @JsonIgnore
      String accountId;
      List<Map<String, Object>> issues;
      Map<String, List<Object>> excessWorklogs;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScrumRequestKBS {
      String todayDate;
      String yesterdayDate;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScrumResponseKBS {
      String message;
      String last_day;
      String current_day;
      String blockers;
      String calendar_connected;

      public ScrumResponseKBS(String message)
      {
        this.message = message;
      }
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScrumUpdateSaveRequest {
        private LocalDate date;
        private String body;
    }

    public enum Type {
      PERSONALIZATION,
      CURRENT_WEEKLY_WORK_LOG_SUMMARY
    }
  }