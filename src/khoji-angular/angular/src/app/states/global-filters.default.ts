/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { GlobalFilters } from './app-states'
import { Constants } from 'app/constants';
import { AppFeature, getAppFeature } from 'app/app-features';
import { format, subDays } from 'date-fns';

const dateFrom = format(subDays(new Date(), 7), Constants.DATE_FORMAT);
const dateTo = format(new Date(), Constants.DATE_FORMAT);

const appFeature = getAppFeature();
const clearCache = appFeature === AppFeature.ReleaseReport
  || appFeature === AppFeature.TeamProgressReport
  || appFeature === AppFeature.IndicatorsSummaryByTeam;

export const defaultFilters: GlobalFilters = {

  teams: [],
  teamsList: [],


  worklogTeamsList: [],
  worklogTeams: [],
  members: [],
  users: [],

  // below are all selected filters
  dateFrom: dateFrom,
  dateTo: dateTo,
  dateLabel: null,
  throughputInterval: 'Fortnightly',
  status: 'All',
  clearCache: clearCache,
  showBarLabels: false,
  othersChartDataAvailable: true,
  teamWorklogUpdated: false,
  isLocalFilterTriggered: false,
};
