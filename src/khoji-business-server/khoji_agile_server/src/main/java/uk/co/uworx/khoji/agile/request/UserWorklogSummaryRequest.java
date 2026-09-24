package uk.co.uworx.khoji.agile.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@AllArgsConstructor
@Getter
@Setter
public class UserWorklogSummaryRequest
{
  private String accountId;
  private String startDate;
  private String endDate;
  private String timeZone;
}
