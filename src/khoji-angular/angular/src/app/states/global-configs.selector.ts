/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { createSelector, select } from "@ngrx/store";
import { Constants } from "app/constants";
import { ISSUE_SOURCE_TYPE_CONFIGS, OTHERS_WORKLOG_EMAIL_SUBSCRIPTION_THRESHOLD, SUBTASK_DISTRIBUTION, WORKLOG_DATA_STORAGE_CONFIG, WORKLOG_DAY_HOUR_CONFIG, WORKLOG_DISTRIBUTION, WORKLOG_MAIN_CATEGORIES_ALIAS, WORKLOG_OTHER_CATEGORIES_ALIAS, WORKLOG_DATA_SYNC_PERMISSION, INCLUDE_WEEKENDS_IN_WORKLOG_STATS } from "app/constants.configs";
import { WorklogConfigAction, WorklogConfigActionType } from "app/interface/worklog-config-action";
import { pipe } from "rxjs";
import { filter, map } from "rxjs/operators";
import { AppState, GlobalConfigs, SprintAnalyticsState } from "./app-states";
import { UserProfileState } from "app/user-profile/state/user-profile.states";

const dropdownGroupingsSelector = createSelector(
  (state: AppState) => state.globalConfigs,
  (configs: GlobalConfigs) => configs.groupingConfigs
);

export const khojiLimitationsSelector = createSelector(
  (state: AppState) => state.userProfile,
  (userProfile: UserProfileState) => {
    const instanceId = userProfile.instanceId;
    const workspaceId = userProfile.spaceId;
    return userProfile?.workspaces?.find(workspace => workspace.id == workspaceId)
      ?.instances.find(instance => instance.id == instanceId)?.limitationAndComponents?.khojiLimitations || []
  }
);

export const khojiComponentsSelector = createSelector(
  (state: AppState) => state.userProfile,
  (userProfile: UserProfileState) => {
    const instanceId = userProfile.instanceId;
    const workspaceId = userProfile.spaceId;
    return userProfile?.workspaces?.find(workspace => workspace.id == workspaceId)
      ?.instances.find(instance => instance.id == instanceId)?.limitationAndComponents?.khojiComponents
  }
);

export const serverConfigSelector = createSelector(
  (state: AppState) => state.globalConfigs,
  (configs: GlobalConfigs) => configs.serverConfigs
);

export const statsForWeekendSettingSelector = createSelector(
  serverConfigSelector,
  (serverConfigs) => serverConfigs ? eval(serverConfigs[INCLUDE_WEEKENDS_IN_WORKLOG_STATS]) : undefined
);

export const selectWeekendStatsTooltip = pipe(
  select(statsForWeekendSettingSelector),
  map(ws => ws ? 'Including weekends in worklog stats, you can change it from manage settings' : 'Excluding weekends in worklog stats, you can change it from manage settings')
)


const _generalSettingsSelector = createSelector(
  serverConfigSelector,
  (serverConfigs) => serverConfigs
    ? {
      worklogDayHour: Number(serverConfigs[WORKLOG_DAY_HOUR_CONFIG]),
      productiveAlias: serverConfigs[WORKLOG_MAIN_CATEGORIES_ALIAS],
      nonProductiveAlias: serverConfigs[WORKLOG_OTHER_CATEGORIES_ALIAS],
      othersWorklogEmailSubscriptionThreshold: serverConfigs[OTHERS_WORKLOG_EMAIL_SUBSCRIPTION_THRESHOLD]
    }
    : undefined
)

const _dataStoragePermissionSelector = createSelector(serverConfigSelector, (serverConfigs) =>
  serverConfigs ? {
    dataStoragePermission: eval(serverConfigs[WORKLOG_DATA_STORAGE_CONFIG])
  } : undefined
);

const _dataSyncPermissionSelector = createSelector(serverConfigSelector, (serverConfigs) =>
  serverConfigs ? {
    dataSyncPermission: eval(serverConfigs[WORKLOG_DATA_SYNC_PERMISSION])
  } : undefined
);

export const globalConfigSelector = createSelector(
  (state: AppState) => state.globalConfigs,
  (configs: GlobalConfigs) => configs.khoji
);

const globalServerConfigsSelector = createSelector(
  (state: AppState) => state.globalConfigs,
  (configs: GlobalConfigs) => configs.serverConfigs
);

export const featureFlagMapSelector = createSelector(
  globalConfigSelector,
  (configs) => configs?.featureFlagMap
);

const cacheTypeSelector = createSelector(
  globalConfigSelector,
  (configs) => configs?.cacheType
);

const dataSourceSelector = createSelector(
  globalConfigSelector,
  (configs) => configs?.dataSource
);

const enableDashboardInsightsSelector = createSelector(
  featureFlagMapSelector, cacheTypeSelector, dataSourceSelector,
  (featureFlagMap, cacheType, dataSource) => {
    return featureFlagMap && featureFlagMap[Constants.DASHBOARD_INSIGHTS_FEATURE] && cacheType === Constants.CACHE_MODE_REDIS && dataSource === Constants.ES_DATASOURCE
  }
)

const issueTypesSelector = createSelector(
  (state: AppState) => state.globalConfigs,
  (configs: GlobalConfigs) => configs.serverConfigs[ISSUE_SOURCE_TYPE_CONFIGS]
);

const configUpdatedSelector = createSelector(
  (state: AppState) => state.globalConfigs,
  (configs: GlobalConfigs) => configs.configsUpdatedState
);

const updatedUserSelector = createSelector(
  (state: AppState) => state.globalConfigs,
  (configs: GlobalConfigs) => configs.updatedUser
);

const updatedUserSettingsSelector = createSelector(
  (state: AppState) => state.globalConfigs,
  (configs: GlobalConfigs) => configs.updatedUserSettings
)

const worklogTimeSelector = createSelector(
  (state: AppState) => state.globalConfigs,
  (configs: GlobalConfigs) => configs.khoji.workLogHours
)

const sourceIssueIdsSelector = createSelector(
  issueTypesSelector,
  (issueTypes) =>
    issueTypes?.sourceIssueTypes?.reduce<{
      sourceIssuesIds: string[];
    }>(
      ({ sourceIssuesIds }, { id }) => ({
        sourceIssuesIds: [...sourceIssuesIds, id],
      }),
      { sourceIssuesIds: [] }
    )
);

const assignedIssueTypesSelector = createSelector(
  (appState: AppState) =>
    appState.globalConfigs.serverConfigs[WORKLOG_DISTRIBUTION],
  (worklogDistribution) => {
    return worklogDistribution
      ? Object.values(worklogDistribution).flatMap(
        ({ issueTypes }) => issueTypes
      )
      : [];
  }
);

const assignedSubtaskIssueTypesSelector = createSelector(
  (appState: AppState) =>
    appState.globalConfigs.serverConfigs[SUBTASK_DISTRIBUTION],
  (worklogDistribution) => {
    return worklogDistribution
      ? Object.values(worklogDistribution).flatMap(
        ({ issueTypes }) => issueTypes
      )
      : [];
  }
);


const unAssignedIssueTypesSelector = createSelector(
  issueTypesSelector,
  assignedIssueTypesSelector,
  (issueTypes, assignedIssueTypes) => {
    const assignedIssues = assignedIssueTypes.map(({ id }) => id);
    return issueTypes?.sourceIssueTypes?.filter(({ id }) => !assignedIssues.includes(id)).map(issueType => {
      const obj = { ...issueType };
      obj.toString = () => obj.name;
      return obj;
    });
  }
);

const unAssignedSubtaskIssueTypesSelector = createSelector(
  issueTypesSelector,
  assignedSubtaskIssueTypesSelector,
  (issueTypes, assignedIssueTypes) => {
    const assignedIssues = assignedIssueTypes.map(({ id }) => id);
    return issueTypes?.sourceIssueTypes?.filter(({ id }) => !assignedIssues.includes(id)).map(issueType => {
      const obj = { ...issueType };
      obj.toString = () => obj.name;
      return obj;
    });
  }
);

const deletedIssueTypesSelector = createSelector(
  sourceIssueIdsSelector,
  assignedIssueTypesSelector,
  ({ sourceIssuesIds }, assignedIssueTypes) => {
    if (sourceIssuesIds.length) return assignedIssueTypes.filter(({ id }) => !sourceIssuesIds.includes(id))
  }
);


const editedIssueTypesSelector = createSelector(
  issueTypesSelector,
  assignedIssueTypesSelector,
  (issueTypes, assignedIssueTypes) =>
    assignedIssueTypes.filter(({ id, name }) => {
      const issueType = issueTypes.sourceIssueTypes.find((issueType) => issueType.id === id);
      if (issueType) {
        return issueType?.name !== name;
      }
      return false;
    })
);

const editedSubtaskIssueTypesSelector = createSelector(
  issueTypesSelector,
  assignedSubtaskIssueTypesSelector,
  (issueTypes, assignedIssueTypes) =>
    assignedIssueTypes.filter(({ id, name }) => {
      const issueType = issueTypes.sourceIssueTypes.find((issueType) => issueType.id === id);
      if (issueType) {
        return issueType?.name !== name;
      }
      return false;
    })
);


const worklogConfigSyncSelector = createSelector(
  deletedIssueTypesSelector,
  editedIssueTypesSelector,
  (state: AppState) => state.globalConfigs.serverConfigs[WORKLOG_DISTRIBUTION],
  (deletedIssueTypes, editedIssueTypes, worklogDistribution) => {
    if (!worklogDistribution) {
      return [];
    }
    const editedIssueTypesActions = editedIssueTypes.map<WorklogConfigAction>(
      (issueType) => ({
        issueType,
        action: WorklogConfigActionType.EDIT,
      })
    );
    const deletedIssueTypesActions = deletedIssueTypes?.map<WorklogConfigAction>(
      (issueType) => ({
        issueType,
        action: WorklogConfigActionType.DELETE,
      })
    );
    return editedIssueTypesActions.concat(deletedIssueTypesActions);
  }
);

const componentsConfigsSelector = createSelector(
  (state: AppState) => state.globalConfigs.khoji,
  (khojiConfigs) => khojiConfigs?.khojiComponents
)

const fetchButtonSelector = createSelector(
  (state: AppState) => state.globalConfigs,
  (globalConfigs) => globalConfigs.fetchButton
);

const globalBaseFieldSelector = createSelector(
  globalConfigSelector,
  (configs) => configs.globalBaseField
)

const lastNumberOfDaysForRecentIssueTypesSelector = createSelector(
  (state: AppState) => state.globalConfigs.khoji,
  (khojiConfigs) => khojiConfigs?.lastNumberOfDaysForRecentIssueTypes
)

const unassignedWorklogLegendsCountSelector = createSelector(
  (state: AppState) => state.globalConfigs,
  (configs: GlobalConfigs) => configs.khoji.unassignedWorklogLegendsCount
);

export const selectLastNumberOfDaysForRecentIssueTypes = pipe(
  select(lastNumberOfDaysForRecentIssueTypesSelector),
  filter(val => val != undefined)
)

export const selectDropdownGroupings = pipe(
  select(dropdownGroupingsSelector),
  filter(configs => configs !== undefined)
);

export const selectKhojiConfig = pipe(
  select(globalConfigSelector),
);

export const selectKhojiComponentsAgainstInstance = pipe(
  select(khojiComponentsSelector),
);

export const selectGlobalConfig = pipe(
  select(globalConfigSelector),
  filter(configs => configs !== undefined)
);

export const selectGlobalServerConfigs = pipe(
  select(globalServerConfigsSelector),
  filter(configs => configs !== undefined)
);

export const selectIssueTypes = pipe(
  select(issueTypesSelector),
  filter(configs => configs !== undefined)
);

export const selectConfigUpdated = pipe(
  select(configUpdatedSelector),
  filter(configs => configs !== undefined)
);

export const selectDataStoragePermission = pipe(
  select(_dataStoragePermissionSelector),
  filter(configs => configs !== undefined)
);

export const selectDataSyncPermission = pipe(
  select(_dataSyncPermissionSelector),
  filter(configs => configs !== undefined)
);

export const selectServerConfig = pipe(
  select(serverConfigSelector),
  filter(data => data !== undefined)
);

export const selectWorkLogGeneralSettings = pipe(
  select(_generalSettingsSelector),
  filter(data => data !== undefined)
);

export const selectWorklogTimeConfig = pipe(
  select(worklogTimeSelector),
  filter(data => data !== undefined)
);

export const selectUnassignedIssueTypes = pipe(select(unAssignedIssueTypesSelector));
export const selectSubtaskUnassignedIssueTypes = pipe(select(unAssignedSubtaskIssueTypesSelector));
export const selectWorklogConfigSync = pipe(select(worklogConfigSyncSelector));
export const selectUpdatedUser = pipe(select(updatedUserSelector));
export const selectUpdatedUserSettings = pipe(select(updatedUserSettingsSelector));
export const getComponentConfigs = pipe(select(componentsConfigsSelector), filter((configData) => !!configData));
export const getKhojiLimitations = pipe(select(khojiLimitationsSelector), filter((configData) => !!configData));

export const selectFetchButton = pipe(
  select(fetchButtonSelector)
);

export const selectFeatureFlagMap = pipe(
  select(featureFlagMapSelector),
  filter(featureFlag => featureFlag !== undefined)
);

export const selectCacheType = pipe(
  select(cacheTypeSelector),
  filter(cacheType => cacheType !== undefined)
);

export const selectDataSource = pipe(
  select(dataSourceSelector),
  filter(dataSource => dataSource !== undefined)
);

export const selectEnableDashboardInsights = pipe(
  select(enableDashboardInsightsSelector)
);


export const selectGlobalBaseField = pipe(
  select(globalBaseFieldSelector)
);

export const selectUnassignedWorklogLegendsCount = pipe(
  select(unassignedWorklogLegendsCountSelector)
);

const proactiveSprintsSelector = createSelector(
  (state: AppState) => state.sprintAnalyticsState,
  (configs: SprintAnalyticsState) => configs?.proactiveSprints,
);

// this action starts sprints_list_sync job
export const selectProactiveSprintsForDropdown = pipe(
  select(proactiveSprintsSelector),
)

const proactiveSprintFilteredSelector = createSelector(
  (state: AppState) => state.sprintAnalyticsState,
  (configs: SprintAnalyticsState) => configs?.targetProactiveSprintId
)

export const selectProActiveSprintFiltered = pipe(
  select(proactiveSprintFilteredSelector)
)
