export enum RoutesCode {
    REPORT_ANALYSIS_DASHBOARD = 'ReportsDashboard',
    DELIVERY_ANALYSIS_DASHBOARD = 'DeliveryAnalysisDashboard',
    DASHBOARD = 'Dashboard',
    ANALYSIS_BY_WORKLOG = 'AnalysisbyWorkLog',
    ANALYSIS_BY_TEAMBOARD = 'AnalysisbyTeamBoard',
    ANALYSIS_BY_RELEASE = 'AnalysisbyRelease',
    REPORT_ANALYSIS = 'ReportAnalysis',
    TEAM_WORKLOG_ANALYSIS = 'TeamWorkLogAnalysis',
    ADMIN_PANEL = 'AdminPanel',
    USER_PROFILE = 'UserProfile',
    INSIGHTS = 'Insights',
}

export enum Routes {
    REPORT_ANALYSIS_DASHBOARD = 'reports',
    ANALYSIS_DASHBOARD = 'analysis',
    DELIVERY_ANALYSIS_DASHBOARD = 'delivery-analysis',
    DASHBOARD = 'dashboard',
    ANALYSIS_BY_WORKLOG = 'team',
    ANALYSIS_BY_TEAMBOARD = 'teamboard-analysis',
    ANALYSIS_BY_RELEASE = 'release-analysis',
    REPORT_ANALYSIS = 'report-analysis',
    TEAM_WORKLOG_ANALYSIS = 'timelog',
    ADMIN_PANEL = 'admin-panel',
    USER_PROFILE = 'user-profile',
    INSIGHTS = 'insights',
    CONFIGURE_SOURCE = 'configure-source',
    SIGNUP = 'signup',
    LOGIN = 'login',
    NOT_FOUND = 'not-found',
    FORGOT_PASSWORD = 'forgot-password',
    SESSION_EXPIRED = 'session-expired',
    ACCESS_DENIED = 'access-denied',
    REQUEST_ACCESS = 'request-access',
    TEAM_INSIGHTS = 'insights/team',
    HOME = '/',
    ONBOARDING = "onboarding",
    TEAM_SETUP = 'team-setup',
    SPACE = 'space',
    INTEGRATING = 'integrating',
    LINK_TO_MS_TEAMS_STATUS = 'link-to-ms-teams-status',
}

export enum RoutesTemplateIDs {
    TEAM_PROGRESS_REPORT = 'TPR',
    RELEASE_REPORT = 'RR',
    INDICATORS_SUMMARY_BY_TEAM = 'IST',
}


export enum RoutesBreadcrumbs {
    ANALYSIS_BY_TEAMBOARD = 'Analysis by Team Board',
    TEAM_WORKLOG_ANALYSIS = 'Team View',
    TEAM_PROGRESS_REPORT = 'Team Progress Report',
    RELEASE_REPORT = 'Release Report',
    INDICATORS_SUMMARY_BY_TEAM_BOARD = 'Indicators Summary by Team Board',
    REPORT_DASHBOARD = 'Reports Dashboard',
    REPORT_ANALYSIS = 'Report Analysis',
    ANALYSIS_BY_RELEASE = 'Analysis by Release',
    MANAGE_TEAMS = 'Manage Teams',
    ADMIN_DASHBOARD = 'Admin Dashboard',
    MANAGE_USERS = 'Manage Users',
    INVITE_USER = 'Invite User',
    USER_DETAIL = 'User Detail',
    ANALYSIS_BY_WORKLOG = 'Analysis by Work Log',
    DELIVERY_ANALYSIS_DASHBOARD = 'Delivery Analysis Dashboard',
    DASHBOARD = 'Dashboard',
    ADMIN_PANEL = 'Admin Panel',
    PROFILE_SETTINGS = 'Profile Settings',
    SETTINGS = "Settings"
}

export enum subRoutes {
    TEAM_INSIGHTS = '/insights/team',
    USERS_DETAILS = '/khoji-users-details',
    USERS = '/khoji-users',
    USER_MANAGEMENT = '/user-management',
    TEAMS = '/khoji-teams',
    ANALYSIS_BY_WORKLOG = '/timelog',
    KHOJI_USERS = '/admin-panel/khoji-users',
    ADMIN_PANEL = '/admin-panel',
    INSIGHTS = '/insights'
}
