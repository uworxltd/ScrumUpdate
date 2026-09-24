/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.datamodel;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class SourceSystemServerInfo
{
  private String baseUrl;
  private String deploymentType;
  private String buildDate;
  private String serverTimeZone;
  private String serverTime;
  private String serverTitle;
  private String defaultLocale;

}
