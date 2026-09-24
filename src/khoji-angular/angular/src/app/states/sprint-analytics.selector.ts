/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { createSelector, select } from '@ngrx/store';
import { pipe } from 'rxjs';
import { AppState } from './app-states';

const sprintAnalyticsSelector = createSelector(
  (state: AppState) => state.sprintAnalyticsState,
  (state) => state.sprintAnalytics
);

export const selectSprintAnalytics = pipe(select(sprintAnalyticsSelector));

const sprintStaticSummaryValueSelector = createSelector(
  (state: AppState) => state.sprintAnalyticsState,
  (state) => state.staticSummary
);

const sprintStaticSummaryLoadingSelector = createSelector(
  (state: AppState) => state.sprintAnalyticsState,
  (state) => state.staticSummaryLoadingState
);

export const selectSprintStaticSummaryValue = pipe(select(sprintStaticSummaryValueSelector));

export const selectSprintStaticSummaryLoadingState = pipe(select(sprintStaticSummaryLoadingSelector));

const sprintStatusChangesValueSelector = createSelector(
  (state: AppState) => state.sprintAnalyticsState,
  (state) => state.statusChanges
);

const sprintStatusChangesLoadingSelector = createSelector(
  (state: AppState) => state.sprintAnalyticsState,
  (state) => state.statusChangesLoadingState
);

export const selectSprintStatusChangesValue = pipe(select(sprintStatusChangesValueSelector));

export const selectSprintStatusChangesLoadingState = pipe(select(sprintStatusChangesLoadingSelector));

const sprintTeamPulseValueSelector = createSelector(
  (state: AppState) => state.sprintAnalyticsState,
  (state) => state.teamPulse
);

const sprintTeamPulseLoadingSelector = createSelector(
  (state: AppState) => state.sprintAnalyticsState,
  (state) => state.teamPulseLoadingState
);

export const selectSprintTeamPulseValue = pipe(select(sprintTeamPulseValueSelector));

export const selectSprintTeamPulseLoadingState = pipe(select(sprintTeamPulseLoadingSelector));

const sprintVelocityBurndownValueSelector = createSelector(
  (state: AppState) => state.sprintAnalyticsState,
  (state) => state.velocityBurndown
);

const sprintVelocityBurndownLoadingSelector = createSelector(
  (state: AppState) => state.sprintAnalyticsState,
  (state) => state.velocityBurndownLoadingState
);

export const selectSprintVelocityBurndownValue = pipe(select(sprintVelocityBurndownValueSelector));

export const selectSprintVelocityBurndownLoadingState = pipe(select(sprintVelocityBurndownLoadingSelector));

const sprintEpicProgressValueSelector = createSelector(
  (state: AppState) => state.sprintAnalyticsState,
  (state) => state.epicProgress
);

const sprintEpicProgressLoadingSelector = createSelector(
  (state: AppState) => state.sprintAnalyticsState,
  (state) => state.epicProgressLoadingState
);

export const selectSprintEpicProgressValue = pipe(select(sprintEpicProgressValueSelector));

export const selectSprintEpicProgressLoadingState = pipe(select(sprintEpicProgressLoadingSelector));

const worklogSyncJobStatusSelector = createSelector(
  (state: AppState) => state.sprintAnalyticsState,
  (state) => state.worklogSyncJobStatus
);

export const selectWorklogSyncJobStatus = pipe(select(worklogSyncJobStatusSelector));
