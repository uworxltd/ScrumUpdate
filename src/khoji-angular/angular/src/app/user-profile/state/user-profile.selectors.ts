/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { createSelector, select } from "@ngrx/store";
import { AccessLevels, AppState, InstanceFeaturesStatus, UserAccessLevelsStatus } from "app/states/app-states";
import { pipe } from "rxjs";
import { filter } from "rxjs/operators";
import { Features, UserProfileState, Workspace } from "./user-profile.states";
import { Member, Team } from "app/admin/admin.entities";
import { Constants } from "app/constants";
import { getCurrentInstance, getCurrentWorkspace } from "app/shared/helper-functions";

const userSettingSelector = createSelector(
  (state: AppState) => state.userProfile,
  (userProfile: UserProfileState) => userProfile.userSettings
);

const workspacesSelector = createSelector(
  (state: AppState) => state.userProfile,
  (userProfile: UserProfileState) => userProfile.workspaces
);

export const workLogCategorizationEnabledSelector = (state: AppState) => {
  const workSpaces: Workspace[] = state.userProfile.workspaces;
  const currentSpace = getCurrentWorkspace();
  const foundWorkSpace = workSpaces?.find(w => w.id === Number(currentSpace));
  if (foundWorkSpace) {
    const currentInstance = getCurrentInstance();
    const foundInstance = foundWorkSpace.instances.find(instance => instance.id === Number(currentInstance));
    if (foundInstance) {
      return foundInstance.instanceFeatures?.some(feature => feature.id == Features.WORK_LOG_CATEGORIZATION);
    }
    return false;
  }
  return false;
}

const workspacesLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates) => loadingStates.workspacesLoadingState
);

const workspacesWithLoadingStateSelector = createSelector(
  workspacesSelector,
  workspacesLoadingStateSelector,
  (workspaces, loadingState) => ({ workspaces, loadingState })
);

const selectedInstanceSelector = createSelector(
  (state: AppState) => state.userProfile,
  (profile) => {
    const instance = profile.workspaces.find(workspace => workspace.id == profile.spaceId)?.instances.find(instance => instance.id == profile.instanceId);
    return instance ? { ...instance, spaceId: profile.spaceId } : null;
  }
)

const accessibleResourcesSelector = createSelector(
  (state: AppState) => state.userProfile,
  (userProfile: UserProfileState) => userProfile.accessibleResources
);

const accessibleResourcesLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates) => loadingStates.accessibleResourcesLoadingState
);

const instanceCreateLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates) => loadingStates.instanceDetailsLoadingState
);

export const userSelectedAccessibleResourceSelector = createSelector(
  (state: AppState) => state.userProfile,
  (userProfile: UserProfileState) => userProfile.userSelectedAccessibleResource
)

const userProfileSelector = createSelector(
  (state: AppState) => state.userProfile,
  (state: AppState) => state.userProfile.spaceId,
  (state: AppState) => state.userProfile.instanceId,
  (userProfile, spaceId, instanceId) => ({ ...userProfile, accessibleAccessLevels: getAccessibleLevels(userProfile, spaceId, instanceId) })
);

const accessibleLevelsSelector = createSelector(
  (state: AppState) => state.userProfile,
  (state: AppState) => state.userProfile.spaceId,
  (state: AppState) => state.userProfile.instanceId,
  (userProfile, spaceId, instanceId) => {
    return getAccessibleLevels(userProfile, spaceId, instanceId);
  }
);

const projectSourceConfiguredSelector = createSelector(
  (state: AppState) => state.userProfile,
  (userProfile: UserProfileState) => userProfile.projectSourceConfigured
);

const sourceSubscriptionDetailLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates) => loadingStates.subscriptionDetailsLoadingState
);

const loadingTemplatesSelector = createSelector(
  (state: AppState) => state.userProfile,
  (userProfile: UserProfileState) => userProfile.loadingTemplates
)

const userTeamsSelector = createSelector(
  (state: AppState) => state.userProfile,
  (userProfile: UserProfileState) => userProfile.userSettings?.user?.teams
);

const loggedInUserAccountIdSelector = createSelector(
  (state: AppState) => state.userProfile.userSettings.user?.member,
  (member: Member) => member?.accountId
);

export const selectLoggedInMemberAccountId = pipe(
  select(loggedInUserAccountIdSelector),
  filter(id => id !== undefined)
);

const encodedTeamNamesSelector = createSelector(
  userTeamsSelector,
  (teams: Team[]) => {
    const encodedTeamsName = teams?.map(team => encodeURIComponent(team.teamName));
    return encodedTeamsName?.join(',');
  }
);

export const selectEncodedTeamNames = pipe(
  select(encodedTeamNamesSelector),
  filter(data => data != null)
)

const userFirstNameSelector = createSelector(
  (state: AppState) => state.userProfile,
  (userProfile: UserProfileState) => userProfile.userSettings.user?.member?.fullName
);

const userFullNameSelector = createSelector(
  (state: AppState) => state.userProfile,
  (userProfile: UserProfileState) => userProfile.userSettings.user?.member?.fullName
)

const teamsCountSelector = createSelector(
  (state: AppState) => state.userProfile,
  (userProfile: UserProfileState) => userProfile.userSettings.user?.teams.length
);

const usersAddedInTeamSelector = createSelector(
  (state: AppState) => state.userProfile,
  (userProfile: UserProfileState) => userProfile.usersAdded
);

const worklogCategoryAddedSelector = createSelector(
  (state: AppState) => state.userProfile,
  (userProfile: UserProfileState) => userProfile.workLogCategoryAdded
)

const availableFeaturesSelector = createSelector(
  (state: AppState) => state.userProfile,
  (userProfile: UserProfileState) => userProfile.features
)

const instanceDetailsSelector = createSelector(
  (state: AppState) => state.userProfile,
  (userProfile: UserProfileState) => userProfile.instanceDetails
)

const khojiUserProfileSelector = createSelector(
  (state: AppState) => state.userProfile,
  (userProfile: UserProfileState) => userProfile.khojiUserProfile
);

const combinedInstanceDataAndLoadingStateSelector = createSelector(
  instanceDetailsSelector, instanceCreateLoadingStateSelector,
  (instanceDetails, instanceLoadingState) => {
    return { instanceLoadingState, instanceDetails };
  }
);

export const selectInstanceDataAndLoadingState = pipe(
  select(combinedInstanceDataAndLoadingStateSelector)
);

export const selectUserTeams = pipe(
  select(userTeamsSelector)
);

export const selectWorkspaces = pipe(
  select(workspacesSelector)
);

export const selectWorkspacesWithLoadingStates = pipe(
  select(workspacesWithLoadingStateSelector)
);

export const selectWorkspaceWithInstance = pipe(
  select(workspacesSelector),
  filter(workspaces => workspaces.length !== 0)
)

export const selectWorkLogCategorizationEnabled = pipe(
  select(workLogCategorizationEnabledSelector)
);

export const selectWorkspacesLoadingState = pipe(
  select(workspacesLoadingStateSelector)
);


export const selectInstanceCreateLoadingState = pipe(
  select(instanceCreateLoadingStateSelector)
);


export const selectAccessibleResources = pipe(
  select(accessibleResourcesSelector)
);

export const selectAccessibleResourcesLoadingState = pipe(
  select(accessibleResourcesLoadingStateSelector)
);

export const selectUserSelectedAccessibleResource = pipe(
  select(userSelectedAccessibleResourceSelector)
)

export const selectSourceSubscriptionLoadingState = pipe(
  select(sourceSubscriptionDetailLoadingStateSelector)
);

export const selectLoadingTemplates = pipe(
  select(loadingTemplatesSelector)
)

export const selectAvailableFeatures = pipe(
  select(availableFeaturesSelector)
)

export const selectInstanceDetail = pipe(
  select(instanceDetailsSelector)
);

export const selectUserProfile = pipe(
  select(userProfileSelector),
  filter(data => data.khojiUserProfile != null)
);

export const selectUserSetting = pipe(
  select(userSettingSelector),
  filter(userSettings => userSettings != undefined)
);

export const selectAccessibleAccessLevels = pipe(
  select(accessibleLevelsSelector),
  filter(accessibleAccessLevels => accessibleAccessLevels && accessibleAccessLevels.length > 0)
);

export const selectProjectSourceConfigured = pipe(
  select(projectSourceConfiguredSelector)
);

export const selectUserFirstName = pipe(
  select(userFirstNameSelector),
  filter(firstName => firstName != undefined)
);

export const selectUserFullName = pipe(
  select(userFullNameSelector),
  filter(fullName => fullName != undefined)
);

export const selectTeamsCount = pipe(
  select(teamsCountSelector)
);

export const selectUsersAddedInTeam = pipe(
  select(usersAddedInTeamSelector)
);

export const selectWorklogCategoryAdded = pipe(
  select(worklogCategoryAddedSelector)
);

export const selectKhojiUserProfile = pipe(
  select(khojiUserProfileSelector),
  filter(userProfile => userProfile !== undefined)
);

const deleteAccountLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates) => loadingStates?.deleteAccountLoadingState,
);

export const selectDeleteAccountLoadingState = pipe(
  select(deleteAccountLoadingStateSelector)
);

const deleteAppLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates) => loadingStates?.deleteAppLoadingState,
)

export const selectDeleteAppLoadingState = pipe(
  select(deleteAppLoadingStateSelector)
);

export const hasAccessLevelSelector = (props: { accessLevel: AccessLevels }) =>
  createSelector(accessibleLevelsSelector, (accessLevels) => {
    return accessLevels?.includes(props.accessLevel);
  });

function getAccessibleLevels(userProfile: UserProfileState, spaceId: number, instanceId: number): string[] {
  const availableAccessLevels: string[] = ['TENANT_ADMIN', 'ADMIN', 'USER'];

  let currentAccessLevel = userProfile
    ?.workspaces
    ?.find(w => w.id === spaceId)
    ?.instances
    ?.find(i => i.id === instanceId)
    ?.instanceUser
    ?.accessLevelCode;
  switch (currentAccessLevel) {
    case 'TENANT_ADMIN':
      return availableAccessLevels; // Return all roles
    case 'ADMIN':
      return availableAccessLevels.slice(1); // Return 'ADMIN' and 'USER'
    case 'USER':
      return availableAccessLevels.slice(2); // Return only 'USER'
    default:
      return [];
  }
}

export const selectCurrentInstance = pipe(
  select(selectedInstanceSelector),
  filter(instance => instance != null)
);

const accessLevelsStatusSelector = createSelector(
  accessibleLevelsSelector,
  (accessLevels) =>
    <UserAccessLevelsStatus>{
      hasAdminAccess: accessLevels?.includes(AccessLevels.Admin),
      hasTenantAdminAccess: accessLevels?.includes(AccessLevels.TenantAdmin)
    }
);

export const selectAccessLevelsStatus = pipe(select(accessLevelsStatusSelector));

const instanceFeaturesStatusSelector = createSelector(
  instanceDetailsSelector,
  (instance) => instance ?
    <InstanceFeaturesStatus>{
      // Main Features
      isMyWorkEnabled: instance?.features?.some((f) => f.id === Features.MY_WORK),
      isTeamViewEnabled: instance?.features?.some((f) => f.id === Features.TEAM_VIEW),

      // My Worklogs child features
      // isScrumUpdatesEnabled: instance?.features?.some((f) => f.id === Features.SCRUM_UPDATES),
      isMyWorklogsEnabled: instance?.features?.some((f) => f.id === Features.MY_WORKLOGS),

      // Team View child features
      // isWorklogInsightsEnabled: instance?.features?.some((f) => f.id === Features.WORKLOG_INSIGHTS),
      isCategorizationEnabled: instance?.features?.some((f) => f.id === Features.WORK_LOG_CATEGORIZATION),
      isTeamPulseEnabled: instance?.features?.some((f) => f.id === Features.TEAM_PULSE),
      isStandupBoardEnabled: instance?.features?.some((f) => f.id === Features.STANDUP_BOARD),
    } : null
);

export const selectInstanceFeaturesStatus = pipe(select(instanceFeaturesStatusSelector), filter(status => status != null));
