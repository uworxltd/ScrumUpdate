/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { createSelector, select } from "@ngrx/store";
import { pipe } from "rxjs";
import { filter } from "rxjs/operators";
import { AppState, GlobalConfigs, LoadingState, LoadingStates } from "./app-states";

const navigateBasedOnLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates: LoadingStates) => ({
    workspaceLoadingState: loadingStates.workspacesLoadingState,
    instanceInviteLoadingState: loadingStates.instanceInviteActionLoadingState
  })

)

export const selectNavigateBasedOnLoadingState = pipe(
  select(navigateBasedOnLoadingStateSelector)
)

const loadingStatesSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates) => loadingStates
);


const WorklogCategoryModalClosedSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates) => loadingStates.worklogCategoryModalClosed
);

const editUserInBulkSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates) => loadingStates.editUserInBulkLoadingState
);


const categoryConfigLoadingState = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates) => loadingStates.categoryConfigLoadingState
);

const sendEmailForWorklogReminderLoadingState = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates) => loadingStates.sendEmailForRemindTeamLoadingState
)

export const selectLoadingStates = pipe(
  select(loadingStatesSelector)
);


export const selectEditUserInBulkLoadingState = pipe(
  select(editUserInBulkSelector)
)

export const selectWorkLogCategoryModalClosed = pipe(
  select(WorklogCategoryModalClosedSelector)
);


export const sourceUsersLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates) => loadingStates.sourceUsersLoadingState
);

export const rolesLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates) => loadingStates.rolesLoadingState
);

const _updatedUserProfileLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates) => loadingStates.updatedUserProfileLoadingState
)

const _teamWorkLogForThisMonthLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates) => loadingStates.teamWorklogForThisMonthLoadingState
);

const assignSupervisorsSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates) => loadingStates.assignSupervisorsLoadingState
);

const userProfileLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates) => loadingStates.userProfileLoadingState
);

const updateOnboardingTeamLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingState) => loadingState.updateOnboardingTeamLoadingState
)

const instanceUserMetaDataLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingState) => loadingState.instanceUserLoadingState
)

const unlockedFeatureLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingState) => loadingState.featureUnlockLoadingState
)

const workLogCategorizationFeatureUnlockLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingState) => loadingState.workLogFeatureUnlockLoadingState
)

const logMyWorkSummaryLoadingState = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingState) => loadingState.logMyWorkSummaryLoadingState
)

const aiGeneratedWorklogLoadingState = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates) => loadingStates.generateAIWorklogLoadingState
)

const issueValidityLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingState) => loadingState.validateIssueIdLoadingState
);


export const selectIssueValidityLoadingState = pipe(
  select(issueValidityLoadingStateSelector)
);

const submitAIGeneratedWorklogLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingState) => loadingState.submitAIGeneratedWorklogLoadingState
);

const submitPopupWorklogLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingState) => loadingState.submitPopupGeneratedWorklogLoadingState
);

const deleteWorklogLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingState: LoadingStates) => loadingState.deleteWorkLogLoadingState
);

const editWorklogLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingState: LoadingStates) => loadingState.editWorklogLoadingState
);

const manualWorkLogLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates: LoadingStates) => loadingStates.manualWorkLogLoadingState
)

export const selectManualWorkLogLoadingState = pipe(
  select(manualWorkLogLoadingStateSelector)
)

export const selectPopupGeneratedWorklogLoadingState = pipe(
  select(submitPopupWorklogLoadingStateSelector)
);

export const selectSubmitAIGeneratedWorklogLoadingState = pipe(
  select(submitAIGeneratedWorklogLoadingStateSelector)
);

const workingHourPerDayConfigLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingState: LoadingStates) => loadingState.workingHoursPerDayLoadingState
);

export const selectWorkingHourPerDayConfigLoadingState = pipe(
  select(workingHourPerDayConfigLoadingStateSelector)
);


export const selectupdateOnboardingTeamLoadingState = pipe(
  select(updateOnboardingTeamLoadingStateSelector)
);

export const selectInstanceUserMetaDataLoadingState = pipe(
  select(instanceUserMetaDataLoadingStateSelector)
);

export const selectunlockedFeatureLoadingState = pipe(
  select(unlockedFeatureLoadingStateSelector)
);

export const selectWorkLogCategorizationFeatureUnlockLoadingState = pipe(
  select(workLogCategorizationFeatureUnlockLoadingStateSelector)
);

export const selectLogMyWorkSummaryLoadingState = pipe(
  select(logMyWorkSummaryLoadingState)
);

export const selectAiGeneratedWorklogLoadingState = pipe(
  select(aiGeneratedWorklogLoadingState)
)

const updateTeamLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingState) => loadingState.updateTeamLoadingState
)

export const selectupdateTeamLoadingState = pipe(
  select(updateTeamLoadingStateSelector)
);

const worklogDistributionLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingState) => loadingState.worklogDistributionLoadingState
)

export const selectWorklogDistributionLoadingState = pipe(
  select(worklogDistributionLoadingStateSelector)
);

const sourceIssueTypesLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingState) => loadingState.sourceIssueTypesLoadingState
)



export const selectSourceIssueTypesLoadingState = pipe(
  select(sourceIssueTypesLoadingStateSelector)
)

export const selectAssignSupervisorLoadingState = pipe(
  select(assignSupervisorsSelector)
);

export const selectTeamWorkLogForThisMonthLoadingState = pipe(
  select(_teamWorkLogForThisMonthLoadingStateSelector),
);

export const selectUpdatedUserProfileLoadingState = pipe(
  select(_updatedUserProfileLoadingStateSelector),
  filter(loadingState => loadingState !== undefined)
);


export const selectSourceUsersLoadingState = pipe(
  select(sourceUsersLoadingStateSelector),
  filter(data => data !== undefined)
);

export const selectCategoryConfigLoadingState = pipe(
  select(categoryConfigLoadingState)
)

export const selectSendEmailForWorklogReminder = pipe(
  select(sendEmailForWorklogReminderLoadingState)
)


export const selectUserProfileLoadingState = pipe(
  select(userProfileLoadingStateSelector)
)

export const teamMembersLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingState) => loadingState.teamMembersLoadingState
);

const membersLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingState) => loadingState.membersLoadingState
);

export const selectMembersLoadingState = pipe(
  select(membersLoadingStateSelector)
);

export const teamWorkLogLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingState) => loadingState.teamWorkLogSummaryLoadingState
);

export const _teamWorkLogLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingState) => loadingState.teamWorklogLoadingState
);

export const selectTeamWorklogLoadingState = pipe(
  select(_teamWorkLogLoadingStateSelector)
);

export const selectTeamWorklogForThisMonthLoadingStateAll = pipe(
  select(_teamWorkLogForThisMonthLoadingStateSelector)
);

const requestAccessLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingState) => loadingState.requestAccessLoadingState
)

export const selectRequestAccessLoadingState = pipe(
  select(requestAccessLoadingStateSelector)
);

const validateUserLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingState) => loadingState.validateUserLoadingState
)

export const selectValidateUserLoadingState = pipe(
  select(validateUserLoadingStateSelector)
);

export const selectDeleteWorklogLoadingState = pipe(
  select(deleteWorklogLoadingStateSelector)
);

export const selectEditWorklogLoadingState = pipe(
  select(editWorklogLoadingStateSelector)
);

const aiGeneratedCategoriesLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates: LoadingStates) => loadingStates.aiGeneratedCategoriesLoadingState
);

export const selectAiGeneratedCategoriesLoadingState = pipe(
  select(aiGeneratedCategoriesLoadingStateSelector)
);

const aiGeneratedCategoriesSelector = createSelector(
  (state: AppState) => state.globalConfigs,
  (configs: GlobalConfigs) => configs.aiGeneratedCategories
);

export const selectAiGeneratedCategories = pipe(
  select(aiGeneratedCategoriesSelector)
);

const weeklyWorklogSummaryLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates: LoadingStates) => loadingStates.weeklyWorklogSummaryLoadingState
);

export const selectWeeklyWorklogSummaryLoadingState = pipe(
  select(weeklyWorklogSummaryLoadingStateSelector)
);

const fetchDailyScrumLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates: LoadingStates) => loadingStates.fetchDailyScrumLoadingState
);

export const selectFetchDailyScrumLoadingState = pipe(
  select(fetchDailyScrumLoadingStateSelector)
);

const upsertDailyScrumLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates: LoadingStates) => loadingStates.upsertDailyScrumLoadingState
);

export const selectUpsertDailyScrumLoadingState = pipe(
  select(upsertDailyScrumLoadingStateSelector)
);

const linkToMSTeamsLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates: LoadingStates) => loadingStates.linkToMSTeamsLoadingState
);

export const selectLinkToMSTeamsLoadingState = pipe(
  select(linkToMSTeamsLoadingStateSelector)
);

/*const dataSyncStatusLoadingStateSelector = createSelector(
  (state: AppState) => state.globalConfigs,
  (configs: GlobalConfigs) => configs.dataSyncJobStatus[jobId]
);

export const selectDataSyncStatusLoadingState = pipe(
  select(dataSyncStatusLoadingStateSelector)
);*/

const dataSyncStatusLoadingStateSelector = (jobId: string) =>
  createSelector(
    (state: AppState) => state.globalConfigs,
    (configs: GlobalConfigs) => {
      let state = LoadingState.Pending;

      switch (configs.dataSyncJobStatus[jobId].status) {
        case "running":
          LoadingState.Loading;
          break;
        case "submitted":
          LoadingState.Pending;
          break;
        case "success":
          LoadingState.Done;
          break;
      }

      return state;
    }
  );

export const selectDataSyncStatusLoadingState = (jobId: string) =>
  pipe(select(dataSyncStatusLoadingStateSelector(jobId)));

const startDataSyncLoadingStateSelector = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates: LoadingStates) => loadingStates.startDataSyncLoadingState
);

export const selectStartDataSyncLoadingState = pipe(
  select(startDataSyncLoadingStateSelector)
);
export const selectSprintAnalyticsLoadingState = createSelector(
  (state: AppState) => state.loadingStates,
  (loadingStates: LoadingStates) => loadingStates.sprintAnalyticsLoadingState
);
