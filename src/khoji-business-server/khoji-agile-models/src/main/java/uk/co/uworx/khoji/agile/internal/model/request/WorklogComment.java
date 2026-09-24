package uk.co.uworx.khoji.agile.internal.model.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class WorklogComment
{
  private List<WorklogCommentContent> content;
  private String type;
  private int version;
}
