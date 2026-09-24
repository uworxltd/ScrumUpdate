/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.service;

/**
 * Class to hold constants for helper classes
 */
public class Constants
{
  public static final double SECONDS_IN_AN_HOUR = 3600;
  public static final String DECIMAL_FORMAT_PATTERN = "#.##";
  public static final String YYYY_MM_DD = "yyyy-MM-dd";
  public static final String DD_MM_YYYY = "dd/MM/yyyy";
  public static final String ZONED_DATE_TIME_FORMAT = "uuuu-MM-dd'T'HH:mm:ss.SSSX";
  public static final String MEDIUM_THRESHOLD = "Medium";
  public static final String TASK_TYPE_OTHERS = "Others";

  // Integrations
  public static final String MS_CALENDAR_INTEGRATION = "ms-calendar";
  public static final String MS_CALENDAR_VIEW_KEY = "MS-Calendar-View";
  public static final String MS_CALENDAR_VIEW = "view";
  public static final String MS_CALENDAR_ERROR_KEY = "error";
  public static final String MS_CALENDAR_REFRESH_TOKEN_EXPIRED_OR_CONSENT_REVOKED_ERROR = "RefreshTokenExpiredOrConsentRevoked";
  public static final String MS_CALENDAR_GENERIC_ERROR = "GenericError";
  public static final String MS_CALENDAR_EMPTY_RESPONSE = "EmptyResponse";
}
