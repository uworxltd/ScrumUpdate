export interface Sprint {
  id: string;
  name: string;
  status: 'Closed' | 'Active' | 'Future';
  sprintLink: string;
  startDate: string;
  endDate: string;
  completionDate: string;
  originBoardId: string;
  outOfRequestedDateRange: boolean;
  cacheModel: CacheModel;
  overDue: boolean;
}

export interface CacheModel {
  cached: boolean;
  cacheDate: string;
  cacheInterval: number;
}
