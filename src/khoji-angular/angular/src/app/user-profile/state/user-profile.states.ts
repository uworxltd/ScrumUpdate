/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { User } from "app/admin/admin.entities";
import { AccessLevel } from './../../admin/state/admin.state';
import { CreateInstancePayload } from "app/shared/picklist/interfaces";
import { KhojiComponent, KhojiLimitation } from "app/interface/khoji-component.interface";

export interface UserProfileState {
  userSettings: UserSetting;
  userProfileBase64String: string;
  accessibleAccessLevels: string[];
  projectSourceConfigured: boolean;
  inTrial: boolean;
  nextBillingDate: string;
  companyURL: string;
  tenantName: string;
  loadingTemplates: _LoadingTemplate[];
  workLogCategoryAdded: boolean;
  usersAdded: boolean;
  lastFetched: number;
  workspaces: Workspace[];
  accessibleResources: AccessibleResource,
  features: FeatureOption[];
  instanceDetails: InstanceDetails;
  unlockedFeatureDetails: any;
  userSelectedAccessibleResource: CreateInstancePayload;
  khojiUserProfile: KhojiUserProfile;
  spaceId: number;
  instanceId: number;
}

export interface Workspace {
  id: number;
  name: string;
  instances: Instance[];
  selected?: boolean;
}

export interface InstanceUserForWorkSpace {
  accountId: string;
  accessLevelCode: string;
  fullName: string;
}

export interface Instance {
  id: number;
  name: string;
  imageUrl?: string;
  selected?: boolean;
  tenantId?: string;
  memberCount?: number;
  instanceUser?: InstanceUserForWorkSpace;
  limitationAndComponents?: InstanceComponentsAndLimitations;
  nonRevokedUsers: number;
  instanceFeatures: FeatureDetails[];
  sharedInstance: boolean;
  joined: boolean;
  ownerInformation: KhojiUserProfile;
  /** spaceId is assigned later in selector */
  spaceId?: number;
}

export interface _LoadingTemplate {
  id: number;
  templateName: string;
  title: string;
  subtitle: string;
  image: string;
}

export interface AccessibleResource {
  jiraInstances: JiraResourcesResponse[];
  invitedInstances: InvitedInstances[];
}

export interface JiraResourcesResponse {
  scopes: string[];
  alreadyRegistered: boolean;
  id: string;
  url: URL | string;
  name: string;
  avatarUrl: string;
}

export interface InvitedInstances {
  errorCode: string;
  instanceOwner: InstanceOwner;
  id: string;
  url: URL | string;
  name: string;
  avatarUrl: string;
  instanceId: number;
}

export interface InstanceOwner {
  name: string;
  avatarUrl: string;
}

export interface FeatureIntegration {
  icon: string;
  name: string;
  description: string;
}

export interface FeatureOption {
  id: number;
  featureName: string;
  name?: string;
  title?: string;
  header?: string;
  footer?: string;
  details?: string[];
  image?: string;
  icon?: string;
  subtitle?: string;
  integrations?: FeatureIntegration[];
  progressLabel?: string;
  progressStepLabel?: string;
  ctaButtonText?: string;
  ctaIcon?: string;
  disclaimers?: string[];
}

export interface UserSetting {
  admin: boolean;
  allowAllocationManagement: boolean;
  allowTeamManagement: boolean;
  emailWorkLog: boolean;
  emailFrequency: string;
  id: number;
  user: User;
  accessLevel: AccessLevel
}

export interface PaymentHostedPageObject {
  hostedPage: any;
  paymentSite?: string;
  closedPopup?: boolean;
  successfulPayment?: boolean;
}

export interface KhojiUserProfile {
  id: number;
  imageUrl?: string;
  fullName: string;
  email: string;
  worklogEmailFrequency: string;
  worklogEmailEnabled: boolean;
}


export interface InstanceDetails {
  id: number;
  tenantId: number;
  instanceImageUrl: string;
  instanceName: string;
  platform: string;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
  featureId: number;
  workSpaceId?: number;
  workspace?: Workspace;
  features?: FeatureDetails[];
};

export interface FeatureDetails {
  id: number;
  featureName: string;
  updatedAt: Date;
  createdAt: Date;
};

export enum Features {
  MY_WORK = 1,
  TEAM_VIEW = 2,
  WORK_LOG_CATEGORIZATION = 3,
  MY_WORKLOGS = 4,
  TEAM_PULSE = 5,
  STANDUP_BOARD = 6,
  //SCRUM_UPDATES = 7,
  //WORKLOG_INSIGHTS = 8,
};


export interface InstanceComponentsAndLimitations {
  khojiComponents: KhojiComponent[];
  khojiLimitations: KhojiLimitation[];
}

export interface UserEmailSettings {
  id: number;
  worklogEmailFrequency: String;
  worklogEmailEnabled: boolean;
}
