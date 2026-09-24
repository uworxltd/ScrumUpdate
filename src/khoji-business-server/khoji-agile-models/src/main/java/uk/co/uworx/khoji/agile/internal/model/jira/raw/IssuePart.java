package uk.co.uworx.khoji.agile.internal.model.jira.raw;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class IssuePart
{
  Fields fields;
  String key;

  @AllArgsConstructor
  @NoArgsConstructor
  @Getter
  @Setter
  public static class Fields
  {
    Worklog worklog;
  }

  @Getter
  @Setter
  @AllArgsConstructor
  @NoArgsConstructor
  public static class Worklog
  {
    Integer total;
    Integer maxResults;
    List<Object> worklogs;
  }
}



