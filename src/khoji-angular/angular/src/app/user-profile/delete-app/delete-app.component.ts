/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Store } from '@ngrx/store';
import { AccessLevels, AppState, InstanceFeaturesStatus, LoadingState } from 'app/states/app-states';
import { selectTranslation } from 'app/states/global-translations.selector';
import { setDeleteAppLoadingState, submitDeleteApp } from 'app/user-profile/state/user-profile.actions';
import { selectAccessibleAccessLevels, selectDeleteAppLoadingState, selectInstanceFeaturesStatus, selectWorkspacesWithLoadingStates } from 'app/user-profile/state/user-profile.selectors';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { combineLatest, Subscription } from 'rxjs';
import { SharedModule } from 'app/shared/shared.module';
import { Router } from '@angular/router';
import { Instance, Workspace } from 'app/user-profile/state/user-profile.states';
import { AdminActions, RootNav, TrackingService, UserActions } from 'app/services/tracking';
import { fetchConfigs, fetchInstanceDetails, updateEvalConfig } from 'app/states/app.actions';
import { InputSwitchModule } from 'primeng/inputswitch';
import { FormsModule } from '@angular/forms';
import { WORKLOG_DATA_STORAGE_CONFIG } from 'app/constants.configs';
import { WORKLOG_DATA_SYNC_PERMISSION } from 'app/constants.configs';
import { selectDataStoragePermission, selectDataSyncPermission } from 'app/states/global-configs.selector';
import { CommonModule } from '@angular/common';
import { DividerModule } from 'primeng/divider';
import { wait } from 'app/shared/helper-functions';
import { UnleashService } from 'app/services/unleash.service';
import { Constants } from 'app/constants';

export interface DeleteAppConfig {
  /** Indicates which config is updated but not its actual value. To get actual value please fetch the config again.*/
  dataSyncPermission: boolean;
}
@Component({
  selector: 'khoji-delete-app',
  templateUrl: './delete-app.component.html',
  styleUrls: ['./delete-app.component.scss'],
  standalone: true,
  imports: [CommonModule, ConfirmDialogModule, SharedModule, InputSwitchModule, FormsModule, DividerModule],
  providers: [ConfirmationService]
})
export class DeleteAppComponent implements OnInit, OnDestroy {
  subscription = new Subscription();
  translation: any;
  loading: LoadingState = LoadingState.Pending;
  workspaces: Workspace[];
  filteredInstances: Instance[];
  dataPermission: boolean = true;
  dataSyncPermission: boolean = true;

  hasTenantAdminAccess: boolean = false;
  instanceFeaturesStatus: InstanceFeaturesStatus;
  standupBoardFeatureEnabled = false;

  config: DeleteAppConfig = {
    dataSyncPermission: false
  };

  @Input() hideDeleteApp = false;
  @Input() hideDataStorage = false;
  @Output() configChange = new EventEmitter<DeleteAppConfig>();

  constructor(private store: Store<AppState>, private confirmationService: ConfirmationService, private router: Router, private trackingService: TrackingService, private unleashService: UnleashService) {}

  ngOnInit(): void {
    const userAccessLevels$ = this.store.pipe(selectAccessibleAccessLevels);
    const instanceFeaturesStatus$ = this.store.pipe(selectInstanceFeaturesStatus);

    this.store.dispatch(fetchConfigs({ propKeys: [WORKLOG_DATA_STORAGE_CONFIG] }));
    this.store.dispatch(fetchConfigs({ propKeys: [WORKLOG_DATA_SYNC_PERMISSION] }));

    // component is called outside of admin panel
    if (this.hideDeleteApp) {
      this.store.dispatch(fetchInstanceDetails());
    }

    this.subscription.add(
      this.store.pipe(selectDataStoragePermission).subscribe((config) => {
        this.dataPermission = config.dataStoragePermission;
      })
    );

    this.subscription.add(
      this.store.pipe(selectDataSyncPermission).subscribe((config) => {
        this.dataSyncPermission = config.dataSyncPermission;
      })
    );

    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe((translation) => {
        this.translation = translation;
      })
    );

    this.subscription.add(
      combineLatest([this.store.pipe(selectDeleteAppLoadingState), this.store.pipe(selectWorkspacesWithLoadingStates)]).subscribe(([loading, workspacesWithLoadingStates]) => {
        this.workspaces = workspacesWithLoadingStates.workspaces;
        this.filteredInstances = workspacesWithLoadingStates.workspaces?.flatMap((workspace) => workspace.instances);
        this.loading = loading;

        if (loading === LoadingState.Done && workspacesWithLoadingStates.loadingState === LoadingState.Done) {
          if (this.filteredInstances && this.filteredInstances.length > 0) {
            sessionStorage.removeItem(Constants.INSTANCE_ID);
            this.router.navigate([`/space/${this.workspaces[0].id}/home`]);
          } else if (this.filteredInstances && this.filteredInstances.length === 0) {
            sessionStorage.removeItem(Constants.INSTANCE_ID);
            this.router.navigate([`/space/${this.workspaces[0].id}/jira-instances`]);
          }
        }
      })
    );

    this.trackingService.captureNavigationStep(RootNav.ManageApp.AdminPanel.AppSettings);

    this.subscription.add(
      userAccessLevels$.subscribe((userAccessLevels) => {
        this.hasTenantAdminAccess = userAccessLevels.includes(AccessLevels.TenantAdmin);
      })
    );

    this.subscription.add(
      instanceFeaturesStatus$.subscribe((data) => {
        this.instanceFeaturesStatus = data;
      })
    );

    // 1. check feature standup board
    this.unleashService.isFeatureEnabled(Constants.UNLEASH_FEATURE_FLAG_STANDUP_BOARD, this.standupBoardFeatureEnabled)?.subscribe((enabled) => {
      this.standupBoardFeatureEnabled = enabled;
    });
  }

  confirmAppDeletion() {
    this.confirmationService.confirm({
      message: this.translation?.userProfile.deleteAppConfirmation.message,
      icon: 'pi pi-info-circle',
      acceptIcon: 'none',
      rejectIcon: 'none',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.trackingService.captureUserAction(UserActions.AppSettings.DeleteApp.ClosedButton);
        this.store.dispatch(submitDeleteApp());
      }
    });
    this.trackingService.captureNavigationStep(RootNav.ManageApp.AdminPanel.AppSettings.DeleteApp.ConfirmationModal);
  }

  handleDataPermission(event) {
    this.store.dispatch(updateEvalConfig({ propKey: WORKLOG_DATA_STORAGE_CONFIG, propValue: event.checked }));
  }

  async handleDataSyncPermission(event) {
    this.trackingService.captureUserAction(AdminActions.ManageSettings.AppSettings.JiraDataSyncronization, { Enable: event.checked });
    this.store.dispatch(updateEvalConfig({ propKey: WORKLOG_DATA_SYNC_PERMISSION, propValue: event.checked }));
    await wait(500);
    this.configChange.emit({ ...this.config, dataSyncPermission: true });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.store.dispatch(setDeleteAppLoadingState({ loading: LoadingState.Pending }));
  }
}
