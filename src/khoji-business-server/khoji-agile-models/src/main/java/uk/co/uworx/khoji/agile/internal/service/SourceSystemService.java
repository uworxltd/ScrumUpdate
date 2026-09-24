/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.service;

import org.springframework.http.ResponseEntity;
import uk.co.uworx.khoji.agile.internal.model.SourceSystem;

import java.util.Map;

public interface SourceSystemService
{
  ResponseEntity<Map<String, String>> removeAllTenantRelatedSettings();
}
