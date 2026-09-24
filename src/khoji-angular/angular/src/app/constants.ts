/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { ISpecialCharatersEncoding } from './interface/special-charaters.interface';

//TODO : separate color constants and configs constants
//TODO : add all data types for variables
export class Constants {
  // max image size to be uploaded on signup or update profile (10mb)
  public static MAX_IMAGE_SIZE = 10485760;

  public static WATERMARK = '© ScrumUpdate Contributors';
  public static WORKLOG_CATEGORY_OTHER = 'Others (Default)';

  //Its a dynamic property it will simply replace the charcter with encoded value.
  //If you want to escape another chracter just add new object with respective attribute values
  public static specialCharsEncoding: Array<ISpecialCharatersEncoding> = [{ specialCharacter: "'", encodedValue: '&#39;', replaceValue: '' }];

  //Whitespace
  public static SPACE: string = ' ';
  //Response messages from server that we are displaying to user.
  public static FAILED_TO_LOAD_RESPONSE: string = 'Something went wrong, please try again.';
  public static SOURCE_USERS = 'sourceUsers';

  //Titles to display in toast messages.
  public static TITLE_ERROR: string = 'Error!' + ' ';

  //Tool-tips config
  public static TOOL_TIP_SWITCH: boolean = true;

  //Issue types
  public static ISSUE_TYPE_EPIC: string = 'Epic';

  //Common colors.
  public static TIME_REMAINING: string = 'rgba(90,164,84, 0.8)'; //Apple
  public static NEW_WORKLOG_CATEGORY: string = '#35ACC7';

  //worklog main pie chart colors
  public static OTHERS: string = '#788DA0';

  // Color Picker Palette Colors
  public static COLOR_PICKER_PALETTE: string[] = [
    '#A9A9A9',
    '#E58B56',
    '#EDC759',
    '#88C861',
    '#22D4BF',
    '#51A4EB',
    '#8FA1BB',
    '#858585',
    '#D3782D',
    '#F7C047',
    '#73B433',
    '#00BCA6',
    '#2187E4',
    '#6F8CB5',
    '#6D6D6D',
    '#C65911',
    '#EAAB20',
    '#659E2B',
    '#00A08D',
    '#406FC6',
    '#516E97',
    '#5A5A5A',
    '#BD3117',
    '#BF8F00',
    '#4A782B',
    '#008777',
    '#0040BE',
    '#495E7B',
    '#454638',
    '#833C0C',
    '#806000',
    '#375623',
    '#005E52',
    '#003C8C',
    '#333F4F'
  ];

  //  Color Picker Radius
  public static COLOR_PICKER_RADIUS = 10;

  //Bug Pie, StoryPoints Chart Color
  public static INPROGRESS: string = '#C7B42C';
  public static RESOLVED: string = '#5AA454';
  public static PRIMARY_TEXT_COLOR: string = '#707070';

  //Lowest standard resolutions
  public static WIDTH_LOWEST: number = 1366;
  public static HEIGHT_LOWEST: number = 768;

  //Epic Analysis datatable epic row class
  public static EPIC_ROW = 'epic-row';
  public static RAG_STATUS = 'ragStatus';
  public static ALERTS_ERRORS = 'alerts.errors';
  public static ALERTS_WARNINGS = 'alerts.warnings';
  public static RAG_AND_ALERTS = 'ragAndAlerts';
  public static ALERTS_ISSUE = 'Alerts';

  //admin view teams table
  public static TEAM_TEAMBOARDS = 'teamBoards';
  public static TEAM_MEMBERS = 'members';
  public static TEAM_SUPERVISORS = 'supervisors';
  public static TEAM_NAME = 'teamName';
  public static MEMBER_FULL_NAME = 'fullName';
  public static MEMBER_REVOKED_STATUS = 'REVOKED';

  public static COMPONENTS_STATE_SESSION_KEY: string = 'componentsDataState';
  public static USERNAME_SESSION_KEY: string = 'username';
  public static TOKEN_SESSION_KEY: string = 'token';
  public static TOKEN_SESSION_START_VALUE: string = 'Bearer ';
  public static ALERT_CONFIRM_BY_USER: string = 'alertIsConfirmedByUser';
  public static INSTANCE_ID = 'instanceId';
  public static SPACE_ID = 'spaceId';
  public static EVENT_STORAGE_STORE_ITEM = 'storage-storeItem';
  public static EPIC_ANALYSIS_TAB: string = '#/#epicAnalysis';
  public static EPIC_ANALYSIS_TABLE_ID: string = 'epic-index';

  public static TEAM_WORKLOG_DETAIL_TAB_ID = 'team-worklog-detail-tab';
  public static TEAM_WORKLOG_DASHBOARD_TAB_ID = 'team-worklog-dashboard-tab';
  //New admin dashboard tables
  public static CREATE_TEAMS_TABLE_ID = 'create-teams-table';
  public static VIEW_TEAMS_TABLE_ID = 'view-teams-table';
  public static ALLOCATE_SUPERVISOR_MANAGE_USER_TABLE_ID = 'allocate-supervisor-users-table';
  public static ALLOCATE_SUPERVISOR_MANAGE_USER_TEAMS_TABLE_ID = 'allocate-supervisor-users-teams-table';
  public static TEAM_WORKLOG_TABLE_CONTAINER: string = 'worklog-table-container';
  public static DATA_TABLE_SEARCH_INPUT_TOOLTIP: string = 'Filter from all rows';
  public static INITIAL_ROWS_PER_PAGE: number = 10;
  public static DATATABLE_POPUP_INTERVAL_TIME: number = 2000;
  public static SHOW_REQUEST_PANEL_QUERY_PARAM = 'request-panel';

  //Story comments datatable pagination config
  public static ALL_STATUS_FILTER: string = 'All';

  public static RESOLVED_STATUS: string = 'Resolved';

  //Datatable names and height
  public static DATATABLE_HEIGHT = '560px';
  public static MIN_COLUMN_WIDTH = 65;
  public static AUTO_COLUMN_WIDTH = '100px';
  public static MEMBER_WORKLOG_PERCENTAGE_ANALYSIS_TABLE_ID = 'member_worklog_percentage_table';

  //burnup detail table selection mode
  public static MULTIPLE_SELECTION_MODE = 'multiple';
  public static NONE_SELECTION_MODE = 'none';
  public static FIX_VERSION = 'fixVersion';

  //DataTable map keys
  public static NUMERIC_DATATYPE = 'numeric';

  //Note for exporting fix version
  public static NOTE_FIX_VERSION = '(i) in Fix Versions represents inherited from a parent.';

  //Teamboard Analysis Dropdown Sprint Styling Classes
  public static DROPDOWN_STATUS_STYLE: object = {
    closed: 'closed-sprint',
    future: 'future-sprint',
    active: ''
  };

  //scrolll Directions
  public static BOTH_DIRECTION = 'both';

  //Echarts Style Properties
  public static ECHARTS_FONT_STYLE = 'Nunito';
  public static ENABLE_CHART_ANIMATION = false;

  //Element ID Constants for RPA
  //TO DO: Need to change in screenshot repo
  public static RPA_IN_PROGRESS_STORIES_CLOSE_BUTTON = 'modal-close-button';
  public static RPA_IN_PROGRESS_STORIES_MODAL_TITLE = 'modal_title';
  public static RPA_REQUEST_PANEL_SUBMIT_BUTTON = 'rpa-submit-button';
  public static RPA_TEAMS_SELECT = 'rpa-teams-select';
  public static RPA_TEAM_DROP_DOWN_ICON = 'rpa-team-drop-down-icon';
  public static RPA_IN_PROGRESS_STORIES_MODAL_DESC = 'rpa-modal-description';
  public static RPA_TEAM_WORKLOG_DASHBOARD_LINK = 'rpa-team-worklog-dashboard-link';
  public static RPA_TEAM_WORKLOG_DETAIL_LINK = 'rpa-team-worklog-detail-link';
  public static RPA_TEAM_WORKLOG_DISTRIBUTION_GRAPH_LEGENDS = 'rpa-team-worklog-distribution-graph-legends';
  public static RPA_TEAM_WORKLOG_READY_DISTRIBUTION = 'rpa-team-worklog-distribution-graph';
  public static RPA_TEAM_WORKLOG_DETAILS_TABLE = 'rpa-team-worklog-details-table';
  public static RPA_TEAM_WORKLOG_DETAILS_HIDE_COLUMNS_BUTTON = 'rpa-team-worklog-details-hide-columns-button';
  public static RPA_TEAM_WORKLOG_DETAILS_TABLE_CATEGORY_COLUMNS = 'rpa-team-worklog-details-table_category_columns';
  public static RPA_TEAM_WORKLOG_DETAILS_TABLE_COLUMNS_TO_SHOW = 'Worklog';
  public static RPA_TEAM_WORKLOG_MODAL_TOOLTIP = 'rpa-team-worklog-modal-worklog-column-tooltip';

  public static PRIME_NG_DATE_FORMAT = 'DD/MM/YYYY';
  public static DATE_FORMAT = 'yyyy-MM-dd';

  public static WORKLOG_REQUEST_PANNEL_PINNABLE: boolean = true;
  public static WORKLOG_REQUEST_PANNEL_PINNED: boolean = true;

  public static KHOJI_DASHBOARD_PAGE = 'admin-panel';
  public static KHOJI_FORGOT_PASSWORD_PAGE = 'forgot-password';

  public static WAND_ICON_AI = 'assets/svg/ai_wand_icon.svg';
  public static MANUAL_WORK_LOG_ICON = 'assets/svg/manual-work-log.svg';
  public static AI_ICON = 'assets/svg/ai.svg';
  public static POPPERS = 'assets/svg/poppers.svg';
  public static WAIT_ICON = 'assets/images/wait_icon.png';
  public static GENERATE_AI_WORKLOG_LOADING_GIF = 'assets/gif/generate_worklog_loading_animation.gif';
  public static KHOJI_IMAGE_DELETE_ICON = 'assets/images/delete-button.png';
  public static KHOJI_UPLOAD_ICON = 'assets/svg/profile-icon.svg';
  public static ERROR_SVG = 'assets/svg/errorOccurred.svg';
  public static OUTLOOK_SVG = 'assets/svg/outlook.svg';
  public static SPARKLES_SVG = 'assets/svg/sparkles.svg';

  //User profile image
  public static IMAGE_MINIMUM_SIZE = 200;
  public static IMAGE_ACCEPTABLE_FORMATES = '.png, .jpg, .jpeg';
  public static IMAGE_REGX_PATTERN = '(https?:\/\/.*\.(?:png|jpg|jpeg))';

  //Email
  /**
   * RegEx acceptance criteria:
   * <ul>Only numbers alphabets and 19 special characters are allowed.</ul>
   * <ul>@ symbol is mandatory</ul>
   * <ul>After @ symbol, 1 domain and one high-level domain is mandatory</ul>
   * <ul>domain name can have numbers, alphabets and hyphen only</ul>
   */
  // TODO: change the string to regex
  public static KHOJI_EMAIL_REGX = "[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?";
  public static KHOJI_EMAIL_REGX_LOGIN = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

  //Empty String
  public static EMPTY_STRING = '';

  public static INVALID_WORKLOG_CATEGORY_NAME_REGEX = /^(?!.*[ /-]{2,})(?!^[ /-]|.*[ /-]$)[a-zA-Z0-9 /-]+$/;

  //Admin settings icon
  public static SETTINGS_ICON = 'assets/images/settings-icon.svg';
  public static UPDATE_SETTINGS_ICON = 'assets/images/update-settings-icon.svg';

  //Input validation Regex
  /**
   * RegEx acceptance criteria:
   * <ul> alphabetic characters with spaces, hyphens (-), dots (.) and apostrophes (‘) are allowed.</ul>
   * <ul>The mentioned special characters cannot be next to each other.</ul>
   * <ul>Name must start from an alphabet.</ul>
   * <ul>Name can end with a special character</ul>
   */
  public static INVALID_USERNAME_REGEX = "([A-Za-z]+( |'|-|\\. |\\.))*[A-Za-z]([A-Za-z]*([.\'\\-])|[A-Za-z]*)";
  public static VALID_TEAMNAME_REGEX = /^[a-zA-Z0-9]+(?:[\s-.'\/]+[a-zA-Z0-9]+)*$/;
  public static USERNAME_MAX_LENGTH = '40';
  public static VIEW_TEAMS_MAX_LENGTH = 30;
  public static TEAMNAME_MAX_LENGTH = 25;
  public static CATEGORY_MAX_LENGTH = 25;
  public static CATEGORY_MIN_LENGTH = 2;

  public static IS_DIRTY_STATE_ON_SOURCE_MAPPING = 'isDirtyStateOnSourceMapping';

  // Minimum team count allowed to display a menu
  public static MINIMUM_TEAM_LIMIT: number = 1;

  //Payment portal pages name (Chargebee specific)
  public static PAYMENT_PORTAL_SESSION_PAGE = 'portal_session';
  public static PAYMENT_CHECKOUT_PAGE = 'hosted_page';

  //Component On/Off constants
  public static DELIVERY_ANALYSIS = 'delivery-analysis';
  public static ANALYSIS_BY_TEAMBOARDS = 'analysis-by-teamboard';
  public static ANALYSIS_BY_RELEASE = 'analysis-by-release';
  public static ANALYSIS_BY_WORKLOG = 'analysis-by-worklog';
  public static REPORT = 'reports-analysis';
  public static TEAM_PROGRESS_REPORT = 'team-progress-report';
  public static RELEASE_REPORT = 'release-report';
  public static INDICATOR_SUMMARY_BY_TEAM = 'indicator-summary-by-team';
  public static WORKLOG = 'worklog-analysis';
  public static EPIC_ANALYSIS = 'epic-analysis';
  public static TEAM_INDICATOR_ANALYSIS = 'team-indicator';
  public static ISSUES_DEFECT_ANALYSIS = 'issue-defect-analysis';
  public static VARIANCE_INDICATOR = 'variance-indicators';
  public static ALERTS_ANALYSIS = 'alerts-analysis';
  public static REPORT_ANALYSIS_URL = 'report-analysis';
  public static MANAGE_TEAMS = 'manage-teams';
  public static ISSUES_BASE_FIELD_TRACKER = 'issues-basefield-tracker';
  public static USER_TRACKING_STATUS = 'uts';
  public static KHOJI_USER_EMAIL_SETTINGS = 'khoji-user-email-settings';
  public static MANAGE_SETTINGS = 'manage-settings';
  public static TEAM_WORKLOG_CATEGORIZATION = 'team-worklog-categorization';

  // khoji limitations
  public static USERS_ALLOWED = 'users_allowed';
  public static TEAMS_ALLOWED = 'teams_allowed';
  public static SOURCE_BOARDS_ALLOWED = 'source_boards_allowed';
  public static MEMBERS_IN_TEAM = 'members_in_team';

  //For Airthmetic operations of tables such as TOTAL/AVG
  public static TOTAL = 'Total';
  public static AVG = 'Average';

  //Feature flag
  public static SUBTASK_DISTRIBUTION_FEATURE = 'sub-task-distribution';
  public static DASHBOARD_INSIGHTS_FEATURE = 'dashboard-insights';

  // Access Level Code to Name Map
  public static ACCESS_LEVEL_CODE_NAME_MAP = {
    USER: 'User',
    ADMIN: 'Admin',
    TENANT_ADMIN: 'Tenant Admin'
  };

  public static NEW_TENANT_ADMIN_DASHBOARD_KEY = 'NEW_TENANT_ADMIN_DASHBOARD';
  public static CLOUD_FEATURE_KEY = 'CLOUD';
  public static WARNING_COUNT: 'warning-count';
  public static NETWORK_COUNT: 'network-count';
  public static CACHE_MODE_REDIS = 'redis';
  public static ES_DATASOURCE = 'ES';
  public static KHOJI_CONGIG_CACHE_DURATION_SECONDS = 10;
  public static DASHBOARD_CACHE_DURATION_SECONDS = 10;

  public static HOURS_IDENTIFIER = ' hrs';
  public static MAIN_CATEGORY = 'mainCategory';
  public static OTHER_CATEGORY = 'otherCategory';
  public static OTHER_CATEGORY_NAME = 'Others';
  public static ALL_OTHER_ISSUE_TYPES_GROUP = '#';
  public static RECENTLY_USED_ISSUE_TYPES_GROUP = 'Recently work logged issue types';

  public static RED_COLOR_CODE = '#DC143C';
  public static AMBER_COLOR_CODE = '#FFD700';
  public static WHITE_COLOR_CODE = '#FFFFFF';
  public static BLACK_COLOR_CODE = '#000000';

  public static BOTH = 'BOTH';
  public static AMBER = 'AMBER';
  public static RED = 'RED';

  //For email frequencies
  public static DAILY = 'DAILY';
  public static WEEKLY = 'WEEKLY';
  public static MONTHLY = 'MONTHLY';

  //p-tag sverities
  public static SEVERITY_DANGER = 'danger';
  public static SEVERITY_WARNING = 'warning';
  public static SEVERITY_SUCCESS = 'success';
  public static PLUS_SIGN = '+';

  public static COMMA_WITH_SPACE_REGEX = /,/g;

  //users billing strategy
  public static MENU_CLICK = 'menu-click-';
  public static TAB_CLICK = 'tab-click-';

  // Khoji Steps Component Keys
  public static KHOJI_STEPS_ONBOARDING_KEY = 'onboarding-steps';

  //Worklog Status Titles
  public static MISSING = 'Missing';
  public static INCOMPLETE = 'Incomplete';
  public static COMPLETED = 'Completed';

  public static FEATURE_MY_WORK = 1;
  public static FEATURE_TEAM_VIEW = 2;

  public static LOADING_TPL_DISPLAY_TIME = 4000;
  public static MINIMUM_WORKLOG_HOURS_ALLOWED_ON_JIRA = 0.02;

  public static TOUR_GEN_AI_WORKLOG = 'tour-generate-ai-worklog';
  public static TOUR_GEN_AI_WORKLOG_TABLE = 'tour-generate-ai-worklog-table';
  public static WAND_ICON_AI_WHITE = 'assets/svg/ai_wand_icon_white.svg';
  public static IS_HOURS_STORAGE_KEY = 'isHours';

  public static UNLEASH_FEATURE_FLAG_MY_WORKLOGS = 'my-worklogs';
  public static UNLEASH_FEATURE_FLAG_SCRUM_UPDATES = 'scrum-updates';

  public static UNLEASH_FEATURE_FLAG_STANDUP_BOARD = 'standup-board';
  public static UNLEASH_FEATURE_FLAG_WORKLOG_INSIGHTS = 'worklog-insights';
  public static UNLEASH_FEATURE_FLAG_TEAM_PULSE = 'team-pulse';
  public static UNLEASH_FEATURE_FLAG_SCRUM_ASSISTANT = 'scrum-assistant';
  public static UNLEASH_FEATURE_FLAG_PLAN_DETAILS = 'plan-details';
  public static DATA_SYNC_STATUS_POLLING_TIME_MS = 1000;
}
