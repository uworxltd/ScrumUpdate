package uk.co.uworx.khoji.agile.internal.model.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AIModelChangeRequest
{
  @NotNull
  String modelApiType; // can be either claude or openAI
  String modelName; // if openAI then this is required
  String modelApiUrl;
  String apiKey;
}