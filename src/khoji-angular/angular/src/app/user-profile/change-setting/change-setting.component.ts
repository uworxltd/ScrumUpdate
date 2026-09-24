/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, combineLatest } from 'rxjs';
import { Store } from '@ngrx/store';
import { AppState } from 'app/states/app-states';
import { selectTranslation } from 'app/states/global-translations.selector';
import { fetchKhojiUserProfile, updateWorklogEmailSetting } from 'app/states/app.actions';
import { selectKhojiUserProfile, selectUserSetting } from '../state/user-profile.selectors';
import { Constants } from 'app/constants';
import { FeatureFlagService } from '../../services/feature.flag.service';
import { TrackingService, UserActions } from 'app/services/tracking';
@Component({
  selector: 'khoji-change-setting',
  templateUrl: './change-setting.component.html',
})
export class ChangeSettingComponent implements OnInit, OnDestroy {

  translation: any;
  disabledEmailCheckbox: boolean = true;
  subscription = new Subscription();
  emailCheckbox: boolean;
  selectedCategory: any = {};
  initialCategory: string = null;
  categories: any[] = [];

  constructor(private store: Store<AppState>, private flag: FeatureFlagService, private trackingService: TrackingService) {
  }

  ngOnInit(): void {
    this.store.dispatch(fetchKhojiUserProfile());
    const $userProfileState = this.store.pipe(selectKhojiUserProfile);
    const $translations = this.store.pipe(selectTranslation);
    this.subscription.add(combineLatest([$translations, $userProfileState]).subscribe(data => {
      this.translation = data[0];
      this.populateEmailFrequencyCategories();
      this.emailCheckbox = data[1].worklogEmailEnabled;
      this.initialCategory = data[1].worklogEmailFrequency ? data[1].worklogEmailFrequency : Constants.DAILY;
      this.populateFrequency();
    }));
  }

  populateFrequency() {
    if (this.initialCategory) {
      if (this.initialCategory == Constants.DAILY) {
        this.selectedCategory = this.categories[0];
      }
      else if (this.initialCategory == Constants.WEEKLY) {
        this.selectedCategory = this.categories[1];
      }
      else if (this.initialCategory == Constants.MONTHLY) {
        this.selectedCategory = this.categories[2];
      }
    }
  }

  populateEmailFrequencyCategories() {
    this.categories = [];
    this.categories.push({ name: this.translation?.userProfile.settings.emailFrequencies.daily, key: Constants.DAILY });
    this.categories.push({ name: this.translation?.userProfile.settings.emailFrequencies.weekly, key: Constants.WEEKLY });
    this.categories.push({ name: this.translation?.userProfile.settings.emailFrequencies.monthly, key: Constants.MONTHLY });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onSubmit(): void {
    this.disabledEmailCheckbox = true;
    this.trackingService.captureUserAction(UserActions.Profile.Settings);
    this.store.dispatch(updateWorklogEmailSetting({ emailWorkLog: this.emailCheckbox, emailFrequency: this.selectedCategory?.key }));
  }

  updateEmailWorklog(check): void {
    this.trackingService.captureUserAction(UserActions.Profile.Settings.EmailSubscription, { check });
    this.disabledEmailCheckbox = false;
  }

  trackFrequency(event) {
    this.trackingService.captureUserAction(UserActions.Profile.Settings.EmailSubscriptionFrequency);
  }

  disableButton() {
    return this.disabledEmailCheckbox && (this.selectedCategory?.key == this.initialCategory);
  }
}
