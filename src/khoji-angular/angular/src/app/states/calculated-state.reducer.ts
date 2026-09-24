/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Action, createReducer, on } from '@ngrx/store';
import { RequestPanelState } from './app-states';
import * as actions from './app.actions';


const calculatedState: RequestPanelState = {

  teamWorklogRequest: {
    requestChanged: false,
    validRequest: false
  }
};

const _calculatedStatesReducer = createReducer(
  calculatedState,
  on(actions.setAnalysisByWorklogRequestFilterState, (state, { requestChanged, validRequest }) => ({ ...state, analysisByWorklogRequest: { requestChanged: requestChanged, validRequest: validRequest } })),
  on(actions.setTeamWorklogRequestFilterState, (state, { requestChanged, validRequest }) => ({ ...state, teamWorklogRequest: { requestChanged: requestChanged, validRequest: validRequest } })),
  on(actions.resetCalculatedState, () => calculatedState)
);

export function calculatedStatesReducer(state: RequestPanelState, action: Action) {
  return _calculatedStatesReducer(state, action);
}
