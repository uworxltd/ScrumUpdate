/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { setSendEmailForWorklogReminderLoadingState } from 'app/admin/state/admin.actions';
import { AppFeature, getAppFeature } from 'app/app-features';
import { Constants } from 'app/constants';
import { getDateRange } from 'app/dropdowns/date-range/date-range.component';
import { MemberWorklog, TeamWorklog, TeamWorklogResponse, TeamWorklogStatistics } from 'app/interface/team-worklog-stats';
import { HttpService } from 'app/services/common/http.service';
import { KhojiSpinnerService } from 'app/services/spinner.service';
import { selectUserProfile } from 'app/user-profile/state/user-profile.selectors';
import { environment } from 'environments/environment';
import { MessageService } from 'primeng/api';
import { combineLatest, EMPTY, Observable, of } from 'rxjs';
import { catchError, map, mergeMap, skipWhile, switchMap, take, takeUntil } from 'rxjs/operators';
import { AppState, GlobalTranslations, LoadingState, RequestFilters } from './app-states';
import { discardSentCallsAfterNavigate, fetchError, fetchKhojiConfigs, fetchMembers, fetchTeamWorklogStats, fetchTeamWorklogStatsDefault, fetchTeamWorklogStatsForThisMonth, resetGlobalFiltersMap, resetGlobalStats, resetLoadingStates, resetTeamWorkLogStatistics, selectDateLabel, selectDateRange, selectWorklogTeams, sendWorklogReminderEmail, setTeamWorkLogForThisMonthLoadingState, setTeamWorkLogLoadingState, setTeamWorklogStats, setTeamWorklogStatsForThisMonth, updateRequestFilters } from './app.actions';
import { selectWorklogTeamsList } from './global-filters.selector';
import { AdminActions, TrackingService, UserActions } from '../services/tracking';

@Injectable()
export class TeamWorklogEffects {
    worklogStatsEffect$ = createEffect(() => this.actions$.pipe(
        ofType(fetchTeamWorklogStats),
        switchMap(action =>
            combineLatest([of(action), this.store.select('requestFilters'), this.store.select('globalTranslations')]).pipe(
                skipWhile(([action, filters, translation]) => {
                    if (!filters || !filters.worklogTeams.length) return true;
                    return false;
                }),
                take(1),
                mergeMap(([action, filters, translation]) => this.fetchStats(action, filters).pipe(map(res => this.dispatchStats(action, res, translation)))),
            ))
    ));

    worklogReminderEmailEffect$ = createEffect(() => this.actions$.pipe(
        ofType(sendWorklogReminderEmail),
        mergeMap(action => this.sendWorkLogReminderEmail(action).pipe(map(res => this.showSentEmailToast(res))))
    ), { dispatch: false });


    worklogSummaryDefaultEffect$ = createEffect(() => this.actions$.pipe(
        ofType(fetchTeamWorklogStatsDefault),
        switchMap(() => combineLatest([
            this.store.pipe(selectWorklogTeamsList),
            this.store.select('globalFilters'),
            this.store.pipe(selectUserProfile),
        ]).pipe(
            skipWhile(([teams, filters, profile]) => {
                // update filters and prerequisites
                if (!teams || teams.length === 0) return true;

                if (!filters || !filters.worklogTeams.length) {
                    const ids = teams.map((r) => r.item_id);
                    this.store.dispatch(selectWorklogTeams({ ids: ids }));
                    return true;
                }

                if (!filters || !filters.dateLabel) {
                    const dateLabel = 'Last 7 Days';
                    const dateRange = getDateRange(dateLabel);
                    const dateFrom = dateRange[0];
                    const dateTo = dateRange[1];

                    this.store.dispatch(selectDateRange({
                        dateFrom: dateFrom.format(Constants.DATE_FORMAT),
                        dateTo: dateTo.format(Constants.DATE_FORMAT)
                    }));

                    this.store.dispatch(selectDateLabel({ dateLabel }));
                    return true;
                }

                if (!profile || !profile.accessibleAccessLevels || !profile.accessibleAccessLevels.length) return true;

                return false;
            }),
            take(1),
            mergeMap(([teams, filters, profile]) => {
                // update request filters
                this.store.dispatch(updateRequestFilters({ filters }));
                // fetch stats and related data
                this.store.dispatch(fetchKhojiConfigs());
                this.store.dispatch(fetchMembers());

                return of(fetchTeamWorklogStats());
            })
        ))));

    constructor(
        private http: HttpService,
        private spinner: KhojiSpinnerService,
        private actions$: Actions,
        private store: Store<AppState>,
        private messageService: MessageService,
        private trackingService: TrackingService
    ) { }

    fetchStats(action: any, filters: RequestFilters): Observable<TeamWorklogResponse> {
        if (filters.worklogTeams.length !== 0) {
            const appFeature = getAppFeature();
            const url = environment.GETWORKLOG
            let params = this.getParams(appFeature, filters);
            this.store.dispatch(setTeamWorkLogLoadingState({ teamWorklogLoadingState: LoadingState.Loading }));

            return <any>this.http.apiPostRequest(url, params, false)
                .pipe(
                    takeUntil(
                        this.actions$.pipe(
                            ofType(
                                resetGlobalFiltersMap,
                                resetGlobalStats,
                                resetLoadingStates,
                                resetTeamWorkLogStatistics,
                                discardSentCallsAfterNavigate
                            )
                        )
                    ),
                    catchError((error) => {

                        if (action.type === fetchTeamWorklogStatsForThisMonth.type) {

                            return of(this.store.dispatch(setTeamWorkLogForThisMonthLoadingState({ loadingState: LoadingState.Error })));
                        } else {
                            return of(this.store.dispatch(setTeamWorkLogLoadingState({ teamWorklogLoadingState: LoadingState.Error })));
                        }
                    })
                );
        }
        return of(undefined);
    }

  dispatchStats(action: any, resp: TeamWorklogResponse, translations: GlobalTranslations) {
    if (resp === undefined) {
      this.trackingService.captureUserActionResult(UserActions.RequestPanel.WorklogRequest, 'Failure');
      return fetchError();
    }

    const tooltipPrefix = translations.translation.timelog.table.columns.tooltip;

    const stats: TeamWorklogStatistics = {
      dateFrom: resp.dateFrom,
      dateTo: resp.dateTo,
      thresholdColors: resp.thresholdColors,
      thresholdPercentage: resp.thresholdPercentage,
      teamWorklogColumns: resp.mainCategoryCols.map(c => {
        // Create a unique list of issue types
        const uniqueIssueTypes = Array.from(new Set(c.includedIssueTypes));
        return {
          name: c.name,
          tooltip: tooltipPrefix + uniqueIssueTypes.join(', ')
        };
      }),

      teamWorklogs: resp.workAudit.map<TeamWorklog>(wa => ({
        teamName: wa.teamName,
        thresholdColor: wa.thresholdColor,
        avgDays: {}, // wa.totalsDays, // calculated in selector
        avgPercents: {}, // wa.totalsPercentages, // calculated in selector
        percentage: 0, // wa.percentage, // calculated in selector
        totalAvailableDays: wa.totalAvailableDays,
        totalWorkLogInHours: 0, // assigned in loop below
        totalWorkLogInDays: 0, // assigned in loop below
        totalMainDays: 0, // assigned in loop below
        totalOthersDays: 0, // assigned in loop below
        totalMainPercents: 0, // assigned in loop below
        totalOthersPercents: 0, // assigned in loop below

        memberWorklogColumns: {
          //remove Duplicate Column Name from columnsNames List
          main: wa.columnsNames,
          other: wa.othersDistrMeta
        },

        memberWorklogs: wa.members.map<MemberWorklog>(mw => ({
          memberName: mw.name,
          thresholdColor: mw.thresholdColor,
          email: mw.email,
          roleName: '', // assigned in selector
          //TODO: accountId and Email identifiers for members need to be refactored to one unique identifier
          accountId: mw.accountId,
          inMultipleTeams: mw.inMultipleTeams,
          totalMainDays: {}, // assigned in loop below
          totalMainPercents: {}, // assigned in loop below
          totalOthersDays: {}, // assigned in loop below
          totalOthersPercents: {}, // assigned in loop below
          workLogDistribution: mw.workLogDistribution,
          totalAvailableDays: mw.totalAvailableDays,
          percentage: 0, // assigned in loop below
          mainPercentage: 0, // assigned in loop below
          othersPercentage: 0 // assigned in loop below
        }))
      }))
    };

    stats.teamWorklogColumns.unshift({ name: 'Worklog', tooltip: translations.translation.timelog.tooTips.worklog });
    stats.teamWorklogColumns.push({ name: 'Others', tooltip: translations.translation.timelog.tooTips.others });

    resp.workAudit.forEach(wa => {
      const teamWorklog = stats.teamWorklogs.find(tw => tw.teamName === wa.teamName);

      //teamWorklog.avgDays['Worklog'] // from API and also calculated in selector
      //teamWorklog.avgPercents['Worklog'] = wa.percentage; // calculated in selector
      teamWorklog.avgDays['Others'] = resp.otherCategoryCols.map(col => teamWorklog.avgDays[col]).reduce((a, c) => a + c, 0) || 0;
      teamWorklog.avgPercents['Others'] = resp.otherCategoryCols.map(col => teamWorklog.avgPercents[col]).reduce((a, c) => a + c, 0) || 0;

      wa.members.forEach(mw => {
        //TODO: accountId and Email identifiers for members need to be refactored to one unique identifier
        const memberWorklog = teamWorklog.memberWorklogs.find(_mw => _mw.email && mw.email ? _mw.email === mw.email : _mw.accountId === mw.accountId);

        Object.entries(mw.workLogDistribution.values).forEach(([column, worklog]) => {
          teamWorklog.totalMainDays += worklog.totalDaysSpent;
          memberWorklog.totalMainDays[column] = worklog.totalDaysSpent;
          memberWorklog.totalMainPercents[column] = worklog.percentage;
        });

        Object.entries(mw.workLogDistribution.others).forEach(([column, worklog]) => {
          teamWorklog.totalOthersDays += worklog.totalDaysSpent;
          memberWorklog.totalOthersDays[column] = worklog.totalDaysSpent;
          memberWorklog.totalOthersPercents[column] = worklog.percentage;
        });

        memberWorklog.percentage = mw.percentage;
        memberWorklog.mainPercentage = mw.percentage - mw.othersPercentage;
        memberWorklog.othersPercentage = mw.othersPercentage;
        memberWorklog.totalMainDays['Worklog'] = mw.totalWorkLogInDays; //resp.mainCategoryCols.map(col => memberWorklog.totalDays[col.name]).reduce((a, c) => a + c) || 0;
        memberWorklog.totalMainPercents['Worklog'] = mw.percentage;
        memberWorklog.totalMainDays['Others'] = resp.otherCategoryCols.map(col => memberWorklog.totalOthersDays[col]).reduce((a, c) => a + c, 0) || 0;
        memberWorklog.totalMainPercents['Others'] = mw.othersPercentage;
        teamWorklog.totalWorkLogInHours += mw.totalWorkLogInHours;
        teamWorklog.totalWorkLogInDays += mw.totalWorkLogInDays;
        teamWorklog.totalMainPercents += mw.percentage - mw.othersPercentage;
        teamWorklog.totalOthersPercents += mw.othersPercentage;
      });

      teamWorklog.totalMainPercents = teamWorklog.totalMainPercents / wa.members.length;
      teamWorklog.totalOthersPercents = teamWorklog.totalOthersPercents / wa.members.length;
    });

    if (action.type === fetchTeamWorklogStats.type) {
      this.store.dispatch(setTeamWorkLogLoadingState({ teamWorklogLoadingState: LoadingState.Done }));
      this.trackingService.captureUserActionResult(UserActions.RequestPanel.WorklogRequest, 'Success');
      return setTeamWorklogStats({ stats: stats });
    } else {
      this.store.dispatch(setTeamWorkLogForThisMonthLoadingState({ loadingState: LoadingState.Done }));
      return setTeamWorklogStatsForThisMonth({ stats: stats });
    }

  }

    getParams(appFeature: AppFeature, filters: RequestFilters) {
        return {
            teams: filters.worklogTeams,
            dateFrom: filters.dateFrom,
            dateLabel: filters.dateLabel === 'Custom Range' ? null : filters.dateLabel,
            dateTo: filters.dateTo,
            stats: true,
            membersData: []
        };
    }

    sendWorkLogReminderEmail(action: any) {
        const url = environment.WORKLOG_REMINDER_API;
        const params = action.worklogReminder;
        this.store.dispatch(setSendEmailForWorklogReminderLoadingState({ loadingState: LoadingState.Loading }));
        return <Observable<string[]>>this.http.apiPostRequest(url, params, false).pipe(
            catchError((error) => {
                this.store.dispatch(setSendEmailForWorklogReminderLoadingState({ loadingState: LoadingState.Error }));
                this.trackingService.captureUserActionResult(AdminActions.RemindTeam.SendEmail, "Failure");
                return EMPTY;
            })
        );
    }

    showSentEmailToast(res: any): any {
        this.messageService.add({
            key: 'message',
            severity: 'success',
            summary: "Success!",
            detail: "Email sent successfully"
        });
        this.store.dispatch(setSendEmailForWorklogReminderLoadingState({ loadingState: LoadingState.Done }));
        this.trackingService.captureUserActionResult(AdminActions.RemindTeam.SendEmail, "Success");
    }

    private isTeamHasMembers(teamWorklog: any[], selectedTeams: string | any[]) {
        return teamWorklog.filter((tw: { member: string | any[]; }) => tw.member.length > 0).map((teamsArr: { teamName: any; }) => teamsArr.teamName).filter((teamName: any) => selectedTeams.includes(teamName))
    }
}
