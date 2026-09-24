/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Injectable } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { Store } from "@ngrx/store";
import { AppFeature, getAppFeature } from "app/app-features";
import { TrackingService, UserActions } from "app/services/tracking";
import { Observable, of } from "rxjs";
import { concatMap, mergeMap, withLatestFrom } from "rxjs/operators";
import { AppState, GlobalFilters } from "./app-states";
import * as actions from './app.actions';

interface TrackingData {
  action: object | string,
  params?: any
}

@Injectable()
export class TrackingEffect {

  constructor(private actions$: Actions, private store: Store<AppState>, private trackingService: TrackingService) { }

  trackingEffect$ = createEffect(() => this.actions$.pipe(
    ofType(actions.trackingReleaseRequest, actions.trackingWorklogRequest, actions.selectMembers, actions.selectStatus),
    concatMap(action => of(action).pipe(withLatestFrom(this.store.select('globalFilters')))),
    mergeMap(([action, filter]) => this.tracking(action, filter))),
  )


  tracking(actions, filter): Observable<any> {
    let appFeature = getAppFeature();
    let trackingAction = this.getTrackingActionData(actions, this.getParams(filter, appFeature));
    if (trackingAction) {
      const trackingParams = trackingAction.params ? { props: trackingAction.params, appFeature: this.getAppFeatureName(appFeature) } : undefined;
      this.trackingService.captureUserAction(trackingAction.action, trackingParams);
    }
    return of();
  }

  getAppFeatureName(appFeature): string | undefined {
    return Object.keys(AppFeature).find((key) => AppFeature[key] === appFeature) || "app feature is not registered";
  }

  getTrackingActionData(action, params): TrackingData {
    switch (action.type) {
      case actions.trackingWorklogRequest.type:
        return {
          action: UserActions.RequestPanel.WorklogRequest,
          params: params?.dateLabel
        }
      case actions.selectMembers.type:
        return {
          action: UserActions.RequestPanel.WorklogMembersFilter,
        }
      default:
        return null;
    }
  }


  getParams(filters: GlobalFilters, appFeature: AppFeature) {
    switch (appFeature) {
      case AppFeature.TeamWorklogAnalysis:
        return {
          teams: filters.teams,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          dateLabel: filters.dateLabel,
          stats: true
        };

      default:
        return null;
    }
  }
}
