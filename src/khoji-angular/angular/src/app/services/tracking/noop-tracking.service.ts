/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Injectable } from '@angular/core';
import { ITrackingService } from './tracking-service.interface';
import { UserProfileState } from 'app/user-profile/state/user-profile.states';

@Injectable({
  providedIn: 'root'
})
export class NoOpTrackingService implements ITrackingService {
  init(): void {}

  captureNavigationStep(path: object | string, props?: object) {}

  captureUserAction(action: string, props?: object) {}

  captureUserActionResult(action: string, result: 'Success' | 'Failure', props?: object) {}

  captureApplicationStatus(status: string, props?: object) {}

  registerProperties(props: object, days?: number) {}

  registerEventProperties(props: { [key: string]: any }) {}

  resetUserIdentity(reset?: boolean) {}

  isFeatureEnabled(feature: string) {
    return false;
  }

  isFeatureEnabledAsync(feature: string) {
    return new Promise<boolean>((res, rej) => {
      res(false);
    });
  }

  captureUserIdentity(khojiUserId: string) {}
}
