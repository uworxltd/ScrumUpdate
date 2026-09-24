/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { EmailValidator } from '@angular/forms';
import { LoadingState } from 'app/states/app-states';
import { MenuItem } from 'primeng/api';

export interface Organization {
  orgId: string;
  orgName: string;
  orgCode: string;
  orgContactPersonEmail: string;
  orgContactPersonMobilePhone: string;
  orgContactPersonName: string;
  orgContactPersonWorkPhone: string;
  locations: Location[];
}

export interface Member {
  accountId: string;
  //firstName: string;
  fullName: string;
  isInMultipleTeams: boolean;
  id: number;
  //iskhojiUser: string;
  lastName: string;
  //location: Location;
  memberEmail: string;
  role?: Role;
  //middleName: string;
  accessLevelCode: string;
  status: string;
  memberRole: string;
}


export interface Location {
  locnId: string;
  locnName: string;
  locnCountry: string;
  locnCity: string;
  locnPostalCode: string;
  locnState: string;
  locnAddressLine1: string;
  locnAddressLine2: string;
  locnContactPersonName: string;
  locnContactPersonEmail: EmailValidator;
  locnContactPersonWorkPhone: string;
  locnContactPersonMobilePhone: string;
  organization: Organization;
}

export interface Team {
  id: number;
  teamName: string;
  members: Member[];
  //boards?: any;
  activeStatus?: boolean;
  location?: Location;
  // member?: Member[];
  supervisorsMembers?: Member[];
  supervisors?: Member[];
}

export interface TeamOnboarding extends Team {
  teamId: number;
  teamName: string;
  sourceUsers?: ProjectIntegrationUser[];
  khojiUsers?: ProjectIntegrationUser[];
}

export interface Role {
  id: number;
  code: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface allSourceCustomFields {
  customValue: Number;
  name: string;
}

export enum JoiningStatus {
  PENDING,
  JOINED,
  REVOKED,
}

export interface UserOrganization {
  id: string;
  userId: string;
  organizationId: string;
  joiningDate: Date;
  leavingDate: Date;
  status: JoiningStatus;
}

export interface UserTeam {
  id: string;
  userId: string;
  teamId: string;
  roleId: string;
  joiningDate: Date;
  leavingDate: Date;
  dailyHours: number;
}

export interface UserStatus {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
}

export interface User {
  id: string;
  currentMenuCode: string;
  email: string;
  member: Member;
  password?: string;
  teams: Team[];
  activationCode?: string;
  username: string;
  userStatuses?: UserStatus[];
  status: string;
  currentStatus: string;
  accountId?: string;
  avatarURL?: string;
  roleName?: string;
  role?: Role;
  roleCode?: string;
  accessLevel: string;
  emailWorkLog: string;
  isFirstTenantAdmin: boolean;
  userProfileImage: any;
  menuItem?: MenuItem[];
  loading?: LoadingState;
  fullName?: string;
  sourceId?: string;
  activeInSourceSystem: boolean;
  emailFrequency: any;
  privacyPolicy: false;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  userAgreement: boolean;
  lastSeen: string;
}

export interface DropDownUser {
  id: string;
  fullName: string;
  memberEmail: string;
  role: Role;
  status: string;
  firstName: string;
  lastName: string;
  isInMultipleTeams
  avatarURL: string;
  roleName: string;
}

export interface UserEditDetails {
  accountId?: string;
  roleCode?: string;
  email?: string;
  accessLevel?: string;
}


export interface SourceSystem {
  sourceUrl: string;
  sourceUser: string;
  apiToken: string;
}

export interface Project {
  id: number;
  name: string;
  projectID: string;
  projectKey: string;
  type: string;
  projectLead: string;
  projectUrl: string;
}

export interface Teamboard {
  id: number;
  dateStarted: string;
  dateDissolved: string;
  boardID: string;
  boardName: string;
  teamBoardIdentifier: string;
  teamBoardDataSource: string;
  type: string;
  project: Project;
}


export interface ProjectIntegrationUser {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  accountId: string;
  // locationId: string;
  userRole: Role;
  avatarURL: string;
  userStatus?: string;
  accessLevel?: string;
}

export interface OnboardingTeamUpdate {
  teamId: number;
  teamName: string;
  sourceUsers: ProjectIntegrationUser[];
}

export interface ProjectComponentUsers extends ProjectIntegrationUser {
  isEdited: boolean;
  alreadyExisting: boolean;
  isSelected: boolean;
  alreadyAddedInSystem: boolean;
}

enum CustomFields {
  teamBoard = "KhojiTeamBoard",
  epicId = "KhojiEpicId",
  storyPoints = "KhojiStoryPoints",
  sprintList = "KhojiSprintList",
  highLevelEstimate = "KhojiHighLevelEstimate"
}

export type CustomField = Record<CustomFields, string>;

export enum UserKhojiStatus {
  REVOKED = "REVOKED",
  INCOMPLETE = "INCOMPLETE",
  PENDING = "PENDING",
  JOINED = "JOINED"
}
