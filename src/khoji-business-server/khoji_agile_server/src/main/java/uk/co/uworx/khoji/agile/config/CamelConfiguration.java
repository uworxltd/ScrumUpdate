package uk.co.uworx.khoji.agile.config;

import org.apache.camel.CamelContext;
import org.apache.camel.ProducerTemplate;
import org.apache.camel.builder.RouteBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import uk.co.uworx.khoji.agile.handler.ConfigHandler;
import uk.co.uworx.khoji.security.subscription.ValidateUserSubscriptionServiceImpl;

@Configuration
public class CamelConfiguration
{
  @Bean
  public ProducerTemplate producerTemplate(CamelContext camelContext) {
    return camelContext.createProducerTemplate();
  }
}

