package uk.co.uworx.khoji.agile.controller.admin;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import uk.co.uworx.khoji.agile.internal.model.request.AIModelChangeRequest;

import java.util.Map;

@RestController
public class InsightsAIModelController
{
  @Value("${change.model.endpoint.insights.ai:${khoji.insights.ai.base.url}/changeModel}")
  private String changeModelEndPoint;

  private final RestTemplate restTemplate;

  InsightsAIModelController(
          RestTemplate restTemplate
  )
  {
    this.restTemplate = restTemplate;
  }

  @PostMapping("/changeAiModelTo")
  private ResponseEntity<Map<String, String>> changeAiModelTo(
          @Valid @RequestBody AIModelChangeRequest aiModelChangeRequest
  )
  {
      try
      {
        return restTemplate.exchange(
                changeModelEndPoint,
                HttpMethod.POST,
                new HttpEntity<>(aiModelChangeRequest, new HttpHeaders()),
                new ParameterizedTypeReference<>() {}
        );
      }
      catch (Exception e)
      {
        return new ResponseEntity<>(
                Map.of("failed", e.getMessage()),
                HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
  }
}
