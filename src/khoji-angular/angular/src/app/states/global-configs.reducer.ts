/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Action, createReducer, on } from '@ngrx/store';
import { ADMIN_TABLE_CONFIGS, DATATABLES_CONFIGS, GLOBAL_BASE_FIELD_AND_MAPPINGS, ISSUE_SOURCE_TYPE_CONFIGS, ISSUE_SOURCE_TYPE_FETCH_FREQUENCY, RAG_COLOR_CODES, SUBTASK_DISTRIBUTION, WORKLOG_DISTRIBUTION } from 'app/constants.configs';
import { MenuItem } from 'primeng/api';
import { GlobalConfigs } from './app-states';
import * as actions from './app.actions';
import { setDataSyncJobStatus } from './global-configs.actions';


const globalConfigs: GlobalConfigs = {
  khoji: undefined,
  angularAppConfigs: undefined,
  datatable: undefined,
  datatableButtons: undefined,
  indicatorFooterConfigs: undefined,
  groupingConfigs: {
    analysisByWorklog: {
      team: [],
    },
    teamWorklogAnalysis: {
      member: [],
      team: [],
    },
    manageTeams: {
      users: [],
      teamboards: [],
      sourceAndSystemUsers: []
    },
  },
  workLogConfig: [],
  configsUpdatedState: {},
  configsErrorState: {},
  serverConfigs: {
    [WORKLOG_DISTRIBUTION]: {},
    [SUBTASK_DISTRIBUTION]: {},
    [DATATABLES_CONFIGS]: null,
    [ADMIN_TABLE_CONFIGS]: null,
    [ISSUE_SOURCE_TYPE_CONFIGS]: {
      lastSuccessfulSyncTime: null,
      sourceIssueTypes: []
    },
    [ISSUE_SOURCE_TYPE_FETCH_FREQUENCY]: 0,
    [RAG_COLOR_CODES]: null,
  },
  updatedUser: undefined,
  updatedUserSettings: null,
  fetchButton: false,
  aiGeneratedCategories: [],
  dataSyncJobStatus: {},
};

globalConfigs.khoji = <any>{};
globalConfigs.khoji.lastFeched = 0;

const initialMenu: MenuItem[] = [];

const _globalConfigsReducer = createReducer(
  globalConfigs,
  on(actions.resetGivenServerConfigs, (state, { propKey }) => {
    const serverConfigs = { ...state.serverConfigs };
    propKey.forEach(pK => {
      delete serverConfigs[pK];
    });

    return { ...state, serverConfigs };
  }),
  on(actions.setKhojiConfigs, (state, { config }) => ({ ...state, khoji: config })),
  on(actions.setAngularAppConfigs, (state, { angularAppConfig }) => ({ ...state, angularAppConfigs: angularAppConfig })),
  on(actions.setDatatableConfigs, (state, { config }) => ({ ...state, datatable: config })),
  on(actions.setDatatableButtonsConfigs, (state, { config }) => ({ ...state, datatableButtons: config })),
  on(actions.setDropdownGroupingConfig, (state, { config }) => ({ ...state, groupingConfigs: config })),
  on(actions.setWorkLogMainConfigs, (state, { config }) => ({ ...state, workLogConfig: config })),
  on(actions.resetServerConfigs, (state) => ({ ...state, serverConfigs: { ...state.serverConfigs, [GLOBAL_BASE_FIELD_AND_MAPPINGS]: { "default.base.field": "", "base.field.to.issue.type.mappings": {} } } })),
  on(actions.isConfigsUpdated, (state, { propKey, propState }) => ({ ...state, configsUpdatedState: { ...state.configsUpdatedState, [propKey]: propState } })),
  on(actions.resetKhojiConfigs, (state) => ({ ...state, khoji: null })),
  on(actions.setConfigErrorState, (state, { propKey, propState }) => ({ ...state, configsErrorState: { ...state.configsUpdatedState, [propKey]: propState } })),
  on(actions.resetConfigUpdatedState, (state) => ({ ...state, configsUpdatedState: globalConfigs.configsUpdatedState })),
  on(actions.resetComponentConfigs, (state) => ({ ...state, khoji: { ...state.khoji, khojiComponents: null } })),
  on(actions.setWorklogCategoryIssueTypes, (state, { categoryName, issueTypes, selectedType }) => ({
    ...state,
    workLogConfig: state.workLogConfig
      .map(c => c.name == selectedType ? { ...c, includedIssueTypes: issueTypes, name: categoryName } : { ...c })
  })),
  on(actions.configsFetched, (state, { response }) => ({
    ...state,
    serverConfigs: { ...state.serverConfigs, ...response }
  })),
  on(actions.configUpdated, (state, { propKey, propValue }) => ({
    ...state,
    serverConfigs: { ...state.serverConfigs, [propKey]: propValue },
  })),
  on(actions.setUpdatedUser, (state, { updatedUser }) => (({ ...state, updatedUser: updatedUser }))),
  on(actions.setUpdatedUserSettings, (state, { settings }) => ({ ...state, updatedUserSettings: settings })),
  on(actions.setFetchButton, (state, { fetchButton }) => ({ ...state, fetchButton: fetchButton })),
  on(actions.setAiGeneratedCategories, (state, { aiGeneratedCategories }) => ({ ...state, aiGeneratedCategories })),
  on(actions.setSourceIssueTypes, (state, { sourceIssueTypes }) => {
    return {
      ...state,
      serverConfigs: {
        ...state.serverConfigs,
        'source-issue-type-sync.json': {
          ...state.serverConfigs['source-issue-type-sync.json'],
          sourceIssueTypes: sourceIssueTypes
        }
      }
    }
  }),
  on(setDataSyncJobStatus, (state, { dataSyncJobStatus }) => ({ ...state, dataSyncJobStatus: { [dataSyncJobStatus.jobId]: { ...state.dataSyncJobStatus[dataSyncJobStatus.jobId], ...dataSyncJobStatus } } })),
);

const _menuConfigReducer = createReducer(
  initialMenu,
  on(actions.setMenu, (state, { menu }) => menu),
)

export function menuReducer(state: any, action: any) {
  return _menuConfigReducer(state, action);
}

export function globalConfigsReducer(state: GlobalConfigs, action: Action) {
  return _globalConfigsReducer(state, action);
}
