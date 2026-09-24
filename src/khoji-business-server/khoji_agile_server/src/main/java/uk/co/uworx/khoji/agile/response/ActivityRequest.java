package uk.co.uworx.khoji.agile.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ActivityRequest
{
  private String date; //format yyyy-mm-dd
  private Double remainingHours;
  private UserActivityInformation userInformation;
  private List<UserActivityData> sourceData; //list of issues from jira
  private Object externalReferences;
  private String uniqueIdentifier;
  private String summary;
}
