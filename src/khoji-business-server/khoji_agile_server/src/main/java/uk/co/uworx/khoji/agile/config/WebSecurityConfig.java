/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Lazy;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.zalando.problem.spring.web.advice.security.SecurityProblemSupport;
import uk.co.uworx.khoji.agile.context.BootApplicationContextProvider;
import uk.co.uworx.khoji.agile.persistence.service.IdentityProviderDataService;
import uk.co.uworx.khoji.agile.persistence.service.KhojiUserDataService;
import uk.co.uworx.khoji.agile.persistence.service.WorkspaceDataService;
import uk.co.uworx.khoji.security.UserDetailsServiceImpl;
import uk.co.uworx.khoji.security.jwt.JwtAuthenticationFilter;
import uk.co.uworx.khoji.security.jwt.JwtAuthorizationFilter;
import uk.co.uworx.khoji.security.jwt.refresh.TokenInterceptor;
import uk.co.uworx.khoji.security.subscription.ValidateUserSubscriptionServiceImpl;

import java.util.Arrays;
import java.util.List;

import static uk.co.uworx.khoji.security.jwt.JwtTokenService.WHITELIST_URLS;

/**
 * This class is responsible for enabling
 * the JWT token service. It passes all the
 * requests except of White List Urls from
 * JWT filters available in
 * khoji security
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@Order(1)
@Import(SecurityProblemSupport.class)
public class WebSecurityConfig
{
  @Autowired
  private SecurityProblemSupport problemSupport;
  @Autowired
  private KhojiUserDataService khojiUserDataService;
  @Autowired
  private IdentityProviderDataService identityProviderDataService;
  @Autowired
  private WorkspaceDataService workspaceDataService;

  @Bean
  @Lazy(value = false)
  public UserDetailsService userDetailsService()
  {
    return new UserDetailsServiceImpl(khojiUserDataService);
  }

  @Bean
  public BCryptPasswordEncoder bCryptPasswordEncoder()
  {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public ValidateUserSubscriptionServiceImpl validateUserSubscriptionService()
  {
    return new ValidateUserSubscriptionServiceImpl();
  }

  @Bean
  public AuthenticationManager authenticationManager(
          AuthenticationConfiguration authenticationConfiguration
  ) throws Exception
  {
    return authenticationConfiguration.getAuthenticationManager();
  }

  private void addWhiteListUrls(HttpSecurity http) throws Exception
  {
    Arrays.stream(WHITELIST_URLS).forEach(url -> {
      try
      {
        http.authorizeHttpRequests(authorize -> authorize.requestMatchers(new AntPathRequestMatcher(url)).permitAll());
      }
      catch (Exception e)
      {
        throw new RuntimeException(e);
      }
    });
  }

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception
  {
    addWhiteListUrls(http);
    http
            .cors(Customizer.withDefaults())
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exception ->
                    exception.authenticationEntryPoint(problemSupport)
            )
            .exceptionHandling(exception ->
                    exception.accessDeniedHandler(problemSupport)
            )
            .authorizeHttpRequests(authorize -> authorize.anyRequest().authenticated())
            .addFilter(
                    new JwtAuthenticationFilter(
                            BootApplicationContextProvider.getContext().getBean(AuthenticationManager.class),
                            validateUserSubscriptionService(),
                            khojiUserDataService,
                            identityProviderDataService,
                            workspaceDataService,
                            userDetailsService()
                    )
            )
            .addFilter(
                    new JwtAuthorizationFilter(
                            BootApplicationContextProvider.getContext().getBean(AuthenticationManager.class),
                            userDetailsService(),
                            validateUserSubscriptionService()
                    )
            )
            .addFilterAfter(
                    new TokenInterceptor(userDetailsService()),
                    JwtAuthorizationFilter.class
            );

    return http.build();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource()
  {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(List.of("*"));
    configuration.setAllowedMethods(
            List.of(
                    "GET",
                    "POST",
                    "PUT",
                    "PATCH",
                    "DELETE",
                    "OPTIONS"
            )
    );
    configuration.setAllowedHeaders(List.of("*"));
    configuration.setExposedHeaders(
            List.of(
                    "x-auth-token",
                    "CUSTOM_ERROR",
                    "USER_STATUS",
                    "requested_user_info",
                    "Authorization",
                    "Refresh_token",
                    "Tenant_id"
            )
    );
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);

    return source;
  }

}
