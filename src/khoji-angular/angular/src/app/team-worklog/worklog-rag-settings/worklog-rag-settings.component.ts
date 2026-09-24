/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Constants } from 'app/constants';
import { RAG_COLOR_CODES, WORKLOG_DAY_HOUR_CONFIG, WORKLOG_OTHER_PERCENTAGE_THRESHOLD, WORKLOG_OTHER_RAG_SLIDER_CONFIG, WORKLOG_PERCENTAGE_THRESHOLD, WORKLOG_RAG_SLIDER_CONFIG, WORKLOG_RAG_STATUS_CATEGORY_EMAIL } from 'app/constants.configs';
import { AppState, EvalConfig } from 'app/states/app-states';
import { fetchMembers, fetchTeamWorklogStats, fetchTeamWorklogStatsForThisMonth, updateEvalConfigInBatch } from 'app/states/app.actions';
import { selectServerConfig, selectWorkLogGeneralSettings } from 'app/states/global-configs.selector';
import { selectTranslation } from 'app/states/global-translations.selector';
import { Subscription } from 'rxjs';
import { TrackingService } from '../../services/tracking';
import { RagStatusWrapperComponent } from 'app/shared/rag-status-wrapper/rag-status-wrapper.component';
import { selectDateTo } from 'app/states/global-filters.selector';
import { RagStatusComponent } from 'app/shared/rag-status/rag-status.component';

export interface modalStateForConfirmationDialog {
  open: boolean,
  save: boolean
}

@Component({
  selector: 'khoji-worklog-rag-settings',
  templateUrl: './worklog-rag-settings.component.html',
  styleUrls: ['./worklog-rag-settings.component.scss']
})
export class WorklogRagSettingsComponent implements OnInit {
  @ViewChild(RagStatusWrapperComponent) ragStatusWrapperComponent!: RagStatusWrapperComponent;
  @ViewChild(RagStatusComponent) ragStatusComponent!: RagStatusComponent;

  protected workLogHoursPerDay: number = 0;
  private defaultWorkLogHoursPerDay: number = 0;
  protected workLogHoursPerDayInError: boolean = false;

  private subscription = new Subscription();
  @Input() showSkeletalLoading = false;
  @Input() isConfigOnSourceUpdated = false;

  constants = Constants;
  translation: any;

  // rag component
  worklogPercentageThreshold: any;
  ragColorCodes: any;
  worklogRagSliderConfig: any;

  otherWorklogPercentageThreshold: any;
  otherWorklogRagSliderConfig: any

  worklogThresholdPropKey = WORKLOG_PERCENTAGE_THRESHOLD;
  otherWorklogThresholdPropKey = WORKLOG_OTHER_PERCENTAGE_THRESHOLD;
  isRagConfigInDirtyState = false;
  isWorklogCategoriesInDirtyState = false;
  showSpinner: boolean = true;
  defaultRagThresholdCategory = null;

  @Output() onClose = new EventEmitter();
  @Output() configUpdated = new EventEmitter();

  constructor(private store: Store<AppState>, private trackingService: TrackingService) { }

  ngOnInit(): void {
    const workLogHoursPerDay$ = this.store.pipe(selectWorkLogGeneralSettings);
    this.subscription.add(
      workLogHoursPerDay$.subscribe(cfg => {
        this.workLogHoursPerDay = this.defaultWorkLogHoursPerDay = cfg.worklogDayHour;
      })
    )

    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe((translation) => {
        this.translation = translation;
      })
    );

    const serverConfigs$ = this.store.pipe(selectServerConfig);

    this.subscription.add(serverConfigs$.subscribe(serverConfig => {

      this.ragColorCodes = serverConfig[RAG_COLOR_CODES];

      this.defaultRagThresholdCategory = serverConfig[WORKLOG_RAG_STATUS_CATEGORY_EMAIL];

      this.worklogPercentageThreshold = serverConfig[WORKLOG_PERCENTAGE_THRESHOLD];
      this.worklogRagSliderConfig = serverConfig[WORKLOG_RAG_SLIDER_CONFIG];

      this.otherWorklogPercentageThreshold = serverConfig[WORKLOG_OTHER_PERCENTAGE_THRESHOLD];
      this.otherWorklogRagSliderConfig = serverConfig[WORKLOG_OTHER_RAG_SLIDER_CONFIG];

      if (this.worklogPercentageThreshold && this.ragColorCodes && this.worklogRagSliderConfig) {
        this.showSpinner = false;
      }
    }));

  }

  protected checkForErrorInWorklogDayHour(value) {
    this.handleWorklogDirtyStateChange(true)
    if (!value) this.workLogHoursPerDayInError = true;
    else this.workLogHoursPerDayInError = false;
  }

  onSave() {
    const props: EvalConfig[] = [
      { propKey: WORKLOG_DAY_HOUR_CONFIG, propValue: this.workLogHoursPerDay }
    ]
    this.ragStatusWrapperComponent.handleSave();
    this.store.dispatch(updateEvalConfigInBatch({ props }));
    this.refreshWorkLog();
    this.onClose.emit();
  }

  protected resetToPreviouState() {
    this.workLogHoursPerDay = this.defaultWorkLogHoursPerDay;
    this.workLogHoursPerDayInError = false;
    this.ragStatusWrapperComponent.handleClear();
    this.ragStatusWrapperComponent.clearMethod();
  }

  refreshWorkLog = () => {
    this.store.dispatch(fetchTeamWorklogStats());
    const dateTo$ = this.store.pipe(selectDateTo).subscribe(dateTo => {
      const currentDate = new Date();
      const currentDay = currentDate.getDate();
      const currentfullYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const selectedMonth = Number(dateTo.split('-')[1]);
      if (currentMonth === selectedMonth) {
        this.store.dispatch(fetchTeamWorklogStatsForThisMonth({
          dateFrom: `${currentfullYear}-${currentMonth >= 10 ? currentMonth : '0' + currentMonth}-01`,
          dateTo: `${currentfullYear}-${currentMonth >= 10 ? currentMonth : '0' + currentMonth}-${currentDay >= 10 ? currentDay : '0' + currentDay}`
        }));
      }
    });
    dateTo$.unsubscribe();
    this.store.dispatch(fetchMembers());
  }

  protected saveButtonDisabled(): boolean {
    const hasError = this.workLogHoursPerDayInError;
    const isWorkLogHoursUnchanged = this.defaultWorkLogHoursPerDay === this.workLogHoursPerDay;
    const isDisabled = hasError || (!this.isRagConfigInDirtyState && isWorkLogHoursUnchanged);

    return isDisabled;
  }

  protected fieldInErrorState(): boolean {
    return this.workLogHoursPerDayInError;
  }

  hideRagStatusModal(ragConfigUpdated: boolean): void {
    if (ragConfigUpdated) {
      this.configUpdated.emit();
    }
    this.onClose.emit();
  }

  handleRagDirtyStateChange($event: boolean): void {
    this.isRagConfigInDirtyState = $event;
  }

  handleWorklogDirtyStateChange(isDirty: boolean): void {
    this.isWorklogCategoriesInDirtyState = isDirty;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
