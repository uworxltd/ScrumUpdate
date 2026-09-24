
/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

  import { createSelector, select } from "@ngrx/store";
  import { pipe } from "rxjs";
  import { AppState } from "./app-states";

const isStatsRequestSelector = createSelector(
  (state: AppState) => state.calculatedState.teamboardsRequest.validRequest,
  (state: AppState) => state.calculatedState.releaseRequest.validRequest,
  (state: AppState) => state.calculatedState.analysisByWorklogRequest.validRequest,
  (state: AppState) => state.calculatedState.teamWorklogRequest.validRequest,
  (teamboardsRequest, releaseRequest, analysisByWorklogRequest, teamWorklogRequest) => {
    return teamboardsRequest || releaseRequest || analysisByWorklogRequest || teamWorklogRequest;
  }
);

const requestChangedSelector = createSelector(
  (state: AppState) => state.calculatedState.teamboardsRequest.requestChanged,
  (state: AppState) => state.calculatedState.releaseRequest.requestChanged,
  (state: AppState) => state.calculatedState.analysisByWorklogRequest.requestChanged,
  (state: AppState) => state.calculatedState.teamWorklogRequest.requestChanged,
  (teamboardsRequest, releaseRequest, analysisByWorklogRequest, teamWorklogRequest) => {
    return teamboardsRequest || releaseRequest || analysisByWorklogRequest || teamWorklogRequest;
  }
);

const exportButtonEnabledSelector = createSelector(
  (state: AppState) => state.calculatedState.exportButtonState.enabled,
  (enabled) => {
    return enabled;
  }
); 

export const selectIsStatsRequestValid = pipe(
  select(isStatsRequestSelector)
);

export const selectExportButtonEnabled = pipe(
  select(exportButtonEnabledSelector)
);

export const selectRequestChanged = pipe(
  select(requestChangedSelector)
);
