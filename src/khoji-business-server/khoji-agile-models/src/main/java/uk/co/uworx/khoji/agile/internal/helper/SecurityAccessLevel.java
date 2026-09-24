/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.helper;

import lombok.Getter;

@Getter
public enum SecurityAccessLevel {
  APPLICATION("APP"),
  ADMIN("ADMIN"),
  TENANT_ADMIN("TENANT_ADMIN"),
  USER("USER");

  private final String value;

  SecurityAccessLevel(String value) {
    this.value = value;
  }
}
