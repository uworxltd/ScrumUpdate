/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { IssueType } from 'app/interface/worklog-catagory';
import { ProjectedTime } from '../interface/projected-time.interface';
import { SubTask } from '../interface/sub-task.interface';
import { Comment } from './comment.datamodel';
import { Sprint } from './sprint.datamodel';
import { StoryEstimates } from './story-estimates.datamodel';
import { StoryRagStatus } from './story-ragStatus.datamodel';
import { StoryTimeRemaining } from './story-timeremaining.datamodel';
import { StoryTimeSpent } from './story-timespent.datamodel';

export class Issues {

  id: string;
  name: string;
  status: string;
  teamBoard: string;
  defectCount: number;
  devTime: number;
  defectTime: number;
  qualityRisk: boolean;
  dateStarted: string;
  dateResolved: string;
  threshold: number;
  storyPoints: number;
  issueURL: string;
  epicId: string;
  epicURL: string;
  estimates: StoryEstimates;
  timeRemaining: StoryTimeRemaining;
  timeSpent: StoryTimeSpent;
  timeSpentToStoryPointVariancePercentage: number;
  timeSpentToOriginalEstimateVariancePercentage: number;
  deliveryRisk: number;
  storyAge: number;
  defectTimePercentage: number;
  devTaskCount: number;
  aggregatedEstimatedTime: number;
  overEstimatedThresholdTime: number;
  missingTasks: Array<string>;
  parent: string;
  parentURL: string;
  parentType?: string;
  projectedTime: ProjectedTime;
  subTaskList?: Array<SubTask>;
  latestSprint: Sprint;
  fixVersions: any;
  commentsList: Array<Comment>;
  ragStatus: StoryRagStatus;
  resolution: any;
  issueType: IssueType;
  mappedHighLevelEstimate: {
    sourceValue: number,
    label: string
  };
  elapsedDays: number;
  aggregatedTeamBoardList: Array<string>;
  issueMetaData: {
    timeSpent: number,
    originalEstimates: number,
    originalEstimatesInDays: number,
    timeEstimate: number,
    aggregateTimeSpent: number,
    aggregatedTimeSpentInDays:number,
    aggregateTimeEstimate: number,
    aggregateOriginalEstimate: number,
    projectId: string,
    projectName: string,
    defectTime: number,
    devTime: number,
    devOriginalEstimates: number,
    devTimeRemaining: number,
    qaTime: number,
    qaOriginalEstimates: number,
    qaTimeRemaining: number,
    othersTime: number,
    othersOriginalEstimates: number,
    othersTimeRemaining: number
  };
}
