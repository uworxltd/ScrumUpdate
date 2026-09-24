import { WorkLogDistributionDataModel } from "./work-log-distribution-datamodel";

export interface WorklogMember {
    name: string;
    email: string;
    accountId: string;
    totalWorkLog: number;
    totalWorkLogInHours: number;
    totalWorkLogInDays: number;
    percentage: number;
    thresholdColor: string;
    workLogDistribution: WorkLogDistributionDataModel;
    othersPercentage: number;
    inMultipleTeams : boolean;
    totalAvailableDays: number;
}

// export interface TeamMember {
//     id: number;
//     accountId?: string;
//     member_name: string;
//     member_email: string;
//     //member_status: string;
//     /** member email id */
//     member_id: string;
//     memberRole: string;
//     member_status: string;
// }
