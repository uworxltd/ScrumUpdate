/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const commonEnvironment = {
  //Common properties
  production: false,
  docker: false,
  VERSION: '2.5',

  /** API SERVER PORT */
  SERVER_PORT: '4243',
  /** SERVER DOMAIN NAME */
  SERVER_NAME: 'localhost',
  /** ANGULAR APP PORT */
  APP_PORT: '4241',

  // Backend APIs
  ALL_TEAMS: '/teamNames',
  REGISTERED_TEAMS: '/registeredTeams?username=',
  TEAM_DATA_ALERTS: '/alerts/teams',
  TEAM_DATA_ALERTS_DETAILS: '/alerts/teams/issues',
  ALL_TEAM_MEMBERS: '/teamMembers?teamName=',
  REGISTERED_TEAM_MEMBERS: '/registeredTeamsMembers?username=',
  INDIVIUAL_MEMBER_STATISTICS_DATA: '/stats/individuals',
  DASHBOARD: '/teamBoards',
  REGISTER_TEAMBOARD: '/registeredTeamBoards?username=',
  INVITE_USER_CODE_VALIDATION_URL: '/signup/validate?code=',
  UPDATE_PASSWORD_CODE_VALIDATION_URL: '/update-password/validate?code=',
  SUCCESSFULL_SIGNUP_PAGE_URL: '../signup/succesfullSignup',
  VALIDATE_TENANT_ADMIN_INFO_URL: '/signup/validateUserInformation',
  SUCCESSFULL_PASSWORD_PAGE_URL: '/forgot-password/success',
  SUCCESSFUL_PASSWORD_UPDATED: '/forgot-password/password-success',
  GETWORKLOG: '/getWorkLog',
  WORKLOG_REMINDER_API: '/remindWorkLog',
  GETHELPCONFIG: '/faqConfig',
  LOGIN_API_KBS: '/login',
  CAPTCHA_API_KBS: '/recaptcha/validate',
  GET_ACCESS_LEVEL_API: '/user/access-levels',
  GET_CHARGEBEE_HOSTEDPAGE_KBS: '/payment/signup/hosted-page',
  GET_BILLING_STRATEGY: '/payment/fetchStrategy',
  UPDATE_ONBOARDING_TEAM: '/onboarding/team',
  ONBOARDING_INVITE_USER: '/onboarding/inviteUser',
  ADD_JIRA_USERS: '/onboarding/inviteUser',
  LINK_USER_TO_MS_TEAMS: '/kgs/link-user-with-teams',

  // Angular routes
  ANGULAR_MENU_CONFIG: '/angular/menuConfig',
  LOGIN_PAGE: '/login',
  FORGOT_PASSWORD_PAGE: '/forgot-password',
  REPORT_DASHBOARD_PAGE: '/reports',
  ANALYSIS_DASHBOARD_PAGE: '/analysis',
  KHOJI_DASHBOARD_PAGE: '/dashboard',
  KHOJI_ONBOARDING_PAGE: '/onboarding',
  REDIRECT_URL: 'REDIRECT_URL',
  DASHBOARD_INSIGHTS_PAGE: '/insights',
  DASHBOARD_TEAM_INSIGHTS_PAGE: '/insights/team/',
  TEAM_WORKLOG_PAGE: '/team',
  TEAMBOARD_ANALYSIS_PAGE: '/teamboard-analysis',
  RELEASE_ANALYSIS_PAGE: '/delivery-analysis',
  WORKLOG_ANALYSIS_PAGE: '/timelog',
  TENANT_DASHBOARD_PAGE: '/admin-panel/tenant-dashboard',
  REPORT_PAGE: '/report-analysis',
  ADMIN_PAGE: '/admin-panel',
  USER_PROFILE_PAGE: '/user-profile',
  USER_SIGNUP_REQUEST_URL: '/signup',
  SESSION_EXPIRED: '/session-expired',
  ACCESS_DENIED: '/access-denied',
  PAGE_NOT_FOUND: '/not-found',
  KHOJI_TENANT_ADMIN_LANDING_PAGE: '/configure-source',
  KHOJI_CLOUD_ONBOARDDING_PAGE: '/onboarding',
  INTEGRATION: '/admin-panel/integration',
  VIEW_USERS: '/admin-panel/khoji-users',
  INVITE_USERS: '/admin-panel/user-management',
  MANAGE_TEAMS: '/admin-panel/tenant-dashboard/manage-teams',

  COMPONENT_SETTINGS_ENABLED: 'true',

  // Video for tenant admin
  VIDEO_URL: 'https://www.youtube.com/embed/npcP8n00Hus',

  CLOUD: 'true',
  REQUEST_PANEL_VISIBILITY: 'true',

  // Support email on login page configuration
  SUPPORT_EMAIL: 'hello@scrumupdate.com',
  ACTIVE_TEAM_MEMBERS_URL: '/teams/members',
  KHOJI_CONFIG: '/getKhojiConfig',
  SOURCE_ISSUE_TYPES_SYNC: '/getSourceIssueTypes',
  GENERATE_CATEGORIES_WITH_AI: '/category/generate',
  ANGULAR_APP_CONFIG: '/angular/appConfig',
  DATATABLE_BUTTON_CONFIG: '/assets/config/datatableConfigs/datatableButtonsConfig.json',
  DROPDOWN_GROUPING_CONFIG: '/assets/config/dropdown-grouping-config.json',
  DELETE_ACCOUNT_REASONS: '/assets/config/delete-account-reasons.json',
  TEMPLATES: '/templates',
  TEMPLATEDETAILS: '/templateDetails',
  COMPONENTS: '/components',
  MEMBERS_API: '/members',
  USERS_API: '/users',
  USERS_IN_TEAMS_API: '/usersInTeam',
  USERS_AGAINST_MEMBERS: '/usersByMemberIds',
  BASIC_USERS_API: '/basicUsers',
  USER_SETTINGS: '/users/settings',
  USER_TEAM_API: '/users/team',
  USER_DASHBOARD: '/users/reduced/dashboard/',
  PAYMENT_HOSTED_PAGE: '/payment/hosted-page',
  WORKSPACES: '/workspace',
  ACCESSIBLE_RESOURCES: '/accessible-resources',
  INSTANCE_INVITE_ACTION: '/instance/invite',
  USER_PROFILE: '/user/profile',
  TEAMS_API: '/teams',
  TEAMS_IN_TENANT_API: '/teamsInTenant',
  UPDATE_TEAMS_API: '/team',
  CREATE_UPDATE_TEAM_WITH_SOURCE_AND_KHOJI_USERS: '/onboarding/team/sourceAndSystem',
  DELETE_TEAMS_API: '/teams/delete',
  PROJECTS_API: '/projects',
  INSTANCE_USER: '/user/me',
  USER_PREFERENCE: '/user/preferences',
  LOG_MY_WORK_SUMMARY: '/getUserWorklogSummary',
  ISSUE_ID_VALIDITY: '/issue/verify/%s1',
  ISSUE_SEARCH_API: '/issue/search?query=',
  POST_AI_GENERATED_WORKLOG: '/post/worklogs',
  EDIT_WORKLOG: '/edit/worklogs',
  DELETE_WORKLOG: '/delete/worklogs',
  REQUEST_ACCESS_API: '/request/access',
  REQUEST_ACCESS_PAGE: '/request-access',
  CLEAR_CACHE: true,
  //unit is in milliseconds, 1000ms = 1 second, 1000ms * 60s = 1 minute, 1000ms * 60s * 60m = 1 hour
  STATUS_CONFIG_REFRESH_TIME: 10800000, //setting to 3 hours
  VARIANCE_CONFIG_REFRESH_TIME: 10800000, //setting to 3 hours
  STATUS_CATEGORY_CONFIG_REFRESH_TIME: 10800000, //setting to 3 hours
  STATUS_CONFIGS: '/statusConfigs?issueType=',
  STATUS_CATEGORY_CONFIGS: '/statusCategoryConfigs',
  GENERATE_WORKLOG_WITH_AI: '/worklog/generate',
  GENERATE_WORKLOG_SUMMARY_WITH_AI: '/generate/current-summary',
  GENERATE_DAILY_SCRUM_UPDATES_WITH_AI: '/generate/scrum-updates',
  UPSERT_DAILY_SCRUM_UPDATES: '/scrum/save',
  FETCH_SAVED_DAILY_SCRUM_UPDATES: (instanceId: string, userId: string, startDate: Date, endDate: Date) => `/scrum/${instanceId}/users/${userId}/gather?startDate=${startDate?.formatISODateOnly()}&endDate=${endDate?.formatISODateOnly()}`,
  FETCH_TEAM_SCRUM_UPDATES: (instanceId: string, startDate: Date, endDate: Date) => `/scrum/${instanceId}/gather?startDate=${startDate?.formatISODateOnly()}&endDate=${endDate?.formatISODateOnly()}`,
  PING_AI_CACHE_PROMPT: '/ping/cache/prompt',
  NO_SPRINT_WARNING_TOAST_DURATION: 6000,
  VALIDATE_USER_API: '/user/validate',
  TOAST_TIMEOUT_DURATION: '6000', //10 seconds {1000 = 1 sec}
  SUCCESS_MESSAGE_FOR_REPORT_TOAST_TIMEOUT_DURATION: '3000000',
  INVITE_USER_API: '/invite-user',
  ASSIGN_SUPERVISORS_API: '/teams/assignsupervisors',
  INVITE_AGAIN_API: '/invite-again',
  UPDATE_USER_API: '/update-user',
  UPDATE_USER_DETAILS_IN_BULK: '/update/users/details',
  UPDATE_USER_DETAILS_API: '/update/users/details',
  UPDATE_USER_EMAIL_SETTINGS_API: '/user/update/email',
  CATEGORY_CONFIGS_API: '/source/categoryconfigs',
  SOURCE_USERS_API: '/source/users',
  SOURCE_CUSTOM_FIELDS_API: '/source/customFields',
  REVOKE_ACCESS: '/user/revoke',
  ENABLE_ACCESS: '/user/enable-access',
  UPDATE_CHANGED_PASSWORD: '/user/change-password',
  UPDATE_WORKLOG_SETTING: '/users/settings/',
  DELETE_ACCOUNT_API: '/delete/tenant',
  DELETE_APP_API: '/instance/delete',
  DELETE_USER_ACCOUNT_API: '/user/delete/profile',
  EVALUATOR_URL: '/gateway',
  TENAND_ID: 'dev_tenant1_jira',
  WORKLOG_CONFIG: '/getWorkLogConfig',
  ISSUE_TYPES: '/source/issuetype',
  FEATURES: '/features',
  CREATE_INSTANCE: '/instance/create',
  UNLOCK_FEATURES: '/features/unlock',
  INSTANCE: '/instance',
  GET_CONFIGS: '/getConfigs',
  UPSERT_CONFIG: '/upsertConfig',
  UPSERT_CONFIG_IN_BATCH: '/upsertConfigsInBatch',
  WORKLOG_CONFIG_SCHEDULED_JOB_MINUTES: 5,
  WORKLOG_CONFIG_MAX_HOURS_PER_DAY: 16,
  ROLES_API: '/user/roles',
  // issue collector link for Provide Feedback form
  // Supplied at runtime via env.js (Docker) / operator config; empty disables the feedback widget.
  JIRA_ISSUE_COLLECTOR_LINK: '',
  // Data Sync Endpoints
  DATA_SYNC_STATUS: '/sync/status',
  DATA_SYNC_START: '/sync/start',
  DATA_SYNC_START_JOB: '/sync/submit',
  SPRINT_ANALYTICS: '/analytics/get-analytics-data',
  SPRINT_STATIC_SUMMARY: '/analytics/sprint-static-summary',
  SPRINT_STATUS_CHANGES: '/analytics/sprint-status-changes',
  SPRINT_TEAM_PULSE: '/analytics/sprint-team-pulse',
  SPRINT_VELOCITY_BURNDOWN: '/analytics/sprint-velocity-burndown',
  SPRINT_EPIC_FETCH: '/analytics/epic-fetch',
  PROACTIVE_SPRINTS: '/sync/proactive/sprints',
  PROACTIVE_SPRINT_TARGET_ENDPOINT: '/sync/proactive/sprints/target',

  // ChatBot Endpoints — supplied at runtime via env.js (Docker); empty by default.
  CHAT_BOT: '',

  // User Tracking
  TRACKING_PROVIDER: 'POSTHOG',
  TRACKING_API_TOKEN: '', // set via environment (NG_TRACKING_API_TOKEN); never commit a live token
  TRACKING_API_HOST: 'https://app.posthog.com',
  TRACKING_AUTO_EVENTS: false,
  TRACKING_NAVIGATION_EVENTS: false,
  TRACKING_USER_ACTION_EVENTS: false,
  TRACKING_APPLICATION_STATUS_EVENTS: false,

  JIRA_CLIENT_ID: 'OObevlSfWpZbEl73iTHIyxFIRon0dScj',
  // Default scopes used when no feature-specific scopes are required.
  // Stored as a string because Docker environment variables provide a string.
  // Format: space-separated scopes (may be URL-encoded). Parse into string[] before use.  
  JIRA_DEFAULT_SCOPES: 'read:me read:jira-user offline_access',

  CAPTCHA_KEY: '6LdTOxwqAAAAABR952jM1jw27puo1_kJLxl-82gZ',
  DISABLE_CAPTCHA: true,
  RSS_FEED_URL: '/getRssFeed',

  // Integrations — not hardcoded; supplied at runtime via env.js (Docker) or
  // by the operator for non-Docker builds. MS calendar UI is gated on
  // MS_OAUTH_ENABLED so it vanishes when MS OAuth is unconfigured.
  MS_OAUTH_CLIENT_ID: '',
  MS_OAUTH_TOKEN_URL: '',
  MS_OAUTH_REQUESTED_SCOPES: '',
  MS_OAUTH_ENABLED: false,

  // Unleash
  UNLEASH: true,
  UNLEASH_URL: 'http://localhost:4242',
  UNLEASH_API_TOKEN: '',
};
