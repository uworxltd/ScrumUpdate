/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabPanel, TabViewModule } from 'primeng/tabview';
import { DeleteAppComponent } from 'app/user-profile/delete-app/delete-app.component';
import { IntegrationsComponent } from '../integrations/integrations.component';
import { WorklogSettingsComponent } from 'app/team-worklog/worklog-settings/worklog-settings.component';
import { FeatureFlagsTestComponent } from './feature-flags-test/feature-flags-test.component';
import { AppState, InstanceFeaturesStatus, UserAccessLevelsStatus } from 'app/states/app-states';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { selectAccessLevelsStatus, selectInstanceFeaturesStatus } from 'app/user-profile/state/user-profile.selectors';
import { MS_OAUTH_ENABLED, wait } from 'app/shared/helper-functions';
import { TooltipModule } from 'primeng/tooltip';
import { selectTranslation } from 'app/states/global-translations.selector';
import { UnleashService } from 'app/services/unleash.service';
import { Constants } from 'app/constants';

@Component({
  selector: 'khoji-manage-settings',
  standalone: true,
  imports: [CommonModule, TabViewModule, DeleteAppComponent, IntegrationsComponent, WorklogSettingsComponent, FeatureFlagsTestComponent, TooltipModule],
  templateUrl: './manage-settings.component.html',
  styleUrls: ['./manage-settings.component.scss']
})
export class ManageSettingsComponent implements OnInit, OnDestroy {
  subscription = new Subscription();
  translation: any;
  activeIndex = 0;
  accessLevelsStatus: UserAccessLevelsStatus;
  instanceFeaturesStatus: InstanceFeaturesStatus;
  worklogInsightsFeatureEnabled = false;
  msOAuthEnabled = MS_OAUTH_ENABLED;
  showFeatureFlagsDevTab = false; // Set to true to show Feature Flags test panel

  constructor(
    private store: Store<AppState>,
    private unleashService: UnleashService
  ) {}

  ngOnInit(): void {
    const translation$ = this.store.pipe(selectTranslation);
    const accessLevelsStatus$ = this.store.pipe(selectAccessLevelsStatus);
    const instanceFeaturesStatus$ = this.store.pipe(selectInstanceFeaturesStatus);

    this.subscription.add(translation$.subscribe((data) => (this.translation = data)));

    this.subscription.add(
      accessLevelsStatus$.subscribe((data) => {
        this.accessLevelsStatus = data;

        if (!data.hasTenantAdminAccess) {
          this.activeIndex = 1;
        }
      })
    );

    this.subscription.add(
      instanceFeaturesStatus$.subscribe((data) => {
        this.instanceFeaturesStatus = data;
      })
    );

    // Check worklog-insights feature flag
    this.subscription.add(
      this.unleashService.isFeatureEnabled(Constants.UNLEASH_FEATURE_FLAG_MY_WORKLOGS, this.worklogInsightsFeatureEnabled)?.subscribe((enabled) => {
        this.worklogInsightsFeatureEnabled = enabled;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
