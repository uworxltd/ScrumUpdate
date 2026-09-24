/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { buildPathRec } from "./helper-functions";

const Categories = {
  Do_Later_Click: {},
};

const JiraInstances = {
  Integrate_Click: {},
  Back_Click: {},
  Choose_another_instance_Click: {},
};

const rootNav = {
  Login: {},
  Dashboard: {},
  Home: {
    Set_up_a_new_app_Click: {},
    JiraInstances: JiraInstances,
  },
  Onboarding: {
    Build_Team: {
      Do_Later_Click: {},
      Next_Click: {},
    },
    Categories: Categories,
    JiraInstances: JiraInstances,
    FeatureSelection: {},
    UserPains: {},
  },
  AdminDashboard: {
    ProjectIntegration: {
      ProjectSource: {},
      Projects: {},
      Teamboards: {},
      Users: {
        InviteUsers: {},
      },
      CustomFields: {},
      Review: {},
    },
    ManageUsers: {
      InviteUser: {},
      EditUser: {},
      AddJiraUser: {},
      SuspendAccess: {}
    },
    InviteUsers: {},
    ManageTeams: {
      CreateTeam: {},
      EditTeam: {
        ConfirmationModal: {}
      },
      ViewSupervisors: {},
      AssignSupervisors: {},
    },
    CreateTeams: {},
    TrackingFieldSettings: {},
    WorklogSettings: {
      Categories: Categories
    },
    ClassicDashboard: {},
    AccountSettings: {
      DeleteAccount: {},
    },
    QuickSetup: {
      AddMembers: {
        UpdateTeam: {}
      },
      Categories: Categories,
    }
  },
  DeliveryAnalysis: {},
  TeamView: {
    StandupBoard: {},
    WorklogInsightsAndReminders: {},
  },
  Reports: {},
  UserProfile: {
    ProfileSetting: {},
    ManageSubscription: {
      ManageBillingModal: {},
    },
    ChangePassword: {},
    Settings: {},
    Logout: {},
    DeleteAccount: {},
    RequestAccess: {},
  },
  BlogArticle: {},
  LogMyWork: {
    IntegrationModal: {},
    AddWorkLogEntryModal: {},
    EditWorkLogEntry: {},
    SaveWorkLogEntry: {},
    CancelEditWorkLogEntry: {},
    WorklogInsightsTab: {},
    ScrumUpdateTab: {},
    WorklogTab: {},
    PulseTab: {},
  },
  ManageApp: {
    AdminPanel: {
      ManageUsers: {
        BulkAddUsers: {},
        AssignRoleToUsers: {}
      },
      ManageTeams: {
        AddFromJira: {}
      },
      ManageFeature: {},
      AppSettings: {
        DeleteApp: {
          ConfirmationModal: {}
        }
      }
    }
  }
};

export const RootNav = buildPathRec(rootNav);

const componentNavigation = {
  ProfileMenuAvatar: {
    Accountsettings: {
      DeleteAccount: {}
    }
  },
  ViewDetailsDashboardButtonClicked: {},
  VelocityThroughputComponent: {
    VelocityThroughputButtonClicked: {}
  },
  BurnupComponent: {
    BurnupAnalysisComponent: {},
    BurnupDetailsComponent: {},
    BurnupDetailsComponentOnDemand: {},
    BurnupSettingsComponent: {},
  },
  StoryComponent: {
    StoriesAnalysisComponent: {},
    StoriesDetailsComponent: {},
    StoriesDetailsComponentOnDemand: {},
    StorySummaryTabClicked: {},
    StoryCommentTabClicked: {},
    StoryBarClicked: {},
    StoryDetailButtonInModalClicked: {},
    StoryAlertsButtonInModalClicked: {},
    AlertNavigationFromStoryTable: {},
  },
  IssueAnalysisComponent: {
    IssuesAnalysisComponent: {},
    IssuesDetailsComponent: {},
    IssuesDetailsComponentOnDemand: {},
    IssueSummaryTabClicked: {},
    IssueCommentTabClicked: {},
    IssueBarClicked: {},
    IssueDetailButtonInModalClicked: {},
    IssueAlertsButtonInModalClicked: {},
    AlertNavigationFromIssueTable: {},
  },
  EpicComponent: {
    EpicAnalysisComponent: {},
    EpicDetailsComponent: {},
    AlertNavigationFromEpicTable: {},
    EpicDetailsComponentOnDemand: {},
  },
  TeamIndicatorsComponent: {
    TeamIndiacatorDetailsComponent: {},
    TeamIndiacatorSummaryComponent: {},
    TeamIndiacatorSettingsComponent: {},
    TeamIndicatorClicked: {},
    TeamIndicatorsDetailsComponentOnDemand: {},
  },
  QuickSearch: {
    QuickSearchComponent: {},
  },
  BugsAnalysisComponent: {
    BugsDetailsComponent: {},
    BugDetailsComponentOnDemand: {},
  },
  AlertsAnalysisComponent: {
    AlertsDetailsComponent: {},
    AlertsSettingsComponent: {},
    AlertAnalysisDetailsComponentOnDemand: {},
  },
  DefectAnalysisComponent: {
    DefectsDetailsComponent: {},
    DefectBarClicked: {},
    DefectsDetailsComponentOnDemand: {}
  },
  IndicatorsSummaryByTeamComponent: {
    IndicatorsSummaryByTeamSettingsComponent: {},
    IndicatorsSummaryByTeamDetailsComponent: {},
  },
  TeamWorkLogAnalysis: {
    RemindTeam: {},
    TeamWorklogAnalysisDetailsComponent: {
      TeamLogDetailsModal: {}
    },
    TeamWorklogAnalysisSettingsComponent: {},
    TeamWorklogComparisonTableComponent: {},
  }
};

export const ComponentNavigation = buildPathRec(componentNavigation);
