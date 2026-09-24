/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { createSelector, select } from "@ngrx/store";
import { Constants } from "app/constants";
import { DropdownItem } from "app/dropdowns/dropdown-item";
import { KhojiLimitation } from "app/interface/khoji-component.interface";
import { KhojiConfigs } from 'app/interface/khoji-config.interface';
import { group } from "app/shared/helper-functions";
import { StringUtils } from "app/shared/string-utils";
import { AppState, LoadingState } from 'app/states/app-states';
import { khojiLimitationsSelector } from "app/states/global-configs.selector";
import { getDropdownItems } from "app/states/global-filters.selector";
import { rolesLoadingStateSelector, sourceUsersLoadingStateSelector } from "app/states/global-process.selector";
import { pipe } from "rxjs";
import { filter, map } from 'rxjs/operators';
import { DropDownUser, Member, Project, ProjectIntegrationUser, Role, Team, Teamboard, User } from "../admin.entities";
import { globalConfigSelector } from './../../states/global-configs.selector';
import { AdminState } from "./admin.state";

const sourceUserSelector = createSelector(
  (state: AppState) => state.admin,
  (admin: AdminState) => admin.allSourceUsers
);

const rolesSelector = createSelector(
  (state: AppState) => state.admin,
  (admin: AdminState) => admin.roles
)

const defaultKhojiRoleSelector = createSelector(
  rolesSelector,
  globalConfigSelector,
  (roles, gc) => roles.find(r => r.code === gc.defaultKhojiRole)
)

export const selectDefaultKhojiRole = pipe(
  select(defaultKhojiRoleSelector)
)

const userSelector = createSelector(
  (state: AppState) => state.admin,
  (admin: AdminState) => admin.users
);

const createdTeamsLengthSelector = createSelector(
  (state: AppState) => state.admin,
  (admin: AdminState) => admin.teamsLength
);

const createTeamsButtonEnabledSelector = createSelector(
  createdTeamsLengthSelector,
  khojiLimitationsSelector,
  (teamsLength: number, limitations: KhojiLimitation[]) => {
    return teamsLength >= Number(limitations.find(l => l.id === Constants.TEAMS_ALLOWED).value)
  }
)

const createTeamsLimtationSelector = createSelector(
  khojiLimitationsSelector,
  (limitations: KhojiLimitation[]) => {
    if (!limitations || !limitations.length) return 10;
    return Number(limitations.find(l => l.id === Constants.TEAMS_ALLOWED).value)
  }
)

const allUsersSelector = createSelector(
  (state: AppState) => state.admin,
  (admin: AdminState) => admin.users
);

const userDetailSelector = createSelector(
  (state: AppState) => state.admin,
  (admin: AdminState) => admin.userDetail
);

const userTeamsSelector = createSelector(
  userDetailSelector,
  (data) => data?.teams.map((teamData) => {
    return {
      "teamName": teamData.teamName,
      "id": teamData.id
    };
  })
)

const projectIntegrationSelector = createSelector(
  (state: AppState) => state.admin,
  (admin: AdminState) => admin.projectIntegration
);

const basicUsersSelector = createSelector(
  (state: AppState) => state.admin,
  (admin: AdminState) => admin.basicUsers
);


const basicUsersDetailSelector = createSelector(
  basicUsersSelector,
  (usersData) => usersData?.map((userData) => {
    return {
      "email": userData?.email,
      "id": userData?.id,
      "userName": userData?.member?.fullName,
      "accountId": userData.member?.accountId
    }
  })
)

const sourceTeamboardsSelector = createSelector(
  (state: AppState) => state.admin,
  (state: AdminState) => getSourceTeamboards(state.sourceTeamboards)
);

const sourceUngroupedTeamboardsSelector = createSelector(
  (state: AppState) => state.admin,
  (state: AdminState) => getSortedSourceTeamboards(state.sourceTeamboards)
);

const sourceProjectsSelector = createSelector(
  (state: AppState) => state.admin,
  (state: AdminState) => state.allSourceProjects
);

const teamsListSelector = createSelector(
  (state: AppState) => state.admin,
  (state: AdminState) => state.teams
);

const organizationSelector = createSelector(
  (state: AppState) => state.admin,
  (admin: AdminState) => admin.organizations,
);

const userWithRoleNameSelector = createSelector(
  (state: AppState) => state.admin,
  (admin: AdminState) => admin.users.map(u => ({ ...u, roleName: u.member?.role.name })),
);

const userGroupSelector = createSelector(
  userSelector,
  (state: AppState) => state.globalConfigs.groupingConfigs.manageTeams.users,
  (items, configs) => getDropdownItems<User>(items.map(u => ({ ...u, roleName: u.member?.role.name })), configs, (item) => ({
    ...item,
    item_id: item.id,
    item_text: item.member.fullName,
    item_status_label: (item.userStatuses || [])[0]?.status === Constants.MEMBER_REVOKED_STATUS ? 'SUSPENDED' : '',
    item_value: item
  })),
);

const userDropdownSelector = createSelector(
  userGroupSelector,
  (state: AppState) => state.admin.selectedUserIds,
  (items, ids) => items.map(item => item.is_group ? item : ({
    ...item,
    item_selected: ids.includes((item as any as User).id)
  }))
);

const khojiUserSelector = createSelector(
  (state: AppState) => state.admin,
  (admin: AdminState) => admin.users,
);

export const mapUserToDropDownUser = (u: User) => ({
  id: u.member.accountId,
  fullName: u.member.fullName,
  memberEmail: u.member.memberEmail,
  role: u.member.role,
  status: u.status,
  firstName: u.member.fullName.split(' ')[0],
  lastName: '',
  isInMultipleTeams: u.member.isInMultipleTeams,
  avatarURL: u.userProfileImage?.url ? u.userProfileImage.url : 'assets/images/bullet.svg',
  roleName: u.member.role.name
});

export const mapUsersToDropdownItems = (users: User[]): DropdownItem[] => {
  return users.map(user => {
    const dropdownUser = mapUserToDropDownUser(user);
    return {
      ...dropdownUser,
      item_id: dropdownUser.id,
      item_text: dropdownUser.fullName,
      item_status_label: "",
      item_status_class: "",
      item_value: dropdownUser,
      grouping_key: "roleName",
      grouping_value: dropdownUser.roleName.toUpperCase(),
      item_selected: true,
      hide: false,
    };
  });
};



const khojiAndSourceUserGroupSelector = createSelector(
  khojiUserSelector,
  (state: AppState) => state.globalConfigs.groupingConfigs.manageTeams.users,
  (
    items,
    configs,
  ) => {
    const mappedKhojiUsers: DropDownUser[] = items.map(u => mapUserToDropDownUser(u));
    return getDropdownItems<DropDownUser>(
      mappedKhojiUsers,
      configs,
      (item) => ({
        ...item,
        item_id: item.id,
        item_text: item.fullName,
        item_status_label: (item.status || '') === Constants.MEMBER_REVOKED_STATUS ? 'SUSPENDED' : '',
        item_status_class: (item.status || '') === Constants.MEMBER_REVOKED_STATUS ? 'ml-auto status-label' : '',
        item_value: item
      })
    )
  }
);

const khojiAndSourceUserDropdownSelector = createSelector(
  khojiAndSourceUserGroupSelector,
  (state: AppState) => state.admin.selectedUserIds,
  (items, ids) => items.map(item => item.is_group ? item : ({
    ...item,
    item_selected: ids.includes((item as any as DropDownUser).id)
  }))
);

const supervisorDropdownSelector = createSelector(
  userGroupSelector,
  (state: AppState) => state.admin.selectedSupervisorIds,
  (items, ids) => items.map(item => item.is_group ? item : ({
    ...item,
    item_selected: ids.includes((item as any as User).id)
  }))
);

const teamboardGroupSelector = createSelector(
  (state: AppState) => state.admin.teamboards,
  (state: AppState) => state.globalConfigs.groupingConfigs.manageTeams.teamboards,
  (items, configs) => getDropdownItems<Teamboard>(items, configs, (item) => ({
    ...item,
    item_id: item.id.toString(),
    item_text: item.boardName,
    item_subtext: item.project?.name,
    item_value: item
  })),
);

const teamboardDropdownSelector = createSelector(
  teamboardGroupSelector,
  (state: AppState) => state.admin.selectedTeamboardIds,
  (items, ids) => items.map(item => item.is_group ? item : ({
    ...item,
    item_selected: ids.includes((item as any as Teamboard).id)
  }))
);

const fetchUsersLoadingStateSelector = createSelector(
  (state: AppState) => state.admin,
  (adminState: AdminState) => adminState.userLoadingState
);

const khojiTeamsLoadingStateSelector = createSelector(
  (state: AppState) => state.admin,
  (adminState: AdminState) => adminState.khojiTeamsLoadingState
);

const categoryConfig = createSelector(
  (state: AppState) => state.admin,
  (state: AdminState) => state.categoryConfig
);

const sourceUserCount = createSelector(
  (state: AppState) => state.admin,
  (state: AdminState) => state.sourceUserCount
)

const userAgaintstMemberIdsSelector = createSelector(
  (state: AppState) => state.admin,
  (state: AdminState) => state.usersAgainstsMembers
)

const sourceCustomFieldSelector = createSelector(
  (state: AppState) => state.admin,
  (state: AdminState) => state.allSourceCustomFields
)

const sourceExistingUsers = createSelector(
  (state: AppState) => state.admin,
  (state: AdminState) => state.existingUsers
)

const isAdminComingFromDashboard = createSelector(
  (state: AppState) => state.admin,
  (state: AdminState) => state.isComingFromAdminDashboard
);

const loginWithAtlassianLoadingStateSelector = createSelector(
  (state: AppState) => state.admin,
  (state: AdminState) => state.loginWithAtlassianLoadingState,
);

const fetchUsersAgainstsMemberIdsLoadingStateSelector = createSelector(
  (state: AppState) => state.admin,
  (state: AdminState) => state.fetchUsersAgainstsMemberIdsLoadingState,
);

const userUpdateSuccessSelector = createSelector(
  (state: AppState) => state.admin,
  (admin: AdminState) => admin.updateEmailSuccess
)

const existingUserAccountIdsAndRoles = createSelector(
  userSelector,
  (users: User[]) => users.map(user => ({ accountId: user.member.accountId, role: user.member.role, status: user.status }))
)

const accessLevelsSelector = createSelector(
  (state: AppState) => state.admin,
  (admin: AdminState) => admin.accessLevels
)

const onboardingInviteUserModalStatusSelector = createSelector(
  (state: AppState) => state.admin,
  (admin: AdminState) => admin.inviteUserModalStatus
);

const onboardingSelectedRoleIdSelector = createSelector(
  (state: AppState) => state.admin,
  (admin: AdminState) => admin.onboardingSelectedRoleId
);

const worklogTeamSelector = createSelector(
  (state: AppState) => state.requestFilters,
  (requestFilters) => requestFilters.worklogTeams[0]
)

const requestFilterWorkloggedTeamSelector = createSelector(
  (state: AppState) => state.requestFilters,
  (requestFilters) => requestFilters.worklogTeams
)

const userDefaultTeamSelector = createSelector(
  (state: AppState) => state.admin.teams || [],
  (teams: Team[]) => teams.length
    ? { teamName: teams[0].teamName, id: teams[0].id, members: teams[0].members }
    : { teamName: "", id: undefined, members: [] }
);

/**
 * this selector is used at multiple places, and its impact areas are
 * @see TeamOnboardingComponent
 * @see KhojiInviteUserDialogComponent
 * @see BulkInviteUserDialogComponent
 * @type {*}
 */
const onboardingItemsSelector = createSelector(
  (state: AppState) => state.globalFilters?.members,
  sourceUsersLoadingStateSelector,
  sourceUserSelector,
  globalConfigSelector,
  rolesSelector,
  userDefaultTeamSelector,
  existingUserAccountIdsAndRoles,
  onboardingSelectedRoleIdSelector,
  rolesLoadingStateSelector,
  (
    members: Member[],
    loadingState: LoadingState,
    sourceUsers: ProjectIntegrationUser[],
    globalConfigs: KhojiConfigs,
    roles: Role[],
    team: { teamName: string, id: number, members: Member[] },
    _existingUsers: { accountId: string, role: Role, status: string }[],
    selectedRoleId,
    rolesLoadingState
  ) => {
    const defaultKhojiRole = roles.find(role => role.code === 'TM');
    if (selectedRoleId) var selectedRole = roles.find(role => role.code === selectedRoleId);
    const memberIdInTeams = team?.members?.map(m => m.accountId);
    const memberIdInSystem = team?.members?.map(m => m.accountId);
    return {
      roles: roles.map(role => ({ ...role })).sort((a, b) => StringUtils.compare(a.name, b.name)),
      defaultKhojiRole,
      usersLoadingState: loadingState,
      rolesLoadingState: rolesLoadingState,
      existingUsers: _existingUsers.map(m => m?.accountId),
      revokedUsersIds: _existingUsers.filter(u => u.status === "REVOKED").map(u => u.accountId),
      users: sourceUsers
        ? sourceUsers
          .filter(user => user.accountId)
          .sort((a, b) => StringUtils.compare(a.name, b.name))
          .map(
            user => {
              const _existingUser = memberIdInSystem?.includes(user.accountId);
              const memberExistsInTeam = memberIdInTeams?.includes(user.accountId);
              if (memberExistsInTeam) var existingRole = team.members.find(m => m.accountId === user.accountId).role;
              const userRole = memberExistsInTeam
                ? selectedRole
                  ? selectedRole
                  : existingRole
                    ? existingRole
                    : defaultKhojiRole
                : defaultKhojiRole;
              return ({
                id: members?.find(m => m.accountId === user.accountId)?.id,
                name: user.name,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                accountId: user.accountId,
                userRole: userRole,
                avatarURL: user.avatarURL,
                isEdited: false,
                alreadyExisting: memberExistsInTeam ? memberExistsInTeam : false,
                isSelected: false,
                userStatus: 'INCOMPLETE',
                alreadyAddedInSystem: _existingUser ? _existingUser : false,
              })
            }
          )
        : [],
      team: {
        name: team.teamName,
        id: team.id
      }
    }
  }
);

const selectedJiraUserIdsSelector = createSelector(
  (state: AppState) => state.admin,
  (admin: AdminState) => admin.selectedJiraUserIds
);

export const selectUserDefaultTeam = pipe(
  select(userDefaultTeamSelector)
);

export const selectSelectedJiraUsersIds = pipe(
  select(
    selectedJiraUserIdsSelector
  )
);

/**
 * this selector is used at multiple places, and its impact areas are
 * @see TeamOnboardingComponent
 * @see KhojiInviteUserDialogComponent
 * @see BulkInviteUserDialogComponent
 */
export const selectTeamOnboardingObjects = pipe(
  select(onboardingItemsSelector),
  filter(ob => ob !== undefined && ob !== null)
)

export const selectAccessLevels = pipe(
  select(accessLevelsSelector),
  filter(al => al !== undefined && al !== null)
);

export const selectOnboardingInviteUserModalStatus = pipe(
  select(onboardingInviteUserModalStatusSelector),
  filter(status => status === false)
)

const loginWithAtlassianResponseSelector = createSelector(
  (state: AppState) => state.admin,
  (state: AdminState) => state.loginWithAtlassianResponse,
);

export const selectCreateTeamsButtonEnabled = pipe(
  select(createTeamsButtonEnabledSelector)
);

export const selectTeamLimitation = pipe(
  select(createTeamsLimtationSelector)
)

export const selectFetchUsersLoadingState = pipe(
  select(fetchUsersLoadingStateSelector)
);

export const selectKhojiTeamsLoadingStateSelector = pipe(
  select(khojiTeamsLoadingStateSelector)
);

export const selectUsers = pipe(
  select(userSelector),
  map(u1 => u1.map(u => ({ ...u, currentStatus: u.status }))),
  filter(data => data != undefined)
);

export const selectBasicUsers = pipe(
  select(basicUsersSelector),
  filter(data => data != undefined)
);

export const selectUserUpdateSuccess = pipe(
  select(userUpdateSuccessSelector)
)

export const selectProjectIntegration = pipe(
  select(projectIntegrationSelector)
);

export const selectSourceTeamboards = pipe(
  select(sourceTeamboardsSelector)
);

export const selectSourceCustomFields = pipe(
  select(sourceCustomFieldSelector)
);

export const selectSourceUngroupedTeamboards = pipe(
  select(sourceUngroupedTeamboardsSelector)
);

export const selectSourceProjects = pipe(
  select(sourceProjectsSelector)
);

export const selectTeamsList = pipe(
  select(teamsListSelector),
  filter(data => data != undefined)
);


export const selectOrganizations = pipe(
  select(organizationSelector)
);

export const selectUserDropdownItems = pipe(
  select(userDropdownSelector)
);

export const selectDropDownKhojiAndSourceUserItems = pipe(
  select(khojiAndSourceUserDropdownSelector)
);

export const selectSupervisorDropdownItems = pipe(
  select(supervisorDropdownSelector)
);

export const selectTeamboardDropdownItems = pipe(
  select(teamboardDropdownSelector)
);

export const selectAllUsersList = pipe(
  select(allUsersSelector)
);


export interface SourceTeamboard {
  project: Project;
  boards: Teamboard[];
}

export function getSourceTeamboards(teamboards: Teamboard[]) {
  return group(teamboards, tb => tb.project.projectKey)
    .map<SourceTeamboard>(grp => ({ project: grp.val[0].project, boards: grp.val }));
}

export function getSortedSourceTeamboards(teamboards: Teamboard[]) {
  return group(teamboards, tb => tb.project.projectKey)
    .flatMap<Teamboard>(grp => grp.val);
}

export const selectCategoryConfig = pipe(
  select(categoryConfig),
);

export const selectUserTeamsList = pipe(
  select(userTeamsSelector)
);

export const selectSourceUserCountSelector = pipe(
  select(sourceUserCount)
);

export const selectUserAgaintstMemberIds = pipe(
  select(userAgaintstMemberIdsSelector)
);

export const selectSourceExistingUserSelector = pipe(
  select(sourceExistingUsers),
  filter(data => data != undefined)
);

export const selectIsAdminComingFromDashboard = pipe(
  select(isAdminComingFromDashboard),
  filter(data => data != undefined)
);

export const selectUserDetail = pipe(
  select(userDetailSelector),
  filter(data => data != undefined)
);

export const selectUsersDetails = pipe(
  select(basicUsersDetailSelector),
  filter(usersData => usersData !== undefined)
);

export const selectLoginWithAtlassianLoadingState = pipe(
  select(loginWithAtlassianLoadingStateSelector),
);

export const selectFetchUsersAgainstsMemberIdsLoadingState = pipe(
  select(fetchUsersAgainstsMemberIdsLoadingStateSelector),
);

export const selectLoginWithAtlassianResponse = pipe(
  select(loginWithAtlassianResponseSelector),
);


const newJiraUserIdSelector = createSelector(
  (state: AppState) => state.admin,
  (admin: AdminState) => admin.newJiraUserId
);

export const selectNewJiraUser = pipe(
  select(newJiraUserIdSelector),
  filter(al => al !== undefined && al !== null)
);

const addJiraUsersLoadingStateSelector = createSelector(
  (state: AppState) => state.admin,
  (admin: AdminState) => admin.addJiraUsersLoadingState
);

export const selectAddJiraUsersLoadingState = pipe(
  select(addJiraUsersLoadingStateSelector),
);

export const selectUserWithRoleName = pipe(
  select(userWithRoleNameSelector),
);

export const selectRoles = pipe(
  select(rolesSelector)
)

export const selectWorklogTeam = pipe(
  select(worklogTeamSelector),
  filter(teamName => teamName !== null || teamName !== undefined),
)

export const selectRequestFilterWorkloggedTeam = pipe(
  select(requestFilterWorkloggedTeamSelector),
  filter(teams => teams.length > 0),
)

const selectedTeamForWorklogSelector = createSelector(
  teamsListSelector,
  worklogTeamSelector,
  (teamsList: Team[], selectedTeamName: string) => teamsList.find(team => team.teamName === selectedTeamName)
);

export const selectTeamForWorklog = pipe(
  select(selectedTeamForWorklogSelector),
)

