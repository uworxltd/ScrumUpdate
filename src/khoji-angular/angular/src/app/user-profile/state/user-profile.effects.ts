/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { environment } from 'app/../environments/environment';
import { Constants } from 'app/constants';
import { HttpErrorInterceptor } from 'app/interceptors/http.interceptor';
import { HttpService } from 'app/services/common/http.service';
import { KhojiSpinnerService } from 'app/services/spinner.service';
import { AdminActions, TrackingService, UserActions } from 'app/services/tracking';
import { getCurrentWorkspace, observableToPromise } from 'app/shared/helper-functions';
import { CreateInstancePayload } from 'app/shared/picklist/interfaces';
import { LoadingState } from 'app/states/app-states';
import * as actions from 'app/states/app.actions';
import { discardSentCallsAfterNavigate, fetchError, fetchWorkSpaces, setKhojiUserProfile, setUserSettingLoadingState } from 'app/states/app.actions';
import { selectTranslation } from 'app/states/global-translations.selector';
import { MessageService } from 'primeng/api';
import { Observable, of } from 'rxjs';
import { catchError, concatMap, map, mergeMap, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { dispatchCreateInstance, dispatchFeaturesUnlock, dispatchWorkLogCategorizationFeatureUnlock, fetchAvailableFeatures, setAvailableFeatures, setDeleteAccountLoadingState, setDeleteAppLoadingState, setInstanceDetails, setUnlockedFeatureResponse, submitDeleteApp, submitDeleteUserAccount } from './user-profile.actions';
import { selectUserProfile } from './user-profile.selectors';
import { AccessibleResource, FeatureOption, Features, Instance, InstanceDetails, KhojiUserProfile, UserEmailSettings, UserProfileState, Workspace } from './user-profile.states';
import { UnleashService } from 'app/services/unleash.service';

@Injectable()
export class UserProfileEffect {
  constructor(
    private store: Store,
    private http: HttpService,
    private actions$: Actions,
    private messageService: MessageService,
    private spinner: KhojiSpinnerService,
    private trackingService: TrackingService,
    private router: Router,
    private unleashService: UnleashService,
  ) { }

  editUserEffect$ = createEffect(() => this.actions$.pipe(
    ofType(actions.updateProfile),
    mergeMap(action => this.dispatchUpdateProfileRequest(action).pipe(map(res => this.setUpdatedUserProfile(res))))
  ), { dispatch: false });

  /**
   * User settings contains the information of
   * id (settings id)
   * emailWorklogLog (email subscription)
   * admin (true or false)
   * allowTeamManagement
   * user (complete object)
   * allowAllocationManagement
   */
  fetchUserSetting$ = createEffect(() =>
    this.actions$.pipe(
      ofType(),
      concatMap(action => of(action).pipe(withLatestFrom(this.store.pipe(selectUserProfile)))),
      mergeMap(([action, profile]) =>
        this.fetchUserSetting(action, profile).pipe(
          map((res) => this.dispatchUserSetting(res))
        )
      )
    )
  );


  fetchWorkSpaces$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.fetchWorkSpaces, actions.fetchWorkSpacesAndNavigateToInstance),
      mergeMap(action => this._fetchWorkSpaces(action).pipe(
        map(res => this.dispatchWorkSpaces(res, action))
      ))
    )
  );

  fetchAccessibleResources$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.fetchAccessibleResources),
      mergeMap(action => this._fetchAccessibleResources(action).pipe(
        map(res => this.dispatchAccessibleResources(res))
      ))
    )
  );


  fetchSubscriptionDetail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.fetchSubscriptionHostedPageDetail),
      mergeMap((action) =>
        this.fetchSubscriptionDetail(action).pipe(
          map((res) => this.dispatchSubscriptionDetail(res))
        )
      )
    )
  );

  fetchHostedPageObject$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.fetchHostedPageObject),
      mergeMap((action) =>
        this.fetchHostedPage(action.signupCode).pipe(
          map((res) => this.dispatchHostedPage(res))
        )
      )
    )
  );

  updateWorkLogEmailsetting$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(actions.updateWorklogEmailSetting),
        mergeMap((action) =>
          this.updateWorkLogEmailsetting(action).pipe(
            map((res) =>
              this.setUpdatedWorklogEmailSetting(res, actions.updateWorkLogSettingLoadingState)
            )
          )
        )
      ),
    { dispatch: false }
  );

  requestAccess$ = createEffect(() => this.actions$.pipe(
    ofType(actions.requestAccess),
    mergeMap((action) => this.requestAccess(action).pipe(map(res => this.dispatchRequestAccessResponse(res))))
  ));

  fetchAvailableFeatures$ = createEffect(() =>
    this.actions$.pipe(
      ofType(fetchAvailableFeatures),
      mergeMap(
        (action) => this.fetchAvailableFeatures(action).pipe(
          map((res) => this.setAvailableFeatures(res))
        )
      )
    )
  );

  dispatchCreateInstance$ = createEffect(() =>
    this.actions$.pipe(
      ofType(dispatchCreateInstance),
      mergeMap(
        (action) => this._dispatchCreateInstance(action).pipe(
          map((res) => this.refetchInstance(res)),
          map((res) => this._setInstanceDetails(res))
        )
      )
    )
  );

  refetchInstance(res) {
    if (res) this.store.dispatch(actions.fetchWorkSpaces());
    return res;
  }

  dispatchFeaturesUnlock$ = createEffect(() =>
    this.actions$.pipe(
      ofType(dispatchFeaturesUnlock, dispatchWorkLogCategorizationFeatureUnlock),
      mergeMap(
        (action) => this._dispatchFeaturesUnlock(action)
          .pipe(
            map((res) => this._setUnlockedFeatureDetails(action, res))
          )
      )
    )
  );

  fetchKhojiUserProfile$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.fetchKhojiUserProfile),
      mergeMap(
        (action) => this.fetchKhojiUserProfile(action)
          .pipe(
            map((res) => this.dispatchKhojiUserProfile(res))
          )
      )
    )
  );

  fetchInstanceDetails$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.fetchInstanceDetails),
      mergeMap(
        (action) => this.fetchInstanceDetails(action)
          .pipe(
            map((res) => this._setInstanceDetails(res))
          )
      )
    )
  );

  inviteActionEffect$ = createEffect(() => this.actions$.pipe(
    ofType(actions.instanceInviteAction),
    mergeMap((action) => this.dispatchInstanceInviteAction(action).pipe(map((res) => this.updateLoadingStateForInstanceInviteAction(res))))
  ));

  updateLoadingStateForInstanceInviteAction(res: Record<string, string>): any {
    if (res === undefined || res.type === fetchError.type) {
      return fetchError();
    }

    this.store.dispatch(fetchWorkSpaces());
    return actions.setInstanceInviteActionLoadingState({ loadingState: LoadingState.Done });
  }

  dispatchInstanceInviteAction(action: any) {
    this.store.dispatch(actions.setInstanceInviteActionLoadingState({ loadingState: LoadingState.Loading }));
    return <Observable<Record<string, string>>>this.http.apiPostRequest(environment.INSTANCE_INVITE_ACTION, action.inviteAction).pipe(
      takeUntil(
        this.actions$.pipe(
          ofType(
            actions.discardSentCallsAfterNavigate
          )
        )
      ),
      catchError((error) => {
        this.store.dispatch(actions.setInstanceInviteActionLoadingState({ loadingState: LoadingState.Error }));
        if (error && error.status === 406) {
          this.router.navigate(['space', getCurrentWorkspace(), 'invite-error']);
        }
        return of(fetchError());
      })
    )
  }

  dispatchUpdateProfileRequest(action: any) {
    this.spinner.show();
    this.store.dispatch(actions.setupdateProfileLoadingState({ loadingState: LoadingState.Loading }));
    const url = environment.UPDATE_USER_API;
    const reqBody = action.updatedUser;
    return <Observable<string[]>>this.http.apiPostRequest(url, reqBody, false)
      .pipe(
        takeUntil(
          this.actions$.pipe(
            ofType(
              actions.discardSentCallsAfterNavigate
            )
          )
        ),
        catchError((error) => {
          this.store.dispatch(actions.setupdateProfileLoadingState({ loadingState: LoadingState.Error }));
          this.spinner.hide();
          return of(this.showToast('Error!', 'Changes could not be saved.', 'error'));
        }));
  }

  setUpdatedUserProfile(res: any) {
    if (res === undefined) {
      this.store.dispatch(actions.setupdateProfileLoadingState({ loadingState: LoadingState.Error }));
      this.trackingService.captureUserActionResult(UserActions.Profile.ProfileSettings, "Failure");
      return of(fetchError());
    }

    this.store.dispatch(actions.fetchUserSetting({ force: true }));
    this.spinner.hide();
    this.store.dispatch(actions.setupdateProfileLoadingState({ loadingState: LoadingState.Done }));
    this.trackingService.captureUserActionResult(UserActions.Profile.ProfileSettings, "Success");
    return this.showToast("Success!", "Changes were saved successfully.", 'success');
  }

  static fetchingUserSetting = false;

  fetchUserSetting(action: any, profile: UserProfileState): Observable<void | UserProfileState> {
    //This is done to provide the multiple calls with 0 time difference.
    if (UserProfileEffect.fetchingUserSetting) {
      return of(undefined);
    }
    UserProfileEffect.fetchingUserSetting = true;
    const { force } = action;
    const { lastFetched } = profile;


    const diff = () => new Date().getTime() - lastFetched; // milliseconds
    const expired = () => diff() > Constants.DASHBOARD_CACHE_DURATION_SECONDS * 1000; // milliseconds

    if (profile.userSettings.user && !force && !expired()) {
      return of(profile);
    }

    this.spinner.show();
    const url = environment.USER_DASHBOARD;
    this.store.dispatch(
      actions.setUserSettingLoadingState({ loadingState: LoadingState.Loading })
    );

    return this.http.apiGetRequest<UserProfileState>(url).pipe(
      takeUntil(
        this.actions$.pipe(
          ofType(
            actions.discardSentCallsAfterNavigate
          )
        )
      ),
      catchError((error) => {
        this.spinner.hide();
        return of(
          this.store.dispatch(
            actions.setUserSettingLoadingState({
              loadingState: LoadingState.Error,
            })
          )
        );
      }),
      map(response => response ? ({ ...response, lastFetched: new Date().getTime() }) : response),
      tap(response => {
        if (response) {
          //this.trackingService.captureUserIdentity(response);
        }
      })
    );
  }

  fetchHostedPage(signupCode: any): Observable<any> {
    this.spinner.show();
    const url = environment.GET_CHARGEBEE_HOSTEDPAGE_KBS + '?code=' + signupCode;

    return <any>this.http.apiGetRequest(url).pipe(
      takeUntil(
        this.actions$.pipe(
          ofType(
            actions.discardSentCallsAfterNavigate
          )
        )
      ),
      catchError((error) => {
        return of(
          this.showToast('Error!', 'Failed to contact payment provider. Please try again later or contact Khoji support.', 'error')
        );
      })
    );
  }

  fetchSubscriptionDetail(action: any): Observable<any> {
    this.spinner.show();
    const url = environment.PAYMENT_HOSTED_PAGE;
    this.store.dispatch(
      actions.setSubscriptionHostedPageLoadingState({ loadingState: LoadingState.Loading })
    );

    return <any>this.http.apiGetRequest(url).pipe(
      takeUntil(
        this.actions$.pipe(
          ofType(
            actions.discardSentCallsAfterNavigate
          )
        )
      ),
      catchError((error) => {
        this.store.dispatch(
          actions.setSubscriptionHostedPageLoadingState({
            loadingState: LoadingState.Error,
          })
        );
        return of(
          this.showToast('Error!', 'Failed to fetch subscription information.', 'error')
        );
      })
    );
  }

  _fetchWorkSpaces(action): Observable<Workspace[]> {
    const url = environment.WORKSPACES;
    this.store.dispatch(
      actions.setWorkspacesLoadingState({ loadingState: LoadingState.Loading })
    );

    return <Observable<Workspace[]>>this.http.apiGetRequest(url).pipe(
      takeUntil(
        this.actions$.pipe(
          ofType(actions.discardSentCallsAfterNavigate, actions.cancelWorkspacesRequest),
          // This is done so that tenantId gets populated correctly in the session storage for future calls (refactor later with a better approach)
          tap(() => {
            this.store.dispatch(actions.setWorkspacesLoadingState({ loadingState: LoadingState.Done }));
          })
        )
      ),
      catchError((error) => {
        this.store.dispatch(actions.setWorkspacesLoadingState({ loadingState: LoadingState.Error }));
        return of(
          this.showToast('Error!', 'Unable to fetch work spaces.', 'error')
        );
      })
    );
  }

  dispatchWorkSpaces(response, action) {
    if (!response) {
      return fetchError();
    }
    this.store.dispatch(actions.setWorkSpaces({ workspace: response }));
    this.store.dispatch(
      actions.setWorkspacesLoadingState({ loadingState: LoadingState.Done })
    );

    if (action.type === actions.fetchWorkSpacesAndNavigateToInstance.type) {
      const spaceId = getCurrentWorkspace();
      const selectedWorkSpace: Workspace = response.find(w => w.id === Number(spaceId));
      const alreadyCreatedInstance = selectedWorkSpace.instances.find(i => i.tenantId === action.tenantId);

      this.getFeatureUrl(alreadyCreatedInstance).then(featureUrl => {
        this.router.navigate(['space', selectedWorkSpace.id, 'instance', alreadyCreatedInstance.id, 'feature', featureUrl]);
      });
    }

    return actions.dummyAction();
  }

  async getFeatureUrl(instance: Instance): Promise<string> {
    const enabledFeatures = await observableToPromise(this.unleashService.getEnabledFeatures());

    const myWorkFeatures = [Constants.UNLEASH_FEATURE_FLAG_MY_WORKLOGS, Constants.UNLEASH_FEATURE_FLAG_SCRUM_UPDATES];
    const TeamViewFeatures = [Constants.UNLEASH_FEATURE_FLAG_WORKLOG_INSIGHTS, Constants.UNLEASH_FEATURE_FLAG_TEAM_PULSE, Constants.UNLEASH_FEATURE_FLAG_STANDUP_BOARD];
    const myWorkFeaturesEnabled = enabledFeatures.filter(feature => myWorkFeatures.includes(feature.name)).map(feature => feature.name);
    const teamViewFeaturesEnabled = enabledFeatures.filter(feature => TeamViewFeatures.includes(feature.name)).map(feature => feature.name);

    const isMyWorkFeature = instance.instanceFeatures.find(feature => feature.id == Features.MY_WORK);
    const isTeamViewFeature = instance.instanceFeatures.find(feature => feature.id == Features.TEAM_VIEW);

    if (isMyWorkFeature && myWorkFeaturesEnabled.length > 0) {
      return 'my-work';
    }
    else if (isTeamViewFeature && teamViewFeaturesEnabled.length > 0) {
      return 'team-view';
    }

    return 'team-view';
  }

  _fetchAccessibleResources(action): Observable<AccessibleResource> {
    const url = environment.ACCESSIBLE_RESOURCES;
    this.store.dispatch(
      actions.setAccessibleResourcesLoadingState({ loadingState: LoadingState.Loading })
    );

    return <Observable<AccessibleResource>>this.http.apiGetRequest(url).pipe(
      takeUntil(
        this.actions$.pipe(
          ofType(
            actions.discardSentCallsAfterNavigate
          )
        )
      ),
      catchError((error) => {
        this.store.dispatch(actions.setAccessibleResourcesLoadingState({ loadingState: LoadingState.Error }));
        return of(
          this.showToast('Error!', 'Unable to fetch accessible resources.', 'error')
        );
      })
    );
  }

  dispatchAccessibleResources(response: AccessibleResource) {
    if (!response) {
      return fetchError();
    }
    this.store.dispatch(
      actions.setAccessibleResourcesLoadingState({ loadingState: LoadingState.Done })
    );
    return actions.setAccessibleResources({ accessibleResources: response });
  }



  dispatchUserSetting(response: void | UserProfileState) {
    this.spinner.hide();

    if (!response) {
      return fetchError();
    }


    this.store.dispatch(
      actions.setUserSettingLoadingState({ loadingState: LoadingState.Done })
    );

    localStorage.setItem(Constants.USERNAME_SESSION_KEY, response.userSettings.user.member.memberEmail);

    UserProfileEffect.fetchingUserSetting = false;
    return actions.setUserSetting({ userProfile: response });
  }

  dispatchSubscriptionDetail(response: any) {
    this.spinner.hide();
    if (response === undefined) {
      return fetchError();
    }
    this.store.dispatch(
      actions.setSubscriptionHostedPageLoadingState({ loadingState: LoadingState.Done })
    );
    return actions.setPaymentHostedPage({ paymentHostedObject: response });
  }

  dispatchHostedPage(response: any) {
    this.spinner.hide();
    if (response === undefined) {
      return fetchError();
    }

    return actions.setPaymentHostedPage({ paymentHostedObject: response });
  }


  updateCurrentPassword(action: any): Observable<any> {
    this.store.dispatch(
      actions.setChangePasswordLoadingState({
        loadingState: LoadingState.Loading,
      })
    );
    var url = environment.UPDATE_CHANGED_PASSWORD;
    const params = {
      currentPassword: action.info.oldPassword,
      newPassword: action.info.newPassword,
    };

    return <any>this.http.apiPostRequest(url, params, false).pipe(
      takeUntil(
        this.actions$.pipe(
          ofType(
            actions.discardSentCallsAfterNavigate
          )
        )
      ),
      catchError((error) => {
        let translation: any;
        this.store.pipe(selectTranslation).subscribe((data) => (translation = data));
        this.store.dispatch(
          actions.setChangePasswordLoadingState({
            loadingState: LoadingState.Error,
          })
        );

        if (error === undefined) {
          return of(
            this.showToast('Error!', translation.updatePassword.userOffline, 'error')
          );
        }
        else if (error.status !== 401) {
          return of(
            this.showToast('Error!', translation.updatePassword.incorrectCurrentPassword, 'error')
          );
        }
      })
    );
  }

  updateWorkLogEmailsetting(action: any): Observable<any> {
    this.store.dispatch(
      actions.updateWorkLogSettingLoadingState({ loadingState: LoadingState.Loading, })
    );

    var url = environment.UPDATE_USER_EMAIL_SETTINGS_API;

    // let userSettings: UserSetting;
    // this.store.pipe(selectUserSetting).subscribe((data: UserSetting) => (userSettings = data));
    // let cloneUser = Object.assign({}, userSettings.user);
    // // TODO Verify
    // // @ts-ignore
    // cloneUser = { ...cloneUser, emailWorkLog: String(userSettings.emailWorkLog), emailFrequency: action.emailFrequency };
    const userSettings: UserEmailSettings = {
      worklogEmailEnabled: action.emailWorkLog,
      worklogEmailFrequency: action.emailFrequency,
      id: 0
    };
    return <any>this.http.apiPostRequest(url, userSettings, false).pipe(
      takeUntil(
        this.actions$.pipe(
          ofType(
            actions.discardSentCallsAfterNavigate
          )
        )
      ),
      catchError((error) => {
        this.store.dispatch(
          actions.updateWorkLogSettingLoadingState({
            loadingState: LoadingState.Error,
          })
        );
        return of(this.showToast('Error!', 'Changes could not be saved.', 'error'));
      })
    );
  }

  setUpdatedUserPassword(res: any, loading: any) {
    if (res === undefined) {
      this.trackingService.captureUserActionResult(UserActions.Profile.ChangePassword, "Failure");
      return fetchError();
    }
    this.trackingService.captureUserActionResult(UserActions.Profile.ChangePassword, "Success");
    this.showToast('Success!', 'Changes were saved successfully.', 'success');
    this.store.dispatch(loading({ loadingState: LoadingState.Done }));
    this.store.dispatch(actions.fetchUserSetting({ force: true }));
  }

  setUpdatedWorklogEmailSetting(res: any, loading: any) {
    if (res === undefined) {
      this.trackingService.captureUserActionResult(UserActions.Profile.Settings, "Failure");
      return fetchError();
    }
    this.trackingService.captureUserActionResult(UserActions.Profile.Settings, "Success");
    this.showToast('Success!', 'Changes were saved successfully.', 'success');
    this.store.dispatch(loading({ loadingState: LoadingState.Done }));
    this.store.dispatch(actions.fetchKhojiUserProfile());
  }


  requestAccess(action: any) {
    const url = environment.REQUEST_ACCESS_API;
    const token = action.token;
    this.store.dispatch(actions.setRequestAccessLoadingState({ loadingState: LoadingState.Loading }));
    return <Observable<any>>this.http.apiPostRequest(url, token, false)
      .pipe(
        takeUntil(
          this.actions$.pipe(
            ofType(
              actions.discardSentCallsAfterNavigate
            )
          )
        ),
        catchError((error) => {
          this.spinner.hide();
          this.store.dispatch(actions.setRequestAccessLoadingState({ loadingState: LoadingState.Error }));
          return of(this.showToast('Error!', 'Request Access failed.', 'error'));
        }));
  }

  dispatchRequestAccessResponse(response) {
    if (!response) {
      this.store.dispatch(actions.setRequestAccessLoadingState({ loadingState: LoadingState.Error }));
      return fetchError();
    }

    this.showToast("Success!", "Access requested successfully.", 'success');
    sessionStorage.removeItem(HttpErrorInterceptor.REQUESTED_INFO);
    return actions.setRequestAccessLoadingState({ loadingState: LoadingState.Done });
  }

  deleteAccountEffect$ = createEffect(() => this.actions$.pipe(
    ofType(submitDeleteUserAccount),
    mergeMap(action => this.submitDeleteAccount(action).pipe(map(res => this.dispatchDeleteAccount(res, action))))
  ), { dispatch: false });

  deleteAppEffect$ = createEffect(() => this.actions$.pipe(
    ofType(submitDeleteApp),
    mergeMap(action => this.submitDeleteApp(action).pipe(map(res => this.dispatchDeleteApp(res))))
  ), { dispatch: false });

  submitDeleteApp(action: any) {
    this.spinner.show();
    this.store.dispatch(setDeleteAppLoadingState({ loading: LoadingState.Loading }));
    const url = environment.DELETE_APP_API;
    return <Observable<any>>this.http.apiDeleteRequest(url, '', false)
      .pipe(
        takeUntil(
          this.actions$.pipe(
            ofType(
              actions.discardSentCallsAfterNavigate
            )
          )
        ),
        catchError((error) => {
          this.store.dispatch(setDeleteAppLoadingState({ loading: LoadingState.Error }));
          return of(this.showToast('Error!', 'Error while submitting request. Please try again later', 'error'));
        }));
  }

  dispatchDeleteApp(res: any) {
    this.spinner.hide();

    if (res === undefined) {
      this.trackingService.captureUserActionResult(UserActions.AppSettings.DeleteApp, 'Failure');
      this.store.dispatch(setDeleteAppLoadingState({ loading: LoadingState.Error }));
      return of(fetchError());
    }

    sessionStorage.removeItem(Constants.INSTANCE_ID);
    this.store.dispatch(fetchWorkSpaces());
    this.trackingService.captureUserActionResult(UserActions.AppSettings.DeleteApp, 'Success');
    this.store.dispatch(setDeleteAppLoadingState({ loading: LoadingState.Done }));
    return setDeleteAppLoadingState({ loading: LoadingState.Done });
  }

  submitDeleteAccount(action: any) {
    this.spinner.show();
    this.store.dispatch(setDeleteAccountLoadingState({ loading: LoadingState.Loading }));
    const url = environment.DELETE_USER_ACCOUNT_API;
    //const leavingReason = action.reason;
    return <Observable<any>>this.http.apiDeleteRequest(url, '', false)
      .pipe(
        takeUntil(
          this.actions$.pipe(
            ofType(
              actions.discardSentCallsAfterNavigate
            )
          )
        ),
        catchError((error) => {
          this.store.dispatch(setDeleteAccountLoadingState({ loading: LoadingState.Error }));
          return of(this.showToast('Error!', 'Error while submitting request. Please try again later', 'error'));
        }));
  }

  dispatchDeleteAccount(res: any, action: any) {
    this.spinner.hide();

    if (res === undefined) {
      this.store.dispatch(setDeleteAccountLoadingState({ loading: LoadingState.Error }));
      this.trackingService.captureUserActionResult(AdminActions.AccountSettings.DeleteAccount, 'Failure');
      return of(fetchError());
    }

    const reason = action.reason;
    this.trackingService.captureUserActionResult(AdminActions.AccountSettings.DeleteAccount, 'Success', { reason });
    this.store.dispatch(setDeleteAccountLoadingState({ loading: LoadingState.Done }));
    return actions.dummyAction();
  }

  fetchAvailableFeatures(action: any) {
    const url = `${environment.FEATURES}`;
    this.store.dispatch(actions.setAccountSetupLoadingState({ loading: LoadingState.Loading }));
    return <Observable<FeatureOption[]>>this.http.apiGetRequest(url)
      .pipe(
        takeUntil(
          this.actions$.pipe(
            ofType(
              actions.discardSentCallsAfterNavigate
            )
          )
        ),
        catchError((error) => {
          this.store.dispatch(actions.setAccountSetupLoadingState({ loading: LoadingState.Error }));
          const msg = 'Something went wrong. Please try again later.';
          return of(this.showToast('Error!', error || msg, 'error'));
        }));
  }

  setAvailableFeatures(res: any) {
    if (res && res.error) {
      return fetchError();
    }

    this.store.dispatch(actions.setAccountSetupLoadingState({ loading: LoadingState.Done }));
    return setAvailableFeatures({ features: res });
  }

  _dispatchCreateInstance(action: any) {
    this.store.dispatch(actions.setInstanceDetailsLoadingState({ loadingState: LoadingState.Loading }));
    const url = `${environment.CREATE_INSTANCE}`;
    const reqBody: CreateInstancePayload = action.instancePayload;
    return <Observable<any>>this.http.apiPostRequest(url, reqBody, false)
      .pipe(
        takeUntil(
          this.actions$.pipe(
            ofType(
              actions.discardSentCallsAfterNavigate
            )
          )
        ),
        catchError((error) => {
          this.store.dispatch(actions.setInstanceDetailsLoadingState({ loadingState: LoadingState.Error }));
          if (error && error.status === 409) {
            this.store.dispatch(actions.fetchWorkSpacesAndNavigateToInstance({ tenantId: reqBody.tenantId }));
            return of();
          }
          if (!error) return of();
          return of(this.showToast('Error!', 'Changes could not be saved.', 'error'));
        }));
  }

  _setInstanceDetails(response: InstanceDetails) {
    if (response === undefined) {
      this.store.dispatch(actions.setInstanceDetailsLoadingState({ loadingState: LoadingState.Error }));
      this.trackingService.captureUserActionResult(UserActions.Instance.InstanceCreation, 'Failure');
      return fetchError();
    }

    sessionStorage.storeItem(Constants.INSTANCE_ID, response.id?.toString() || '');
    this.store.dispatch(setInstanceDetails({ instanceDetails: response }));
    this.store.dispatch(actions.setInstanceDetailsLoadingState({ loadingState: LoadingState.Done }));
    return actions.dummyAction();
  }

  _dispatchFeaturesUnlock(action: any) {
    const { featureId } = action;

    if (action.type === dispatchWorkLogCategorizationFeatureUnlock.type) {
      this.store.dispatch(actions.setWorkLogCategorizationFeatureUnlockLoadingState({ loadingState: LoadingState.Loading }));
    } else {
      this.store.dispatch(actions.setFeatureUnlockLoadingState({ featureId, loadingState: LoadingState.Loading }));
    }

    const url = `${environment.UNLOCK_FEATURES}`;
    const params = {
      instanceId: action.instanceId,
      featureId: action.featureId
    }

    return this.http.apiPostRequest(url, params, false)
      .pipe(
        takeUntil(
          this.actions$.pipe(
            ofType(
              actions.discardSentCallsAfterNavigate
            )
          )
        ),
        catchError((error) => {
          if (action.type === dispatchWorkLogCategorizationFeatureUnlock.type) {
            this.store.dispatch(actions.setWorkLogCategorizationFeatureUnlockLoadingState({ loadingState: LoadingState.Error }));
          } else {
            this.store.dispatch(actions.setFeatureUnlockLoadingState({ featureId, loadingState: LoadingState.Error }));
          }

          if (error.status === 409) return of();
          return of(this.showToast('Error!', error, 'error'));
        })
      );
  }

  _setUnlockedFeatureDetails(action: any, res: any) {
    if (res === undefined) {
      return fetchError();
    }

    const { featureId } = action;

    if (action.type === dispatchWorkLogCategorizationFeatureUnlock.type) {
      this.store.dispatch(actions.setWorkLogCategorizationFeatureUnlockLoadingState({ loadingState: LoadingState.Done }));
    } else {
      this.store.dispatch(actions.setFeatureUnlockLoadingState({ featureId, loadingState: LoadingState.Done }));
    }

    return setUnlockedFeatureResponse({ unlockedFeatureResponse: res });
  }

  fetchKhojiUserProfile(action: any): Observable<KhojiUserProfile> {
    const url = `${environment.USER_PROFILE}`;
    this.store.dispatch(setUserSettingLoadingState({ loadingState: LoadingState.Loading }));
    return <Observable<KhojiUserProfile>>this.http.apiGetRequest(url)
      .pipe(
        takeUntil(
          this.actions$.pipe(
            ofType(
              discardSentCallsAfterNavigate
            )
          )
        ),
        catchError((error) => {
          this.store.dispatch(setUserSettingLoadingState({ loadingState: LoadingState.Error }));
          const msg = typeof error === 'string' ? error : "Something went wrong.";
          return of(this.showToast('Error!', msg, 'error'));
        })
      );
  }

  dispatchKhojiUserProfile(res: KhojiUserProfile) {
    if (res === undefined) {
      return fetchError();
    }

    this.store.dispatch(actions.setUserSettingLoadingState({ loadingState: LoadingState.Done }));
    return setKhojiUserProfile({ userProfile: res });
  }


  fetchInstanceDetails(action: any): Observable<InstanceDetails> {
    const instanceId = sessionStorage.getItem(Constants.INSTANCE_ID);
    if (!instanceId) return of(null);
    const url = `${environment.INSTANCE}/${instanceId}`;
    this.store.dispatch(actions.setInstanceDetailsLoadingState({ loadingState: LoadingState.Loading }));
    return <Observable<InstanceDetails>>this.http.apiGetRequest(url)
      .pipe(
        takeUntil(
          this.actions$.pipe(
            ofType(
              actions.discardSentCallsAfterNavigate
            )
          )
        ),
        catchError((error) => {
          this.store.dispatch(actions.setInstanceDetailsLoadingState({ loadingState: LoadingState.Error }));
          return of(this.showToast('Error!', error, 'error'));
        }));
  }

  fetchValidateUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.fetchValidateUser),
      mergeMap(action => this.fetchValidateUser(action).pipe(
        map(res => this.dispatchValidateUser(res))
      ))
    )
  );

  fetchValidateUser(action): Observable<any> {
    const url = environment.VALIDATE_USER_API;

    this.store.dispatch(
      actions.setValidateUserLoadingState({ loadingState: LoadingState.Loading })
    );
    return <Observable<any>>this.http.apiPostRequest(url, action.sourceCode, false).pipe(
      takeUntil(
        this.actions$.pipe(
          ofType(
            actions.discardSentCallsAfterNavigate
          )
        )
      ),
      catchError((error) => {
        this.store.dispatch(actions.setValidateUserLoadingState({ loadingState: LoadingState.Error }));
        return of('error');
      })
    );
  }

  dispatchValidateUser(response) {
    if (response === 'error') {
      return fetchError();
    }

    this.store.dispatch(actions.setValidateUserLoadingState({ loadingState: LoadingState.Done }));

    return actions.setValidateUserLoadingState({ loadingState: LoadingState.Done })
  }

  showToast(header: string, message: string, type: string, life?: number) {
    this.messageService.clear('validate-user');
    this.messageService.add({
      key: 'validate-user',
      severity: type,
      detail: message,
      summary: header,
      // @ts-ignore
      preventOpenDuplicates: true,
      position: 'top-right',
      life: life || 3000
    });
  }

  clearToasts() {
    this.messageService.clear();
  }
}
