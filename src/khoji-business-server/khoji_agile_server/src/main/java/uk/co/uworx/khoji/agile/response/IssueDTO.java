package uk.co.uworx.khoji.agile.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class IssueDTO {
  private Long id;
  private String key;
  private String keyHtml;
  private String summary;
  private String summaryText;
  private String description;
  private String descriptionText;
  private String assignee;
  private String img;
}

