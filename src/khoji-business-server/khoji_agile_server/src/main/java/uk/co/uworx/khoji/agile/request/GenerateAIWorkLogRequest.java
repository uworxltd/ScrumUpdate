package uk.co.uworx.khoji.agile.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class GenerateAIWorkLogRequest
{
  private String accountId;
  private String requestedDate;
  private Double hoursToGenerate;
}
