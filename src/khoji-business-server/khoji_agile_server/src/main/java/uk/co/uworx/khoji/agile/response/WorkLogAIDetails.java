package uk.co.uworx.khoji.agile.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class WorkLogAIDetails
{
  private String date;
  private String key;
  private Double time;
  private String summary;
  private String reason;
  private String taskTitle;
}