import { CategoryConfig } from "app/interface/category-config.interface";
import { LoadingState } from "app/states/app-states";
import { CustomField, Location, Member, Organization, Project, ProjectIntegrationUser, Role, SourceSystem, Team, Teamboard, User, UserOrganization, UserTeam, allSourceCustomFields } from "../admin.entities";
import { FieldError } from "../admin.models";

export interface AdminState {
  allSourceCustomFields: allSourceCustomFields[];
  users: User[];
  selectedUserIds: string[];
  selectedJiraUserIds: string[];
  selectedSupervisorIds: string[];
  roles: Role[];
  organizations: Organization[];
  members: Member[];
  teamboards: Teamboard[];
  selectedTeamboardIds: number[];
  teams: Team[];
  userOrganizations: UserOrganization[];
  userTeams: UserTeam[];
  locations: Location[];
  selectedUser: User;
  fieldErrors: FieldError[];
  projectIntegration: ProjectIntegration;
  allSourceProjects: Project[];
  allSourceUsers: ProjectIntegrationUser[];
  existingUsers: ProjectIntegrationUser[];
  sourceTeamboards: Teamboard[];
  categoryConfig: CategoryConfig;
  isComingFromAdminDashboard: boolean;
  userLoadingState: LoadingState;
  khojiTeamsLoadingState: LoadingState;
  loginWithAtlassianLoadingState: LoadingState;
  sourceUserCount: number;
  accessLevels: AccessLevels;
  basicUsers: BasicUsers[];
  userDetail: User;
  teamsLength: number;
  loginWithAtlassianResponse: LoginWithAtlassianResponse;
  updateEmailSuccess?: boolean
  inviteUserModalStatus: boolean;
  onboardingSelectedRoleId?: string,
  newJiraUserId: string,
  addJiraUsersLoadingState: LoadingState;
  fetchUsersAgainstsMemberIdsLoadingState: LoadingState,
  usersAgainstsMembers: User[],
}

export interface ProjectIntegration {
  name: string;
  updateDate: string;
  sourceSystem: SourceSystem;
  projects: Project[];
  teamBoards: Teamboard[];
  users: ProjectIntegrationUser[];
  customFields: CustomField;
  issueCategoryMap: {};
  sprintCategoryMap: {};
  releaseCategoryMap: {};
  billingStrategy: string;
}

export interface AccessLevels {
  accessLevel: AccessLevel[];
}

export interface BasicUsers {
  email: string;
  id: string;
  password: string;
  member: Member;
}
export interface AccessLevel {
  id: number;
  levelCode: string;
  description: string;
  parentCode: string;
}

export interface LoginWithAtlassianResponse {
  token: string;
  timestamp: number;
}
