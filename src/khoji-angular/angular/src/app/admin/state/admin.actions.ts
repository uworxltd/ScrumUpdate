/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { createAction, props } from '@ngrx/store';
import { CategoryConfig } from 'app/interface/category-config.interface';
import { LoadingState } from 'app/states/app-states';
import { CustomField, Location, Project, ProjectIntegrationUser, Role, SourceSystem, Teamboard, TeamOnboarding, User, UserEditDetails } from "../admin.entities";
import { FieldError, InviteUserParams, SourceTeamboardRequest } from '../admin.models';
import { Member, OnboardingTeamUpdate, Organization, Team } from './../admin.entities';
import { AccessLevels, BasicUsers, LoginWithAtlassianResponse, ProjectIntegration } from './admin.state';

// user actions
export const resetUserState = createAction('[Reset User State] ResetUserState');
export const fetchUsers = createAction('[Admin State] FetchUsers', props<{ selectUsersIds?: string[] }>());
export const fetchBasicUsers = createAction('[Admin State] fetchBasicUsers');
export const fetchUsersInTeams = createAction('[Admin Actions] FetchUsersInTeams');
export const setUsersLoadingState = createAction('[Admin Processes] SetUsersLoadingState', props<{ loadingState: LoadingState; }>());
export const setBasicUsersLoadingState = createAction('[Admin Processes] setBasicUsersLoadingState', props<{ loadingState: LoadingState; }>());
export const setAssignTeamsAccessToUserLoadingState = createAction('[Admin Processes] setAssignTeamsAccessToUserLoadingState', props<{ loadingState: LoadingState; }>());
export const setRemoveUserAccessLoadingState = createAction('[Admin Processes] setRemoveUserAccessLoadingState', props<{ loadingState: LoadingState; }>());
export const setUserDetailLoadingState = createAction('[Admin Processes] setUserDetailLoadingState', props<{ loadingState: LoadingState; }>());
export const setSourceCustomFieldsLoadingState = createAction('[Admin Processes] SetSourceCustomFieldsLoadingState', props<{ loadingState: LoadingState; }>());
export const setBillingStrategyLoadingState = createAction('[Admin Processes] setBillingStrategyLoadingState', props<{ loadingState: LoadingState; }>());
export const setUsers = createAction('[Admin State] SetUsers', props<{ users: User[]; }>());
export const setBasicUsers = createAction('[Admin State] setBasicUsers', props<{ users: BasicUsers[]; }>());
export const resetUsers = createAction('[Admin State] ResetUsers');
export const sendUserInvite = createAction('[Admin State] SendUserInvite', props<{ userInvite: InviteUserParams; }>());
export const sendInviteAgain = createAction('[Admin State] SendInviteAgain', props<{ inviteAgainUsername: string; }>());
export const revokeUserAccess = createAction('[Admin State] RevokeUserAccess', props<{ revokeAccessUsername: number; }>());
export const enableAccess = createAction('[Admin State] EnableAccess', props<{ revokeAccessUsername: Number; }>());
export const setSelectedUser = createAction('[Admin Filter State] setUser', props<{ selectedUser: User; }>());
export const editUser = createAction('[Admin State] EditUSer', props<{ selectedUser: any; editingUserID: string }>());
export const emailUpdated = createAction('[Admin State] emailUpdated', props<{ selectedUser: any; }>());
export const postSuccessFulUserCreation = createAction('[Admin State] PostSuccessFulUserCreation');
export const setFieldErrors = createAction('[Admin State] SetFieldErrors', props<{ errors: FieldError[]; }>());
export const fetchKhojiTeamsList = createAction('[Admin State] fetchKhojiTeamsList');
export const emailUpdatedStatus = createAction('[Admin] Email Updated Status', props<{ success?: boolean }>());
export const fetchKhojiTeamById = createAction('[Admin State] fetchKhojiTeamById', props<{ teamId: string; }>());
export const setKhojiTeamsList = createAction('[Admin State] setKhojiTeamsList', props<{ khojiTeamsList: Team[] }>());
export const fetchOrganizationsList = createAction('[Admin State] fetchOrganizationsList');
export const setOrganizationsList = createAction('[Admin State] setOrganizationsList', props<{ organizationsList: Organization[] }>());
export const fetchMembersList = createAction('[Admin State] fetchMembersList');
export const setMembersList = createAction('[Admin State] setMembersList', props<{ membersList: Member[] }>());
export const fetchTeamboardsList = createAction('[Admin State] fetchTeamboardsList');
export const setTeamboardsList = createAction('[Admin State] setTeamboardsList', props<{ teamboardsList: Teamboard[] }>());
export const createNewTeam = createAction('[Admin State] setNewTeamData', props<{ teamData: TeamOnboarding }>());
export const updateTeam = createAction('[Admin State] updateTeam', props<{ teamData: TeamOnboarding }>());
export const setSelectedUserIds = createAction('[Admin State] SetSelectedUserIds', props<{ ids: string[] }>());
export const setJiraSelectedUserIds = createAction('[Admin State] SetSelectedJiraUsersIds', props<{ ids: string[] }>());
export const setSelectedSupervisorIds = createAction('[Admin State] SetSelectedSupervisorIds', props<{ ids: string[] }>());
export const setSelectedTeamboardIds = createAction('[Admin State] SetSelectedTeamboardIds', props<{ ids: number[] }>());
export const deleteTeams = createAction('[Admin State] deleteTeam', props<{ ids: string[] }>());
export const assignTeamsAccessToUser = createAction('[Admin State] assignTeamsAccessToUser', props<{ teams: Team[], userId: string }>());
export const removeUserAccessToTeam = createAction('[Admin State] removeUserAccessToTeam', props<{ teamId: number, userId: string }>());
export const fetchUserDetail = createAction('[Admin State] fetchUserDetail', props<{ userId: string }>());
export const assignSupervisors = createAction('[Admin State] assignSupervisors', props<{ data: any }>());
export const setAssignSupervisorsLoadingState = createAction('[Admin State] setAssignSupervisorsLoadingState', props<{ loadingState: LoadingState; }>());
export const setUserDetail = createAction('[Admin State] setUserDetail', props<{ userDetail: User }>());
export const fetchBillingStrategy = createAction('[Admin State] fetchBillingStrategy');
export const setBillingStrategy = createAction('[Admin State] setBillingStrategy', props<{ billingStrategy: string; }>());

export const postSuccessTeamCreation = createAction('[Admin State] postSuccessTeamCreation');
export const postSuccessTeamDeletion = createAction('[Admin State] postSuccessTeamDeletion');
// project integration actions
// export const fetchSourceSystem = createAction('[Admin State] FetchSourceSystem', props<{ sourceSystem: SourceSystem}>());
export const setSourceSystem = createAction('[Admin State] SetSourceSystem', props<{ sourceSystem: SourceSystem; }>());
export const validateSourceSystem = createAction('[Admin State] ValidateSourceSystem', props<{ sourceSystem: SourceSystem, wizard: string, stepToComplete: string; }>());

export const fetchSourceProjects = createAction('[Admin State] FetchSourceProjects', props<{ sourceSystem: SourceSystem; }>());
export const fetchSourceUsers = createAction('[Admin State] FetchSourceUsers', props<{ sourceSystem: SourceSystem; }>());
export const fetchSourceCustomFields = createAction('[Admin State] FetchSourceCustomFields');
export const setSourceCustomFields = createAction('[Admin State] SetSourceCustomFields', props<{ customFields: any[]; }>());
export const setSourceProjects = createAction('[Admin State] SetSourceProjects', props<{ projects: Project[]; }>());
export const setSourceUsers = createAction('[Admin State] SetSourceProjects', props<{ users: any[]; }>());
export const setExistingUsers = createAction('[Admin State] SetExistingUsers', props<{ users: any[]; }>());
export const setSelectedSourceProjects = createAction('[Admin State] SetSelectedSourceProjects', props<{ projects: Project[]; }>());
export const setSelectedSourceUsers = createAction('[Admin State] SetSelectedSourceUsers', props<{ users: ProjectIntegrationUser[]; }>());
export const saveProjectSource = createAction('[Admin State] SaveProjectSource', props<{ projectSource: ProjectIntegration; }>());
export const setProjectSourceName = createAction('[Admin State] SetSourceSystem', props<{ name: string; }>());
export const setSourceUsersLoadingState = createAction('[Admin Processes] SetSourceUsersLoadingState', props<{ loadingState: LoadingState; }>());
export const setSourceProjectsLoadingState = createAction('[Admin Processes] SetSourceProjectsLoadingState', props<{ loadingState: LoadingState; }>());
export const setCustomFields = createAction('[Admin State] setCustomFields', props<{ customFields: CustomField; }>());
export const setKhojiTeamsLoadingState = createAction('[Admin Processes] setKhojiTeamsLoadingState', props<{ loadingState: LoadingState; }>());
export const setCreateTeamsLoadingState = createAction('[Admin Processes] setCreateTeamsLoadingState', props<{ loadingState: LoadingState; }>());
export const setUpdateTeamLoadingState = createAction('[Admin Processes] setUpdateTeamLoadingState', props<{ loadingState: LoadingState; }>());
export const setDeleteTeamsLoadingState = createAction('[Admin Processes] setDeleteTeamsLoadingState', props<{ loadingState: LoadingState; }>());
export const setSourceUserCount = createAction('[Admin State] setSourceUserCount', props<{ sourceUserCount: number; }>());
export const setNewJiraUserId = createAction('[Admin State] SetNewJiraUserId', props<{ id: string; }>());

// project source actions
export const fetchProjectSource = createAction('[Admin State] FetchProjectSource');
export const setProjectSource = createAction('[Admin State] SetProjectSource', props<{ projectSource: ProjectIntegration; }>());

export const setLocations = createAction('[Admin State] SetLocations', props<{ locations: Location[]; }>());
export const fetchLocations = createAction('[Admin State] FetchLocations');

// project-integration-teamboards actions
export const fetchSourceTeamboards = createAction('[Admin State] FetchSourceTeamboards', props<{ request: SourceTeamboardRequest; }>());
export const setSourceTeamboards = createAction('[Admin State] SetSourceTeamboards', props<{ teamboards: Teamboard[]; }>());
export const setSelectedSourceTeamboards = createAction('[Admin State] SetSelectedSourceTeamboards', props<{ teamboards: Teamboard[]; }>());
export const setSourceTeamboardsLoadingState = createAction('[Admin Processes] SetSourceTeamboardsLoadingState', props<{ loadingState: LoadingState; }>());
export const resetAdminStateToDefault = createAction('[Admin State] ResetAdminStateToDefault');
export const addJiraUsers = createAction('[Admin State] AddJiraUsers', props<{ users: ProjectIntegrationUser[], tab: string }>());
export const setAddJiraUsersLoadingState = createAction('[Admin Processes] SetAddJiraUsersLoadingState', props<{ loadingState: LoadingState; }>());


// Roles Action
export const fetchRoles = createAction('[Admin State] FetchRoles');
export const setRoles = createAction('[Admin State] SetRoles', props<{ roles: Role[]; }>());
export const rolesLoadingState = createAction(
  '[Admin Processes] RolesLoadingState',
  props<{ loadingState: LoadingState; }>()
);

// Issue Status Mapping
export const fetchCategoryConfig = createAction('[Admin State] FetchCategoryConfig', props<{ sourceSystem: SourceSystem; }>());
export const setCategoryConfig = createAction('[Admin State] SetCategoryConfig', props<{ categoryConfig: CategoryConfig; }>());

export const setCategoryConfigLoadingState = createAction(
  '[Admin Processes] SetCategoryConfigLoadingState',
  props<{ loadingState: LoadingState; }>()
);

export const setKhojiToSourceCategoryMap = createAction(
  '[Action State] SetCategoryMap',
  props<{
    issueCategoryMap: {};
    sprintCategoryMap: {};
    releaseCategoryMap: {};
  }>()
);

// set isComingFromAdminDashboard
export const setIsComingFromAdminDashboard = createAction('[Admin State] SetIsComingFromAdminDashboard', props<{ isComingFromAdminDashboard: boolean; }>());

export const getAccessLevels = createAction('[Admin Access Levels Get] GetAdminAccessLevels');
export const setAccessLevels = createAction('[Admin Access Levels Set] SetAdminAccessLevels', props<{ accessLevels: AccessLevels }>());



export const loginWithAtlassian = createAction('[Admin State] LoginWithAtlassian', props<{ data: { [key: string]: any } }>());
export const setLoginWithAtlassianLoadingState = createAction('[Admin Processes] SetLoginWithAtlassianLoadingState', props<{ loadingState: LoadingState; }>());
export const setLoginWithAtlassianResponse = createAction('[Admin Processes] SetLoginWithAtlassianResponse', props<{ response: LoginWithAtlassianResponse; }>());

export const updateOnboardingTeam = createAction('[Onboarding process] UpdateOnboardingTeam', props<{ team: OnboardingTeamUpdate; showToast?: boolean }>());
export const updateOnboardingTeamLoadingState = createAction('[Onboarding process] UpdateOnboardingTeamLoadingState', props<{ loadingState: LoadingState; }>());;
export const inviteOnboardingUser = createAction('[Onboarding process] InviteOnboardingUser', props<{ users: ProjectIntegrationUser[]; }>());
export const onboardingInviteUserModalStatus = createAction('[Onboarding process] OnboardingInviteUserModalStatus', props<{ status: boolean; }>());
export const onboardingSelectedRoleId = createAction('[Onboarding process] OnboardingSelectedRoleId', props<{ roleId: string; }>());
export const resetOnboardingSelectedRoleId = createAction('[Onboarding process] ResetOnboardingSelectedRoleId');

export const editUserInBulk = createAction('[Admin State] EditUserInBulk', props<{ users: any[], isBulkEdit: boolean }>());
export const setEditUserInBulkLoadingState = createAction('[Admin State] EditUserInBulkLoadingState', props<{ loadingState: LoadingState }>());


export const setUserInLoadingState = createAction('[Admin State] SetUserInLoadingState', props<{ userId: string, loadingState: LoadingState }>());
export const setMembersLoadingState = createAction('[Admin State] MembersLoadingState', props<{ loadingState: LoadingState }>());
export const updateUsersState = createAction('[Admin State] UpdateUsersState', props<{ users: User[]; }>());


export const fetchUsersAgainstsMemberIds = createAction("[Admin State] FetchUsersAgainstsMemberIds", props<{ memberIds: number[]; }>());
export const setUsersAgainstsMemberIds = createAction("[Admin State] setUsersAgainstsMemberIds", props<{ users: User[]; }>());
export const fetchUsersAgainstsMemberIdsLoadingState = createAction("[Admin State] FetchUsersAgainstsMemberIdsLoadingState", props<{ loadingState: LoadingState; }>());

export const setSendEmailForWorklogReminderLoadingState = createAction("[Admin State] setSsendEmailForWorklogReminderLoadingState", props<{ loadingState: LoadingState; }>());

export const saveUserLeavesPreference = createAction("[Admin State] SaveUserLeavesPreference", props<{ ticketID: string, showToast: boolean }>());
export const setUserPreferenceUpdated = createAction("[Admin State] SetUserPreferenceUpdated", props<{ time: number; leavesTicketId?: string }>());
