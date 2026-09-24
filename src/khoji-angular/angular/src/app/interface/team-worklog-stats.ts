/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { TeamWorkLogDataModel } from 'app/datamodels/team-work-log-datamodel';
import { WorkLogCategory } from "./worklog-catagory";

export interface TeamWorklogResponse {
    dateTo: string;
    dateFrom: string;
    summary: number;
    thresholdColors: { [level: string]: string };
    thresholdPercentage: { [level: string]: number };
    mainCategoryCols: Array<WorkLogCategory>;
    otherCategoryCols: Array<string>;
    workAudit: Array<TeamWorkLogDataModel>;
}

export interface MemberWorklog {
    workLogDistribution: any;
    memberName: string;
    thresholdColor: string;
    email: string;
    accountId: string;
    roleName: string;
    inMultipleTeams : boolean;
    totalMainDays: { [column: string]: number };
    totalMainPercents: { [column: string]: number };
    totalOthersDays: { [column: string]: number };
    totalOthersPercents: { [column: string]: number };
    totalAvailableDays: number;
    percentage: number;
    mainPercentage: number;
    othersPercentage: number;
}

export interface TeamWorklog {
    /** totalPercents (mains + others) */
    percentage: number;
    teamName: string;
    thresholdColor: string;
    avgDays: { [column: string]: number };
    avgPercents: { [column: string]: number };

    memberWorklogColumns: {
        main: string[];
        other: string[];
    };

    memberWorklogs: MemberWorklog[];
    totalAvailableDays: number;
    totalWorkLogInHours: number;
    totalWorkLogInDays: number;
    totalMainDays: number;
    totalOthersDays: number;
    totalMainPercents: number;
    totalOthersPercents: number;
}

export interface TeamWorklogStatistics {
    dateTo: string;
    dateFrom: string;
    thresholdColors: { [level: string]: string };
    thresholdPercentage: { [level: string]: number };
    teamWorklogColumns: { name: string; tooltip: string; }[];
    teamWorklogs: TeamWorklog[];
}

export interface WorkLogConfiguration{
  name: string;
  issueTypes: Array<string>;
}
