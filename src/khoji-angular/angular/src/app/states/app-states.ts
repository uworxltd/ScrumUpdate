/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Member, Team, User } from 'app/admin/admin.entities';
import { AdminState } from 'app/admin/state/admin.state';
import { ADMIN_TABLE_CONFIGS, DATATABLES_CONFIGS, ISSUE_SOURCE_TYPE_CONFIGS, ISSUE_SOURCE_TYPE_FETCH_FREQUENCY, SPRINT_ANALYTICS_TARGET_SPRINT, WORKLOG_DISTRIBUTION } from 'app/constants.configs';
import { DateLabel } from 'app/dropdowns/date-range/date-range.component';
import { AngularAppConfigs, DropdownGroupingConfig, KhojiConfigs } from 'app/interface/khoji-config.interface';
import { TeamWorklogStatistics } from 'app/interface/team-worklog-stats';
import { UpdatedUserOnChange } from 'app/interface/updated-user.interface';
import { WorkLogCategory } from 'app/interface/worklog-catagory';
import WorklogDistributionConfig from 'app/types/worklog-distribution.config';
import { UserProfileState, UserSetting } from 'app/user-profile/state/user-profile.states';
import { MenuItem } from 'primeng/api';
import { SourceIssueTypeConfig } from '../interface/worklog-catagory';
import { PaymentHostedPageObject } from './../user-profile/state/user-profile.states';
import { SprintAnalytics, ProActiveSprint } from 'app/analysis/sprint-analytics-types';
import { SprintStaticSummary } from 'app/analysis/sprint-static-summary-card/sprint-static-summary-card.component';
import { TeamPulseData } from 'app/analysis/sprint-team-pulse-card/sprint-team-pulse-card.component';
import { ChatBotState } from 'app/chat/chat/state';
import { JobType } from './global-configs.actions';
import { SavedDailyScrumUpdate } from 'app/interface/daily-scrum-update.interface';

export type ThroughputInterval = 'Weekly' | 'Monthly' | 'Fortnightly';
export type DataFetchingStrategy = 'Weekly' | 'Monthly' | 'Fortnightly';

export interface AppState {
  globalFilters: GlobalFilters;
  requestFilters: RequestFilters;
  globalTranslations: GlobalTranslations;
  globalConfigs: GlobalConfigs;
  loadingStates: LoadingStates;
  calculatedState: RequestPanelState;
  teamWorklogStatistics: TeamWorklogStatistics;
  teamWorklogStatisticsForThisMonth: TeamWorklogStatistics;
  admin?: AdminState;
  invitedUser?: InvitedUser;
  userProfile: UserProfileState;
  menu: MenuItem[];
  updatePassword?: UpdatePassword;
  paymentHostedObject: PaymentHostedPageObject;
  logMyWork: LogMyWork;
  commands: AppCommands;
  sprintAnalyticsState: SprintAnalyticsState;
  chatBotState: ChatBotState;
}

export interface SprintAnalyticsState {
  sprintAnalytics: SprintAnalytics;
  proactiveSprints: ProActiveSprint[];
  targetProactiveSprintId: string;
  staticSummary?: SprintStaticSummary | null;
  staticSummaryLoadingState?: LoadingState;
  statusChanges?: any | null;
  statusChangesLoadingState?: LoadingState;
  teamPulse?: TeamPulseData | null;
  teamPulseLoadingState?: LoadingState;
  velocityBurndown?: any | null;
  velocityBurndownLoadingState?: LoadingState;
  epicProgress?: any | null;
  epicProgressLoadingState?: LoadingState;
  /** worklog sync status per sprint: { [sprintId]: JobStatus } */
  worklogSyncJobStatus: { [key: number]: JobStatus };
}
export interface InstanceUser {
  calendarIntegration: boolean;
  calendarTokenValid: boolean;
  accountId: string;
  instanceId: string;
  name: string;
  timeZone: string;
  userPreferences: UserPreferences;
}

export interface ActivityState {
  message: string;
  errorCode: string;
}

export interface LogMyWork {
  instanceUser: InstanceUser;
  summary: LogMyWorkSummary;
  aiGeneratedWorklog: AIGeneratedWorklog[];
  uniqueIdentifier: string;
  issueIdValidity: IssueIdValidity;
  activityState: ActivityState;
  summaryData: AILogMyWorkSummaryData;
  manualWorkLogModal: ManualWorkLogModalState;
  submittedWorklogResponse: AISubmittedWorklogResponse;
  edittedWorkLogsResponse: AISubmittedResponse;
  selectedTicketDetails: SelectedTicketDetails;
  manualWorklogSubmitted: boolean;
  pingAiCachePromptResult: {
    time: Date;
    responseCode: number;
  };
  userPreferencesUpdated: number;
  weeklyWorklogSummary: WeeklyWorklogSummary;
  weeklyWorklogSummaryDateRange: [Date, Date];
  dailyScrumUpdates: DailyScrumUpdates;
  savedDailyScrumUpdates: SavedDailyScrumUpdate[];
  dailayScrumDates: DailyScrumDates;
}

export interface WeeklyWorklogSummary {
  message: string;
  summary: string;
  dateRange: [Date, Date];
  instanceId: number;
}

export interface DailyScrumUpdates {
  message: string;
  current_day: string;
  last_day: string;
  blockers: string;
  dates: DailyScrumDates;
  /** instanceId is assigned in effect */
  instanceId: string;
  isSavedDailyScrumUpdate: boolean;
  isSavedDailyScrumUpdateAvailable: boolean;
  updatedAt: Date;
}

export interface DailyScrumDates {
  todayDate: Date;
  yesterdayDate: Date;
}

export interface LogMyWorkSummary {
  worklogPercentage: number;
  totalAvailableSeconds: number;
  totalLoggedTimeInSeconds: number;
  loggedTimePerDay: LoggedTimePerDay[];
  workLogHoursPerDayConfig: number;
  thresholdColors: { [level: string]: string };
  thresholdPercentage: { [level: string]: number };
  updatedFromEffect: boolean;
}

export interface LoggedTimePerDay {
  date: string;
  data: TicketWorklogData[];
}

export interface TicketWorklogData {
  ticketId: string;
  ticketDescription: string;
  workLogItems: WorklogItem[];
}

export interface WorklogItem {
  workLogId: string;
  description: string;
  timeSpentInSeconds: number;
  timeSpentInHours?: number;
  newWorklog?: boolean;
}
export interface AIGeneratedWorklog {
  id: number | string;
  taskId: string;
  hours: number;
  comments: string;
  taskUrl?: string;
  taskTitle?: string;
  suggestionKey?: SearchIssuesSuggestions;
}

export interface SearchIssuesSuggestions {
  summary: string;
  key: string;
}

export interface AIGeneratedWorklogResponse {
  date: string;
  key: string;
  time: number;
  summary: string;
  reason: string;
  uniqueIdentifier: string;
  taskTitle: string;
}

export interface AIResponse {
  errorCode: string;
  message: string;
  data: AIGeneratedWorklogResponse[];
  uniqueIdentifier: string;
}

export interface AIGeneratedWorklogPayload {
  accountId: string;
  worklogs: AIWorklog[];
  uniqueIdentifier: string;
}

export interface AIWorklog {
  ticketId: string;
  ticketDescription?: string;
  timelogInSeconds: number;
  comment: string;
  startedAt: string;
  // for edit/update provide this id else it should be null
  workLogId?: string;
}

export interface IssueIdValidity {
  id: string;
  valid: boolean;
}

export interface EvalConfig {
  propKey: string;
  propValue: any;
}

export interface WorklogTeamSelectable {
  name: string;
  selected: boolean;
}

export interface RequestFilters {
  worklogTeams: string[];
  /** Initialized with GlobalFilters.worklogTeams. This is used in selectTeamWorklogStats selector */
  worklogTeamsFilter: WorklogTeamSelectable[];
  worklogTeamsList: Team[];
  users: User[];
  members: Member[];
  dataFetchingStrategy: DataFetchingStrategy;
  teams: string[];
  dateLabel: DateLabel;
  dateTo: string;
  dateFrom: string;
  clearCache: boolean;
  aboveThreshold: boolean;
  status: string;
  requestId: string;
}

export interface GlobalFilters {
  /** selected team ids */
  teams: string[];
  /** fetched team items */
  teamsList: string[];

  /** selected worklogteam ids */
  worklogTeams: string[];
  /** fetched worklogteams */
  worklogTeamsList: Team[];

  /** selected members */
  members: Member[];
  users: User[];

  dateTo: string;
  dateFrom: string;
  dateLabel: DateLabel;
  throughputInterval: ThroughputInterval;
  status: string;
  clearCache: boolean;
  showBarLabels: boolean;
  othersChartDataAvailable: boolean;
  teamWorklogUpdated: boolean;
  isLocalFilterTriggered: boolean;
}

export interface RequestPanelState {
  teamWorklogRequest: {
    requestChanged?: boolean;
    validRequest?: boolean;
  };
}

export interface InvitedUser {
  user: User;
  codeExpired: boolean;
}

export interface UpdatePassword {
  codeExpired: boolean;
}

export interface ExportState {
  exportRequestInfo: any;
  reportExportingState: LoadingState;
}

export interface GlobalTranslations {
  translation: any;
}

export interface AiGeneratedIssueType {
  issueTypeId: string;
  issueTypeName: string;
}
export interface AiGeneratedCategory {
  title: string;
  issuetypes: AiGeneratedIssueType[];
}

export interface GlobalConfigs {
  khoji: KhojiConfigs;
  angularAppConfigs: AngularAppConfigs;
  datatable: any;
  datatableButtons: any;
  indicatorFooterConfigs: any;
  groupingConfigs: DropdownGroupingConfig;
  workLogConfig: Array<WorkLogCategory>;
  configsUpdatedState: {
    [key: string]: boolean;
  };
  configsErrorState: {
    [key: string]: boolean;
  };
  serverConfigs: {
    [key: string]: any;
    [WORKLOG_DISTRIBUTION]?: Record<string, WorklogDistributionConfig>;
    [DATATABLES_CONFIGS]?: Record<string, any>;
    [ADMIN_TABLE_CONFIGS]?: Record<string, any>;
    [ISSUE_SOURCE_TYPE_FETCH_FREQUENCY]?: number;
    [ISSUE_SOURCE_TYPE_CONFIGS]?: SourceIssueTypeConfig;
    [SPRINT_ANALYTICS_TARGET_SPRINT]?: string;
  };
  updatedUser: UpdatedUserOnChange;
  updatedUserSettings: UserSetting;
  fetchButton: boolean;
  aiGeneratedCategories: AiGeneratedCategory[];
  dataSyncJobStatus: { [key: string]: DataSyncJobStatus };
}

export enum LoadingState {
  Pending,
  Loading,
  Done,
  Error
}

export interface LoadingStates {
  globalStatisticsLoadingState: LoadingState;
  teamWorklogLoadingState: LoadingState;
  sourceUsersLoadingState: LoadingState;
  updateWorkLogEmailLoadingState: LoadingState;
  sprintAnalyticsLoadingState: LoadingState;
  worklogCategoryModalClosed: LoadingState;
  categoryConfigLoadingState: LoadingState;
  createTeamLoadingState: LoadingState;
  updateTeamLoadingState: LoadingState;
  deleteTeamLoadingState: LoadingState;
  subscriptionDetailsLoadingState: LoadingState;
  updatedUserProfileLoadingState: LoadingState;
  updateWorklogRAGEmailState: LoadingState;
  updateWorklogRAGConfigState: LoadingState;
  basicUsersLoadingState: LoadingState;
  assignUserTeamsLoadingState: LoadingState;
  deleteUserTeamsLoadingState: LoadingState;
  userDetailLoadingState: LoadingState;
  teamWorklogForThisMonthLoadingState: LoadingState;
  billingStrategyLoadingState: LoadingState;
  assignSupervisorsLoadingState: LoadingState;
  userProfileLoadingState: LoadingState;
  teamMembersLoadingState: LoadingState;
  teamWorkLogSummaryLoadingState: LoadingState;
  sourceIssueTypesLoadingState: LoadingState;
  updateOnboardingTeamLoadingState: LoadingState;
  worklogDistributionLoadingState: LoadingState;
  requestAccessLoadingState: LoadingState;
  editUserInBulkLoadingState: LoadingState;
  membersLoadingState: LoadingState;
  accountSetupLoadingState: LoadingState;
  instanceDetailsLoadingState: LoadingState;
  sendEmailForRemindTeamLoadingState: LoadingState;
  rolesLoadingState: LoadingState;
  workspacesLoadingState: LoadingState;
  instanceInviteActionLoadingState: LoadingState;
  accessibleResourcesLoadingState: LoadingState;
  instanceUserLoadingState: LoadingState;
  logMyWorkSummaryLoadingState: LoadingState;
  generateAIWorklogLoadingState: LoadingState;
  validateUserLoadingState: LoadingState;
  featureUnlockLoadingState: { featureId: number; loadingState: LoadingState };
  workLogFeatureUnlockLoadingState: LoadingState;
  validateIssueIdLoadingState: LoadingState;
  submitAIGeneratedWorklogLoadingState: LoadingState;
  manualWorkLogLoadingState: LoadingState;
  submitPopupGeneratedWorklogLoadingState: LoadingState;
  editWorklogLoadingState: LoadingState;
  deleteWorkLogLoadingState: LoadingState;
  workingHoursPerDayLoadingState: LoadingState;
  aiGeneratedCategoriesLoadingState: LoadingState;
  deleteAccountLoadingState: LoadingState;
  deleteAppLoadingState: LoadingState;
  weeklyWorklogSummaryLoadingState: LoadingState;
  fetchDailyScrumLoadingState: LoadingState;
  upsertDailyScrumLoadingState: LoadingState;
  linkToMSTeamsLoadingState: LoadingState;
  dataSyncStatusLoadingState: LoadingState;
  startDataSyncLoadingState: LoadingState;
}
export interface ControlState {
  visible?: boolean;
  disabled?: boolean;
  title?: string;
}

export interface UserCredentials {
  username: string;
  password: string;
}
// why did we euate the first enum to 0? simply to tell its starting value
// in this case profile has value 0 and next are auto incremneted i.e organization would be 1 and so on
export enum SignupSteps {
  profile = 0,
  organization,
  billing
}

export enum AccessLevels {
  TenantAdmin = 'TENANT_ADMIN',
  Admin = 'ADMIN',
  User = 'USER'
}

// why did we euate the first enum to 0? simply to tell its starting value
// read more on enums https://www.typescriptlang.org/docs/handbook/enums.html
export enum RouteProtectionMode {
  queryParam = 0,
  route
}

export interface AIWorklogSmmaryMetaData extends LoggedTimePerDay {
  updatedFromEffect: boolean;
}

export interface AILogMyWorkSummaryData {
  date: string;
  hours: number;
  accountId: string;
}

export interface ManualWorkLogModalState {
  date: string;
  showModal: boolean;
  markAsLeave: boolean;
}

export interface AISubmittedWorklogResponse {
  date: string;
  response: AISubmittedResponse;
  submittedHoursForWorklog: number;
}

export interface AISubmittedResponse {
  submissionDetails: AISubmittedWorklogTickets[];
  successfullySubmittedWorklogsCount: number;
}

export interface AISubmittedWorklogTickets {
  ticketId: string;
  submitted: boolean;
  hours: number;
  workLogId: string;
  comment?: string;
}

export interface IssueWorkLog {
  issueId: string;
  workLogId: string;
}

export interface IssueWorkLogDeleted extends IssueWorkLog {
  deleted: boolean;
}

export interface DeletionResponse {
  deletionDetails: IssueWorkLogDeleted[];
  successfullyDeletedWorkLogsCount: number;
}

export interface DeletionRequest {
  details: IssueWorkLog[];
}

export interface SelectedTicketDetails {
  ticketId: string;
  ticketDescription: string;
  date: string;
}

export interface SelectedTicketDetails {
  ticketId: string;
  date: string;
}

export interface UserPreferences {
  LEAVES: string;
}

export interface InstanceFeaturesStatus {
  // Main features
  isMyWorkEnabled: boolean;
  isTeamViewEnabled: boolean;

  // My Work child features
  // isScrumUpdatesEnabled: boolean;
  isMyWorklogsEnabled: boolean;

  // Team View child features
  // isWorklogInsightsEnabled: boolean;
  isCategorizationEnabled: boolean;
  isTeamPulseEnabled: boolean;
  isStandupBoardEnabled: boolean;
}

export interface UserAccessLevelsStatus {
  hasAdminAccess: boolean;
  hasTenantAdminAccess: boolean;
}

export interface AppCommands {
  addNewUser: boolean;
}

export type JobStatus = 'submitted' | 'running' | 'success' | 'failed';

export interface DataSyncJobStatus {
  jobId: string;
  status: JobStatus;
  jobType: JobType;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  submittedAt?: string;
}
