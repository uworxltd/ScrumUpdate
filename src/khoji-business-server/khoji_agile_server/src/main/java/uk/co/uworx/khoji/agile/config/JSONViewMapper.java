/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.config;

import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;

/**
 * Handles JSONViews and
 * filters the required
 * field in an API response
 */
@Configuration
public class JSONViewMapper
{
  @Bean
  public MappingJackson2HttpMessageConverter mappingJackson2HttpMessageConverter()
  {
    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper());
    return converter;
  }

  @Bean
  public ObjectMapper objectMapper()
  {
    return JsonMapper
            .builder()
            .disable(MapperFeature.DEFAULT_VIEW_INCLUSION)
            .build();
  }
}
