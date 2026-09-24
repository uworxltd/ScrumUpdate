/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { LayoutService } from '../layout/service/app.layout.service';
import { AppState, LoadingState } from '../states/app-states';
import { fetchTranslations, requestAccess } from '../states/app.actions';
import { selectTranslation } from '../states/global-translations.selector';
import { selectRequestAccessLoadingState } from 'app/states/global-process.selector';
import { HttpErrorInterceptor } from 'app/interceptors/http.interceptor';
import { RootNav, TrackingService, UserActions } from 'app/services/tracking';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'khoji-request-access',
  templateUrl: './request-access.component.html',
  styleUrls: ['./request-access.component.scss'],
})
export class RequestAccessComponent implements OnInit, OnDestroy {

  translation: any;
  subscription = new Subscription();
  loadingState = LoadingState;
  loading = LoadingState.Pending;

  constructor(private store: Store<AppState>, 
    private layoutService: LayoutService, 
    private trackingService: TrackingService,
    private titleService: Title) { }

  ngOnInit(): void {
    this.trackingService.captureNavigationStep(RootNav.UserProfile.RequestAccess);

    const loadingState$ = this.store.pipe(selectRequestAccessLoadingState);

    this.subscription.add(this.store.pipe(selectTranslation)
      .subscribe(translation => { 
        this.translation = translation;
        this.titleService.setTitle(translation?.pageTitles?.requestAccess);
       }));

    if (!this.translation) {
      this.store.dispatch(fetchTranslations({ locale: 'en_GB' }));
      this.subscription.add(this.store.pipe(selectTranslation)
        .subscribe(translation => { this.translation = translation; }));
    }

    this.subscription.add(loadingState$.subscribe(loadingState => {
      this.loading = loadingState;

      if (loadingState === LoadingState.Done) {
        this.trackingService.captureUserActionResult(UserActions.Profile.RequestAccess, 'Success');
      }
      else if (loadingState === LoadingState.Error) {
        this.trackingService.captureUserActionResult(UserActions.Profile.RequestAccess, 'Failure');
      }
    }));
  }

  get dark(): boolean {
    return this.layoutService.config.colorScheme !== 'light';
  }

  get accessToken() {
    return sessionStorage.getItem(HttpErrorInterceptor.REQUESTED_INFO);
  }

  requestAccess(): void {
    const token = this.accessToken;

    if (!token) return;

    this.trackingService.captureUserAction(UserActions.Profile.RequestAccess);

    this.store.dispatch(requestAccess({ token: token }));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
