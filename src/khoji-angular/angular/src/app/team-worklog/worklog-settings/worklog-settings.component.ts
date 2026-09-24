import { RagStatusWrapperComponent } from 'app/shared/rag-status-wrapper/rag-status-wrapper.component';
/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { CacheService } from 'app/caching/cache.service';
import { Constants } from 'app/constants';
import { INCLUDE_WEEKENDS_IN_WORKLOG_STATS, RAG_COLOR_CODES, WORKLOG_PERCENTAGE_THRESHOLD, WORKLOG_RAG_SLIDER_CONFIG } from 'app/constants.configs';
import { WorklogCategoriesComponent } from 'app/onboarding/worklog-categories/worklog-categories.component';
import { SharedModule } from 'app/shared/shared.module';
import { AppState, UserAccessLevelsStatus } from 'app/states/app-states';
import { fetchConfigs, updateConfig } from 'app/states/app.actions';
import { selectServerConfig } from 'app/states/global-configs.selector';
import { selectTranslation } from 'app/states/global-translations.selector';
import { selectAccessLevelsStatus, selectInstanceDetail } from 'app/user-profile/state/user-profile.selectors';
import { Features, InstanceDetails } from 'app/user-profile/state/user-profile.states';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputSwitchModule } from 'primeng/inputswitch';
import { MenuModule } from 'primeng/menu';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { RootNav, TrackingService } from '../../services/tracking';
import { WorklogGeneralSettingsComponent } from '../worklog-general-settings/worklog-general-settings.component';
import { UnleashService } from 'app/services/unleash.service';

@Component({
  selector: 'khoji-worklog-settings',
  templateUrl: './worklog-settings.component.html',
  styleUrls: ['./worklog-settings.component.scss'],
  standalone: true,
  imports: [
    ConfirmDialogModule,
    CommonModule,
    WorklogGeneralSettingsComponent,
    MenuModule,
    DividerModule,
    SharedModule,
    WorklogCategoriesComponent,
    DialogModule,
    ButtonModule,
    ProgressSpinnerModule,
    ConfirmPopupModule,
    InputSwitchModule,
    FormsModule
  ]

})
export class WorklogSettingsComponent implements OnInit, OnDestroy {
  @Input() isConfigOnSourceUpdated = false;
  @Input() showOnlyRagComponent = false;
  @Input() showSkeletalLoading = false;
  @Input() buttonsOnRight = false;

  enableWeekendsInWorklog: boolean = false;

  constants = Constants;
  translation: any;
  subscription = new Subscription();

  worklogPercentageThreshold: any;
  ragColorCodes: any;
  worklogRagSliderConfig: any;

  worklogThresholdPropKey = WORKLOG_PERCENTAGE_THRESHOLD;
  isGeneralSettingsDirty: boolean = false;
  generalSettingsResetButtonVisible: boolean = false;
  generalSettingsSaveDisabled: boolean = false;
  ragStatusResetButtonVisible: boolean = false;
  ragStatusAnyFieldInError: boolean = false;
  ragStatusSaveDisabled: boolean = false;

  @ViewChild('kwgs') worklogGeneralSettingsComponent: WorklogGeneralSettingsComponent;
  @ViewChild('krsw') ragStatusWrapperComponent: RagStatusWrapperComponent;
  @ViewChild('worklogCategoriesComponent') worklogCategoriesComponent: WorklogCategoriesComponent;


  @Output() configUpdated = new EventEmitter();
  isCategorizationAndWorklogRemainderEnabled: boolean;
  displayCategorizationDialog = false;
  accessLevelsStatus: UserAccessLevelsStatus;
  instanceDetails: InstanceDetails;
  isLoading = { loading: true };
  standupBoardFeatureEnabled = false;

  constructor(private store: Store<AppState>, private cacheService: CacheService, private trackingService: TrackingService,
    private confirmationService: ConfirmationService,
    private unleashService: UnleashService
  ) { }

  ngOnInit(): void {
    this.store.dispatch(fetchConfigs({ propKeys: [RAG_COLOR_CODES, WORKLOG_PERCENTAGE_THRESHOLD, WORKLOG_RAG_SLIDER_CONFIG, INCLUDE_WEEKENDS_IN_WORKLOG_STATS] }));
    // select translation
    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe((translation) => {
        this.translation = translation;
      })
    );

    const instanceDetails$ = this.store.pipe(selectInstanceDetail);
    const serverConfigs$ = this.store.pipe(
      selectServerConfig,
      filter((cnf) => !!cnf[WORKLOG_PERCENTAGE_THRESHOLD])
    );
    const accessLevelsStatus$ = this.store.pipe(selectAccessLevelsStatus);

    this.subscription.add(instanceDetails$.subscribe(async (instanceDetails) => {
      setTimeout(() => {
        this.isLoading = { loading: instanceDetails?.id?.toString() !== sessionStorage.getItem(Constants.INSTANCE_ID) };
      }, 500);

      if (!this.instanceDetails) {
        this.instanceDetails = instanceDetails;
      }

      //checking if instance features have worklog remainder feature and worklog categorization
      const isWorklogRemainder = instanceDetails?.features?.some(feature => feature.id === Features.TEAM_VIEW) || false;
      const isWorklogCategorizationEnabled = instanceDetails?.features?.some(feature => feature.id === Features.WORK_LOG_CATEGORIZATION) || false;
      this.isCategorizationAndWorklogRemainderEnabled = isWorklogCategorizationEnabled && isWorklogRemainder;
    }));

    this.subscription.add(serverConfigs$.subscribe(serverConfig => {
      this.ragColorCodes = serverConfig[RAG_COLOR_CODES];
      this.worklogPercentageThreshold = serverConfig[WORKLOG_PERCENTAGE_THRESHOLD];
      this.worklogRagSliderConfig = serverConfig[WORKLOG_RAG_SLIDER_CONFIG];
      this.enableWeekendsInWorklog = serverConfig[INCLUDE_WEEKENDS_IN_WORKLOG_STATS] ?? false;
    }));

    this.subscription.add(accessLevelsStatus$.subscribe((data) => (this.accessLevelsStatus = data)));

    // Check standup-board feature flag
    this.unleashService.isFeatureEnabled(Constants.UNLEASH_FEATURE_FLAG_STANDUP_BOARD, this.standupBoardFeatureEnabled)
      ?.subscribe(enabled => {
        this.standupBoardFeatureEnabled = enabled;
      });

    this.trackingService.captureNavigationStep(RootNav.ManageApp.AdminPanel.ManageFeature);
  }

  handleGeneralSettingsDirtyState(dirty: boolean) {
    this.isGeneralSettingsDirty = dirty;
  }


  submitButtonDisabled() {
    return (this.generalSettingsSaveDisabled && this.ragStatusSaveDisabled) || this.ragStatusAnyFieldInError;
  }

  resetButtonVisible() {
    return this.generalSettingsResetButtonVisible || this.ragStatusResetButtonVisible;
  }

  handleSaveChanges() {
    if (!this.generalSettingsSaveDisabled)
      this.worklogGeneralSettingsComponent.handleSaveChanges();

    if (!this.ragStatusSaveDisabled)
      this.ragStatusWrapperComponent.handleSave()
  }

  handleReset() {
    if (this.generalSettingsResetButtonVisible)
      this.worklogGeneralSettingsComponent.resetToPreviousState();

    if (this.ragStatusResetButtonVisible)
      this.ragStatusWrapperComponent.handleClear();

  }

  handleIncludingWeekendsLogic(event: any) {
    this.store.dispatch(updateConfig({ propKey: INCLUDE_WEEKENDS_IN_WORKLOG_STATS, propValue: String(event.checked), showToast: true }));
  }

  handleCategoriesClose({ target }) {
    if (this.worklogCategoriesComponent.hasChanges()) {
      const message = this.translation?.worklogSettings.unsavedCategoriesWarningMessage;
      const acceptLabel = this.translation?.worklogSettings.unsavedCategoriesDiscardMessage;
      const rejectLabel = this.translation?.worklogSettings.unsavedCategoriesCancelMessage;

      this.confirmationService.confirm({
        target,
        message,
        acceptLabel,
        rejectLabel,
        accept: () => {
          this.worklogCategoriesComponent?.resetChanges();
          this.displayCategorizationDialog = false;
        }
      });
    }
    else {
      this.displayCategorizationDialog = false;
    }
  }

  /** only hanldes changes for general settings & rag settings. category changes are propagated separately. */
  hasChanges = () => this.resetButtonVisible();
  /** only hanldes changes for general settings & rag settings. category changes are propagated separately */
  resetChanges = () => this.handleReset();

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
