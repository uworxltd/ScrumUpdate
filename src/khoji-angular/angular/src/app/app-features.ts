/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Routes, RoutesTemplateIDs, subRoutes } from './interface/routes.enum';
import { getPage } from './shared/helper-functions';

export enum AppFeature {
  AnalysisByRelease,
  AnalysisByTeamboard,
  AnalysisByWorklog,
  TeamWorklogAnalysis,
  ReleaseReport,
  TeamProgressReport,
  IndicatorsSummaryByTeam,
  AdminPanel,
  Dashboard,
  UserProfile,
  Insights,
  TeamInsights
}

export function getAppFeature() {
  const teamInsightsFeature = getAppFeatureForTeamInsights();
  if (teamInsightsFeature) return teamInsightsFeature
  const page = getPage();
  switch (page) {
    case Routes.DELIVERY_ANALYSIS_DASHBOARD:
      return AppFeature.AnalysisByRelease;

    case Routes.ANALYSIS_BY_TEAMBOARD:
      return AppFeature.AnalysisByTeamboard;

    case Routes.ANALYSIS_BY_WORKLOG:
      return AppFeature.AnalysisByWorklog;

    case Routes.TEAM_WORKLOG_ANALYSIS:
      return AppFeature.TeamWorklogAnalysis;

    case Routes.REPORT_ANALYSIS:
      const match = location.href.match(/\?templateId=([A-Za-z]+)/);
      const templateId = match ? match[1] : '';

      switch (templateId) {
        case RoutesTemplateIDs.TEAM_PROGRESS_REPORT:
          return AppFeature.TeamProgressReport;
        case RoutesTemplateIDs.INDICATORS_SUMMARY_BY_TEAM:
          return AppFeature.IndicatorsSummaryByTeam;
        case RoutesTemplateIDs.RELEASE_REPORT:
          return AppFeature.ReleaseReport;
        default:
          new Error(`template-id: ${templateId} does not map any app feature`);
          return null;
      }

    case Routes.ADMIN_PANEL:
      return AppFeature.AdminPanel;
    case Routes.DASHBOARD:
      return AppFeature.Dashboard;
    case Routes.USER_PROFILE:
      return AppFeature.UserProfile;
    case Routes.INSIGHTS:
      return AppFeature.Insights;

    default:
      new Error(`page: ${page} does not map any app feature`);
      return null;
  }
}

export function getAppFeatureForTeamInsights() {
  return location.href.split('?')[0].includes(subRoutes.TEAM_INSIGHTS) ? AppFeature.TeamInsights : null;
}
