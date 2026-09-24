/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Injectable } from '@angular/core';
import { Constants } from 'app/constants';
import { environment } from 'environments/environment';
import posthog from 'posthog-js';
import { ITrackingService } from './tracking-service.interface';
import { EventType } from './tracking.service';

@Injectable({
  providedIn: 'root'
})
export class PosthogService implements ITrackingService {
  eventProps: { [key: string]: any } = {};

  init() {
    if (!environment.TRACKING_API_TOKEN) {
      console.warn('[PostHog] TRACKING_API_TOKEN is empty — skipping init');
      return;
    }
    posthog.init(environment.TRACKING_API_TOKEN, {
      opt_in_site_apps: true,
      api_host: environment.TRACKING_API_HOST,
      autocapture: environment.TRACKING_AUTO_EVENTS,
      capture_pageview: environment.TRACKING_AUTO_EVENTS,
    });
  }
  
  private capture(event: string, props?: any) {
    props = {
      ...this.eventProps,
      ...props
    };

    if (!environment.docker) {
      console.log('___________________ posthog event captured ___________________');
      console.log('event:', event);
      console.log('props:', props);
    }

    return posthog.capture(event, props, { transport: 'XHR' });
  }

  captureNavigationStep(path: object | string, props?: object) {
    if (!environment.TRACKING_NAVIGATION_EVENTS) return;

    const _props = {
      ...props,
      EventType: EventType.NavigationStep
    };

    return this.capture(`${EventType.NavigationStep}: ${path}`, _props);
  }

  captureUserAction(action: string, props?: object) {
    if (!environment.TRACKING_USER_ACTION_EVENTS) return;

    const _props = {
      ...props,
      EventType: EventType.UserAction
    };

    return this.capture(`${EventType.UserAction}: ${action}`, _props);
  }

  captureUserActionResult(action: string, result: 'Success' | 'Failure', props?: object) {
    if (!environment.TRACKING_USER_ACTION_EVENTS) return;

    const _props = {
      ...props,
      EventType: EventType.UserActionResult,
      UserAction: action
    };

    return this.capture(`${EventType.UserActionResult}: ${action} > ${result}`, _props);
  }

  captureApplicationStatus(status: string, props?: object) {
    if (!environment.TRACKING_APPLICATION_STATUS_EVENTS) return;

    const _props = {
      ...props,
      EventType: EventType.ApplicationStatus
    };

    return this.capture(`${EventType.ApplicationStatus}: ${status}`, _props);
  }

  registerProperties(props: object, days?: number) {
    return posthog.register(props, days);
  }

  registerEventProperties(props: { [key: string]: any }) {
    this.eventProps = { ...this.eventProps, ...props };
  }

  captureUserIdentity(khojiUserId: string, userPropertiesToSet = {}, userPropertiesToSetOnce = {}) {
    if (!khojiUserId) return console.error('Critical! Member or Member ID not found!');

    const userTrackingStatus = localStorage.getItem(Constants.USER_TRACKING_STATUS);

    if (userTrackingStatus === khojiUserId) return;

    posthog.identify(khojiUserId, userPropertiesToSet, userPropertiesToSetOnce);
    localStorage.setItem(Constants.USER_TRACKING_STATUS, khojiUserId);
  }

  resetUserIdentity(reset = true) {
    localStorage.removeItem(Constants.USER_TRACKING_STATUS);
    return posthog.reset(reset);
  }

  isFeatureEnabled(feature: string) {
    return posthog.isFeatureEnabled(feature);
  }

  isFeatureEnabledAsync(feature: string) {
    return new Promise<boolean>((res, rej) => {
      posthog.onFeatureFlags(() => {
        if (posthog.isFeatureEnabled(feature)) {
          res(true);
        } else {
          rej(false);
        }
      });
    });
  }
}
