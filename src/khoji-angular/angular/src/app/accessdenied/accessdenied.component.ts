/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AppState } from 'app/states/app-states';
import { fetchTranslations } from 'app/states/app.actions';
import { selectTranslation } from 'app/states/global-translations.selector';
import { Subscription } from 'rxjs';
import { environment } from 'environments/environment';
import { RouteHistoryService } from 'app/services/route-history.service';
import { Constants } from 'app/constants';
import { clearStorageExcept } from 'app/shared/helper-functions';

@Component({
  selector: 'app-access-denied',
  templateUrl: './accessdenied.component.html',
  styleUrls: ["./accessdenied.component.scss"]
})
export class AccessdeniedComponent implements OnInit, OnDestroy {

  translation: any;
  subscription = new Subscription();

  constructor(private store: Store<AppState>, private rhs: RouteHistoryService, private router: Router) { }

  ngOnInit(): void {
    clearStorageExcept(localStorage, [Constants.TOUR_GEN_AI_WORKLOG_TABLE, Constants.TOUR_GEN_AI_WORKLOG, Constants.IS_HOURS_STORAGE_KEY]);
    sessionStorage.clear();
    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe(translation => { this.translation = translation; })
    );

    if (!this.translation) {
      this.store.dispatch(fetchTranslations({ locale: 'en_GB' }));
      this.subscription.add(
        this.store.pipe(selectTranslation).subscribe(translation => { this.translation = translation; })
      );
    }
  }

  goToLogin(): void {
    this.router.navigate([environment.LOGIN_PAGE]);
  }

  ngOnDestroy(): void {
    this.rhs.disbleAccessDenidedTemplate();
    this.subscription.unsubscribe();
  }
}
