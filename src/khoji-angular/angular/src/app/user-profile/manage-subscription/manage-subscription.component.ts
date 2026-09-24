/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppState } from 'app/states/app-states';
import { fetchKhojiConfigs, fetchSubscriptionHostedPageDetail, resetPaymentHostedObject } from 'app/states/app.actions';
import { selectTranslation } from 'app/states/global-translations.selector';
import { combineLatest, Subscription } from 'rxjs';
import { selectGlobalConfig } from 'app/states/global-configs.selector';
import { chargeBeeService } from './chargebee.service';
import { RootNav, TrackingService } from 'app/services/tracking';
import { isGivenStringNullOrEmpty } from '../../shared/helper-functions';
import { ScriptLoaderService } from 'app/services/script-loader';

const chargeBeeScriptUrl = 'https://js.chargebee.com/v2/chargebee.js';

@Component({
  selector: 'khoji-manage-subscription',
  templateUrl: './manage-subscription.component.html',
  styleUrls: ['./manage-subscription.component.css']
})

export class ManageSubscriptionComponent implements OnInit, OnDestroy {

  translation: any;
  subscription = new Subscription();
  paymentSite: string;
  displayPlanDetails: boolean = false;

  planDetails: string[] = [
    'AI work log submission',
    'Send work log reminders',
    'Team productivity using AI',
    'Team work log analysis',
    'Timesheet management',
    'Export timesheet',
  ]

  constructor(
    private store: Store<AppState>, 
    private chargebeeService: chargeBeeService, 
    private trackingService: TrackingService,
    private scriptLoaderService: ScriptLoaderService,
  ) { }

  async ngOnInit() {
    await this.scriptLoaderService.loadScript(chargeBeeScriptUrl);
    this.trackingService.captureNavigationStep(RootNav.UserProfile.ManageSubscription);
    this.subscription.add(this.store.pipe(selectTranslation)
      .subscribe(translation => { this.translation = translation; }));

    const khojiConfigs$ = this.store.pipe(selectGlobalConfig);
    const hostedPageState$ = this.store.select('paymentHostedObject');

    // this subscription is specific to chargebee Payment
    this.subscription.add(
      combineLatest([khojiConfigs$, hostedPageState$]).subscribe(([khojiConfig, hostedPageObject]) => {
        this.paymentSite = khojiConfig.paymentSite;
        if (
          hostedPageObject.closedPopup === true &&
          hostedPageObject.hostedPage.body !== undefined &&
          hostedPageObject.hostedPage.body !== '' &&
          !isGivenStringNullOrEmpty(this.paymentSite)
        ) {
          const hostedPageBody = hostedPageObject.hostedPage.body;
          this.chargebeeService.openManageSubscriptonModal(this.paymentSite, hostedPageBody);
        }
      })
    );
  }

  onSubmit() {
    this.trackingService.captureNavigationStep(RootNav.UserProfile.ManageSubscription.ManageBillingModal);
    this.store.dispatch(fetchKhojiConfigs());
    this.store.dispatch(fetchSubscriptionHostedPageDetail());
  }

  ngOnDestroy() {
    this.chargebeeService.closeHostedPage(this.paymentSite);
    this.store.dispatch(resetPaymentHostedObject());
    this.subscription.unsubscribe();
  }
}
