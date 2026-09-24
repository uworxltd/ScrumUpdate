/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import 'extensions';
import { Component, HostListener, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { fromEvent, Subscription } from 'rxjs';
import { Constants } from './constants';
import { HttpService } from './services/common/http.service';
import { hasAnyWhiteListURL, isTokenExpired, hasToken } from './shared/helper-functions';
import { fetchTranslations } from './states/app.actions';

import { MessageService } from 'primeng/api';
import { AppState } from './states/app-states';
import { selectTranslation } from './states/global-translations.selector';
import { TrackingService, UserActions } from './services/tracking';
import { NgcCookieConsentService, NgcStatusChangeEvent } from 'ngx-cookieconsent';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { setInstanceId, setSpaceId } from './user-profile/state/user-profile.actions';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  screenHeight: any;
  screenWidth: any;
  khojiLowestResolutionWidth: number;
  khojiLowestResolutionHeight: number;
  expiredDate: Date;
  cookieValue: any;
  isOnline = true;
  translation: any;
  subscription = new Subscription();
  constants: any = Constants;

  @HostListener('window:resize', ['$event'])
  getScreenSize(event?) {
    this.screenHeight = window.screen.height;
    this.screenWidth = window.screen.width;
  }

  constructor(
    private httpService: HttpService,
    private store: Store<AppState>,
    private messageService: MessageService,
    private trackingService: TrackingService,
    private ccService: NgcCookieConsentService,
  ) {
    this.khojiLowestResolutionWidth = Constants.WIDTH_LOWEST;
    this.khojiLowestResolutionHeight = Constants.HEIGHT_LOWEST;
    this.getScreenSize();

    if (hasAnyWhiteListURL() && hasToken() && !isTokenExpired()) {
      this.httpService.loadKhojiConfigs();
      this.httpService.loadDropdownGroupingConfigs();
    }

    this.ccService.statusChange$.subscribe((event: NgcStatusChangeEvent) => {
      if (event.status === 'allow') {
        this.trackingService.init();
      }
    });
  }

  ngOnInit() {
    this.store.dispatch(fetchTranslations({ locale: 'en_GB' }));

    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe((translation) => {
        this.translation = translation;
        // this.titleService.setTitle(this.translation?.pageTitles?.dashboard);
      })
    );

    setTimeout(() => this.captureFeedbackPlugin(), 2000);
    this.initTrackingIfCookieConsent();

    const storageStoreItem$ =
      fromEvent<CustomEvent>(window, Constants.EVENT_STORAGE_STORE_ITEM)
        .pipe(
          map(event => ({ key: event.detail.key, value: event.detail.value })),
          distinctUntilChanged((a, b) => a.key === b.key && a.value === b.value)
        );

    this.subscription.add(storageStoreItem$.subscribe(data => {
      if (data.key === Constants.SPACE_ID) {
        this.store.dispatch(setSpaceId({ spaceId: Number(data.value) }));
      }
      else if (data.key === Constants.INSTANCE_ID) {
        this.store.dispatch(setInstanceId({ instanceId: Number(data.value) }));
      }
    }));
  }

  initTrackingIfCookieConsent() {
    if (this.ccService.hasConsented()) {
      this.trackingService.init();
    }
  }

  captureFeedbackPlugin() {
    const btn = document.getElementById('atlwdg-trigger');

    btn?.addEventListener('click', (e) => {
      this.trackingService.captureUserAction(UserActions.Feedback_Plugin_Button_Click);
    });
  }

  handleMessageServiceCount(type: string) {
    this.messageService[type] = 0;
  }
}
