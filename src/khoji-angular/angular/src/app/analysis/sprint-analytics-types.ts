import { FilterType } from "tabulator-tables";

/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

export interface SprintAnalytics {
  synced: boolean;
  schemaVersion: string;
  generatedAt: string;
  meta: Meta;
  kpi: KPI;
  insights: Insight[];
  table: TableData;
}

export interface Meta {
  teamName: string;
  sprintName: string;
  teamIcon: string;
  deliveryConfidence: DeliveryConfidence;
  today: DateInfo;
  overallSummary: OverallSummary;
  priorityCardId: string;
  // attaches lator
  priorityCard?: Insight,
  sprintEndDate: DateInfo;
}

export interface DeliveryConfidence {
  label: string;
  color: string;
  icon: string;
}

export interface DateInfo {
  iso: string;
  pretty: string;
}

export interface OverallSummary {
  html: string;
  expandCardId: string;
}

export interface KPI {
  storyPoints: StoryPoints;
  scopeChange: ScopeChange;
  ticketHygiene: TicketHygiene;
  sprintProgress: SprintProgress;
}

export interface Action {
  type: 'group' | 'filter' | 'sort' | 'export' | 'expand';
  /** related to group, filter and sort */
  field?: string;
  /** related to filter */
  operator?: FilterType;
  /** related to filter */
  value?: any;
  /** related to sort */
  sortDir?: 'asc' | 'desc';
  /** related to export */
  exportType?: 'json' | 'csv' | 'xlsx' | 'pdf' | 'html';
}

export interface StoryPoints {
  done: number;
  total: number;
  action: Action;
}

export interface ScopeChange {
  percent: number;
  action: Action;
}

export interface TicketHygiene {
  percent: number;
  action: Action;
}

export interface SprintProgress {
  percent: number;
}

export interface Insight {
  id: string;
  priority: number;
  header: InsightHeader;
  body: string;
}

export interface InsightHeader {
  title: string;
  summary: string;
  icon: string;
  color: string;
}

export interface TableData {
  dataTree: boolean;
  columns: TableColumn[];
  data: TableRow[];
}

export interface TableColumn {
  title: string;
  field: string;
  hozAlign?: string;
  formatter?: string;
  widthGrow?: number;
}

export interface TableRow {
  [key: string]: any;
  _children?: TableRowChild[];
}

export interface TableRowChild {
  [key: string]: any;
}

export interface ProActiveSprint {
  sprint_id: number;
  sprint_name: string;
  board_id: number;
  board_name?: string;
  goal: string;
  state: string;
  created_at?: number[] | string | Date;
  updated_at?: number[] | string | Date;
  start_date: number[] | string | Date;
  end_date: number[] | string | Date;
  complete_date?: number[] | string | Date;
  last_synced_at: number[] | string | Date;
  total_story_points?: number;
  resolved_story_points?: number;
}
