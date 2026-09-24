import { createAction, props } from "@ngrx/store";
import { SavedDailyScrumUpdate } from "app/interface/daily-scrum-update.interface";
import { GenerateAIWorklogRequest, UserWorklogSummaryRequest } from "app/shared/picklist/interfaces";
import { ActivityState, AIGeneratedWorklog, AIGeneratedWorklogPayload, AILogMyWorkSummaryData, AISubmittedResponse, AISubmittedWorklogResponse, AIWorklogSmmaryMetaData, DailyScrumDates, DailyScrumUpdates, DeletionRequest, DeletionResponse, InstanceUser, IssueIdValidity, LoadingState, LogMyWorkSummary, ManualWorkLogModalState, SelectedTicketDetails, WeeklyWorklogSummary } from "app/states/app-states";

export const fetchInstanceUserMetaData = createAction('[Log My Work] FetchInstanceUserMetaData');
export const setInstanceUserMetaData = createAction('[Log My Work] SetInstanceUserMetaData', props<{ user: InstanceUser; }>());
export const setInstanceUserMetaDataLoadingState = createAction('[Log My Work] FetchInstanceUserMetaDataLoadingState', props<{ loadingState: LoadingState; }>());

export const fetchWorklogSummaryDefault = createAction('[Log My Work] FetchWorklogSummaryDefault');
export const fetchWorklogSummary = createAction('[Log My Work] FetchWorklogSummary', props<{ payload: UserWorklogSummaryRequest; }>());
export const setWorklogSummary = createAction('[Log My Work] SetWorklogSummary', props<{ summary: LogMyWorkSummary; }>());
export const setWorklogSummaryLoadingState = createAction('[Log My Work] SetWorklogSummaryLoadingState', props<{ loadingState: LoadingState; }>());

export const generateAIWorklog = createAction('[Log My Work] GenerateAIWorklog', props<{ payload: GenerateAIWorklogRequest }>());
export const setAIGeneratedWorklog = createAction('[Log My Work] SetAIGeneratedWorklog', props<{ worklog: AIGeneratedWorklog[], uniqueIdentifier: string }>());
export const resetAIGeneratedWorklog = createAction('[Log My Work] ResetAIGeneratedWorklog');
export const setActivityState = createAction('[Log My Work] SetActivityState', props<{ activityState: ActivityState }>());
export const setGenerateAIWorklogLoadingState = createAction('[Log My Work] SetGenerateAIWorklogLoadingState', props<{ loadingState: LoadingState; }>());
export const submittedAIWorklogImpact = createAction('[Log My Work] SubmittedAIWorklogImpact', props<{ metaData: AIWorklogSmmaryMetaData }>());

export const fetchIssueIdValidity = createAction('[Log My Work] FetchIssueIdValidity', props<{ issueId: string }>());
export const setIssueIdValidity = createAction('[Log My Work] SetIssueIdValidity', props<{ issueIdValidity: IssueIdValidity }>());
export const setIssueIdValidityLoadingState = createAction('[Log My Work] SetIssueIdValidityLoadingState', props<{ loadingState: LoadingState; }>());

export const submitWorklogs = createAction('[Log My Work] SubmitWorklogs', props<{ worklogs: AIGeneratedWorklogPayload, loggedTimeDate: string }>());
export const submitManualWorkLog = createAction('[Log My Work] submitManualWorkLog', props<{ worklogs: AIGeneratedWorklogPayload, loggedTimeDate: string }>());
export const submitPopupWorklogs = createAction('[Log My Work] SubmitPopupWorklogs', props<{ worklogs: AIGeneratedWorklogPayload, loggedTimeDate: string, manual?: boolean }>());
export const setAIGeneratedWorklogSubmissionLoadingState = createAction('[Log My Work] SetAIGeneratedWorklogSubmissionLoadingState', props<{ loadingState: LoadingState; }>());
export const setManualWorkLogLoadingState = createAction('[Log My Work] setManualWorkLogLoadingState', props<{ loadingState: LoadingState; }>());
export const setPopupGeneratedWorklogSubmissionLoadingState = createAction('[Log My Work] SetPopupGeneratedWorklogSubmissionLoadingState', props<{ loadingState: LoadingState; }>());
export const setAIGeneratedWorklogSubmissionResponse = createAction('[Log My Work] setAIGeneratedWorklogSubmissionResponse', props<{ submittedResponse: AISubmittedWorklogResponse; }>());
export const resetAIGeneratedWorklogSubmissionResponse = createAction('[Log My Work] resetAIGeneratedWorklogSubmissionResponse');

export const editWorklogs = createAction('[Log My Work] editWorklogs', props<{ workLogs: AIGeneratedWorklogPayload }>());
export const setEditWorkLogResponse = createAction('[Log My Work] setEditWorkLogResponse', props<{ editedWorkLogs: AISubmittedResponse; }>());
export const setEditWorkLogLoadingState = createAction('[Log My Work] setEditWorkLogLoadingState', props<{ loadingState: LoadingState; }>());

export const deleteWorklogs = createAction('[Log My Work] deleteWorklogs', props<{ workLogs: DeletionRequest }>());
export const setDeleteWorkLogResponse = createAction('[Log My Work] setDeleteWorkLogResponse', props<{ response: DeletionResponse; }>());
export const setDeleteWorkLogLoadingState = createAction('[Log My Work] setDeleteWorkLogLoadingState', props<{ loadingState: LoadingState; }>());

export const setAIWorklogSummaryData = createAction('[Log My Work] setAIWorklogSummaryData', props<{ summaryData: AILogMyWorkSummaryData }>());
export const resetAIWorklogSummaryData = createAction('[Log My Work] ResetAIWorklogSummaryData');

export const setSelectedTicketDetails = createAction('[Log My Work] setSelectedTicketDetails', props<{ ticketDetails: SelectedTicketDetails }>());
export const setManualWorklogSubmitted = createAction('[Log My Work] SetManualWorklogSubmitted', props<{ manualWorklog: boolean }>());

export const setManualWorkLogModalState = createAction('[Log My Work] SetManualWorkLogModalState', props<{ manualWorkLogState: ManualWorkLogModalState }>());
export const pingAiCachePrompt = createAction('[Log My Work] PingAiCachePrompt');
export const setPingAiCachePromptResponse = createAction('[Log My Work] SetPingAiCachePromptResponse', props<{ responseCode: number }>());
export const addEmptyWorklogForTicket = createAction('[Log My Work] AddEmptyWorklogForTicket', props<{ date: string; ticketId: string; ticketType: string; ticketDescription: string; }>());

export const fetchWeeklyWorklogSummary = createAction('[Log My Work] FetchWeeklyWorklogSummary', props<{ dateRange: [Date, Date] }>());
export const setWeeklyWorklogSummary = createAction('[Log My Work] SetWeeklyWorklogSummary', props<{ response: WeeklyWorklogSummary }>());
export const setWeeklyWorklogSummaryDates = createAction('[Log My Work] SetWeeklyWorklogSummaryDates', props<{ dateRange: [Date, Date] }>());
export const setWeeklyWorklogSummaryLoadingState = createAction('[Log My Work] WeeklyWorklogSummaryLoadingState', props<{ loading: LoadingState }>());

export const fetchDailyScrumUpdates = createAction('[Log My Work] FetchDailyScrumUpdates', props<{ instanceId: string, instanceUserId: string, dates: DailyScrumDates }>());
export const fetchSavedDailyScrumUpdates = createAction('[Log My Work] FetchSavedDailyScrumUpdates', props<{ instanceId: string, instanceUserId: string, dates: DailyScrumDates }>());
export const fetchTeamScrumUpdates = createAction('[Log My Work] FetchTeamScrumUpdates', props<{ instanceId: string, dates: DailyScrumDates }>());
export const fetchDailyScrumUpdatesLoadingState = createAction('[Log My Work] SetDailyScrumUpdatesLoadingState', props<{ loading: LoadingState }>());
export const cancelDailyScrumUpdates = createAction('[Log My Work] CancelDailyScrumUpdates');
export const setDailyScrumDates = createAction('[Log My Work] SetDailyScrumDates', props<{ dates: DailyScrumDates }>());
export const setDailyScrumUpdates = createAction('[Log My Work] SetDailyScrumUpdates', props<{ response: DailyScrumUpdates }>());
export const setSavedDailyScrumUpdates = createAction('[Log My Work] SetSavedDailyScrumUpdates', props<{ response: SavedDailyScrumUpdate[] }>());
export const upsertDailyScrumUpdates = createAction('[Log My Work] UpsertDailyScrumUpdates', props<{ data: DailyScrumUpdates }>());
export const upsertDailyScrumUpdatesLoadingState = createAction('[Log My Work] UpsertDailyScrumUpdatesLoadingState', props<{ loading: LoadingState }>());