/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { createAction, props } from '@ngrx/store';
import { CreateInstancePayload } from 'app/shared/picklist/interfaces';
import { LoadingState } from 'app/states/app-states';
import { FeatureOption, InstanceDetails } from './user-profile.states';

export const submitDeleteAccount = createAction('[User Profile] SubmitDeleteAccount', props<{ reason: string; }>());
export const submitDeleteUserAccount = createAction('[User Profile] SubmitDeleteUserAccount');
export const submitDeleteApp = createAction('[User Profile] SubmitDeleteApp');
export const setDeleteAppLoadingState = createAction('[User Profile] SetDeleteAppLoadingState', props<{ loading: LoadingState }>());
export const setDeleteAccountLoadingState = createAction('[User Profile] SetDeleteAccountLoadingState', props<{ loading: LoadingState }>());
export const fetchAvailableFeatures = createAction("[Account Setup] FetchAvailableFeatures");
export const setAvailableFeatures = createAction('[Account Setup] SetAvailableFeatures',props<{ features: FeatureOption[] }>());
export const dispatchCreateInstance = createAction('[Account Setup] CreateInstance',props<{ instancePayload: CreateInstancePayload }>());
export const setInstanceDetails = createAction('[Account Setup] SetCreateInstance',props<{ instanceDetails: InstanceDetails }>());
export const dispatchFeaturesUnlock = createAction('[Account Setup] DispatchFeaturesUnlock',props<{ instanceId: number, featureId: number }>());
export const dispatchWorkLogCategorizationFeatureUnlock = createAction('[Account Setup] dispatchWorkLogCategorizationFeatureUnlock',props<{ instanceId: number, featureId: number }>());
export const setUnlockedFeatureResponse = createAction('[Account Setup] SetUnlockedFeatureResponse',props<{ unlockedFeatureResponse: any }>());
export const setSpaceId = createAction("[[User Profile] SetSpaceId", props<{ spaceId: number }>());
export const setInstanceId = createAction("[[User Profile] SetInstanceId", props<{ instanceId: number }>());
