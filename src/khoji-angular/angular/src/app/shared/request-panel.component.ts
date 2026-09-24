/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { Store } from '@ngrx/store';
import { FeatureFlagService } from "app/services/feature.flag.service";
import { AppState, LoadingState } from 'app/states/app-states';
import { resetGlobalFiltersMap } from "app/states/app.actions";
import { Subscription, combineLatest } from 'rxjs';
import { distinctUntilChanged } from "rxjs/operators";
import { ComponentVisibilityService } from '../services/component.visibility.service';
import { resetCalculatedState, resetGlobalStats, resetLoadingStates, resetTeamWorkLogStatistics } from './../states/app.actions';
import { isAnyStatsLoadingState } from "./helper-functions";
import { Constants } from "app/constants";

@Component({
  selector: 'khoji-request-panel',
  template: ` <div *ngIf="visible" [ngClass]="{'pinned':pinned}" class="flex flex-wrap gap-2 align-items-center" id="khoji-request-panel">
                    <ng-content></ng-content>
                    <img *ngIf="false && pinnable" (click)="pinned=!pinned" src="assets/images/{{pinned?'unP':'p'}}in-gray.png" data-test="pinUnpin-image">
                </div>`,
  styles: [
    'div { position:relative; font-family:"Poppins","Helvetica Neue", Arial, "Droid Sans", sans-serif }',
    'div.pinned { position:sticky; top:38px; z-index:100 }',
    'img { position:absolute; right:35px; top:8px; cursor: pointer; transition: 0.3s }',
    'img:hover { transform:scale(1.2) }'
  ]
})
export class RequestPanelComponent implements OnInit, OnDestroy {
  // TODO: This is added because the build was failing and feature was derived from refactoring team-worklog-analysis // Need to confirm changes from Mansib
  constructor(private store: Store<AppState>, private componentVisibilityService: ComponentVisibilityService, private featureFlag: FeatureFlagService) { }

  visible: boolean = true;
  subscription = new Subscription();

  ngOnInit() {
    const loadingStates$ = this.store.select('loadingStates').pipe(
      distinctUntilChanged((prev, curr) =>
        prev.teamWorklogLoadingState === curr.teamWorklogLoadingState
      )
    );

    this.subscription.add(combineLatest([this.componentVisibilityService.requestPanelVisible$, this.componentVisibilityService.requestPanelVisibilityForUrlParam$]).subscribe(([visible, visibilityForUrlParam]) => {
      if (this.featureFlag.isEnabled("REQUEST_PANEL_VISIBILITY")) {
        this.visible = visible || visibilityForUrlParam;
      }
    }));

    this.subscription.add(combineLatest([loadingStates$, this.componentVisibilityService.submitRefreshButton$]).subscribe(([loadingStates, buttonClicked]) => {
      if (
        isAnyStatsLoadingState(loadingStates, LoadingState.Done) ||
        loadingStates.teamWorklogLoadingState === LoadingState.Done) {
        this.componentVisibilityService.showFilterButton();
      }
    }));

    this.showHideRequestPanelForUrlParam();
  }

  showHideRequestPanelForUrlParam() {
    const url = new URL(location.href);
    const filtersFlag = url.searchParams.get(Constants.SHOW_REQUEST_PANEL_QUERY_PARAM);
    const visible = filtersFlag === 'true';
    this.componentVisibilityService.setRequestPanelVisibilityForUrlParam(visible);
  }

  ngOnDestroy() {
    this.store.dispatch(resetGlobalFiltersMap());
    this.store.dispatch(resetGlobalStats());
    this.store.dispatch(resetLoadingStates());
    this.store.dispatch(resetTeamWorkLogStatistics())
    this.store.dispatch(resetCalculatedState());
    this.componentVisibilityService.showRequestPanel();
    this.componentVisibilityService.hideFilterButton();
    this.subscription.unsubscribe();
  }

  @Input() pinned = false;
  @Input() pinnable = false;
}
