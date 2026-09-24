/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { buildPathRec } from './helper-functions';

const burnupActions = {
  DataReliabilityFilterAdded: {},
  DataReliabilityFilterRemoved: {},
  TrackingFieldValueChanged: {},
  IssueTypesValueChanged: {},
  RagValuesChanged: {}
};

const worklogActions = {
  RagValuesChanged: {},
  WorklogCategoriesChanged: {},
  WorklogStatsCategorySelected: {},
  WorkLogDetailsExportAsCsv: {}
};

const subtaskActions = {
  SubtaskCategoriesChanged: {}
};

const alertsActions = {
  AlertsConfigChanged: {}
};

const teamIndicatorsActions = {
  TeamIndicatorsConfigChanged: {}
};

const manageUsersActions = {
  EditUser: {
    SaveEditUser: {},
    CancelEditUser: {}
  },
  AddJiraUser: {
    ClosedButton: {}
  },
  BulkAddUsers: {
    AddUsers: {},
    ClosedButton: {}
  },
  AssignRoleToUsers: {
    Update: {},
    ClosedButton: {}
  },
  MenuButtonOnUserRow: {
    EditUser: {
      UserUpdated: {},
      ClosedButton: {}
    },
    SuspendUserAccess: {
      ConfrimButton: {},
      ClosedButton: {}
    },
    RestoreUserAccess: {}
  }
};

const accountSettingsActions = {
  DeleteAccount: {},
  CancelButton: {}
};

const manageTeamsActions = {
  EditTeam: {
    RemoveMember: {},
    UpdateTeam: {},
    ClosedButton: {}
  },
  AddFromJira: {
    AddUsers: {},
    ClosedButton: {}
  }
};

const worklogRAGSettingsActions = {
  SliderChanged: {},
  RangeUpdatedFromInputField: {},
  EmailCheckboxCheck: {},
  SaveButton: {},
  ResetButton: {}
};

const remindTeamActions = {
  SendEmail: {},
  ClosedButton: {}
};

const categoryActions = {
  New_Category_Click: {},
  Reset_Click: {},
  Save_Click: {}
};

const adminActions = {
  ProjectSourceSaved: {},
  UserUpdated: {},
  UserRevokeAccess: {},
  UserInviteAgain: {},
  TeamCreated: {},
  TeamUpdated: {},
  AssignSupervisorsInBulk: {},
  TeamDeleted: {},
  TeamDeletedBulk: {},
  DataReliabilityRAGSettings: {},
  TrackingFieldAndIssueTypesTab: {},
  WorklogRAGSettingsTab: worklogRAGSettingsActions,
  WorklogCategoriesSettings: {
    Category: categoryActions
  },
  GeneralSettings: {},
  QuickSetup: {
    Category: categoryActions
  },
  NewUserInvited: {},
  ManageUsers: manageUsersActions,
  ManageTeams: manageTeamsActions,
  AccountSettings: accountSettingsActions,
  RemindTeam: remindTeamActions,
  Close: {},
  ManageSettings: {
    AppSettings: {
      JiraDataSyncronization: {}
    }
  }
};

const emailSettingsActions = {
  EmailSubscription: {},
  EmailSubscriptionFrequency: {}
};

const userProfileActions = {
  ProfileSettings: {},
  BillingAndSubscription: {},
  ChangePassword: {},
  Settings: emailSettingsActions,
  SignOut: {},
  DeleteAccount: {},
  RequestAccess: {}
};

const requestPanelActions = {
  ReleaseRequest: {},
  TeamboardRequest: {},
  DateRangeRequest: {},
  WorklogRequest: {},
  WorklogMembersFilter: {},
  StatusCategoryFilter: {},
  EpicsFilter: {},
  TeamboardsFilter: {},
  AboveThresholdFilter: {},
  SprintFilter: {}
};

const generateAIWorkLogActions = {
  ConnectMSCalendar: {},
  WorkLogSummaryRequest: {},
  GenerateAIWorkLogRequest: {},
  Ai_Wand: {
    From_Button_Click: {},
    From_Table_Click: {}
  },
  Manual_WorkLog: {
    Open_Modal: {},
    Add_Entry: {},
    Delete_Entry: {},
    Submit_Button_Click: {}
  },
  SubmitAIGeneratedWorkLogRequest: {},
  WorklogInsightsRequest: {},
  ScrumUpdate: {
    Generate: {},
    FetchSaved: {},
    Edit: {},
    Cancel: {},
    Save: {},
  }
};

const appSettingsActions = {
  DeleteApp: {
    ClosedButton: {}
  }
};

const sprintAnalyticsTableActions = {
  Search: {},
  Reset: {},
  Download: {},
  Filter: {},
  GroupBy: {},
  ToggleColumn: {}
};

const scrumAssistantActions = {
  Chat: {},
  Feedback: {
    Retro: {},
    Scrum: {}
  },
};

const standupBoardActions = {
  JiraDataSynchronization: {},
  SprintDropdown: {},
  ForceLiveSync: {}
};

const userActions = {
  Login: {
    With_Button_Click: {},
    With_External_Link: {},
    Request_Jira_Access: {},
    On_Khoji: {
      With_Saved_Session: {},
      With_SSO_Code: {}
    }
  },
  Logout: {
    LogoutFromSidebar: {},
    LogoutFromJiraInstances: {}
  },
  ChangePassword: {},
  Onboarding: {
    Category: categoryActions,
    FeatureSelection: {},
    UserPains: {
      UserPainSelected: {}
    }
  },
  Config: {},
  Burnup: burnupActions,
  Epic: {
    EpicBarClicked: {}
  },
  Defects: {
    DefectBarClicked: {}
  },
  IssueAnalysis: {
    ChipsFilterClicked: {},
    IssueTypesFilterApplied: {}
  },
  Worklog: worklogActions,
  Subtask: subtaskActions,
  Alerts: alertsActions,
  TeamIndicators: teamIndicatorsActions,
  Profile: userProfileActions,
  RequestPanel: requestPanelActions,
  LogMyWork: generateAIWorkLogActions,
  Feedback_Plugin_Button_Click: {},
  BlogLinkClicked: {},
  Instance: {
    InstanceCreation: {},
    InstanceFeatureUnlock: {}
  },
  AppSettings: appSettingsActions,
  StandupBoard: standupBoardActions
};

export const AdminActions = buildPathRec(adminActions, ' / ');

export const UserActions = buildPathRec(userActions, ' / ');

export const SprintAnalyticsTableActions = buildPathRec(sprintAnalyticsTableActions, ' / ');
export const ScrumAssistantActions = buildPathRec(scrumAssistantActions, ' / ');
