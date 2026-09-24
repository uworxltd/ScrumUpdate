/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Action, createReducer, on } from '@ngrx/store';
import { GlobalStatuses } from './app-states';
import { setGlobalStatuses } from './app.actions';

const globalStatusConfigs: GlobalStatuses = {
  statuses: []
};

const _globalStatusesReducer = createReducer(
  globalStatusConfigs,
  on(setGlobalStatuses, (state, { statuses }) => (statuses))
);

export function globalStatusesReducer(state: GlobalStatuses, action: Action) {
  return _globalStatusesReducer(state, action);
}
