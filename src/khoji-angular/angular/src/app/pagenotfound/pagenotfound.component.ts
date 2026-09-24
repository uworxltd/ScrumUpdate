/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppState } from '../states/app-states';
import { Subscription } from 'rxjs';
import { selectTranslation } from '../states/global-translations.selector';
import { fetchTranslations, resetProjectSourceStatus } from '../states/app.actions';
import { LayoutService } from '../layout/service/app.layout.service';
import { isTokenExpired, hasToken, clearLocalStorage } from 'app/shared/helper-functions';
import { environment } from 'environments/environment';
import { Router } from '@angular/router';
import { HttpService } from 'app/services/common/http.service';

@Component({
  templateUrl: './pagenotfound.component.html',
})
export class PagenotfoundComponent implements OnInit {
  translation: any;
  subscription = new Subscription();
  buttonText: string;

  constructor(private store: Store<AppState>, private layoutService: LayoutService, private router: Router, private httpService: HttpService) { }

  ngOnInit(): void {
    if (!this.translation) {
      this.store.dispatch(fetchTranslations({ locale: 'en_GB' }));
      this.subscription.add(this.store.pipe(selectTranslation)
        .subscribe(translation => {
          this.translation = translation;
        }));
    }
    if (hasToken()) {
      this.buttonText = this.translation?.errorPage.pageNotFoundButtonText
    }
    else {
      this.buttonText = this.translation?.accessDenied.accessDeniedButton;
    }
  }

  get dark(): boolean {
    return this.layoutService.config.colorScheme !== 'light';
  }

  goToRoute() {
    if (hasToken() && !isTokenExpired()) {
      this.httpService.loadKhojiConfigs();
      this.router.navigate([environment.WORKLOG_ANALYSIS_PAGE]);
    }
    else {
      clearLocalStorage();
      this.store.dispatch(resetProjectSourceStatus());
      this.router.navigate([environment.LOGIN_PAGE]);
    }
  }
}
