/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { IssueType } from 'app/interface/worklog-catagory';

type WorklogDistributionConfig = {
  description: string;
  color: string;
  issueTypes: IssueType[];
};

export default WorklogDistributionConfig;
