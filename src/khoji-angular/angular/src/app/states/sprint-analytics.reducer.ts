/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Action, createReducer, on } from '@ngrx/store';
import { SprintAnalyticsState, LoadingState } from './app-states';
import { ProActiveSprint } from 'app/analysis/sprint-analytics-types';
import { makeUtcDate } from 'app/shared/helper-functions';
import {
  setSprintAnalytics,
  setProActiveSprintsForTeam,
  setSprintStaticSummary,
  setSprintStaticSummaryLoadingState,
  setSprintStatusChanges,
  setSprintStatusChangesLoadingState,
  setSprintTeamPulse,
  setSprintTeamPulseLoadingState,
  setSprintVelocityBurndown,
  setSprintVelocityBurndownLoadingState,
  setWorklogSyncJobStatus,
  setSprintEpicProgress,
  setSprintEpicProgressLoadingState
} from './sprint-analytics.actions';

export const defaultState: SprintAnalyticsState = {
  sprintAnalytics: undefined,
  proactiveSprints: [],
  targetProactiveSprintId: undefined,
  staticSummary: null,
  staticSummaryLoadingState: LoadingState.Done,
  statusChanges: null,
  statusChangesLoadingState: LoadingState.Done,
  teamPulse: null,
  teamPulseLoadingState: LoadingState.Done,
  velocityBurndown: null,
  velocityBurndownLoadingState: LoadingState.Done,
  epicProgress: null,
  epicProgressLoadingState: LoadingState.Done,
  worklogSyncJobStatus: {}
};

const _sprintAnalyticsReducer = createReducer(
  defaultState,
  on(setSprintAnalytics, (state, { sprintAnalytics }) => ({ ...state, sprintAnalytics })),
  on(setProActiveSprintsForTeam, (state, { proactiveSprints }) => ({ ...state, proactiveSprints: proactiveSprints.map(mapProactiveSprints) })),
  on(setSprintStaticSummary, (state, { staticSummary }) => ({ ...state, staticSummary })),
  on(setSprintStaticSummaryLoadingState, (state, { loadingState }) => ({ ...state, staticSummaryLoadingState: loadingState })),
  on(setSprintStatusChanges, (state, { statusChanges }) => ({ ...state, statusChanges })),
  on(setSprintStatusChangesLoadingState, (state, { loadingState }) => ({ ...state, statusChangesLoadingState: loadingState })),
  on(setSprintTeamPulse, (state, { teamPulse }) => ({ ...state, teamPulse })),
  on(setSprintTeamPulseLoadingState, (state, { loadingState }) => ({ ...state, teamPulseLoadingState: loadingState })),
  on(setSprintVelocityBurndown, (state, { velocityBurndown }) => ({ ...state, velocityBurndown })),
  on(setSprintVelocityBurndownLoadingState, (state, { loadingState }) => ({ ...state, velocityBurndownLoadingState: loadingState })),
  on(setSprintEpicProgress, (state, { epicProgress }) => ({ ...state, epicProgress })),
  on(setSprintEpicProgressLoadingState, (state, { loadingState }) => ({ ...state, epicProgressLoadingState: loadingState })),
  on(setWorklogSyncJobStatus, (state, { sprintId, worklogSyncJobStatus }) => ({
    ...state,
    worklogSyncJobStatus: { ...state.worklogSyncJobStatus, [sprintId]: worklogSyncJobStatus }
  }))
);

export function SprintAnalyticsReducer(state: SprintAnalyticsState, action: Action) {
  return _sprintAnalyticsReducer(state, action);
}

const mapProactiveSprints = (sprint: ProActiveSprint): ProActiveSprint => ({
  ...sprint,
  created_at: Array.isArray(sprint.created_at) ? makeUtcDate(sprint.created_at) : sprint.created_at,
  updated_at: Array.isArray(sprint.updated_at) ? makeUtcDate(sprint.updated_at) : sprint.updated_at,
  start_date: Array.isArray(sprint.start_date) ? makeUtcDate(sprint.start_date) : sprint.start_date,
  end_date: Array.isArray(sprint.end_date) ? makeUtcDate(sprint.end_date) : sprint.end_date,
  complete_date: Array.isArray(sprint.complete_date) ? makeUtcDate(sprint.complete_date) : sprint.complete_date,
  last_synced_at: Array.isArray(sprint.last_synced_at) ? makeUtcDate(sprint.last_synced_at) : sprint.last_synced_at
});
