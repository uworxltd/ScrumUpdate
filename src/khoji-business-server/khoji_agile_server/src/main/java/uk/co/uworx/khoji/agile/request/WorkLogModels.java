package uk.co.uworx.khoji.agile.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import uk.co.uworx.khoji.agile.response.WorkLogAIDetails;

import java.util.List;

@AllArgsConstructor
@Getter
@Setter
public class WorkLogModels
{
  private String uniqueIdentifier;
  private List<PostWorklogRequest> worklogs;
  private String timeZone;

  public WorkLogModels(KGSPostWorkLogsRequest request)
  {
    this.uniqueIdentifier = request.uniqueIdentifier;
    this.worklogs = request.workLogs.stream().map(PostWorklogRequest::new).toList();
  }

  @Getter
  @Setter
  @AllArgsConstructor
  public static class KGSPostWorkLogsRequest
  {
    private String uniqueIdentifier;
    private List<WorkLogAIDetails> workLogs;
  }

  @AllArgsConstructor
  @NoArgsConstructor
  @Getter
  @Setter
  public static class Response
  {
    List<SubmissionDetail> submissionDetails;

    @Setter
    @Getter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class SubmissionDetail
    {
      String ticketId;
      boolean submitted;
      double hours;
      String workLogId;
      String comment;
    }
  }

  @AllArgsConstructor
  @NoArgsConstructor
  @Getter
  @Setter
  public static class DeletionResponse
  {
    List<DeletionDetails> deletionDetails;

    @Setter
    @Getter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DeletionDetails extends DeletionRequest.DeletionRequestDetails
    {
      boolean deleted;

      public DeletionDetails(boolean deleted, String workLogId, String issueId) {
        super(workLogId, issueId);
        this.deleted = deleted;
      }
    }
  }

  @AllArgsConstructor
  @NoArgsConstructor
  @Getter
  @Setter
  public static class DeletionRequest
  {
    List<DeletionRequestDetails> details;

    @Setter
    @Getter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DeletionRequestDetails
    {
      String workLogId;
      String issueId;
    }
  }
}
