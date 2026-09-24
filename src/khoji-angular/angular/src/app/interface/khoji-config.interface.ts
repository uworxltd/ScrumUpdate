import { KhojiComponent, KhojiLimitation } from './khoji-component.interface';

export interface KhojiConfigs {
  workLogHours: number;
  storyPlanningThreshold: number;
  workLogDefaultDays: number;
  storyOverAgeThreshold: number;
  JiraBalckList: Array<string>;
  deliveryPercentageThreshold: number;
  storyEstimationThreshold: number;
  version: string;
  browseUrl: string;
  inheritFixVersion: boolean;
  timePeriodCalculationCriteria: TimePeriodCalculationCriteria;
  unRegisteredTeamBoardName: string;
  storyModalEnabled: boolean;
  unassignedWorklogLegendsCount: number;
  khojiComponents: KhojiComponent[];
  khojiLimitations: KhojiLimitation[];
  dataSource: string;
  isConfluenceConfigured: boolean;
  defaultKhojiRole: string;
  defaultKhojiOrganization: string
  sourceUserSyncingScheme: boolean;
  paymentSite: string;
  featureFlagMap: any;
  systemHasCacheStored: boolean;
  khojiDeepIssueScanning: boolean;
  filterDropdownDataBasedOnDate: boolean;
  filterDropdownFromPreviousMonths: number;
  globalBaseField: string;
  paginationEnabledOnDropdown: boolean;
  numberOfItemsToLoadInPagination: number;
  cacheType: string;
  nextCacheRefreshTime: string;
  alertsStoryThreshold: number;
  lastFeched: number;
  lastNumberOfDaysForRecentIssueTypes: Number;
}

export interface AngularAppConfigs {
  userAgreementUrl: string;
  userPrivacyPolicyUrl: string;
  displayBillingOnSignup: boolean;
}

export interface TimePeriodCalculationCriteria {
  durationInDays: number;
  afterCurrentDate: number;
  beforeCurrentDate: number;
}

export interface GroupingConfig {
  name: string,
  /**
   * GroupingConfig.key overrides DropdownConfig.key
   */
  key?: string,
  value: string | number | boolean,
  code: string,
  description: string,
  expand: boolean,
  exclude: boolean,
  order: number
}
export interface DropdownConfig {
  key: string;
  enabled: boolean;
  groups: GroupingConfig[]
}

export interface DropdownGroupingConfig {
  analysisByWorklog: {
    team: DropdownConfig[]
  },
  teamWorklogAnalysis: {
    team: DropdownConfig[],
    member: DropdownConfig[]
  },
  manageTeams: {
    users: DropdownConfig[],
    sourceAndSystemUsers: DropdownConfig[],
    teamboards: DropdownConfig[],
  }
}
