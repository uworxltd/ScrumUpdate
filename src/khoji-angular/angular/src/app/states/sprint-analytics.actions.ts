/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { createAction, props } from '@ngrx/store';
import { JobStatus, LoadingState } from './app-states';
import { ProActiveSprint, SprintAnalytics } from 'app/analysis/sprint-analytics-types';
import { SprintStaticSummary } from 'app/analysis/sprint-static-summary-card/sprint-static-summary-card.component';
import { TeamPulseData } from 'app/analysis/sprint-team-pulse-card/sprint-team-pulse-card.component';

export const fetchSprintAnalytics = createAction('[Sprint Analytics] FetchSprintAnalytics', props<{ teamId: string; analyticsType: string }>());
export const setSprintAnalytics = createAction('[Global Processes] SetSprintAnalytics', props<{ sprintAnalytics: SprintAnalytics }>());
export const setSprintAnalyticsLoadingState = createAction('[Global Processes] FetchSprintAnalyticsLoadingState', props<{ sprintAnalyticsLoadingState: LoadingState }>());

export const fetchProActiveSprintsForTeam = createAction('[Sprint Analytics] FetchProActiveSprintsForTeam');
export const setProActiveSprintsForTeam = createAction('[Sprint Analytics] SetProActiveSprintsForTeam', props<{ proactiveSprints: ProActiveSprint[] }>());
export const clearSprintAnalyticsState = createAction('[Sprint Analytics] ClearSprintAnalyticsState');
export const postTargetProactiveSprintId = createAction(
  '[Sprint Analytics] PostTargetProactiveSprintId',
  props<{
    targetProactiveSprintId: string;
    funcToCallOnResponse?: () => void;
  }>()
);

export const fetchSprintStaticSummary = createAction('[Sprint Analytics] FetchSprintStaticSummary', props<{ sprintId: string | null }>());
export const setSprintStaticSummary = createAction('[Sprint Analytics] SetSprintStaticSummary', props<{ staticSummary: SprintStaticSummary | null }>());
export const setSprintStaticSummaryLoadingState = createAction('[Sprint Analytics] SetSprintStaticSummaryLoadingState', props<{ loadingState: LoadingState }>());

export const fetchSprintStatusChanges = createAction('[Sprint Analytics] FetchSprintStatusChanges', props<{ sprintId: string | null }>());
export const setSprintStatusChanges = createAction('[Sprint Analytics] SetSprintStatusChanges', props<{ statusChanges: any | null }>());
export const setSprintStatusChangesLoadingState = createAction('[Sprint Analytics] SetSprintStatusChangesLoadingState', props<{ loadingState: LoadingState }>());

export const fetchSprintTeamPulse = createAction('[Sprint Analytics] FetchSprintTeamPulse', props<{ sprintId: string | null }>());
export const setSprintTeamPulse = createAction('[Sprint Analytics] SetSprintTeamPulse', props<{ teamPulse: TeamPulseData | null }>());
export const setSprintTeamPulseLoadingState = createAction('[Sprint Analytics] SetSprintTeamPulseLoadingState', props<{ loadingState: LoadingState }>());

export const fetchSprintVelocityBurndown = createAction('[Sprint Analytics] FetchSprintVelocityBurndown', props<{ sprintId: string | null }>());
export const setSprintVelocityBurndown = createAction('[Sprint Analytics] SetSprintVelocityBurndown', props<{ velocityBurndown: any | null }>());
export const setSprintVelocityBurndownLoadingState = createAction('[Sprint Analytics] SetSprintVelocityBurndownLoadingState', props<{ loadingState: LoadingState }>());
export const setWorklogSyncJobStatus = createAction('[Sprint Analytics] SetWorklogSyncJobStatus', props<{ sprintId: number; worklogSyncJobStatus: JobStatus }>());

export const fetchSprintEpicProgress = createAction('[Sprint Analytics] FetchSprintEpicProgress', props<{ sprintId: string | null }>());
export const setSprintEpicProgress = createAction('[Sprint Analytics] SetSprintEpicProgress', props<{ epicProgress: any | null }>());
export const setSprintEpicProgressLoadingState = createAction('[Sprint Analytics] SetSprintEpicProgressLoadingState', props<{ loadingState: LoadingState }>());
