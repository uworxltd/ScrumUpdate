/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { resetAdminStateToDefault } from 'app/admin/state/admin.actions';
import { AppState, LoadingState } from 'app/states/app-states';
import { cancelAllRequests, resetKhojiConfigs, resetProjectSourceStatus, setUserSettingLoadingState } from 'app/states/app.actions';
import { environment } from 'environments/environment';
import { TrackingService } from './tracking';
import { clearLocalStorage } from 'app/shared/helper-functions';

@Injectable({ providedIn: 'root' })
export class LogoutService {
  constructor(private store: Store<AppState>, private router: Router, private trackingService: TrackingService) { }

  logout(switchAccount?: boolean) {
    this.store.dispatch(cancelAllRequests());
    this.trackingService.resetUserIdentity();
    clearLocalStorage();
    sessionStorage.clear();
    this.store.dispatch(resetProjectSourceStatus());
    this.store.dispatch(setUserSettingLoadingState({ loadingState: LoadingState.Pending }));
    this.store.dispatch(resetKhojiConfigs());
    this.store.dispatch(resetAdminStateToDefault());

    let queryParams = {
      switchAccount: true
    };

    this.router.navigate([environment.LOGIN_PAGE], { queryParams: switchAccount ? queryParams : null });
  }
}
