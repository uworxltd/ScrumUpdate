/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Action, createReducer, on } from '@ngrx/store';
import { Member } from 'app/admin/admin.entities';
import { AppFeature, getAppFeature } from 'app/app-features';
import { GlobalFilters } from './app-states';
import * as actions from './app.actions';
import { defaultFilters } from './global-filters.default';
import { extractMembersForSelectedWorklogTeams, getMembersFromTeamMap, updateWorklogTeamsList } from './global-filters.selector';



export const _analysisByTeamboardReducer = createReducer(
  defaultFilters,
  on(actions.selectDefaultDateRange, (state) => ({ ...state, dateFrom: defaultFilters.dateFrom, dateTo: defaultFilters.dateTo })),
  on(actions.selectDefaultDateLabel, (state) => ({ ...state, dateLabel: defaultFilters.dateLabel })),
  on(actions.selectDateRange, (state, { dateFrom, dateTo }) => ({ ...state, dateFrom: dateFrom, dateTo: dateTo })),
  on(actions.selectDateLabel, (state, { dateLabel }) => ({ ...state, dateLabel: dateLabel })),

  // submit
  on(actions.selectStatus, (state, { value }) => ({ ...state, status: value })),
  on(actions.resetGlobalFiltersMap, (state) => defaultFilters),
  on(actions.setRequestId, (state, { requestId }) => ({ ...state, requestId: requestId })),
  on(actions.setLocalFilterFlag, (state, { triggeredLocalFilter }) => ({ ...state, isLocalFilterTriggered: triggeredLocalFilter }))
);

const resetWorklogFilters = (state: GlobalFilters) => ({
  ...state,
  throughputInterval: defaultFilters.throughputInterval,
  status: defaultFilters.status,
});

export const _analysisByWorklogReducer = createReducer(
  defaultFilters,
  // before submit
  on(actions.selectTeams, (state, { ids }) => ({
    ...state,
    teams: matchTeamsIds(ids, state.teamsList),
    dateFrom: defaultFilters.dateFrom, dateTo: defaultFilters.dateTo
  })),
  on(actions.selectDateRange, (state, { dateFrom, dateTo }) => ({ ...state, dateFrom: dateFrom, dateTo: dateTo })),
  on(actions.selectDateLabel, (state, { dateLabel }) => ({ ...state, dateLabel: dateLabel })),
  // submit
  on(actions.fetchTeamStats, actions.resetTeamFilters, (state) => ({ ...resetWorklogFilters(state) })),

  // after submit
  on(actions.selectStatus, (state, { value }) => ({ ...state, status: value })),


  // non-filters
  on(actions.setTeamsList, (state, { list }) => ({
    ...state,
    teamsList: list
  })),
  on(actions.setUsers, (state, { users }) => ({ ...state, users: users })),
  on(actions.resetGlobalFiltersMap, (state) => defaultFilters),
  on(actions.setRequestId, (state, { requestId }) => ({ ...state, requestId: requestId }))
);

const resetTeamWorklogFilters = (state: GlobalFilters) => ({
  ...state,

});

const _teamWorklogAnalysisReducer = createReducer(
  defaultFilters,
  // before submit
  on(actions.selectWorklogTeams, (state, { ids }) => ({
    ...state,
    worklogTeams: ids,
    members: extractMembersForSelectedWorklogTeams(state.worklogTeamsList, ids), // select team members
    dateFrom: defaultFilters.dateFrom, dateTo: defaultFilters.dateTo
  })),
  on(actions.selectMembers, (state, { members }) => ({ ...state, members: matchTeamMembers(members, extractMembersForSelectedWorklogTeams(state.worklogTeamsList, state.worklogTeams)) })),
  on(actions.selectDateRange, (state, { dateFrom, dateTo }) => ({ ...state, dateFrom: dateFrom, dateTo: dateTo })),
  on(actions.selectDateLabel, (state, { dateLabel }) => ({ ...state, dateLabel: dateLabel })),
  on(actions.othersChartDataAvailable, (state, { value }) => ({ ...state, othersChartDataAvailable: value })),
  // submit
  on(actions.fetchTeamWorklogStats, (state) => ({ ...resetTeamWorklogFilters(state) })),

  // non-filters
  on(actions.setWorklogTeamsList, (state, { list }) => ({
    ...state,
    worklogTeamsList: list,
    worklogTeams: [], // by default no team is selected
    members: extractMembersForSelectedWorklogTeams(list, list.map(t => t.teamName)) // select team members
  })),
  on(actions.setTeamWorklogUpdated, (state, { teamWorklogUpdated }) => ({ ...state, teamWorklogUpdated: teamWorklogUpdated })),
  on(actions.setTeamWorklogUpdated, (state, { teamWorklogUpdated }) => ({ ...state, teamWorklogUpdated: teamWorklogUpdated })),
  // on(actions.setTeamMembers, (state, { teamsMembers }) => ({ ...state, membersList : teamsMembers.map(m => ({ member_name: m.fullName, member_id: m.memberEmail, memberRole: m.memberRole })) }))
  on(actions.setTeamMembers, (state, { teamsMembers }) => ({
    ...state, worklogTeamsList: updateWorklogTeamsList(state.worklogTeamsList, teamsMembers),
    members: getMembersFromTeamMap(teamsMembers)
  })),
  on(actions.setUsers, (state, { users }) => ({ ...state, users: users })),
  on(actions.resetGlobalFiltersMap, (state) => defaultFilters)
);


const _defaultReducer = createReducer(
  defaultFilters,
  on(actions.resetGlobalFiltersMap, (state) => defaultFilters),
)


export function globalFiltersReducer(state: GlobalFilters, action: Action): GlobalFilters {
  const appFeature = getAppFeature();

  switch (appFeature) {
    case AppFeature.TeamWorklogAnalysis:
      return _teamWorklogAnalysisReducer(state, action);
    case AppFeature.AdminPanel:
    case AppFeature.UserProfile:
    case AppFeature.Dashboard:
      return _defaultReducer(state, action);


    default:
      return _teamWorklogAnalysisReducer(state, action);
  }
}


/**
 * Generic method to merge list
 *
 * @param existingArray
 * @param newArray
 * @param compareIds Optional param to compare object with ids
 * @param compareAttributes  Optional param to check which object to keep after comparison
 * @returns
 */
function mergeList<T>(existingArray: T[], newArray: T[], compareIds?: (a: T, b: T) => boolean, compareAttributes?: (a: T, b: T) => T): T[] {
  const mergedArray: T[] = [...existingArray];

  if (!compareIds) {
    compareIds = (a, b) => a === b;
  }

  if (newArray) {
    for (const newItem of newArray) {
      const existingItemIndex = mergedArray.findIndex(item => compareIds!(item, newItem));

      if (existingItemIndex === -1) {
        mergedArray.push(newItem);
      }
      else if (compareAttributes) {
        mergedArray[existingItemIndex] = compareAttributes(mergedArray[existingItemIndex], newItem);
      }
    }
  }

  return mergedArray;
}

function matchTeamsIds(teamsIds: string[], teamsMap: string[]) {

  return teamsMap.filter(team => teamsIds.indexOf(team['teamName']) !== -1)
    .map(team => team['teamName']);
}

export function matchTeamMembers(teamMembers: Member[], stateMembers: Member[]) {
  return teamMembers.filter(tm => stateMembers.find(sm => sm.fullName.includes(tm.fullName)));
}
