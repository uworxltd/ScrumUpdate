package uk.co.uworx.khoji.agile.config;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import jakarta.persistence.EntityManagerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.zalando.problem.jackson.ProblemModule;
import org.zalando.problem.violations.ConstraintViolationProblemModule;
import uk.co.uworx.khoji.agile.config.instance.filter.InstanceIdFromRequestInterceptor;

@Configuration
@EnableWebMvc
@EnableSpringDataWebSupport
public class ProblemModuleConfig implements WebMvcConfigurer
{

  @Autowired
  private InstanceIdFromRequestInterceptor instanceIdFromRequestInterceptor;

  @Override
  public void addInterceptors(InterceptorRegistry registry)
  {
    registry.addInterceptor(instanceIdFromRequestInterceptor);
  }

  /*
   * Module for serialization/deserialization of RFC7807 Problem.
   */
  @Bean
  ProblemModule problemModule()
  {
    return new ProblemModule().withStackTraces(false);
  }

  /*
   * Module for serialization/deserialization of ConstraintViolationProblem.
   */
  @Bean
  ConstraintViolationProblemModule constraintViolationProblemModule()
  {
    return new ConstraintViolationProblemModule();
  }

  @Primary
  @Bean
  public ObjectMapper objectMapper()
  {
    ObjectMapper mapper = new ObjectMapper();
    mapper.findAndRegisterModules();
    mapper.configure(SerializationFeature.WRAP_ROOT_VALUE, false);
    mapper.configure(DeserializationFeature.UNWRAP_ROOT_VALUE, false);
    return mapper;
  }

  @Bean
  public PlatformTransactionManager transactionManager(EntityManagerFactory emf)
  {
    JpaTransactionManager transactionManager = new JpaTransactionManager();
    transactionManager.setEntityManagerFactory(emf);
    return transactionManager;
  }
}
