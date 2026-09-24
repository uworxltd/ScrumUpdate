package uk.co.uworx.khoji.agile.internal.model.request;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class WorklogCommentContent {
  private List<WorklogCommentContent> content;  // Nested content
  private String type;
  @JsonInclude(JsonInclude.Include.NON_NULL)
  private String text;

  public WorklogCommentContent(Map<String, Object> fields) {
    if (fields.containsKey("content")) {
      this.content = (List<WorklogCommentContent>) fields.get("content");
    }
    if (fields.containsKey("type")) {
      this.type = (String) fields.get("type");
    }
    if (fields.containsKey("text")) {
      this.text = (String) fields.get("text");
    }
  }

  public static WorklogCommentContent fromMap(Map<String, Object> fields) {
    return new WorklogCommentContent(fields);
  }
}
