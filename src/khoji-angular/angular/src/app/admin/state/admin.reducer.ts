/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Action, createReducer, on } from "@ngrx/store";
import * as adminActions from './admin.actions';
import { AdminState } from "./admin.state";
import { LoadingState } from "app/states/app-states";
import { emailUpdatedStatus } from "./admin.actions";
import { User } from "../admin.entities";
import { clearStatesForLoginPage } from "app/states/app.actions";

const defaultAdminState: AdminState = {
  users: [],
  selectedUserIds: [],
  selectedJiraUserIds: [],
  selectedSupervisorIds: [],
  roles: [],
  organizations: [],
  members: [],
  teamboards: [],
  selectedTeamboardIds: [],
  teams: [],
  userOrganizations: [],
  userTeams: [],
  locations: [],
  updateEmailSuccess: undefined,
  selectedUser: undefined,
  fieldErrors: [],
  allSourceProjects: [],
  allSourceUsers: [],
  allSourceCustomFields: [],
  existingUsers: [],
  sourceTeamboards: [],
  //sourceIssueCategories: [],
  //isAllSourceUsersFetched: false,
  //errorFetchingUsers: false,
  //defaultIssueCategories: [],
  projectIntegration: {
    customFields: {
      KhojiEpicId: '',
      KhojiHighLevelEstimate: '',
      KhojiSprintList: '',
      KhojiStoryPoints: '',
      KhojiTeamBoard: ''
    },
    sourceSystem: {
      apiToken: '',
      sourceUrl: '',
      sourceUser: ''
    },
    projects: [],
    //selectedProjects: [],
    teamBoards: [],
    //selectedTeamBoards: [],
    users: [],
    name: '',
    updateDate: '',
    issueCategoryMap: {},
    sprintCategoryMap: {},
    releaseCategoryMap: {},
    billingStrategy: ''
  },
  categoryConfig: {
    issue: {
      khojiCategories: [],
      sourceCategories: [],
    },
    sprint: {
      khojiCategories: [],
      sourceCategories: [],
    },
    release: {
      khojiCategories: [],
      sourceCategories: [],
    },
  },
  isComingFromAdminDashboard: false,
  userLoadingState: undefined,
  khojiTeamsLoadingState: LoadingState.Pending,
  sourceUserCount: 0,
  accessLevels: undefined,
  basicUsers: undefined,
  userDetail: undefined,
  teamsLength: 0,
  loginWithAtlassianLoadingState: LoadingState.Pending,
  loginWithAtlassianResponse: undefined,
  inviteUserModalStatus: true,
  onboardingSelectedRoleId: '',
  newJiraUserId: '',
  addJiraUsersLoadingState: LoadingState.Pending,
  fetchUsersAgainstsMemberIdsLoadingState: LoadingState.Pending,
  usersAgainstsMembers: []
};

const _adminReducer = createReducer(
  defaultAdminState,
  on(adminActions.resetAdminStateToDefault, (state) => ({ ...defaultAdminState })),
  on(adminActions.resetUserState, (state) => ({ ...state, users: defaultAdminState.users })),
  on(adminActions.setKhojiTeamsList, (state, { khojiTeamsList }) => ({ ...state, teams: khojiTeamsList })),
  on(adminActions.setBillingStrategy, (state, { billingStrategy }) => ({ ...state, projectIntegration: ({ ...state.projectIntegration, billingStrategy: billingStrategy }) })),
  on(adminActions.setOrganizationsList, (state, { organizationsList }) => ({ ...state, organizations: organizationsList })),
  on(adminActions.setMembersList, (state, { membersList }) => ({ ...state, members: membersList })),
  on(adminActions.setTeamboardsList, (state, { teamboardsList }) => ({ ...state, teamboards: teamboardsList })),
  on(adminActions.setUsers, (state, { users }) => ({ ...state, users: users.map(user => ({ ...user, loading: LoadingState.Done })) })),
  on(adminActions.setBasicUsers, (state, { users }) => ({ ...state, basicUsers: users })),
  on(adminActions.setUserDetail, (state, { userDetail }) => ({ ...state, userDetail: userDetail })),
  on(adminActions.resetUsers, (state) => ({ ...state, users: defaultAdminState.users })),
  on(adminActions.setSourceUserCount, (state, { sourceUserCount }) => ({ ...state, sourceUserCount: sourceUserCount })),
  on(adminActions.setLocations, (state, { locations }) => ({ ...state, locations: locations })),
  on(adminActions.setSelectedUser, (state, { selectedUser }) => ({ ...state, selectedUser: selectedUser })),
  on(adminActions.sendUserInvite, (state) => ({ ...resetFieldErrors(state) })),
  on(adminActions.setFieldErrors, (state, { errors }) => ({ ...state, fieldErrors: setError(errors) })),
  on(adminActions.setSourceSystem, (state, { sourceSystem }) => ({ ...state, projectIntegration: ({ ...state.projectIntegration, sourceSystem: sourceSystem }) })),
  on(adminActions.setSourceProjects, (state, { projects }) => ({ ...state, allSourceProjects: projects })),
  on(adminActions.setSourceUsers, (state, { users }) => ({ ...state, allSourceUsers: users })),
  on(adminActions.setSourceCustomFields, (state, { customFields }) => ({ ...state, allSourceCustomFields: customFields })),
  on(adminActions.setExistingUsers, (state, { users }) => ({ ...state, existingUsers: users })),
  on(adminActions.setSelectedSourceProjects, (state, { projects }) => ({ ...state, projectIntegration: ({ ...state.projectIntegration, projects: projects }) })),
  on(adminActions.setSelectedSourceUsers, (state, { users }) => ({ ...state, projectIntegration: ({ ...state.projectIntegration, users: users }) })),
  on(adminActions.setProjectSourceName, (state, { name }) => ({ ...state, projectIntegration: ({ ...state.projectIntegration, name: name }) })),
  on(adminActions.setSourceTeamboards, (state, { teamboards }) => ({ ...state, sourceTeamboards: teamboards })),
  on(adminActions.setSelectedSourceTeamboards, (state, { teamboards }) => ({ ...state, projectIntegration: ({ ...state.projectIntegration, teamBoards: teamboards }) })),
  on(adminActions.setProjectSource, (state, { projectSource }) => ({ ...state, projectIntegration: projectSource })),
  on(adminActions.setCustomFields, (state, { customFields }) => ({ ...state, projectIntegration: ({ ...state.projectIntegration, customFields: customFields }) })),
  on(adminActions.setRoles, (state, { roles }) => ({ ...state, roles: roles })),
  on(adminActions.setIsComingFromAdminDashboard, (state, { isComingFromAdminDashboard }) => ({ ...state, isComingFromAdminDashboard: isComingFromAdminDashboard })),
  on(
    adminActions.setKhojiToSourceCategoryMap,
    (state, { issueCategoryMap, sprintCategoryMap, releaseCategoryMap }) => ({
      ...state,
      projectIntegration: {
        ...state.projectIntegration,
        issueCategoryMap,
        sprintCategoryMap,
        releaseCategoryMap,
      },
    })
  ),
  on(adminActions.setCategoryConfig, (state, { categoryConfig }) => ({
    ...state,
    categoryConfig,
  })),
  on(emailUpdatedStatus, (state, { success }) => ({
    ...state,
    updateEmailSuccess: success !== undefined ? success : undefined,
  })),
  on(adminActions.setSelectedUserIds, (state, { ids }) => ({ ...state, selectedUserIds: ids })),
  on(adminActions.setJiraSelectedUserIds, (state, { ids }) => ({ ...state, selectedJiraUserIds: ids })),
  on(adminActions.setSelectedSupervisorIds, (state, { ids }) => ({ ...state, selectedSupervisorIds: ids })),
  on(adminActions.setSelectedTeamboardIds, (state, { ids }) => ({ ...state, selectedTeamboardIds: ids })),
  on(adminActions.setUsersLoadingState, (state, { loadingState }) => ({ ...state, userLoadingState: loadingState })),
  on(adminActions.setAccessLevels, (state, { accessLevels }) => ({ ...state, accessLevels: accessLevels })),
  on(adminActions.setKhojiTeamsLoadingState, (state, { loadingState }) => ({ ...state, khojiTeamsLoadingState: loadingState })),
  on(adminActions.setLoginWithAtlassianLoadingState, (state, { loadingState }) => ({ ...state, loginWithAtlassianLoadingState: loadingState })),
  on(adminActions.setLoginWithAtlassianResponse, (state, { response }) => ({ ...state, loginWithAtlassianResponse: { ...response, timestamp: Date.now() } })),
  on(adminActions.onboardingInviteUserModalStatus, (state, { status }) => ({ ...state, inviteUserModalStatus: status })),
  on(adminActions.onboardingSelectedRoleId, (state, { roleId }) => ({ ...state, onboardingSelectedRoleId: roleId })),
  on(adminActions.resetOnboardingSelectedRoleId, (state) => ({ ...state, onboardingSelectedRoleId: '' })),
  on(adminActions.setNewJiraUserId, (state, { id }) => ({ ...state, newJiraUserId: id })),
  on(adminActions.setAddJiraUsersLoadingState, (state, { loadingState }) => ({ ...state, addJiraUsersLoadingState: loadingState })),
  on(adminActions.setUserInLoadingState, (state, { userId, loadingState }) => ({ ...state, users: state.users.map(user => ({ ...user, loading: user.id === userId ? loadingState : LoadingState.Done })) })),
  on(adminActions.updateUsersState, (state, { users }) => ({ ...state, users: getUpdatedUserState(users, state.users) })),
  on(adminActions.setUsersAgainstsMemberIds, (state, { users }) => ({ ...state, usersAgainstsMembers: users })),
  on(adminActions.fetchUsersAgainstsMemberIdsLoadingState, (state, { loadingState }) => ({ ...state, fetchUsersAgainstsMemberIdsLoadingState: loadingState })),
  on(clearStatesForLoginPage, (state) => { 
    return { 
      ...defaultAdminState,
    };
  })
);

const resetFieldErrors = (state: AdminState) => ({
  ...state,
  fieldErrors: defaultAdminState.fieldErrors
});

export function adminReducer(state: AdminState, action: Action) {
  return _adminReducer(state, action);
}

function setError(errors: any[]): any[] {
  return errors;
}

function getUpdatedUserState(updatedUsers: User[], users: User[]) {
  const userIds = updatedUsers.map(user => user.id);
  const mappedUsers = updatedUsers.map(user => ({ ...user, loading: LoadingState.Done }))
  const previousUsersWithoutUpdatedUsers = users.filter(user => !userIds.includes(user.id));
  return [...previousUsersWithoutUpdatedUsers, ...mappedUsers];
}
