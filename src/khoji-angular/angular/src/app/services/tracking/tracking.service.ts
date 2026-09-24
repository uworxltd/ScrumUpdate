/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { ITrackingService } from './tracking-service.interface';
import { NoOpTrackingService } from './noop-tracking.service';
import { PosthogService } from './posthog.service';
import { UnleashService } from 'app/services/unleash.service';

const ANGULAR_POSTHOG_FLAG = 'angular-posthog';

export enum EventType {
  NavigationStep = 'Nav',
  UserAction = 'Act',
  UserActionResult = 'Res',
  ApplicationStatus = 'Sts'
}

@Injectable({
  providedIn: 'root'
})
export class TrackingService implements ITrackingService {
  private trackingServiceImpl: ITrackingService;

  constructor(
    private posthogService: PosthogService,
    private noopTrackingService: NoOpTrackingService,
    private unleashService: UnleashService
  ) {
    this.trackingServiceImpl = this.noopTrackingService;
  }

  init() {
    const token = environment.TRACKING_API_TOKEN;
    if (!token) {
      console.warn('[Tracking] PostHog disabled — TRACKING_API_TOKEN is not set');
      return;
    }

    if (!this.unleashService.isEnabled(ANGULAR_POSTHOG_FLAG)) {
      console.warn('[Tracking] PostHog disabled — angular-posthog flag is OFF');
      return;
    }

    this.trackingServiceImpl = this.posthogService;
    this.trackingServiceImpl.init();
  }

  captureNavigationStep(path: object | string, props?: object) {
    return this.trackingServiceImpl.captureNavigationStep(path, props);
  }

  captureUserAction(action: object | string, props?: object) {
    return this.trackingServiceImpl.captureUserAction(action, props);
  }

  captureUserActionResult(action: object | string, result: 'Success' | 'Failure', props?: object) {
    return this.trackingServiceImpl.captureUserActionResult(action, result, props);
  }

  captureApplicationStatus(status: object | string, props?: object) {
    return this.trackingServiceImpl.captureApplicationStatus(status, props);
  }

  registerProperties(props: object, days?: number) {
    return this.trackingServiceImpl.registerProperties(props, days);
  }

  registerEventProperties(props: { [key: string]: any }): void {
    return this.trackingServiceImpl.registerEventProperties(props);
  }

  captureUserIdentity(khojiUserId: string) {
    return this.trackingServiceImpl.captureUserIdentity(khojiUserId);
  }

  resetUserIdentity(reset?: boolean) {
    return this.trackingServiceImpl.resetUserIdentity(reset);
  }

  isFeatureEnabled(feature: string) {
    return this.trackingServiceImpl.isFeatureEnabled(feature);
  }

  isFeatureEnabledAsync(feature: string) {
    return this.trackingServiceImpl.isFeatureEnabledAsync(feature);
  }
}
