/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { commonEnvironment } from "./environment.common";

const isFalseElseTrue = (value: string) => value?.toLowerCase() !== 'false';
const isTrueElseFalse = (value: string) => value?.toLowerCase() === 'true';

const env: Partial<typeof commonEnvironment> = {
  docker: true,
  //Overriden properties
  SERVER_NAME: window["env"]["NG_SERVER_NAME"] || 'localhost',
  SERVER_PORT: window["env"]["NG_SERVER_PORT"] || '',
  APP_PORT: window["env"]["NG_APP_PORT"] || '',
  REQUEST_PANEL_VISIBILITY: window["env"]["NG_REQUEST_PANEL_VISIBILITY"] || "false",

  // Support email on login page configuration
  SUPPORT_EMAIL: window["env"]["NG_SUPPORT_EMAIL"] || "hello@scrumupdate.com",

  // Jira issue collector link
  JIRA_ISSUE_COLLECTOR_LINK: window["env"]["NG_JIRA_ISSUE_COLLECTOR_LINK"] || "",

  // Web chat backend
  CHAT_BOT: window["env"]["NG_CHAT_BOT"] || commonEnvironment.CHAT_BOT,

  // User Tracking
  TRACKING_PROVIDER: window["env"]["NG_TRACKING_PROVIDER"] || commonEnvironment.TRACKING_PROVIDER,
  TRACKING_API_TOKEN: window["env"]["NG_TRACKING_API_TOKEN"] || commonEnvironment.TRACKING_API_TOKEN || '',
  TRACKING_API_HOST: window["env"]["NG_TRACKING_API_HOST"] || commonEnvironment.TRACKING_API_HOST,
  TRACKING_AUTO_EVENTS: isFalseElseTrue(window["env"]["NG_TRACKING_AUTO_EVENTS"]),
  TRACKING_NAVIGATION_EVENTS: isFalseElseTrue(window["env"]["NG_TRACKING_NAVIGATION_EVENTS"]),
  TRACKING_USER_ACTION_EVENTS: isFalseElseTrue(window["env"]["NG_TRACKING_USER_ACTION_EVENTS"]),
  TRACKING_APPLICATION_STATUS_EVENTS: isTrueElseFalse(window["env"]["NG_TRACKING_APPLICATION_STATUS_EVENTS"]),

  // Jira OAuth
  JIRA_CLIENT_ID: window["env"]["NG_JIRA_CLIENT_ID"] || "",
  JIRA_DEFAULT_SCOPES: window["env"]["NG_JIRA_SCOPES"] || 'read:me read:jira-user offline_access',

  // Captcha
  CAPTCHA_KEY: window["env"]["NG_CAPTCHA_KEY"] || '',
  DISABLE_CAPTCHA: isTrueElseFalse(window["env"]["NG_DISABLE_CAPTCHA"]),

  // MS OAuth
  MS_OAUTH_CLIENT_ID: window["env"]["NG_MS_OAUTH_CLIENT_ID"] || "",
  MS_OAUTH_TOKEN_URL: window["env"]["NG_MS_OAUTH_TOKEN_URL"] || "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?",
  MS_OAUTH_REQUESTED_SCOPES: window["env"]["NG_MS_OAUTH_REQUESTED_SCOPES"] || "openid profile User.Read Calendars.ReadBasic offline_access",
  MS_OAUTH_ENABLED: isTrueElseFalse(window["env"]["NG_MS_OAUTH_ENABLED"]),

  // Unleash
  UNLEASH: isFalseElseTrue(window["env"]["NG_UNLEASH"]),
  UNLEASH_URL: window["env"]["NG_UNLEASH_URL"] || "http://localhost:4242",
  UNLEASH_API_TOKEN: window["env"]["NG_UNLEASH_API_TOKEN"] || "",
}

export const environment = {
  ...commonEnvironment,
  ...env
};
