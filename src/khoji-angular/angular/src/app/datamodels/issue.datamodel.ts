/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { SubTask } from '../interface/sub-task.interface';
import { ProjectedTime } from '../interface/projected-time.interface';
import { StoryEstimates } from './story-estimates.datamodel';
import { StoryTimeRemaining } from './story-timeremaining.datamodel';
import { StoryTimeSpent } from './story-timespent.datamodel';
import { Sprint } from './sprint.datamodel';
import { Comment } from './comment.datamodel';
import { IssueType } from 'app/interface/worklog-catagory';

export interface ParentIssueDataModel {
  id: string;
  name: string;
  issueType: IssueType;
  status: string;
  statusCategory: string;
  teamBoard: string;
  defectCount: number;
  devTime: number;
  defectTime: number;
  qualityRisk: boolean;
  dateStarted: string;
  dateResolved: string;
  threshold: number;
  storyPoints: number;
  issueURL: number;
  epicId: string;
  epicURL: string;
  parent: string;
  parentURL: string;
  estimates: StoryEstimates;
  timeRemaining: StoryTimeRemaining;
  timeSpent: StoryTimeSpent;
  timeSpentToStoryPointVariancePercentage: number;
  timeSpentToOriginalEstimateVariancePercentage: number;
  deliveryRisk: number;
  storyAge: number;
  issueAge: number;
  defectTimePercentage: number;
  devTaskCount: number;
  aggregatedEstimatedTime: number;
  overEstimatedThresholdTime: number;
  missingTasks: Array<string>;
  projectedTime: ProjectedTime;
  subTaskList?: Array<SubTask>;
  latestSprint: Sprint;
  fixVersionInherited: any;
  fixVersions: any;
  commentsList: Array<Comment>;
  ragStatus: any;
  mappedCategory: any;
  alerts?: {
    errors: number;
    warnings: number;
    status: string;
  };
  aggregatedTeamBoardList: Array<string>;
}
