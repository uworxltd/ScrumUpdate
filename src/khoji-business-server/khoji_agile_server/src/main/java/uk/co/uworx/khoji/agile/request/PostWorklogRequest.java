package uk.co.uworx.khoji.agile.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import uk.co.uworx.khoji.agile.response.WorkLogAIDetails;

import java.time.LocalDate;
import java.time.LocalDateTime;

@AllArgsConstructor
@Getter
@Setter
public class PostWorklogRequest
{
  private String ticketId;
  private double timelogInSeconds;
  private String comment;
  private LocalDateTime startedAt;
  private String workLogId;

  PostWorklogRequest(WorkLogAIDetails workLogAIDetails)
  {
    this.ticketId = workLogAIDetails.getKey();
    this.comment = workLogAIDetails.getSummary();
    this.timelogInSeconds = workLogAIDetails.getTime() * 60 * 60; // converting hrs to sec
    this.startedAt = LocalDate.parse(workLogAIDetails.getDate()).atStartOfDay();
  }
}
