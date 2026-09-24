/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { HttpService } from 'app/services/common/http.service';
import { environment } from 'environments/environment';
import { Observable, of } from 'rxjs';
import { catchError, delay, map, mergeMap, tap } from 'rxjs/operators';
import { LoadingState } from './app-states';
import * as actions from './app.actions';
import { postTargetProactiveSprintId, fetchProActiveSprintsForTeam, fetchSprintAnalytics, setSprintAnalyticsLoadingState, setProActiveSprintsForTeam, setSprintAnalytics } from './sprint-analytics.actions';
import { ProActiveSprint, SprintAnalytics } from 'app/analysis/sprint-analytics-types';
import { SPRINT_ANALYTICS_TARGET_SPRINT } from 'app/constants.configs';
import {
  fetchSprintStaticSummary,
  setSprintStaticSummary,
  setSprintStaticSummaryLoadingState,
  fetchSprintStatusChanges,
  setSprintStatusChanges,
  setSprintStatusChangesLoadingState,
  fetchSprintTeamPulse,
  setSprintTeamPulse,
  setSprintTeamPulseLoadingState,
  fetchSprintVelocityBurndown,
  setSprintVelocityBurndown,
  setSprintVelocityBurndownLoadingState,
  fetchSprintEpicProgress,
  setSprintEpicProgress,
  setSprintEpicProgressLoadingState
} from './sprint-analytics.actions';
import { SprintStaticSummary } from 'app/analysis/sprint-static-summary-card/sprint-static-summary-card.component';
import { TeamPulseData } from 'app/analysis/sprint-team-pulse-card/sprint-team-pulse-card.component';
import { SprintVelocityBurndownData } from 'app/analysis/sprint-velocity-burndown-card/sprint-velocity-burndown-card.component';

@Injectable()
export class SprintAnalyticsEffects {
  constructor(private actions$: Actions, private httpService: HttpService, private store: Store) {}

  setProActiveSprintId$ = createEffect(() =>
    this.actions$.pipe(
      ofType(postTargetProactiveSprintId),
      mergeMap((action) => this.setProActiveSprintId(action).pipe(map((res) => this.dispatchProActiveSprintId(res, action))))
    )
  );

  fetchProActiveSprintsForTeam$ = createEffect(() =>
    this.actions$.pipe(
      ofType(fetchProActiveSprintsForTeam),
      mergeMap((action) => this.fetchProActiveSprintsForTeam().pipe(map((res) => this.dispatchProActiveSprintsForTeam(res))))
    )
  );

  private dispatchProActiveSprintId(targetProactiveSprintId: string, action: any) {
    if (targetProactiveSprintId === undefined) {
      return actions.fetchError();
    }

    if (action.funcToCallOnResponse) {
      action.funcToCallOnResponse();
    }

    return actions.configsFetched({ response: { [SPRINT_ANALYTICS_TARGET_SPRINT]: targetProactiveSprintId } });
  }

  private fetchProActiveSprintsForTeam() {
    const url = `${environment.PROACTIVE_SPRINTS}`;

    return <Observable<ProActiveSprint>>this.httpService.apiGetRequest(url).pipe(catchError((error) => of(this.store.dispatch(actions.fetchError()))));
  }

  private dispatchProActiveSprintsForTeam(proactiveSprints: any) {
    if (proactiveSprints === undefined) {
      return actions.fetchError();
    }

    return setProActiveSprintsForTeam({ proactiveSprints });
  }

  fetchSprintAnalytics$ = createEffect(() =>
    this.actions$.pipe(
      ofType(fetchSprintAnalytics),
      mergeMap((action) => this.fetchSprintAnalytics(action).pipe(map((res) => this.dispatchSprintAnalytics(res))))
    )
  );

  fetchSprintStaticSummary$ = createEffect(() =>
    this.actions$.pipe(
      ofType(fetchSprintStaticSummary),
      mergeMap((action) => this.fetchSprintStaticSummary(action).pipe(map((res) => this.dispatchSprintStaticSummary(res))))
    )
  );

  fetchSprintStatusChanges$ = createEffect(() =>
    this.actions$.pipe(
      ofType(fetchSprintStatusChanges),
      mergeMap((action) => this.fetchSprintStatusChanges(action).pipe(map((res) => this.dispatchSprintStatusChanges(res))))
    )
  );

  fetchSprintTeamPulse$ = createEffect(() =>
    this.actions$.pipe(
      ofType(fetchSprintTeamPulse),
      mergeMap((action) => this.fetchSprintTeamPulse(action).pipe(map((res) => this.dispatchSprintTeamPulse(res))))
    )
  );

  private fetchSprintStaticSummary(action: any) {
    const { sprintId } = action;

    // Don't make the API call if sprintId is null or undefined
    if (!sprintId) {
      this.store.dispatch(setSprintStaticSummaryLoadingState({ loadingState: LoadingState.Error }));
      return of(undefined);
    }

    this.store.dispatch(setSprintStaticSummaryLoadingState({ loadingState: LoadingState.Loading }));
    const url = `${environment.SPRINT_STATIC_SUMMARY}?sprintId=${sprintId}`;
    return this.httpService.apiGetRequest<SprintStaticSummary>(url).pipe(
      map((response) => {
        this.store.dispatch(setSprintStaticSummaryLoadingState({ loadingState: LoadingState.Done }));
        return response;
      }),
      catchError((error) => {
        this.store.dispatch(setSprintStaticSummaryLoadingState({ loadingState: LoadingState.Error }));
        this.store.dispatch(actions.fetchError());
        return of(undefined);
      })
    );
  }

  private dispatchSprintStaticSummary(staticSummary: SprintStaticSummary | undefined) {
    if (staticSummary === undefined) {
      return actions.fetchError();
    }

    return setSprintStaticSummary({ staticSummary });
  }

  private fetchSprintStatusChanges(action: any) {
    const { sprintId } = action;
    // Don't make the API call if sprintId is null or undefined
    if (!sprintId) {
      this.store.dispatch(setSprintStatusChangesLoadingState({ loadingState: LoadingState.Error }));
      return of(undefined);
    }

    this.store.dispatch(setSprintStatusChangesLoadingState({ loadingState: LoadingState.Loading }));
    const url = `${environment.SPRINT_STATUS_CHANGES}?sprintId=${sprintId}`;
    return this.httpService.apiGetRequest<{ statusChanges: any }>(url).pipe(
      map((response) => {
        this.store.dispatch(setSprintStatusChangesLoadingState({ loadingState: LoadingState.Done }));
        return response?.statusChanges || null;
      }),
      catchError((error) => {
        this.store.dispatch(setSprintStatusChangesLoadingState({ loadingState: LoadingState.Error }));
        this.store.dispatch(actions.fetchError());
        return of(null);
      })
    );
  }

  private dispatchSprintStatusChanges(statusChanges: any | null) {
    if (statusChanges === null) {
      return actions.fetchError();
    }

    return setSprintStatusChanges({ statusChanges });
  }

  private fetchSprintTeamPulse(action: any) {
    const { sprintId } = action;

    // Don't make the API call if sprintId is null or undefined
    if (!sprintId) {
      this.store.dispatch(setSprintTeamPulseLoadingState({ loadingState: LoadingState.Error }));
      return of(undefined);
    }

    this.store.dispatch(setSprintTeamPulseLoadingState({ loadingState: LoadingState.Loading }));
    const url = `${environment.SPRINT_TEAM_PULSE}?sprintId=${sprintId}`;
    return this.httpService.apiGetRequest<TeamPulseData>(url).pipe(
      // ensure loader state is updated on success
      map((response) => {
        this.store.dispatch(setSprintTeamPulseLoadingState({ loadingState: LoadingState.Done }));
        return response;
      }),
      catchError((error) => {
        this.store.dispatch(setSprintTeamPulseLoadingState({ loadingState: LoadingState.Error }));
        this.store.dispatch(actions.fetchError());
        return of(undefined);
      })
    );
  }

  fetchSprintVelocityBurndown$ = createEffect(() =>
    this.actions$.pipe(
      ofType(fetchSprintVelocityBurndown),
      mergeMap((action) => this.fetchSprintVelocityBurndown(action).pipe(map((res) => this.dispatchSprintVelocityBurndown(res))))
    )
  );

  private dispatchSprintTeamPulse(teamPulse: TeamPulseData | undefined) {
    if (teamPulse === undefined) {
      return actions.fetchError();
    }

    return setSprintTeamPulse({ teamPulse });
  }

  private fetchSprintVelocityBurndown(action: any) {
    const { sprintId } = action;

    // Don't make the API call if sprintId is null or undefined
    if (!sprintId) {
      this.store.dispatch(setSprintVelocityBurndownLoadingState({ loadingState: LoadingState.Error }));
      return of(undefined);
    }

    this.store.dispatch(setSprintVelocityBurndownLoadingState({ loadingState: LoadingState.Loading }));
    const url = `${environment.SPRINT_VELOCITY_BURNDOWN}?sprintId=${sprintId}`;
    return this.httpService.apiGetRequest<SprintVelocityBurndownData>(url).pipe(
      // ensure loader state is updated on success
      map((response) => {
        this.store.dispatch(setSprintVelocityBurndownLoadingState({ loadingState: LoadingState.Done }));
        return response;
      }),
      catchError((error) => {
        this.store.dispatch(setSprintVelocityBurndownLoadingState({ loadingState: LoadingState.Error }));
        this.store.dispatch(actions.fetchError());
        return of(undefined);
      })
    );
  }

  private dispatchSprintVelocityBurndown(velocityBurndown: SprintVelocityBurndownData | undefined) {
    if (velocityBurndown === undefined) {
      return actions.fetchError();
    }

    return setSprintVelocityBurndown({ velocityBurndown });
  }

  fetchSprintEpicProgress$ = createEffect(() =>
    this.actions$.pipe(
      ofType(fetchSprintEpicProgress),
      mergeMap((action) => this.fetchSprintEpicProgress(action).pipe(map((res) => this.dispatchSprintEpicProgress(res))))
    )
  );

  private fetchSprintEpicProgress(action: any) {
    const { sprintId } = action;
    
    // Don't make the API call if sprintId is null or undefined
    if (!sprintId) {
      this.store.dispatch(setSprintEpicProgressLoadingState({ loadingState: LoadingState.Error }));
      return of(undefined);
    }

    this.store.dispatch(setSprintEpicProgressLoadingState({ loadingState: LoadingState.Loading }));
    const url = `${environment.SPRINT_EPIC_FETCH}?sprintId=${sprintId}`;
    return this.httpService.apiGetRequest<any>(url).pipe(
      map((response) => {
        this.store.dispatch(setSprintEpicProgressLoadingState({ loadingState: LoadingState.Done }));
        return response;
      }),
      catchError((error) => {
        this.store.dispatch(setSprintEpicProgressLoadingState({ loadingState: LoadingState.Error }));
        this.store.dispatch(actions.fetchError());
        return of(undefined);
      })
    );
  }

  private dispatchSprintEpicProgress(epicProgress: any | undefined) {
    if (epicProgress === undefined) {
      return actions.fetchError();
    }

    return setSprintEpicProgress({ epicProgress });
  }

  private setProActiveSprintId(action: any) {
    const { targetProactiveSprintId } = action;
    const url = `${environment.PROACTIVE_SPRINT_TARGET_ENDPOINT}`;

    return <Observable<string>>this.httpService.apiPostRequest(url, targetProactiveSprintId, false).pipe(catchError((error) => of(this.store.dispatch(actions.fetchError()))));
  }

  // --- Fetch (kept same behavior; just clarified types and error emission) ---
  private fetchSprintAnalytics(action: any): Observable<SprintAnalytics | undefined> {
    const { teamId, analyticsType } = action;
    const url = `${environment.SPRINT_ANALYTICS}?teamId=${teamId}&analyticsType=${analyticsType}`;

    return this.httpService.apiGetRequest<SprintAnalytics>(url).pipe(
      //delay(5000),
      tap((response) => {
        if (response === null) {
          console.log('Please sync data for the selected sprint to see analytics.');
        }
      }),
      catchError((_error) => {
        // keep your existing central error dispatch
        this.store.dispatch(actions.fetchError());
        // emit undefined so the dispatcher flips loader to Error (same net effect you had)
        return of(undefined);
      })
    );
  }

  // --- Dispatch (unchanged logic; just typed param) ---
  private dispatchSprintAnalytics(sprintAnalytics: SprintAnalytics | undefined) {
    if (sprintAnalytics === undefined) {
      this.store.dispatch(setSprintAnalyticsLoadingState({ sprintAnalyticsLoadingState: LoadingState.Error }));
      return actions.fetchError();
    }

    // Update data and set to Done state only after successful fetch
    this.store.dispatch(setSprintAnalyticsLoadingState({ sprintAnalyticsLoadingState: LoadingState.Done }));

    if (sprintAnalytics === null) {
      const sprintAnalytics: SprintAnalytics = {
        synced: false,
        schemaVersion: null,
        generatedAt: null,
        meta: null,
        kpi: null,
        insights: null,
        table: null
      };
      return setSprintAnalytics({ sprintAnalytics });
    } else {
      sprintAnalytics.synced = true;
    }

    return setSprintAnalytics({ sprintAnalytics });
  }
}
