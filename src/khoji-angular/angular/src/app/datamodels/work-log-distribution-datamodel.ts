export interface Worklog {
    totalDaysSpent: number;
    daysSpentIntValue: number;
    percentage: number;
    percentageIntValue: number;
}
export interface WorkLogDistributionDataModel {
    values: { [column: string]: Worklog };
    others: { [column: string]: Worklog };
}
