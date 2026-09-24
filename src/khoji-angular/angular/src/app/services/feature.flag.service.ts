/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Constants } from 'app/constants';
import { AppState } from 'app/states/app-states';
import { selectEnableDashboardInsights, selectFeatureFlagMap } from 'app/states/global-configs.selector';
import { environment } from 'environments/environment';
import { first } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FeatureFlagService {
  environment = environment;
  featureFlagMap: any;
  enableDashboardInsights: boolean;


  constructor(private store: Store<AppState>) { }

  isEnabled(featureName: string) {
    return environment[featureName] === 'true';
  }

  static isEnabled(featureName: string) {
    return environment[featureName] === 'true';
  }

  isSubTaskDistributionEnabled(): boolean {
    const subs = this.store.pipe(selectFeatureFlagMap).subscribe(featureFlagMap => {
      this.featureFlagMap = featureFlagMap;
    });
    subs.unsubscribe();
    return this.featureFlagMap[Constants.SUBTASK_DISTRIBUTION_FEATURE];
  }

  isDashboardInsightsEnabled(): Promise<boolean> {
    return new Promise((resolve) => {
      this.store.pipe(selectEnableDashboardInsights, first()).subscribe(enableDashboardInsights => {
        resolve(enableDashboardInsights);
      })
    });
  }
}
