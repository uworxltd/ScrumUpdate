package uk.co.uworx.khoji.agile.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import uk.co.uworx.khoji.agile.internal.model.WorkLog;

import java.util.List;

@AllArgsConstructor
@Getter
@Setter
public class UserWorklogSummaryLoggedTimeInDays
{
  private String date;
  private List<BreakDown> data;

  @AllArgsConstructor
  @NoArgsConstructor
  @Setter
  @Getter
  public static class BreakDown {
    private String ticketId;
    private String ticketType;
    private String ticketDescription;
    List<WorkLogItem> workLogItems;

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class WorkLogItem {
      private String workLogId;
      private String description;
      private double timeSpentInSeconds;

      public WorkLogItem(WorkLog workLog) {
        this.workLogId = workLog.getWorkLogId();
        this.description = workLog.getComment();
        this.timeSpentInSeconds = Double.parseDouble(workLog.getTimeSpentSeconds());
      }
    }
  }
}
