/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.security.helper;

/**
 * Class to hold constants for security repo
 */
public interface SecurityConstants
{
  String HEADER_AUTHORIZATION = "Authorization";
  String BEARER = "Bearer ";
  String BASIC = "Basic ";
  String HEADER_JWT_EXPIRED = "JWT_EXPIRED";
  String HEADER_JWT_EXPIRED_VALUE = "TRUE";
  String SECURITY_ROLE_APP = "APP";
  String CUSTOM_ERROR = "CUSTOM_ERROR";
  String USERNAME = "USERNAME";
  String PASSWORD = "PASSWORD";
  String COLON = ":";
  String SPACE = " ";
  String SSO_CODE_SIGNUP = "Ssocode";
  String REFRESH_TOKEN = "Refresh_token";
  String ACCESS_TOKEN_KEY = "ACCESS_TOKEN_KEY";
  String REFRESH_TOKEN_KEY = "REFRESH_TOKEN_KEY";
  String USER_EMAIL_KEY = "USER_EMAIL_KEY";
  String USER_FULL_NAME = "USER_FULL_NAME";
  String USER_FIRST_NAME_KEY = "USER_FIRST_NAME_KEY";
  String USER_LAST_NAME_KEY = "USER_LAST_NAME_KEY";
  String USER_ACCOUNT_ID_KEY = "USER_ACCOUNT_ID_KEY";
  String USER_TIME_ZONE_NAME_KEY = "USER_TIME_ZONE_NAME_KEY";
  String USER_PROFILE_PICTURE_SOURCE_URL = "USER_PROFILE_PICTURE_SOURCE_URL";
  String SUBSCRIPTION_ID_KEY = "SUBSCRIPTION_KEY";
  String SUBSCRIPTION_BILLING_IDENTIFIER_KEY = "SUBSCRIPTION_BILLING_IDENTIFIER_KEY";
  String TENANT_ID_KEY = "TENANT_ID";
  String TENANT_URL_KEY = "TENANT_URL_KEY";
  String TENANT_NAME_KEY = "TENANT_NAME_KEY";
}
