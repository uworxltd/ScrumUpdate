/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


export enum ModuleName {
  Stories = 'story-analysis',
  Epics = 'epic-analysis',
  Burnup = 'burnup-analysis',
  Velocity = 'velocity-throughput-analysis',
  Defects = 'issue-defect-analysis',
  Bugs = 'bug-analysis',
  Alerts = 'alert-analysis',
  TeamIndicators = 'team-indicators',
  StoryPointsIndicator = 'story-points-indicator',
  StoriesIndicator = 'stories-indicator',
  VarianceIndicator = 'varaince-indicator',
  IndicatorSummary = 'indicator-summary',
  TeamWorklog = 'team-worklog-analysis',
  Issues = 'issue-analysis'
}

export enum DropdownName {
  Release = 'release',
  Teamboard = 'teamboard',
  Team = 'team',
  Epic = 'epic',
  Sprint = 'sprint',
  SprintFilter = 'sprint-filter',
  DateRange = 'date-range',
  StatusCategory = 'status-category',
  WorklogTeam = 'worklog-team',
  Member = 'member'
}

export enum TabName {
  Dashboard = 'dashboard',
  TeamWorklogDetail = 'team-worklog-detail',
  TeamWorklogDashboard = 'team-worklog-dashboard'
}

// *********** Button Names ***********
// submit, reset, select, export, close, click-here-for-more-details, total-alerts

// *********** Radio Button Names ***********
// monthly, weekly, fortnightly

// *********** Checkbox Names ***********
// show-values, include-interval, above-threshold

export type DropdownType = 'multi-select' | 'date-select' | 'single-select' | 'menu-select' | 'single-option-select';

export type ElementType =
  | 'tab'
  | 'table'
  | 'graph'
  | 'dropdown'
  | 'dialog'
  | 'button'
  | 'textbox'
  | 'textarea'
  | 'checkbox'
  | 'radio-button'
  | 'link'
  | 'loading'
  | 'title'
  | 'sub-title'
  | 'alert-link'
  | 'issue-button'
  | 'legend'
  | 'legend-button'
  | 'label'
  | 'placeholder'
  | 'text'
  | 'issue-modal-button'
  | 'message'
  | 'chart'
  | 'request-panel'
  | 'image'
  | 'arrow'
  | 'count'
  | 'category'
  | 'info-panel'
  | 'tooltip'
  | 'icon'
  | 'row'
  | 'section'
  | 'card'
  | 'header'
  | 'column'
  | 'clickable-checkbox'
  | 'circle'
  | 'modal'
  | 'slider'
  | 'spinner'
  | 'iframe'
  | 'popup'
  | 'worklog';

export enum DropdownArrows {
  Expanded = 'fa-chevron-up',
  Collapsed = 'fa-chevron-down'
}

export const colorIDs = [
  'purple',
  'red',
  'green',
  'overduered',
  'releasestatusred',
  'lightGrey',
  'grey',
  'lightYellow',
  'lightBlue',
  'lightGreen',
  'orange',
  'darkGrey',
  'teal',
  'deletedIssueTypeColor',
  'renamedIssueTypeColor',
  'updatedIssueTypeColor',
  'lightPurple',
  'ballBlue',
  'persianOrange',
  'silverChalice',
  'saffronMango',
  'bluishGrey',
  'mediumFforestGreen',
  'thunderBird',
  'Grey',
  'lightgrey'
] as const;
export const twacolorIDs = ['red', 'amber', 'green', 'black', 'none'] as const;

type ColorID = (typeof colorIDs)[number];

export const colorLabels: Record<ColorID, string> = {
  purple: 'bg-purple-600',
  red: 'remaining-days',
  green: 'bg-green-600',
  overduered: 'text-red-600',
  releasestatusred: 'bg-red-600',
  lightGrey: 'rgb(238, 238, 238)',
  grey: 'rgb(227, 227, 227)',
  lightYellow: 'rgb(251, 255, 217)',
  lightBlue: 'rgb(207, 228, 255)',
  lightGreen: 'rgb(217, 232, 215)',
  deletedIssueTypeColor: 'rgb(233, 18, 36)',
  renamedIssueTypeColor: 'rgb(142, 68, 173)',
  updatedIssueTypeColor: 'rgb(47, 79, 79)',
  lightPurple: 'rgb(203, 218, 222)',
  ballBlue: '#35ACC7',
  persianOrange: '#E58B56',
  silverChalice: '#A9A9A9',
  saffronMango: '#F7C047',
  bluishGrey: '#788DA0',
  mediumFforestGreen: '#4A782B',
  thunderBird: '#BD3117',
  orange: 'rgb(240, 83, 35)',
  darkGrey: 'rgb(100, 116, 139)',
  teal: 'rgb(37, 100, 119)',
  Grey: 'rgb(214, 214, 214)',
  lightgrey: 'rgb(237, 237, 237)'
} as const;

type TwaColorID = (typeof twacolorIDs)[number];

export const twaColorLabels: Record<TwaColorID, { rgb: string; hex: string }> = {
  red: { rgb: 'rgb(220, 20, 60)', hex: '#DC143C' },
  amber: { rgb: 'rgb(255, 215, 0)', hex: '#FFD700' },
  green: { rgb: 'rgb(50, 205, 50)', hex: '#32CD32' },
  black: { rgb: 'rgb(30, 41, 59)', hex: '#1E293B' },
  none: { rgb: 'rgba(0, 0, 0, 0)', hex: '#00000000' }
} as const;
