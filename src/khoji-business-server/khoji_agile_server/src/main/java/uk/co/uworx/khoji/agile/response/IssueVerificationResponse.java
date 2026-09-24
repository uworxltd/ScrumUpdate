package uk.co.uworx.khoji.agile.response;


import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class IssueVerificationResponse
{
  private String issueId;
  private boolean isValid;
}
