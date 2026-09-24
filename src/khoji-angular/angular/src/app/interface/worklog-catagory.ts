export class WorkLogCategory {
  name: string;
  color:string;
  includedIssueTypes: Array<IssueType>;
  order?: number;
}

export class IssueType {
  id: string;
  name: string;
  description?: string;
  subtask?: boolean;
  hierarchyLevel?: number;
}

export interface SourceIssueTypeConfig {
  sourceIssueTypes: Array<IssueType>;
  lastSuccessfulSyncTime:string;
}
