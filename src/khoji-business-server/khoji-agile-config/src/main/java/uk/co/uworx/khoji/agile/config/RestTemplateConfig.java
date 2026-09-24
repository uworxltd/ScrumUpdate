/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.config;

import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * Configuration for rest template
 */
@Configuration
public class RestTemplateConfig
{
  @Bean
  public RestTemplate restTemplate() {
    // Create and configure the PoolingHttpClientConnectionManager
    PoolingHttpClientConnectionManager connectionManager = new PoolingHttpClientConnectionManager();
    connectionManager.setMaxTotal(100);
    connectionManager.setDefaultMaxPerRoute(20);

    // Create and configure the HttpClient
    CloseableHttpClient httpClient = HttpClients
            .custom()
            .setConnectionManager(connectionManager)
            .build();

    // Create and configure the HttpComponentsClientHttpRequestFactory
    HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory(httpClient);

    // Return the RestTemplate instance
    return new RestTemplate(factory);
  }
}
