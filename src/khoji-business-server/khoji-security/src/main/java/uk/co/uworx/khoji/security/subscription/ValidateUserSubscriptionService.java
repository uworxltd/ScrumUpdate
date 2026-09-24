/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.security.subscription;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

import java.util.HashMap;

/**
 * Provides an interface for validation of subscription service.
 */
public interface ValidateUserSubscriptionService
{
  HashMap<String,String> fetchAccessTokenAndTenantDetailsFromSSO_CODE(String code);
  HashMap<String,String> updatedToken(String refreshToken);
  <R> ResponseEntity<R> fetchAccessibleResources(HttpEntity<String> requestEntity, Class<R> typeClass);
  void fetchUserSourceProfileDetailsAndAccountId(
          HttpHeaders headers,
          ObjectMapper objectMapper,
          HashMap<String, String> map
  );
}
