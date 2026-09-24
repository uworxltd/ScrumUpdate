/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Action, createReducer, on } from '@ngrx/store';
import { RequestFilters } from './app-states';
import * as actions from './app.actions';
import { matchTeamMembers } from './global-filters.reducer';
import { extractMembersForSelectedWorklogTeams, getMembersFromTeamMap, updateWorklogTeamsList } from './global-filters.selector';
import { Member, Team } from 'app/admin/admin.entities';

const requestFilters: RequestFilters = {
  worklogTeams: null,
  worklogTeamsFilter: null,
  members: null,
  worklogTeamsList: null,
  users: null,
  dataFetchingStrategy: null,
  teams: null,
  dateLabel: null,
  dateTo: null,
  dateFrom: null,
  clearCache: null,
  aboveThreshold: null,
  status: null,
  requestId: null,
};

const _requestFiltersReducer = createReducer(
  requestFilters,
  on(actions.updateRequestFilters, (state, { filters }) => ({ ...state, ...filters, worklogTeamsFilter: filters.worklogTeams?.map(t => ({ name: t, selected: false })) || [] })),
  // after submit
  on(actions.selectStatus, (state, { value }) => ({ ...state, status: value })),
  on(actions.setWorklogTeamsFilter, (state, { team }) => ({ ...state, worklogTeamsFilter: state.worklogTeamsFilter.map(f => ({ ...f, selected: f.name === team ? !f.selected : false })) })),
  on(actions.clearWorklogTeamsFilter, (state) => ({...state, worklogTeamsFilter: state.worklogTeamsFilter.map(f => ({ ...f, selected: false })) })),
  on(actions.selectMembers, (state, { members }) => ({ ...state, members: matchTeamMembers(members, extractMembersForSelectedWorklogTeams(state.worklogTeamsList, state.worklogTeams)) })),
  on(actions.setWorklogTeamsList, (state, { list }) => ({
    ...state,
    worklogTeamsList: mapMembers(list),
    worklogTeams: [], // by default no team is selected
    members: extractMembersForSelectedWorklogTeams(list, list.map(t => t.teamName)) // select team members
  })),
  on(actions.setTeamMembers, (state, { teamsMembers }) => ({
    ...state, worklogTeamsList: mapMembers(updateWorklogTeamsList(state.worklogTeamsList, teamsMembers)),
    members: getMembersFromTeamMap(teamsMembers)
  })),
);

export function requestFiltersReducer(state: RequestFilters, action: Action) {
  return _requestFiltersReducer(state, action);
}

function mapMembers(list: Team[]): Team[] {
  return list.map((team: Team) => {
    const updatedMembers = team.members.map((m: Member) => {
      return {
        ...m,
        memberRole: m.role.name
      };
    });
    return {
      ...team,
      members: updatedMembers
    };
  });
}
