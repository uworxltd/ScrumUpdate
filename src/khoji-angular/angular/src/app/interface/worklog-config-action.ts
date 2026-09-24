import { IssueType } from "./worklog-catagory";

export enum WorklogConfigActionType {
    EDIT, DELETE
}

export interface WorklogConfigAction {
    issueType: IssueType,
    action: WorklogConfigActionType;
}