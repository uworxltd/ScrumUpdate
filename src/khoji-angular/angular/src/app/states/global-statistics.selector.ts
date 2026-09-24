/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { createSelector, select } from "@ngrx/store";
import { pipe } from "rxjs";
import { map } from "rxjs/operators";
import { AppState } from "./app-states";
import { TeamWorklogStatistics } from "app/interface/team-worklog-stats";

const teamWorklogSelector = createSelector(
  (state: AppState) => state.teamWorklogStatistics,
  (state: AppState) => state.requestFilters?.worklogTeamsFilter,
  (state: AppState) => state.requestFilters?.members || [],
  (stats, teams, members) => ({
    ...stats,
    teamWorklogs: stats.teamWorklogs.map(twl => {
      return ({
        ...twl,
        //TODO: accountId and Email identifiers for members need to be refactored to one unique identifier
        memberWorklogs: twl.memberWorklogs
          .filter(mwl => members.findIndex(m => m.accountId === mwl.accountId) > -1)
          .map(mwl => ({ ...mwl, roleName: members.find(m => m.accountId === mwl.accountId).role.name }))
      });
    }).filter(twl => teams.filter(t => teams.every(t => !t.selected) ? true : t.selected).map(t => t.name).includes(twl.teamName) && twl.memberWorklogs.length > 0),
  })
);

const teamWorklogForThisMonthSelector = createSelector(
  (state: AppState) => state.teamWorklogStatisticsForThisMonth,
  (state: AppState) => state.requestFilters?.worklogTeamsFilter,
  (state: AppState) => state.requestFilters?.members || [],
  (stats, teams, members) => ({
    ...stats,
    teamWorklogs: stats.teamWorklogs.map(twl => ({
      ...twl,
      //TODO: accountId and Email identifiers for members need to be refactored to one unique identifier
      memberWorklogs: twl.memberWorklogs.filter(mwl => members.findIndex(m => m.id.toString() === (mwl.email || mwl.accountId)) > -1)
    })).filter(twl => teams.filter(t => teams.every(t => !t.selected) ? true : t.selected).map(t => t.name).includes(twl.teamName) && twl.memberWorklogs.length > 0),
  })
);




//c is column, mwl is member worklog, twl is team worklog
export const selectTeamWorklogStats = pipe(
  select(teamWorklogSelector),
  map(stats => ({
    ...stats,
    teamWorklogs: stats.teamWorklogs.map(twl => {
      const avgPercents = stats.teamWorklogColumns.map(c => c.name).reduce((a, c) => {
        a[c] = Number((twl.memberWorklogs.map(mwl => mwl.totalMainPercents[c]).reduce((a, c) => a + c) / twl.memberWorklogs.length).toFixed(2));
        return a;
      }, {});

      return ({
        ...twl,
        avgDays: stats.teamWorklogColumns.map(c => c.name).reduce((a, c) => {
          a[c] = Number((twl.memberWorklogs.map(mwl => mwl.totalMainDays[c]).reduce((a, c) => a + c) / twl.memberWorklogs.length).toFixed(2));
          return a;
        }, {}),
        avgPercents,
        percentage: Number((twl.memberWorklogs.map(mwl => mwl.totalMainPercents['Worklog']).reduce((a, c) => a + c) / twl.memberWorklogs.length).toFixed(2)),
        totalAvailableDays: twl.memberWorklogs.map(mwl => mwl.totalAvailableDays).reduce((a, c) => a + c),
        totalWorkLogInDays: Number((twl.memberWorklogs.map(mwl => mwl.totalMainDays['Worklog']).reduce((a, c) => a + c)).toFixed(2)),
        totalOthersPercents: Number((twl.memberWorklogs.map(mwl => mwl.totalMainPercents['Others']).reduce((a, c) => a + c) / twl.memberWorklogs.length).toFixed(2)),
        totalMainPercents: Number((twl.memberWorklogs.map(mwl => mwl.totalMainPercents['Worklog'] - mwl.totalMainPercents['Others']).reduce((a, c) => a + c) / twl.memberWorklogs.length).toFixed(2)),
        thresholdColor: setTeamRagStatusColor(stats, avgPercents)
      });
    })
  }))
);

function setTeamRagStatusColor(worklogStats: TeamWorklogStatistics, avgPercents: any) {
  if (avgPercents["Worklog"] > worklogStats.thresholdPercentage["Normal"]) {
    return worklogStats.thresholdColors["Normal"];
  }
  else if (avgPercents["Worklog"] > worklogStats.thresholdPercentage["Medium"]) {
    return worklogStats.thresholdColors["Medium"];
  }
  else {
    return worklogStats.thresholdColors["Low"];
  }
}

export const selectTeamWorklogStatsForThisMonth = pipe(
  select(teamWorklogForThisMonthSelector),
  map(stats => ({
    ...stats,
    teamWorklogs: stats.teamWorklogs.map(twl => ({
      ...twl,
      avgDays: stats.teamWorklogColumns.map(c => c.name).reduce((a, c) => {
        a[c] = Number((twl.memberWorklogs.map(mwl => mwl.totalMainDays[c]).reduce((a, c) => a + c) / twl.memberWorklogs.length).toFixed(2));
        return a;
      }, {}),
      avgPercents: stats.teamWorklogColumns.map(c => c.name).reduce((a, c) => {
        a[c] = Number((twl.memberWorklogs.map(mwl => mwl.totalMainPercents[c]).reduce((a, c) => a + c) / twl.memberWorklogs.length).toFixed(2));
        return a;
      }, {}),
      percentage: Number((twl.memberWorklogs.map(mwl => mwl.totalMainPercents['Worklog']).reduce((a, c) => a + c) / twl.memberWorklogs.length).toFixed(2))
    }))
  }))
);
