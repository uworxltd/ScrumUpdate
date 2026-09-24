/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.config;

import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

@Configuration
public abstract class ApplicationConfig
{

  //the file is used for the validation messages, it will pick other files according to locale
  //if the file name is kept in a certain format i.e. messages_{localeCode}.properties
  private static final String BASE_FILE_NAME = "classpath:messages";
  private static final String DEFAULT_ENCODING = "UTF-8";

  /**
   * A message source bean for validation messages
   * that sets the property file to khoji-default
   * to pick up the validation messages
   *
   * @return MessageSource
   */
  @Bean
  public MessageSource messageSource()
  {
    ReloadableResourceBundleMessageSource messageSource
            = new ReloadableResourceBundleMessageSource();

    messageSource.setBasename(BASE_FILE_NAME);
    messageSource.setDefaultEncoding(DEFAULT_ENCODING);
    return messageSource;
  }

  /**
   * A validator Bean that validates the incoming Models
   * it is set to primary in order to avoid conflict or
   * exception with other validator bean
   *
   * @return LocalValidatorFactoryBean
   */
  @Bean
  @Primary
  public LocalValidatorFactoryBean getValidator()
  {
    LocalValidatorFactoryBean bean = new LocalValidatorFactoryBean();
    bean.setValidationMessageSource(messageSource());
    return bean;
  }
}
