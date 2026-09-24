import { createAction, props } from '@ngrx/store';
import { DataSyncJobStatus, JobStatus } from './app-states';

export type JobType = "sprints_list_sync" | "sprint_issues_worklog_workflow" | "jql_issues_worklog_workflow";

export interface StartDataSyncJobRequest {
    job_type: JobType;
    parameters?: {
        jql?: string;
        include_comments?: boolean;
        include_changelog?: boolean;
        sprint_ids?: number[];
        sprint_states?: string[];
        include_subtasks?: boolean;
    }
}

export interface StartDataSyncJobStatusResponse {
    job_id: string;
    message: string;
    status: JobStatus;
    submitted_at?: string;
}

export type onSyncJobComplete = ({ jobId }: { jobId: string; }) => void;
export type onSyncJobStatus = ({ jobId, status }: { jobId: string; status: JobStatus }) => void;

export const startDataSyncJob = createAction('[Global Processes] StartDataSyncJob', props<{ req: StartDataSyncJobRequest; onComplete?: onSyncJobComplete, onStatus?: onSyncJobStatus }>());
export const startDataSyncJobStatusPolling = createAction('[Global Processes] StartDataSyncJobStatusPolling', props<{ jobId: string; onComplete?: onSyncJobComplete, onStatus?: onSyncJobStatus }>());
export const stopAllDataSyncJobStatusPolling = createAction('[Global Processes] StopAllDataSyncJobStatusPolling');
export const stopDataSyncJobStatusPolling = createAction('[Global Processes] StopDataSyncJobStatusPolling', props<{ jobId: string; }>());
export const setDataSyncJobStatus = createAction('[Global Processes] SetDataSyncJobStatus', props<{ dataSyncJobStatus: DataSyncJobStatus; }>());