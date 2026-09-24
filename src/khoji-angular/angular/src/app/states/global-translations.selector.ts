/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { createSelector, select } from "@ngrx/store";
import { pipe } from "rxjs";
import { filter, map } from "rxjs/operators";
import { AppState, GlobalTranslations } from "./app-states";

const translationSelector = createSelector(
  (state: AppState) => state.globalTranslations,
  (trans: GlobalTranslations) => trans.translation
);

export const selectTranslation = pipe(
  select(translationSelector),
  filter(trans => trans !== undefined)
);

const insightsMessagesTranslationSelector = createSelector(
  translationSelector,
  (translation) => translation.insightsCodes
);

export const selectInsightsMessagesTranslation = pipe(
  select(insightsMessagesTranslationSelector),
  filter(trans => trans !== undefined)
);

export const teamMembersMessageTranslationSelector = createSelector(
  translationSelector,
  (translation) => translation.sprintInsights.teamMembers
);

export const teamWorkLogMessageTranslationSelector = createSelector(
  translationSelector,
  (translation) => translation.sprintInsights.teamWorkLog
);

export const dashboardInsightsMessagesTranslationSelector = createSelector(
  translationSelector,
  (translation) => translation.dashboardInsightsTranslation
);

export const statusOverViewMessagesTranslationSelector = createSelector(
  translationSelector,
  (translation) => translation.sprintInsights.statusOverView
);

export const scopeVsVelocityMessagesTranslationSelector = createSelector(
  translationSelector,
  (translation) => translation.sprintInsights.scopeVsVelocity
);

export const changeInScopeMessageTranslationSelector = createSelector(
  translationSelector,
  (translation) => translation.sprintInsights.changeInScope
);

export const dataReliabilityMessageTranslationSelector = createSelector(
  translationSelector,
  (translation) => translation.sprintInsights.dataReliability
);

export const defectsReportedMessageTranslationSelector = createSelector(
  translationSelector,
  (translation) => translation.sprintInsights.defectsReported
);

const teamOnboardingTranslationsSelector = createSelector(
  translationSelector,
  (translation) => translation.onboarding.team
);

export const selectTeamOnboardingTranslations = pipe(
  select(teamOnboardingTranslationsSelector),
  filter(trans => trans !== undefined)
);

const worklogCategoriesTranslationsSelector = createSelector(
  translationSelector,
  (translation) => translation.onboarding.worklogCategories
)

export const selectWorklogCategoriesTranslations = pipe(
  select(worklogCategoriesTranslationsSelector),
  filter(translation => translation)
)

export const selectTranslationRaw = pipe(
  select(translationSelector)
);

const onboardingInviteUserTranslationsSelector = createSelector(
  translationSelector,
  (translation) => translation.onboarding.inviteUserDialog
);

export const selectonboardingInviteUserTranslatiions = pipe(
  select(onboardingInviteUserTranslationsSelector),
  filter(trans => trans !== undefined)
);
