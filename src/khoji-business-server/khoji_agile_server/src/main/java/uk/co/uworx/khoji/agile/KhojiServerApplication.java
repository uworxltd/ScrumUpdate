/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile;

import jakarta.annotation.PostConstruct;
import org.apache.camel.spring.boot.security.CamelSSLAutoConfiguration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.web.servlet.WebMvcAutoConfiguration;
import org.springframework.boot.autoconfigure.web.servlet.error.ErrorMvcAutoConfiguration;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.bind.annotation.CrossOrigin;
import uk.co.uworx.khoji.agile.context.BootApplicationContextProvider;
import uk.co.uworx.khoji.agile.service.BootApplicationContextProviderTenantService;

@SpringBootApplication(
        exclude = {
                ErrorMvcAutoConfiguration.class,
                WebMvcAutoConfiguration.class,
                CamelSSLAutoConfiguration.class
        }
)
@EnableCaching
@CrossOrigin
@EnableAsync
@EnableScheduling
@ComponentScan(
        {
                "uk.co.uworx.khoji.*",
                "uk.co.uworx.khoji.security.*"
        }
)
public class KhojiServerApplication
{
  @Autowired
  private ApplicationContext applicationContext;
  @Value("${khoji.proxy.configure:false}")
  boolean isProxyConfigured;
  @Value("${khoji.http.proxySet:}")
  private String khojiHttpProxySet;
  @Value("${khoji.http.proxyHost:}")
  private String khojiHttpProxyHost;
  @Value("${khoji.http.proxyPort:}")
  private String khojiHttpProxyPort;
  @Value("${khoji.https.proxySet:}")
  private String khojiHttpsProxySet;
  @Value("${khoji.https.proxyPort:}")
  private String khojiHttpsProxyPort;
  @Value("${khoji.https.proxyHost:}")
  private String khojiHttpsProxyHost;
  @Value("${khoji.http.nonProxyHosts:}")
  private String khojiHttpNonProxyHosts;

  public static void main(String[] args)
  {
    new SpringApplicationBuilder(KhojiServerApplication.class)
            .properties("spring.application.name=khoji_agile_server")
            .run(args);
  }

  @PostConstruct
  public void init()
  {
    if (isProxyConfigured)
    {
      System.setProperty("http.proxySet", khojiHttpProxySet);
      System.setProperty("http.proxyPort", khojiHttpProxyPort);
      System.setProperty("http.proxyHost", khojiHttpProxyHost);

      System.setProperty("https.proxySet", khojiHttpsProxySet);
      System.setProperty("https.proxyPort", khojiHttpsProxyPort);
      System.setProperty("https.proxyHost", khojiHttpsProxyHost);
      System.setProperty("http.nonProxyHosts", khojiHttpNonProxyHosts);
    }

    BootApplicationContextProvider.setContext(applicationContext);
    BootApplicationContextProviderAgileConfig.setContext(applicationContext);
    BootApplicationContextProviderJiraImpl.setContext(applicationContext);
    BootApplicationContextProviderTenantService.setContext(applicationContext);
  }
}
