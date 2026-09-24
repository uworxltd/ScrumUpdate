import { WorklogMember } from "./member-datamodel";

export interface TeamWorkLogDataModel {
    teamName: string;
    members: Array<WorklogMember>;
    percentage: number;
    thresholdColor: string;
    othersDistrMeta: Array<string>;
    totalsPercentages: { [column: string]: number };
    totalsDays: { [column: string]: number };
    columnsNames: Array<string>;
    totalAvailableDays: number;
}

export interface WorklogReminder {
    supervisorId: string;
    memberIds: string[];
    workLogUrl: string;
    dateFrom: string;
    dateTo: string;
    customText: string;
}
  
