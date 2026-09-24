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
public class GenerateAIWorkLogResponse
{
  private String errorCode;
  private String message;
  private List<WorkLogAIDetails> data;
  private String uniqueIdentifier;
}
