/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { createReducer, on } from "@ngrx/store";
import { _LoadingTemplate, FeatureOption, PaymentHostedPageObject, Workspace } from './user-profile.states';
import * as actions from 'app/states/app.actions';
import { UserProfileState, UserSetting } from "./user-profile.states";
import { setAvailableFeatures, setInstanceDetails, setInstanceId, setSpaceId, setUnlockedFeatureResponse } from "./user-profile.actions";
import { Constants } from "app/constants";

const userSetting: UserSetting = {
  emailWorkLog: undefined,
  emailFrequency: undefined,
  id: undefined,
  allowAllocationManagement: undefined,
  allowTeamManagement: undefined,
  admin: undefined,
  user: undefined,
  accessLevel: undefined
}

const initialPaymenthostedPageObejct: PaymentHostedPageObject = {
  hostedPage: '',
  paymentSite: '',
  closedPopup: true,
  successfulPayment: false,
};

const defaultFeatures: FeatureOption[] = [
  {
    id: 1,
    featureName: 'my-work',
    name: 'For Me',
    subtitle: 'Intelligent timesheets from your real activity',
    icon: 'assets/images/timeSheet.svg',
    header: 'Tired of manually completing your timesheet?',
    footer: 'Let AI turn your Jira activity into accurate time entries — zero effort required.',
    title: 'Ship Code, Not Status Reports',
    details: ['Auto Worklogs', 'Daily Standups', 'AI Retrospective'],
    image: 'assets/images/My-Work-v1.png',
    integrations: [
      { icon: 'assets/svg/jira-logo.svg', name: 'Jira', description: 'Sprint tasks' },
      { icon: 'assets/svg/outlook.svg', name: 'Outlook', description: 'Calendar events' }
    ],
    progressLabel: 'Almost there',
    progressStepLabel: 'Last step',
    ctaButtonText: 'Enable AI Timelog \u2014 it\'s free',
    ctaIcon: 'assets/svg/sparkles.svg',
    disclaimers: ['Reads your activity', 'Never auto-submits'],
  },
  {
    id: 2,
    featureName: 'team-view',
    name: 'For My Team',
    subtitle: 'Real-time visibility into your team\'s work',
    icon: 'assets/svg/supervisors-icon.svg',
    header: 'Want to send work log reminders to your teams?',
    footer: 'Keep your entire team aligned with automated reminders and live progress tracking.',
    title: 'Pure Signal, Zero Noise',
    details: ['Actionable "How-to"', 'No Missing Context', 'Auto Reminder'],
    image: 'assets/images/Team-View-v1.png',
    integrations: [
      { icon: 'assets/svg/jira-logo.svg', name: 'Jira', description: 'Team worklogs' },
      { icon: 'assets/svg/logo_microsoft-teams.svg', name: 'Teams', description: 'Auto reminders' }
    ],
    progressLabel: 'Almost there',
    progressStepLabel: 'Last step',
    ctaButtonText: 'Enable Team Dashboard \u2014 it\'s free',
    ctaIcon: 'assets/svg/sparkles.svg',
    disclaimers: ['View-only access', 'No data leaves your instance'],
  },
  {
    id: 3,
    featureName: 'worklog-categorization',
    name: 'Smart Categories',
    subtitle: 'AI-powered worklog classification',
    icon: 'assets/images/categories-onboarding.svg',
    header: 'Automatically categorize your worklogs for better insights and organization.',
    footer: 'Let AI sort your worklogs into meaningful categories so reporting takes seconds, not hours.',
    title: 'Worklog Categorization',
    details: ['AI-Powered Categorization', 'Customizable Categories', 'Enhanced Reporting'],
    image: '',
    integrations: [
      { icon: 'assets/svg/jira-logo.svg', name: 'Jira', description: 'Issue types & labels' },
      { icon: 'assets/svg/sparkles.svg', name: 'AI Classifier', description: 'Pattern matching' }
    ],
    progressLabel: 'Almost there',
    progressStepLabel: 'Last step',
    ctaButtonText: 'Enable Smart Categories \u2014 it\'s free',
    ctaIcon: 'assets/svg/sparkles.svg',
    disclaimers: ['Fully customizable', 'Works with existing worklogs'],
  },
  {
    id: 4,
    featureName: 'my-worklogs',
    name: 'Worklog Dashboard',
    subtitle: 'Your capacity and logged hours at a glance',
    icon: 'assets/images/timeSheet.svg',
    title: 'Worklog Dashboard',
    header: 'AI-driven worklog dashboard showing capacity, logged time, and a one-click generator for accurate entries.',
    footer: 'See your capacity, track logged hours, and generate entries in one click.',
    details: [
      'Capacity & logged time summary',
      'Generate work log with a single click',
      'AI-powered suggestions and automation'
    ],
    image: 'assets/images/my-worklogs-card.svg',
    integrations: [
      { icon: 'assets/svg/jira-logo.svg', name: 'Jira', description: 'Time tracking' },
      { icon: 'assets/svg/ai_wand_icon.svg', name: 'AI Generator', description: 'Smart entries' }
    ],
    progressLabel: 'Almost there',
    progressStepLabel: 'Last step',
    ctaButtonText: 'Enable Worklog Dashboard \u2014 it\'s free',
    ctaIcon: 'assets/svg/sparkles.svg',
    disclaimers: ['You review before submitting', 'Works across all projects'],
  },
  {
    id: 5,
    featureName: 'team-pulse',
    name: 'Team Pulse',
    subtitle: 'Live team health and participation tracking',
    icon: 'assets/images/performance.svg',
    title: 'Know Your Team\'s Pulse, Instantly',
    header: 'Track team participation, update completion rates, and active blockers — all from a single live dashboard.',
    footer: 'Spot blockers early and keep every team member accountable in real time.',
    details: ['Member Participation Tracking', 'Completion Rate Monitoring', 'Active Blocker Detection'],
    image: 'assets/images/team-pulse-card.svg',
    integrations: [
      { icon: 'assets/svg/jira-logo.svg', name: 'Jira', description: 'Blocker detection' },
      { icon: 'assets/svg/supervisors-icon.svg', name: 'Team Sync', description: 'Participation rates' }
    ],
    progressLabel: 'Almost there',
    progressStepLabel: 'Last step',
    ctaButtonText: 'Enable Team Pulse \u2014 it\'s free',
    ctaIcon: 'assets/svg/sparkles.svg',
    disclaimers: ['Aggregated data only', 'No individual surveillance'],
  },
  {
    id: 6,
    featureName: 'standup-board',
    name: 'Standup Board',
    subtitle: 'Daily sprint clarity for every standup',
    icon: 'assets/images/kanban.svg',
    title: 'Sprint Clarity, Every Day',
    header: 'See your team\'s daily status changes, sprint progress, and ticket health — all in one standup view.',
    footer: 'Run focused, data-driven standups that keep your sprint on track.',
    details: ['Sprint Progress Tracking', 'Status Transition Insights', 'Team Health Metrics'],
    image: 'assets/images/standup-board-card.svg',
    integrations: [
      { icon: 'assets/svg/jira-logo.svg', name: 'Jira', description: 'Status transitions' },
      { icon: 'assets/images/sprint.svg', name: 'Sprint', description: 'Daily progress' }
    ],
    progressLabel: 'Almost there',
    progressStepLabel: 'Last step',
    ctaButtonText: 'Enable Standup Board \u2014 it\'s free',
    ctaIcon: 'assets/svg/sparkles.svg',
    disclaimers: ['Live sprint data', 'Updates every sync cycle'],
  }
];

const defaultLoadingTemplates: _LoadingTemplate[] = [
  {
    id: 2,
    templateName: "GreatChoice",
    title: "Great choice!",
    subtitle: "Effortlessly logging your work helps you stay organized, track progress, and focus on what matters most.",
    image: "assets/images/aiIllustration-v1.png",
  },
  {
    id: 3,
    templateName: "FetchingLoggedWork",
    title: "Fetching logged work",
    subtitle: "Please wait while we are setting up your account",
    image: "assets/images/Animation-123.gif",
  },
  {
    id: 4,
    templateName: "AnalyzingData",
    title: "Analyzing the data",
    subtitle: "Please wait while we are setting up your account",
    image: "assets/images/Animation-123.gif",
  },
  {
    id: 5,
    templateName: "PreparingDashboard",
    title: "Preparing dashboard for you",
    subtitle: "Please wait while we are setting up your account",
    image: "assets/images/Animation-123.gif",
  },
  {
    id: 6,
    templateName: "SmartMove",
    title: "Smart move!",
    subtitle: "Unlocking work log insights gives you the power to boost productivity and drive success. Keep it up!",
    image: "assets/images/survey-complete.svg",
  }
];

const defaultUserProfileState: UserProfileState = {
  userSettings: userSetting,
  userProfileBase64String: "",
  accessibleAccessLevels: [],
  projectSourceConfigured: undefined,
  inTrial: false,
  nextBillingDate: "",
  companyURL: "",
  tenantName: "",
  loadingTemplates: defaultLoadingTemplates,
  workLogCategoryAdded: false,
  usersAdded: false,
  lastFetched: 0,
  workspaces: [],
  accessibleResources: undefined,
  features: [],
  instanceDetails: undefined,
  unlockedFeatureDetails: undefined,
  userSelectedAccessibleResource: undefined,
  khojiUserProfile: undefined,
  spaceId: 0,
  instanceId: 0,
}

const _userProfileReducer = createReducer(
  defaultUserProfileState,
  on(actions.updateWorklogEmailSetting, (state, { emailWorkLog, emailFrequency }) => ({ ...state, userSettings: { ...state.userSettings, emailWorkLog: emailWorkLog, emailFrequency: emailFrequency } })),
  on(actions.resetUserSettings, (state) => defaultUserProfileState),
  on(actions.setWorkSpaces, (state, { workspace }) => ({ ...state, workspaces: workspace })),
  on(actions.setAccessibleResources, (state, { accessibleResources }) => ({ ...state, accessibleResources })),
  on(setAvailableFeatures, (state, { features }) => ({
    ...state, features: features.map(f => {
      const defFeature = defaultFeatures.find(df => df.id === f.id);
      return defFeature ? { ...defFeature, ...f } : f;
    })
  })),
  on(setInstanceDetails, (state, { instanceDetails }) => ({ ...state, instanceDetails })),
  //on(setUnlockedFeatureResponse, (state, { unlockedFeatureResponse }) => ({ ...state, unlockedFeatureDetails: unlockedFeatureResponse })),
  on(actions.userSelectedAccessibleResource, (state, { userSelectedAccessibleResource }) => ({ ...state, userSelectedAccessibleResource })),
  on(actions.setKhojiUserProfile, (state, { userProfile }) => ({ ...state, khojiUserProfile: userProfile })),
  on(actions.updateUserAccessCountOnRevoke, (state, { value }) => ({ ...state, workspaces: updateUserCountAfterRevoking(state.workspaces, value) })),
  on(actions.clearStatesForLoginPage, (state) => ({ ...defaultUserProfileState })),
  on(setSpaceId, (state, { spaceId }) => ({ ...state, spaceId })),
  on(setInstanceId, (state, { instanceId }) => ({ ...state, instanceId })),
)
const _paymentHostedPageReducer = createReducer(
  initialPaymenthostedPageObejct,
  on(actions.setPaymentHostedPage, (state, { paymentHostedObject }) => ({ ...state, hostedPage: paymentHostedObject })),
  on(actions.closedPaymentPopup, (state, { popupClosed }) => ({ ...state, closedPopup: popupClosed })),
  on(actions.paymnetSuccessful, (state, { successfulPayment }) => ({ ...state, successfulPayment: successfulPayment })),
  on(actions.resetPaymentHostedObject, (state) => initialPaymenthostedPageObejct)
)

function updateUserCountAfterRevoking(workspaces: Workspace[], value: number): Workspace[] {
  if (workspaces.length === 0) return workspaces;

  const workspaceId = sessionStorage.getItem(Constants.SPACE_ID);
  const instanceId = sessionStorage.getItem(Constants.INSTANCE_ID);

  return workspaces.map(workspace => {
    if (workspace.id.toString() !== workspaceId) {
      return workspace;
    }

    const updatedInstances = workspace.instances.map(instance => {
      if (instance.id.toString() !== instanceId) {
        return instance;
      }

      return {
        ...instance,
        nonRevokedUsers: instance.nonRevokedUsers + value
      };
    });

    return {
      ...workspace,
      instances: updatedInstances
    };
  });
}



export function userProfileReducer(state, action) {
  return _userProfileReducer(state, action);
}

export function paymentHostedPageReducer(state, action) {
  return _paymentHostedPageReducer(state, action)
}


