/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppState, LoadingState } from 'app/states/app-states';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ComponentVisibilityService {
  private requestPanelVisibilitySubject = new BehaviorSubject<boolean>(true);
  requestPanelVisible$ = this.requestPanelVisibilitySubject.asObservable();

  private filterButtonSubject = new BehaviorSubject<boolean>(false);
  filterButtonVisible$ = this.filterButtonSubject.asObservable();

  private submitOrRefreshButtonSubject = new BehaviorSubject<boolean>(false);
  submitRefreshButton$ = this.submitOrRefreshButtonSubject.asObservable();

  private velocityAnalysisComponentSubject = new BehaviorSubject<boolean>(true);
  velocityAnalysisComponentButtonState$ = this.velocityAnalysisComponentSubject.asObservable();

  private requestPanelVisibilityForUrlParamSubject = new BehaviorSubject<boolean>(true);
  requestPanelVisibilityForUrlParam$ = this.requestPanelVisibilityForUrlParamSubject.asObservable();


  constructor(private store: Store<AppState>) { }

  showVelocityAnalysisButton() {
    this.velocityAnalysisComponentSubject.next(true);
  }

  hideVelocityAnalysisButton() {
    this.velocityAnalysisComponentSubject.next(false);
  }

  setVelocityAnalysisbuttonState(option: boolean) {
    this.velocityAnalysisComponentSubject.next(option);
  }

  hideRequestPanel() {
    this.requestPanelVisibilitySubject.next(false);
  }

  showRequestPanel() {
    this.requestPanelVisibilitySubject.next(true);
  }

  setRequestPanelVisibilityState(visible: boolean) {
    this.requestPanelVisibilitySubject.next(visible);
  }

  showFilterButton() {
    this.filterButtonSubject.next(true);
  }

  hideFilterButton() {
    this.filterButtonSubject.next(false);
  }

  setFilterButtonVisibilityState(visible: boolean) {
    this.filterButtonSubject.next(visible);
  }

  submitRefreshButtonClicked() {
    this.submitOrRefreshButtonSubject.next(true);
  }

  submitRefreshButtonNotClicked() {
    this.submitOrRefreshButtonSubject.next(false);
  }

  submitRefreshButtonClickState(visible: boolean) {
    visible? this.submitRefreshButtonClicked() : this.submitRefreshButtonNotClicked();
  }

  setRequestPanelVisibilityForUrlParam(visible: boolean) {
    this.requestPanelVisibilityForUrlParamSubject.next(visible);
  }
}
