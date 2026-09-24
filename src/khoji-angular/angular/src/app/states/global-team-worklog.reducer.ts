import { resetTeamWorkLogStatistics, setTeamWorklogStatsForThisMonth } from './app.actions';
/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Action, createReducer, on } from '@ngrx/store';
import { TeamWorklogStatistics } from 'app/interface/team-worklog-stats';
import { setTeamWorklogStats } from './app.actions';

export const defaultTeamWorklogStats: TeamWorklogStatistics = {
  dateTo: '',
  dateFrom: '',
  thresholdPercentage: {},
  thresholdColors: {},
  teamWorklogColumns: [],
  teamWorklogs: []
};

const _globalTeamWorklogReducer = createReducer(
  defaultTeamWorklogStats,
  on(setTeamWorklogStats, (state, { stats }) => stats),
  on(resetTeamWorkLogStatistics,(state) => defaultTeamWorklogStats)
);

export function globalTeamWorklogReducer(state: TeamWorklogStatistics, action: Action) {
  return _globalTeamWorklogReducer(state, action);
}

const _globalTeamWorklogReducerForThisMonth = createReducer(
  defaultTeamWorklogStats,
  on(resetTeamWorkLogStatistics, (state) => defaultTeamWorklogStats),
  on(setTeamWorklogStatsForThisMonth, (state, { stats }) => ({ ...state, ...stats }))
);

export function globalTeamWorklogReducerForThisMonth(state: TeamWorklogStatistics, action: Action) {
  return _globalTeamWorklogReducerForThisMonth(state, action);
}
