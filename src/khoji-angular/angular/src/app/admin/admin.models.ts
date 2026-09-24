/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Organization, Role, SourceSystem, Team, User, UserOrganization, UserTeam } from "./admin.entities";

export interface RequestFilter {
  field: string;
  value: string;
}

export interface RequestParams {
  offset: number;
  limit: number;
  search: string;
  filters: RequestFilter[];
}

export interface PagedResponse<T> {
  data: T[];
  meta: {
    count: number;
    offset: number;
    limit: number;
  }
}

export interface InviteUserParams {
  firstName: string;
  lastName: string;
  email: string;
  accessLevel: string;
  accountId: string;
  locationId: string;
  userRole: Role;
}


export interface AllocateTeamParams {
  teamId: string;
  roleId: string;
  joiningDate: string;
  dailyHours: number;
}

export interface SourceTeamboardRequest {
  sourceSystem: SourceSystem,
  projectKeys: string[];
}

export interface AdminRequests {
  fetchUsers: (params: RequestParams) => PagedResponse<User>;
  updateUser: (params: { userId: string, data: User }) => { data: User; message: string; }
  fetchRoles: (params: RequestParams) => PagedResponse<Role>;
  fetchOrganizations: (params: RequestParams) => PagedResponse<Organization>;
  fetchTeams: (params: RequestParams) => PagedResponse<Team>;
  fetchUserOrganizations: (params: RequestParams) => PagedResponse<UserOrganization>;
  fetchUserTeams: (params: RequestParams) => PagedResponse<UserTeam>;
  inviteUser: (params: InviteUserParams) => { data: UserOrganization; };
  allocateTeam: (params: AllocateTeamParams) => { data: UserTeam; };
  revokeUserAccess: (params: { userId: string; }) => { data: boolean; message: string; }
}

export interface AdminEndpoints {
  users: string;
  roles: string;
  organizations: string;
  teams: string;
  userOrganizations: string;
  userTeams: string;
  inviteUser: string;
  allocateTeam: string;
  revokeUserAccess: string;
}
export interface FieldError {
  field: string;
  message: string;
}
