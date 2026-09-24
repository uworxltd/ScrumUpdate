package uk.co.uworx.khoji.agile.controller.healthcheck;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.log4j.Log4j2;
import org.apache.camel.Exchange;
import org.apache.camel.Processor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import uk.co.uworx.khoji.agile.internal.model.HealthCheckConfig;

@Component("PushHealthCheck")
@Log4j2
public class PushHealthCheck implements Processor
{
  @Autowired
  private ApplicationStatusServiceV2 applicationStatusServiceV2;
  @Autowired
  private ObjectMapper objectMapper;

  @Override
  public void process(Exchange exchange) throws Exception
  {
    HealthCheckConfig healthCheckConfig = applicationStatusServiceV2.getHealthCheckConfig();

    log.debug("Heart beat job triggered");
    try
    {
      ResponseEntity<?> response = applicationStatusServiceV2.checkHealthForAllServices(true);

      if (response.getStatusCode().is2xxSuccessful())
      {
        RestTemplate restTemplate = new RestTemplate();
        restTemplate.exchange(healthCheckConfig.getMonitorPushUrl(), HttpMethod.GET, new HttpEntity<String>(null, null), String.class);
        log.debug("HEART BEAT:: Sent successfully");
      }
      else
      {
        log.error("SKIPPING HEART BEAT:: Details: \n{}", objectMapper.writeValueAsString(response.getBody()));
      }
    }
    catch (Exception exception)
    {
      log.error("Heart beat job failed with exception {}", exception.getMessage());
    }
  }

}

