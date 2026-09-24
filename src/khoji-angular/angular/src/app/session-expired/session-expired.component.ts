/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { clearLocalStorage, isTokenExpired } from 'app/shared/helper-functions';
import { environment } from 'environments/environment';
import { Subscription } from 'rxjs';
import { LayoutService } from '../layout/service/app.layout.service';
import { AppState } from '../states/app-states';
import { fetchTranslations, resetKhojiConfigs, resetProjectSourceStatus } from '../states/app.actions';
import { selectTranslation } from '../states/global-translations.selector';

@Component({
  selector: 'app-session-expired',
  templateUrl: './session-expired.component.html',
})
export class SessionExpiredComponent implements OnInit {

  translation: any;
  subscription = new Subscription();

  constructor(private store: Store<AppState>, private layoutService: LayoutService, private router: Router) { }

  ngOnInit(): void {
    this.subscription.add(this.store.pipe(selectTranslation)
      .subscribe(translation => { this.translation = translation; }));

    if (!this.translation) {
      this.store.dispatch(fetchTranslations({ locale: 'en_GB' }));
      this.subscription.add(this.store.pipe(selectTranslation)
        .subscribe(translation => { this.translation = translation; }));
    }

    this.clearTokenIfExpired();
  }

  get dark(): boolean {
    return this.layoutService.config.colorScheme !== 'light';
  }

  /**
   * Clears the token in localStorage
   *  if it is expired.
   */
  clearTokenIfExpired() {
    if (isTokenExpired()) {
      clearLocalStorage(['queryParamsForAfterLoginNav']);
      this.store.dispatch(resetProjectSourceStatus());
    }
  }

  goToLogin(): void {
    this.clearTokenIfExpired();
    this.store.dispatch(resetKhojiConfigs());
    this.router.navigate([environment.LOGIN_PAGE]);
  }
}
