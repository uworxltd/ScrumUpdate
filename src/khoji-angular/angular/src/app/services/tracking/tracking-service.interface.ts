/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { CaptureResult } from 'posthog-js';
export interface ITrackingService {
  init(): void;
  captureNavigationStep(path: object | string, props?: object): void | CaptureResult;
  captureUserAction(action: object | string, props?: object): void | CaptureResult;
  captureUserActionResult(action: object | string, result: 'Success' | 'Failure', props?: object): void | CaptureResult;
  captureApplicationStatus(status: object | string, props?: object): void | CaptureResult;
  registerProperties(props: object, days?: number): void;
  registerEventProperties(props: { [key: string]: any }): void;
  captureUserIdentity(khojiUserId: string): void;
  resetUserIdentity(reset?: boolean): void;
  isFeatureEnabled(feature: string): boolean;
  isFeatureEnabledAsync(feature: string): Promise<boolean>;
}
