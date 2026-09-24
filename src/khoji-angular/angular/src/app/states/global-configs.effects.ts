/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Injectable } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { Store } from "@ngrx/store";
import { TypedAction } from "@ngrx/store/src/models";
import { Constants } from "app/constants";
import { WORKLOG_DISTRIBUTION, WORKLOG_OTHER_PERCENTAGE_THRESHOLD, WORKLOG_RAG_STATUS_CATEGORY_EMAIL } from "app/constants.configs";
import { AngularAppConfigs, KhojiConfigs } from "app/interface/khoji-config.interface";
import { WorkLogCategory } from 'app/interface/worklog-catagory';
import { HttpService } from "app/services/common/http.service";
import { KhojiSpinnerService } from "app/services/spinner.service";
import { TrackingService, UserActions } from 'app/services/tracking';
import { getVersonMismatch, isJsonValid } from "app/shared/helper-functions";
import { environment } from "environments/environment";
import { MenuItem, MessageService } from 'primeng/api';
import { merge, Observable, of, timer } from "rxjs";
import { catchError, concatMap, filter, groupBy, map, mergeMap, switchMap, takeUntil, withLatestFrom } from "rxjs/operators";
import { DataSyncJobStatus, EvalConfig, LoadingState } from './app-states';
import * as actions from './app.actions';
import { selectKhojiConfig } from './global-configs.selector';
import { startDataSyncJob, setDataSyncJobStatus, startDataSyncJobStatusPolling, stopDataSyncJobStatusPolling, StartDataSyncJobStatusResponse, stopAllDataSyncJobStatusPolling, onSyncJobComplete, onSyncJobStatus } from "./global-configs.actions";

@Injectable()
export class GlobalConfigsEffects {
  constructor(
    private actions$: Actions,
    private httpService: HttpService,
    private messageService: MessageService,
    private store: Store,
    private spinner: KhojiSpinnerService,
    private trackingService: TrackingService
  ) { }

  // Effect for fetching khoji configs
  khojiConfigsEffect$ = createEffect(() => this.actions$.pipe(
    ofType(actions.fetchKhojiConfigs),
    concatMap(action => of(action).pipe(withLatestFrom(this.store.pipe(selectKhojiConfig)))),
    mergeMap(([action, config]) => this.fetchKhojiConfigs(action, config).pipe(map(res => this.dispatchKhojiConfigs(res))))
  ));

  sourceIssueTypeSyncEffect$ = createEffect(() => this.actions$.pipe(
    ofType(actions.fetchSourceIssueTypes),
    mergeMap(action => this.fetchSourceIssueType().pipe(map(res => this.dispatchSourceIssueTypes(res))))
  ));

  fetchSourceIssueType() {
    this.store.dispatch(actions.setSourceIssueTypesLoadingState({ loadingState: LoadingState.Loading }));
    return <Observable<any>>this.httpService.apiGetRequest(environment.SOURCE_ISSUE_TYPES_SYNC)
      .pipe(catchError((error) => {
        return of(this.store.dispatch(actions.setSourceIssueTypesLoadingState({ loadingState: LoadingState.Error })));
      }));;
  }

  dispatchSourceIssueTypes(response) {
    if (response === undefined) {
      return actions.setSourceIssueTypesLoadingState({ loadingState: LoadingState.Error });
    }
    this.store.dispatch(actions.setSourceIssueTypesLoadingState({ loadingState: LoadingState.Done }));
    return actions.setSourceIssueTypes({ sourceIssueTypes: response });
  }

  //Effect for angfular app cofig
  AngularAppConfigEffect$ = createEffect(() => this.actions$.pipe(
    ofType(actions.fetchAngularAppConfigs),
    mergeMap(action => this.fetchAngularAppConfigs(action).pipe(map(res => this.dispatchAngularAppConfigs(res))))
  ));

  FetchConfigEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.fetchConfigs),
      mergeMap(({ propKeys }) =>
        this.fetchConfigs(propKeys).pipe(
          map((response) => this.dispatchConfigsFetched(response))
        )
      )
    )
  );

  UpdateConfigEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.updateConfig),
      mergeMap(({ propKey, propValue, showToast }) =>
        this.updateConfig(propKey, propValue).pipe(
          map((response) => this.dispatchConfigUpdated(propKey, propValue, showToast, response))
        )
      )
    )
  );

  //Effect to upsert rag status config
  UpdateWorklogRagConfigEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.updateOtherWorklogRAGThresholdConfig),
      mergeMap((action) =>
        this.updateWorklogRAGConfig(action).pipe(
          map((res) => this.dispatchRAGWorklogConfig(res, action.thresholdConfig))
        )
      )
    )
  );

  //Effect to upsert rag status category for email
  UpdateWorklogRagCategoryEmailEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.updateWorklogRAGEmailSetting),
      mergeMap((action) =>
        this.updateWorklogRAGCategoryEmailConfig(action).pipe(
          map((res) => this.dispatchWorklogRAGEmailConfig(res, action.ragEmailSetting))
        )
      )
    )
  );

  fetchMenuEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.fetchMenuJSON),
      mergeMap(action =>
        this.fetchMenu(action).pipe(
          map((res) => this.dispatchMenu(res))
        )
      )
    )
  );

  userEffect$ = createEffect(() => this.actions$.pipe(
    ofType(actions.fetchUpdatedUser),
    mergeMap((action) => this.fetchUser(action).pipe(map(res => this.dispatchUser(res)))),
  ));

  userSettingsEffect$ = createEffect(() => this.actions$.pipe(
    ofType(actions.fetchUpdatedUserSettings),
    mergeMap((action) => this.fetchUserSettings(action).pipe(map(res => this.dispatchUserSettings(res)))),
  ));

  updateConfigsInBatch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.updateEvalConfigInBatch),
      mergeMap(({ props }) =>
        this.updateConfigsInBatch(props).pipe(
          map((response) => this.dispatchConfigUpdatedInBatch(response, props))
        )
      )
    )
  );

  UpdateEvalConfigEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.updateEvalConfig),
      mergeMap(({ propKey, propValue }) =>
        this.updateConfig(propKey, JSON.stringify(propValue)).pipe(
          map((response) => this.dispatchEvalConfigUpdated(propKey, propValue, response))
        )
      )
    )
  );

  startDataSyncJob$ = createEffect(() => this.actions$.pipe(
    ofType(startDataSyncJob),
    mergeMap((action) => this.startDataSyncJob(action).pipe(map(res => this.dispatchStartDataSyncJob(action, res)))),
  ));

  startDataSyncJob(action: ReturnType<typeof startDataSyncJob>): Observable<any> {
    const { req } = action;
    return <any>this.httpService.apiPostRequest(environment.DATA_SYNC_START_JOB, req)
      .pipe(catchError((error) => {
        return of(this.store.dispatch(actions.fetchError()));
      }));
  }

  dispatchStartDataSyncJob(action: ReturnType<typeof startDataSyncJob>, response: StartDataSyncJobStatusResponse) {
    const { req, onComplete, onStatus } = action;

    if (response === undefined) {
      return actions.fetchError();
    }

    const { job_type: jobType } = req;
    const { job_id: jobId, submitted_at: submittedAt, status } = response;

    if (onComplete || onStatus) {
      this.store.dispatch(startDataSyncJobStatusPolling({ jobId, onComplete, onStatus }));
    }

    return setDataSyncJobStatus({
      dataSyncJobStatus: {
        jobId,
        jobType,
        status,
        submittedAt,
      }
    });
  }

  startDataSyncJobStatusPolling$ = createEffect(() =>
    this.actions$.pipe(
      ofType(startDataSyncJobStatusPolling),

      // Group jobs by jobId → each jobId gets its own polling pipeline
      groupBy(({ jobId }) => jobId),

      // For each jobId, create polling logic
      mergeMap(jobActions$ =>
        jobActions$.pipe(
          switchMap(({ jobId, onComplete, onStatus }) =>
            timer(0, Constants.DATA_SYNC_STATUS_POLLING_TIME_MS).pipe(

              // Prevent overlapping HTTP calls (last value cancels previous)
              switchMap(() => this.fetchDataSyncJobStatus(jobId)),

              map((response) => this.dispatchDataSyncJobStatus(jobId, onComplete, onStatus, response as DataSyncJobStatus)),

              // ✅ Stop polling only for this specific job
              takeUntil(
                merge(
                  this.actions$.pipe(
                    ofType(stopDataSyncJobStatusPolling),
                    filter(action => action.jobId === jobId)
                  ),
                  this.actions$.pipe(
                    ofType(stopAllDataSyncJobStatusPolling)
                  )
                )
              ),

              catchError(() => of(null))
            )
          )
        )
      )
    )
  );

  private fetchDataSyncJobStatus(jobId: string) {
    return this.httpService.apiGetRequest(`${environment.DATA_SYNC_STATUS}?jobId=${jobId}`)
      .pipe(
        catchError(() => of(this.store.dispatch(actions.fetchError())))
      );
  }

  private dispatchDataSyncJobStatus(jobId: string, onComplete: onSyncJobComplete, onStatus: onSyncJobStatus, dataSyncJobStatus: DataSyncJobStatus) {
    if (!dataSyncJobStatus) {
      this.store.dispatch(stopDataSyncJobStatusPolling({ jobId }));
      return actions.fetchError();
    }

    const { status } = dataSyncJobStatus;

    if (onStatus) onStatus({ jobId, status });

    // If job finished → stop polling
    if (['success', 'failed', null].includes(status)) {
      this.store.dispatch(setDataSyncJobStatus({ dataSyncJobStatus }));
      this.store.dispatch(stopDataSyncJobStatusPolling({ jobId }));

      if (status === "success") {
        if (onComplete) onComplete({ jobId });
      }
    }

    return setDataSyncJobStatus({ dataSyncJobStatus });
  }

  private updateConfigsInBatch(props: EvalConfig[]): Observable<any> {
    this.spinner.show();
    return <Observable<any>>this.httpService.apiPostRequest(environment.UPSERT_CONFIG_IN_BATCH, props, false).pipe(
      catchError((error) => {
        props.forEach(prop => this.store.dispatch(actions.setConfigErrorState({ propKey: prop.propKey, propState: true })));
        this.messageService.clear('message');
        this.messageService.clear('network');
        this.messageService.add({
          severity: 'error',
          summary: "Error!",
          detail: "Changes could not be saved.",
          key: 'message'
        });
        return of(this.store.dispatch(actions.fetchError()));
      })
    );
  }

  private dispatchEvalConfigUpdated = (propKey: string, propValue: any, response) => {
    this.spinner.hide();
    if (response) {
      this.messageService.clear('message');
      this.messageService.add({
        severity: 'success',
        summary: 'Success!',
        detail: 'Changes were saved successfully.',
        key: 'message'
      });
      this.trackingService.captureUserActionResult(UserActions.Config, 'Success', { propKey: propKey });
      return actions.dummyAction();
    }

    this.trackingService.captureUserActionResult(UserActions.Config, 'Failure', { propKey: propKey });
    return actions.fetchError();
  };

  fetchUser(action: any): Observable<any> {
    this.spinner.show();
    this.store.dispatch(actions.setUsersLoadingState({ loadingState: LoadingState.Loading }));
    const url = environment.USERS_API;

    return <any>this.httpService.apiGetRequest(`${url}/${action.userId}`)
      .pipe(catchError((error) => {
        this.spinner.hide();
        return of(this.store.dispatch(actions.setUsersLoadingState({ loadingState: LoadingState.Error })));
      }));
  }

  fetchUserSettings(action: any): Observable<any> {
    this.spinner.show();
    this.store.dispatch(actions.setUsersLoadingState({ loadingState: LoadingState.Loading }));
    const url = environment.USER_SETTINGS;

    return <any>this.httpService.apiGetRequest(`${url}/${action.userId}`)
      .pipe(catchError((error) => {
        this.spinner.hide();
        return of(this.store.dispatch(actions.setUsersLoadingState({ loadingState: LoadingState.Error })));
      }));
  }

  dispatchUser(response: any) {
    if (response === undefined) {
      return actions.fetchError();
    }

    this.spinner.hide();
    this.store.dispatch(actions.setUsersLoadingState({ loadingState: LoadingState.Done }));
    return actions.setUpdatedUser({ updatedUser: { userId: response.id, updatedUser: response } });
  }

  dispatchUserSettings(response: any) {
    if (response === undefined) {
      return actions.fetchError();
    }

    this.spinner.hide();
    this.store.dispatch(actions.setUsersLoadingState({ loadingState: LoadingState.Done }));
    return actions.setUpdatedUserSettings({ settings: response });
  }

  dispatchRAGWorklogConfig(response: any, payload: any) {
    if (response === undefined) {
      return actions.setWorklogRAGConfigLoadingState({ loadingState: LoadingState.Error });
    }

    this.store.dispatch(actions.configUpdated({ propKey: WORKLOG_OTHER_PERCENTAGE_THRESHOLD, propValue: payload }));
    return actions.setWorklogRAGConfigLoadingState({ loadingState: LoadingState.Done });
  }

  dispatchWorklogRAGEmailConfig(response: any, payload: any) {
    if (response === undefined) {
      return actions.setWorklogRAGEmailLoadingState({ loadingState: LoadingState.Error });
    }

    this.store.dispatch(actions.configUpdated({ propKey: WORKLOG_RAG_STATUS_CATEGORY_EMAIL, propValue: payload }));
    return actions.setWorklogRAGEmailLoadingState({ loadingState: LoadingState.Done });
  }

  fetchMenu(action: any): Observable<any> {
    return <any>this.httpService.apiGetRequest(environment.ANGULAR_MENU_CONFIG)
      .pipe(
        catchError((error) => {
          return of(this.store.dispatch(actions.fetchError()));
        }
        )
      );
  }

  dispatchMenu(res: MenuItem[]) {
    if (res === undefined) {
      return actions.fetchError();
    }
    return actions.setMenu({ menu: res });
  }

  showErrorToast() {
    return of(this.store.dispatch(actions.fetchError()));
  }

  //Khoji config fetch and dispatch
  fetchKhojiConfigs(action: TypedAction<'[Configs] FetchKhojiConfigs'>, config: KhojiConfigs): Observable<KhojiConfigs> {
    const diff = () => new Date().getTime() - config.lastFeched; // milliseconds
    const expired = () => diff() > Constants.KHOJI_CONGIG_CACHE_DURATION_SECONDS * 1000; // milliseconds

    if (config && !expired()) {
      return of(config);
    }

    const configRequestParams = getVersonMismatch() === 'true' ?
      environment.KHOJI_CONFIG + '?versionMismatch=true' : environment.KHOJI_CONFIG;

    this.store.dispatch(actions.resetComponentConfigs());
    return this.httpService.apiGetRequest<KhojiConfigs>(configRequestParams)
      .pipe(map(response => ({ ...response, lastFeched: new Date().getTime() })));
  }

  fetchAngularAppConfigs(action: TypedAction<"[Configs] FetchAngularAppConfigs">) {
    return <Observable<AngularAppConfigs>>this.httpService.apiGetRequest(environment.ANGULAR_APP_CONFIG);
  }

  dispatchAngularAppConfigs(response: AngularAppConfigs) {
    return actions.setAngularAppConfigs({ angularAppConfig: response });
  }

  dispatchKhojiConfigs(response: KhojiConfigs) {
    return actions.setKhojiConfigs({ config: response });
  }

  //Work log config fetch and dispatch

  fetchWorkLogMainConfigs = () =>
    this.httpService.getConfigValue([WORKLOG_DISTRIBUTION]);

  dispatchWorkLogMainConfigs = (worklogDistribution) => {
    const config = Object.keys(worklogDistribution).map<WorkLogCategory>(
      (key) => ({
        name: key,
        color: worklogDistribution[key].color,
        includedIssueTypes: worklogDistribution[key].split(','),
        order: undefined,
      })
    );
    return actions.setWorkLogMainConfigs({ config });
  };

  private dispatchConfigUpdatedInBatch(response, props: EvalConfig[]) {
    this.spinner.hide();
    if (response) {
      //toast message
      this.messageService.clear('message');
      this.messageService.add({
        severity: 'success',
        summary: 'Success!',
        detail: 'Changes were saved successfully.',
        key: 'message'
      });

      props.forEach(prop => {
        this.componentConfigUpdater(prop.propKey, isJsonValid(String(prop.propValue)) ? JSON.parse(prop.propValue) : prop.propValue);
        this.store.dispatch(actions.isConfigsUpdated({ propKey: prop.propKey, propState: true }));
      })
    }
    return actions.fetchError();
  };

  private updateConfig = (propKey: string, propValue: string) => {
    const data = { propKey: propKey, propValue: propValue };
    return this.httpService.apiPostRequest(environment.UPSERT_CONFIG, data, false).pipe(
      catchError((error) => {
        this.store.dispatch(actions.setConfigErrorState({ propKey, propState: true }));
        this.messageService.clear('message');
        this.messageService.clear('network');
        this.messageService.add({
          severity: 'error',
          summary: "Error!",
          detail: "Changes could not be saved.",
          key: 'message'
        });
        return of(this.store.dispatch(actions.fetchError()));
      })
    );
  };

  updateWorklogRAGConfig(action: any): Observable<any> {
    this.store.dispatch(actions.setWorklogRAGConfigLoadingState({ loadingState: LoadingState.Loading }));
    const data = { propKey: WORKLOG_OTHER_PERCENTAGE_THRESHOLD, propValue: action.thresholdConfig };
    return <any>this.httpService.apiPostRequest(environment.UPSERT_CONFIG, data, false).pipe(
      catchError((error) => {
        return of(this.store.dispatch(actions.setWorklogRAGConfigLoadingState({ loadingState: LoadingState.Error })));
      })
    );
  }

  updateWorklogRAGCategoryEmailConfig(action: any): Observable<any> {
    this.store.dispatch(actions.setWorklogRAGEmailLoadingState({ loadingState: LoadingState.Loading }));
    const data = { propKey: WORKLOG_RAG_STATUS_CATEGORY_EMAIL, propValue: action.ragEmailSetting };
    return <any>this.httpService.apiPostRequest(environment.UPSERT_CONFIG, data, false).pipe(
      catchError((error) => {
        return of(this.store.dispatch(actions.setWorklogRAGEmailLoadingState({ loadingState: LoadingState.Error })));
      })
    );
  }

  //config server property
  private dispatchConfigUpdated = (propKey: string, propValue: string, showToast = true, response) => {
    this.spinner.hide();
    propValue = isJsonValid(propValue) ? JSON.parse(propValue) : propValue;
    if (response) {
      if (showToast) {
        //toast message
        this.messageService.clear('message');
        this.messageService.add({
          severity: 'success',
          summary: 'Success!',
          detail: 'Changes were saved successfully.',
          key: 'message'
        });
      }

      if (propKey === WORKLOG_DISTRIBUTION) {
        this.store.dispatch(actions.fetchUserSetting({ force: true }));
        this.store.dispatch(actions.worklogDistributionLoadingState({ loadingState: LoadingState.Done }));
      }

      this.trackingService.captureUserActionResult(UserActions.Config, 'Success', { propKey: propKey });
      this.componentConfigUpdater(propKey, propValue);
      return actions.isConfigsUpdated({ propKey, propState: true });
    }

    if (propKey === WORKLOG_DISTRIBUTION) {
      this.store.dispatch(actions.fetchConfigs({ propKeys: [WORKLOG_DISTRIBUTION] }));
    }

    this.trackingService.captureUserActionResult(UserActions.Config, 'Failure', { propKey: propKey });
    this.store.dispatch(actions.isConfigsUpdated({ propKey, propState: false }));
    return actions.fetchError();
  };

  componentConfigUpdater(propKey: string, propValue: string) {
    this.store.dispatch(actions.configUpdated({ propKey, propValue }));
  }

  fetchConfigs(propKeys: string[]) {
    if (!sessionStorage.getItem(Constants.INSTANCE_ID)) {
      return of(actions.fetchError());
    }

    return this.httpService.getConfigValue(propKeys).pipe(
      catchError(
        (error) => {
          console.error(`Error while fetching configs with prop keys: ${propKeys} and error is: ${error}`);
          return of(actions.fetchError());
        }
      )
    );
  }

  private dispatchConfigsFetched = (response: { [key: string]: any }) =>
    actions.configsFetched({ response });

  requestAIGeneratedCategoriesEffect$ = createEffect(() => this.actions$.pipe(
    ofType(actions.fetchAiGeneratedCategories),
    mergeMap(action => this.fetchAiGeneratedCategories(action).pipe(map(res => this.dispatchAiGeneratedCategories(res))))
  ));

  fetchAiGeneratedCategories(action: any): Observable<any> {
    const data = { Data: [{ type: 'issueTypes', data: action.issueTypes }] };
    this.store.dispatch(actions.setAiGeneratedCategoriesLoadingState({ loadingState: LoadingState.Loading }));

    return <Observable<any>>this.httpService.apiPostRequest(environment.GENERATE_CATEGORIES_WITH_AI, data, false)
      .pipe(catchError((error) => {
        return of(this.store.dispatch(actions.setAiGeneratedCategoriesLoadingState({ loadingState: LoadingState.Error })));
      }));;
  }

  dispatchAiGeneratedCategories(response: any) {
    if (response === undefined || response.response_type === 'error') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error!',
        detail: 'Failed to generate categories with AI.',
        key: 'message'
      });
      return actions.setAiGeneratedCategoriesLoadingState({ loadingState: LoadingState.Error });
    }

    this.store.dispatch(actions.setAiGeneratedCategoriesLoadingState({ loadingState: LoadingState.Done }));

    return actions.setAiGeneratedCategories({ aiGeneratedCategories: response.data });
  }

  linkUserToMSTeamsEffect$ = createEffect(() => this.actions$.pipe(
    ofType(actions.linkUserToMSTeams),
    mergeMap(action => this.submitLinkUserToMSTeams(action).pipe(map(res => this.dispatchLinkUserToMSTeams(res))))
  ));

  submitLinkUserToMSTeams(action: any): Observable<any> {
    const { queryString } = action;
    const url = environment.LINK_USER_TO_MS_TEAMS + '?' + queryString;
    this.store.dispatch(actions.setLinkToMSTeamsLoadingState({ loadingState: LoadingState.Loading }));
    return <Observable<any>>this.httpService.apiGetRequest(url)
      .pipe(catchError((error) => {
        return of(this.store.dispatch(actions.setLinkToMSTeamsLoadingState({ loadingState: LoadingState.Error })));
      }));;
  }

  dispatchLinkUserToMSTeams(response: any) {
    if (response === undefined || response.response_type === 'error') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error!',
        detail: 'Link to MS Teams failed.',
        key: 'message'
      });

      return actions.setLinkToMSTeamsLoadingState({ loadingState: LoadingState.Error });
    }

    this.store.dispatch(actions.setLinkToMSTeamsLoadingState({ loadingState: LoadingState.Done }));

    return actions.setLinkToMSTeamsLoadingState({ loadingState: LoadingState.Done });
  }
}
