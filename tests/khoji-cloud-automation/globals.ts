export const Globals = {
    JIRA_EMAIL: process.env.JIRA_EMAIL || 'test-user@scrumupdate.local',
    JIRA_PASSWORD: process.env.JIRA_PASSWORD || '',
    JIRA_ACCOUNT_ID: process.env.JIRA_ACCOUNT_ID,
    KBP_BASIC_AUTH_CREDS: process.env.KBP_BASIC_AUTH_CREDS || 'admin:admin',
    KBP_URL: process.env.KBP_URL || '',
    SERVER_URL: process.env.SERVER_URL || '',
    APP_NAME: process.env.APP_NAME,
    POSTHOG_URL: '',  // not required for now
    POSTHOG_PROJECT_KEY: '', // not required for now
    POSTHOG_USER_ID: 0, // not required for now
    POSTHOG_TOKEN: process.env.POSTHOG_TOKEN || '', // not required for now
    KBS_BASIC_AUTH_CREDS: process.env.KBS_BASIC_AUTH_CREDS || ''
}