/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { createAction, props } from '@ngrx/store';
import { Member, Team, User } from 'app/admin/admin.entities';
import { WorklogReminder } from 'app/datamodels/team-work-log-datamodel';
import { DateLabel } from 'app/dropdowns/date-range/date-range.component';
import { AngularAppConfigs, DropdownGroupingConfig, KhojiConfigs } from 'app/interface/khoji-config.interface';
import { TeamWorklogStatistics } from 'app/interface/team-worklog-stats';
import { UpdatedUserOnChange } from 'app/interface/updated-user.interface';
import { UserSignup } from 'app/interface/user-signup.interface';
import { IssueType, WorkLogCategory } from 'app/interface/worklog-catagory';
import { CreateInstancePayload, InviteAction } from 'app/shared/picklist/interfaces';
import { AccessibleResource, KhojiUserProfile, UserProfileState, UserSetting, Workspace } from 'app/user-profile/state/user-profile.states';
import { MenuItem } from 'primeng/api';
import { PaymentHostedPageObject } from './../user-profile/state/user-profile.states';
import { AiGeneratedCategory, EvalConfig, GlobalFilters, LoadingState } from './app-states';

// Request Inputs & Filters
export const selectTeams = createAction('[Global Filters] SelectTeams', props<{ ids: string[]; }>());
export const selectDates = createAction('[Global Filters] SelectDates', props<{ dateFrom: string, dateTo: string, dateLabel: DateLabel; }>());
export const selectDateRange = createAction('[Global Filters] SelectDateRange', props<{ dateFrom: string, dateTo: string; }>());
export const selectDefaultDateRange = createAction('[Global Filters] selectDefaultDateRange');
export const selectDefaultDateLabel = createAction('[Global Filters] selectDefaultDateLabel');
export const selectDateLabel = createAction('[Global Filters] SelectDateLabel', props<{ dateLabel: DateLabel; }>());
export const selectStatus = createAction('[Global Filters] SelectStatus', props<{ value: string; }>());
export const othersChartDataAvailable = createAction('[Global Filters] othersChartDataAvailable', props<{ value: boolean; }>());
export const sendUserSignupRequest = createAction('[User Signup] SendUserSignupRequest', props<{ user: UserSignup; }>());
export const validateTenantAdminSignupRequest = createAction('[TenantAdmin Signup] ValidateTenantAdminSignupRequest', props<{ user: UserSignup; }>());
export const sendEmailForResetPassword = createAction('[Email for Reset Password] SendEmailForResetPassword', props<{ email: String; }>());
export const updateWorklogEmailSetting = createAction("[update email worklog setting] ", props<{ emailWorkLog: boolean, emailFrequency: string }>());
export const sendWorklogReminderEmail = createAction("[Worklog reminder email] ", props<{ worklogReminder: WorklogReminder }>());
export const setUserProfileLoadingState = createAction('[Global Processes] SetUsersLoadingState', props<{ loadingState: LoadingState; }>());
export const setTenantAdminValidationLoadingState = createAction('[Global Processes] SetTenantAdminValidationLoadingState', props<{ loadingState: LoadingState; }>());
export const updateWorkLogSettingLoadingState = createAction('[Global Processes] SetChangeWorkLogLoadingState', props<{ loadingState: LoadingState; }>());
export const setChangePasswordLoadingState = createAction('[Global Processes] SetChangePasswordLoadingState', props<{ loadingState: LoadingState; }>());
export const setWorklogCategoryIssueTypes = createAction('[Configs] SetWorklogCategoryIssueTypes', props<{ categoryName: string, issueTypes: IssueType[], selectedType: string; }>());
export const setTeamWorkLogForThisMonthLoadingState = createAction("[Global Process] SetTeamWorkLogForThisMonthLoadingState", props<{ loadingState: LoadingState }>());


export const selectWorklogTeams = createAction('[Global Filters] SelectWorklogTeams', props<{ ids: string[]; }>());
export const setWorklogTeamsFilter = createAction('[Global Filters] SetWorklogTeamsFilter', props<{ team: string }>());
export const clearWorklogTeamsFilter = createAction('[Global Filters] ClearWorklogTeamsFilter');
export const selectMembers = createAction('[Global Filters] SelectMembers', props<{ members: Member[]; }>());
export const setTeamWorklogUpdated = createAction('[Global Filters] SetTeamWorklogUpdated', props<{ teamWorklogUpdated: boolean; }>());


export const setLocalFilterFlag = createAction('[Global Filters] SetLocalFilterFlag', props<{ triggeredLocalFilter: boolean; }>());
// Request Filters
export const updateRequestFilters = createAction('[Request Filters] UpdateRequestFilters', props<{ filters: GlobalFilters; }>());
// Config Responses
export const setKhojiConfigs = createAction('[Configs] SetKhojiConfigs', props<{ config: KhojiConfigs; }>());
export const setWorkLogMainConfigs = createAction('[Configs] SetWorkLogMainConfigs', props<{ config: Array<WorkLogCategory>; }>());
export const setIsIssueTypesSyncedWithWorkLogConfig = createAction('[Configs] SetIsIssueTypesSyncedWithWorkLogConfig', props<{ config: boolean; }>());
export const fetchSourceIssueTypes = createAction('[Configs] fetchSourceIssueTypes');
export const fetchAiGeneratedCategories = createAction('[Configs] FetchAiGeneratedCategories', props<{ issueTypes: IssueType[]; }>());
export const setAiGeneratedCategories = createAction('[Configs] SetAiGeneratedCategories', props<{ aiGeneratedCategories: AiGeneratedCategory[] }>());
export const setAiGeneratedCategoriesLoadingState = createAction('[Configs Loading State] SetAiGeneratedCategoriesLoadingState', props<{ loadingState: LoadingState }>());
export const setSourceIssueTypesLoadingState = createAction('[Configs Loading State] Set Source Issue Types Loading State', props<{ loadingState: LoadingState }>());
export const setSourceIssueTypes = createAction('[Configs] SetSourceIssueTypes', props<{ sourceIssueTypes: any }>());
export const setDropdownGroupingConfig = createAction('[Configs] SetDropdownGroupingConfig', props<{ config: DropdownGroupingConfig; }>());
export const setDatatableConfigs = createAction('[Configs] SetDatatableConfigs', props<{ config: object; }>());
export const setDatatableButtonsConfigs = createAction('[Configs] SetDatatableButtonsConfigs', props<{ config: object; }>());
export const setTranslations = createAction('[Global Translations] SetTranslations', props<{ translation: object; }>());
export const setAngularAppConfigs = createAction('[Global AngularAppConfig] SetAngularAppConfig', props<{ angularAppConfig: AngularAppConfigs; }>());
export const setFetchButton = createAction('[Configs] SetFetchButton', props<{ fetchButton: boolean; }>());

// Stats Responses
export const setTeamWorklogStats = createAction('[Global Statistics] SetTeamWorklogStats', props<{ stats: TeamWorklogStatistics; }>());
export const setTeamWorklogStatsForThisMonth = createAction('[Global Statistics] SetTeamWorklogStatsForThisMonth', props<{ stats: TeamWorklogStatistics; }>());
export const resetGlobalStats = createAction("[Reset Stats Analysis] Reset Stats Analysis");
export const resetTeamIndicators = createAction("[Reset Team Indicators] ResetTeamIndicators");

// List Responses
export const setTeamsList = createAction('[Global Filters] SetTeamsList', props<{ list: string[]; }>());
export const setWorklogTeamsList = createAction('[Global Filters] SetWorklogTeamsList', props<{ list: Team[]; }>());
export const setTeamMembers = createAction('[Global Filters] SetMembers', props<{ teamsMembers: any; }>());
export const setRequestId = createAction('[Global Filters] SetRequestId', props<{ requestId: string; }>());

// Stats Requests
export const fetchTeamWorklogStats = createAction('[Global Statistics] FetchTeamWorklogStats');
export const fetchTeamWorklogStatsDefault = createAction('[Global Statistics] FetchTeamWorklogStatsDefault');
export const fetchTeamWorklogStatsForThisMonth = createAction('[Global Statistics] fetchTeamWorklogStatsForThisMonth', props<{ dateFrom: string, dateTo: string }>());
export const fetchTeamStats = createAction('[TeamBoard Statistics] FetchTeamStats');
export const resetTeamFilters = createAction('[Reset Team Filters] ResetTeamFilters');
export const fetchUpdatePasswordDetails = createAction('[UpdatePassword User] fetchUpdatePasswordDetails', props<{ code: string; }>());
export const fetchIssueSubtasksCategories = createAction('[Global Statistics] fetchSubtasksCategories', props<{ issueId: string; }>());

// Other Requests
export const fetchTeamsList = createAction('[Global Filters] FetchTeamsList');
//export const fetchWorklogTeamsList = createAction('[Global Filters] FetchWorklogTeamsList');
export const fetchError = createAction('[Request] FetchError');
export const dummyAction = createAction('[Request] dummyAction');
export const fetchTranslations = createAction('[Global Translations] FetchTranslations', props<{ locale: string; }>());
export const fetchMembers = createAction('[Global Filters] FetchMembers');
export const fetchUsers = createAction('[Global Filters] FetchUsers');
export const setUsersLoadingState = createAction('[Global Filters] SetUsersLoadingState', props<{ loadingState: LoadingState; }>());
export const setUsers = createAction('[Global Filters] SetUsers', props<{ users: User[]; }>());
// Optional action props
export const fetchUserSetting = createAction('[User Profile] FetchUserSetting', (props: { force: boolean; } = { force: false }) => (props));
export const fetchWorkSpaces = createAction('[User Profile] FetchWorkSpaces');
export const fetchWorkSpacesAndNavigateToInstance = createAction('[User Profile] FetchWorkSpacesAndNavigateToInstanceUsingTenantId', props<{ tenantId: string }>());
export const fetchValidateUser = createAction('[User Profile] FetchValidateUser', props<{ sourceCode: string; }>());
export const setValidateUserLoadingState = createAction('[Global Processes] SetValidateUserLoadingState', props<{ loadingState: LoadingState; }>());
export const setWorkSpaces = createAction('[User Profile] SetWorkSpaces', props<{ workspace: Workspace[]; }>())
export const setWorkspacesLoadingState = createAction('[Global Processes] SetWorkspacesLoadingState', props<{ loadingState: LoadingState; }>());
export const setInstanceInviteActionLoadingState = createAction('[Global Processes] setInstanceInviteActionLoadingState', props<{ loadingState: LoadingState; }>());
export const setSelectedWorkspace = createAction('')
export const fetchAccessibleResources = createAction('[User Profile] FetchAccessibleResources');
export const setAccessibleResources = createAction('[User Profile] SetAccessibleResources', props<{ accessibleResources: AccessibleResource; }>())
export const setAccessibleResourcesLoadingState = createAction('[Global Processes] SetAccessibleResourcesLoadingState', props<{ loadingState: LoadingState; }>());
export const userSelectedAccessibleResource = createAction('[User Profile] UserSelectedAccessibleResource', props<{ userSelectedAccessibleResource: CreateInstancePayload }>())
export const fetchSubscriptionHostedPageDetail = createAction('[User Profile] FetchSubscriptionDetail');
export const setPaymentHostedPage = createAction('[Hosted Pages] SetSubscriptionDetail', props<{ paymentHostedObject: PaymentHostedPageObject; }>());
export const setUserSetting = createAction('[User Profile] SetUserSetting', props<{ userProfile: UserProfileState; }>());
export const updateWorklogRAGEmailSetting = createAction("[User Profile] UpdateWorklogRAGEmailDetting ", props<{ ragEmailSetting: string; }>());
export const setUserSettingLoadingState = createAction('[Global Processes] SetUserSettingLoadingState', props<{ loadingState: LoadingState; }>());
export const setSubscriptionHostedPageLoadingState = createAction('[Global Processes] SetSubscriptionDetailLoadingState', props<{ loadingState: LoadingState; }>());
export const setWorklogRAGEmailLoadingState = createAction('[Global Processes] setWorklogRAGEmailLoadingState', props<{ loadingState: LoadingState; }>());
export const setWorklogRAGConfigLoadingState = createAction('[Global Processes] setWorklogRAGConfigLoadingState', props<{ loadingState: LoadingState; }>());
export const setAccountSetupLoadingState = createAction('[Global Processes] SetAccountSetupLoadingState', props<{ loading: LoadingState; }>());
export const requestAccess = createAction('[Admin State] RequestAccess', props<{ token: string; }>());
export const setRequestAccessLoadingState = createAction('[Global Processes] RequestAccessLoadingState', props<{ loadingState: LoadingState; }>());
export const fetchKhojiUserProfile = createAction('[User Profile] FetchKhojiUserProfile');
export const setKhojiUserProfile = createAction('[User Profile] setKhojiUserProfile', props<{ userProfile: KhojiUserProfile; }>());
export const fetchInstanceDetails = createAction('[User Profile] fetchInstanceDetails');
export const updateUserAccessCountOnRevoke = createAction('[User Profile] updateUserAccessCountOnRevoke', props<{ value: number; }>());
export const instanceInviteAction = createAction('[User Profile] InstanceInviteAction', props<{ inviteAction: InviteAction }>())


//khoji configs
export const fetchKhojiConfigs = createAction('[Configs] FetchKhojiConfigs');
export const resetComponentConfigs = createAction('[Configs] resetComponentConfigs');
export const fetchStatusConfigs = createAction('[Configs] FetchStatusConfigs');
export const fetchStatusCategoryConfigs = createAction('[Configs] FetchStatusCategoryConfigs');
export const fetchVarianceConfigs = createAction('[Configs] FetchVarianceConfigs');
export const fetchConfigs = createAction('[Configs] Fetch Config', props<{ propKeys: string[]; }>());
export const configsFetched = createAction('[Configs] Config Fetched', props<{ response: { [key: string]: any; }; }>());
export const updateConfig = createAction('[Configs] Update Config', props<{ propKey: string; propValue: string; showToast?: boolean }>());
export const updateOtherWorklogRAGThresholdConfig = createAction('[Configs] updateOtherWorklogRAGThresholdConfig', props<{ thresholdConfig: string; }>());
export const updateEvalConfig = createAction('[Configs] Update RAG Config', props<{ propKey: string; propValue: any; }>());
export const updateEvalConfigInBatch = createAction('[Configs] Update Eval Config in Batch', props<{ props: EvalConfig[] }>());
export const updateWorkingHourPerDayConfig = createAction('[Configs] UpdateWorkingHourPerDayConfig', props<{ propKey: string; propValue: any; }>());
export const resetGivenServerConfigs = createAction('[Configs] ResetGivenServerConfigs', props<{ propKey: string[]; }>());
export const updateWorklogConfigPerDayForLMW = createAction('[Configs] UpdateWorklogConfigPerDayForLMW', props<{ hoursPerDay: number }>());
export const WorkingHourPerDayConfigLoadingState = createAction('[Global Processes] WorkingHourPerDayConfigLoadingState', props<{ loadingState: LoadingState; }>());
export const configUpdated = createAction('[Configs] Config Updated', props<{ propKey: string, propValue: string; }>());
export const fetchAngularAppConfigs = createAction('[Configs] FetchAngularAppConfigs');
export const isConfigsUpdated = createAction('[Configs] Is Configs Updated', props<{ propKey: string, propState: boolean; }>());
export const resetConfigUpdatedState = createAction('[ResetConfigUpdatedState] ResetConfigUpdatedState');
export const setConfigErrorState = createAction('[Configs] Error in Configs Updated', props<{ propKey: string, propState: boolean; }>());
export const resetServerConfigs = createAction('[Configs] Reset Server Configs');
export const resetKhojiConfigs = createAction('[Configs] Reset Khoji Configs');
export const worklogDistributionLoadingState = createAction('[Global Processes] worklogDistributionLoadingState', props<{ loadingState: LoadingState; }>());


// Processes
export const setTeamWorkLogLoadingState = createAction('[Global Processes] setTeamWorkLogState', props<{ teamWorklogLoadingState: LoadingState; }>());
export const setGlobalStatisticsLoadingState = createAction('[Global Processes] SetGlobalStatisticsLoadingState', props<{ globalStatisticsLoadingState: LoadingState; }>());
export const setupdateProfileLoadingState = createAction('[User Profile] setupdateProfileLoadingState', props<{ loadingState: LoadingState; }>());
export const setInstanceDetailsLoadingState = createAction('[User Profile] SetInstanceDetailsLoadingState', props<{ loadingState: LoadingState; }>());
export const setFeatureUnlockLoadingState = createAction('[User Profile] setFeatureUnlockLoadingState', props<{ featureId: number, loadingState: LoadingState; }>());
export const setWorkLogCategorizationFeatureUnlockLoadingState = createAction('[User Profile] setWorkLogCategorizationFeatureUnlockLoadingState', props<{ loadingState: LoadingState; }>());


// Request Panel State
export const setTeamWorklogRequestFilterState = createAction('[Request Panel State] SetTeamWorklogRequestFilterState', props<{ requestChanged: boolean, validRequest: boolean; }>());
export const setAnalysisByWorklogRequestFilterState = createAction('[Request Panel State] SetAnalysisByWorklogRequestFilterState', props<{ requestChanged: boolean, validRequest: boolean; }>());
export const resetCalculatedState = createAction('[Request Panel State] ResetCalculatedState');

// !!IMPORTANT: wont reset workspace loading state
export const resetLoadingStates = createAction("[Reset Loading State] ResetLoadingState");
export const resetTeamWorkLogStatistics = createAction("[Reset Team WorkLog Statistics] ResetTeamWorkLogStatistics");

//Khoji Login
export const khojiUserLogin = createAction('[Khoji User Login] KhojiUserLogin', props<{ email: String, }>());

// Side Nav Menu
export const fetchMenuJSON = createAction('[Navigation Menu] FetchMenuJSON');
export const setMenu = createAction('[Navigation Menu] SetMenu', props<{ menu: MenuItem[] }>());

export const fetchUpdatedUser = createAction('[User Status] FetchUpdatedUser', props<{ userId: string; }>());
export const setUpdatedUser = createAction("[User Status] SetUpdatedUser", props<{ updatedUser: UpdatedUserOnChange }>());
export const fetchUpdatedUserSettings = createAction('[User Status] FetchUpdatedUserSettings', props<{ userId: string; }>());
export const setUpdatedUserSettings = createAction('[User Status] SetUpdatedUserSettings', props<{ settings: UserSetting; }>());
export const resetUserSettings = createAction("[Reset User] ResetUserSettings");
export const resetGlobalFiltersMap = createAction("[Reset Global Filters Map] ResetGlobalFiltersMap");
export const updateProfile = createAction("[User Profile] UpdateUserProfile", props<{ updatedUser: User }>());

export const fetchHostedPageObject = createAction("[fetch HostedPage Object] fetchHostedPageObject", props<{ signupCode: any }>());
export const closedPaymentPopup = createAction("[Payment Action] PaymnetPopupClosed", props<{ popupClosed: boolean }>());
export const paymnetSuccessful = createAction("[Payment Action] Paymnetsuccessful", props<{ successfulPayment: boolean }>());
export const resetPaymentHostedObject = createAction("[Payment Action] ResetPaymentHostedObject");

export const isProjectSourceConfigured = createAction("[Project Source] IsProjectSourceConfigured", props<{ projectIntegration: any }>());
export const resetProjectSourceStatus = createAction("[Project Source] resetProjectSource");

export const trackingReleaseRequest = createAction("[Tracking Release Action] TrackingReleaseRequest");
export const trackingWorklogRequest = createAction("[Tracking Worklog Action] trackingWorklogRequestRequest");

export const clearStatesForLoginPage = createAction("[Clear Staes For Login Page] ClearStatesForLoginPage");

export const discardSentCallsAfterNavigate = createAction("[Discard Sent Calls After Navigate] DiscardSentCallsAfterNavigate");
export const cancelAllRequests = createAction("[Request] CancelAllRequests");
export const cancelWorkspacesRequest = createAction("[Request] CancelWorkspacesRequest");
export const linkUserToMSTeams = createAction("[Request] linkUserToMSTeams", props<{ queryString: string; }>());
export const setLinkToMSTeamsLoadingState = createAction('[Global Processes] SetLinkToMSTeamsLoadingState', props<{ loadingState: LoadingState; }>());


// Commands
export const addNewUserCommand = createAction("[Commands] AddNewUserCommand", props<{ add: boolean; }>());
