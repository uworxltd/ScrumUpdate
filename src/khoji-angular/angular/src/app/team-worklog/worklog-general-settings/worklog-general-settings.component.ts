import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { OTHERS_WORKLOG_EMAIL_SUBSCRIPTION_THRESHOLD, WORKLOG_DAY_HOUR_CONFIG, WORKLOG_MAIN_CATEGORIES_ALIAS, WORKLOG_OTHER_CATEGORIES_ALIAS } from 'app/constants.configs';
import { AppState, EvalConfig, InstanceFeaturesStatus, UserAccessLevelsStatus } from 'app/states/app-states';
import { fetchConfigs, resetGivenServerConfigs, updateEvalConfigInBatch } from 'app/states/app.actions';
import { selectWorkLogGeneralSettings } from 'app/states/global-configs.selector';
import { selectTranslation } from 'app/states/global-translations.selector';
import { selectAccessLevelsStatus, selectInstanceDetail, selectInstanceFeaturesStatus } from 'app/user-profile/state/user-profile.selectors';
import { Features, InstanceDetails } from 'app/user-profile/state/user-profile.states';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { combineLatest, Subscription } from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { filter } from 'rxjs/operators';
import { LeaveTicketSettingsComponent } from '../../leave-ticket-settings/leave-ticket-settings.component';

@Component({
  selector: 'khoji-worklog-general-settings',
  templateUrl: './worklog-general-settings.component.html',
  styleUrls: ['./worklog-general-settings.component.scss'],
  standalone: true,
  imports: [FormsModule, CommonModule, InputNumberModule, DividerModule, ButtonModule, InputTextModule, TooltipModule, ProgressSpinnerModule, LeaveTicketSettingsComponent]
})
export class WorklogGeneralSettingsComponent implements OnInit, OnDestroy {
  @ViewChild('leaveTicketSettingsComponent') leaveTicketSettingsComponent: LeaveTicketSettingsComponent;
  // WorkLog hours per day variables
  protected workLogHoursPerDay: number | null = 0;
  private defaultWorkLogHoursPerDay: number = 0;
  protected workLogHoursPerDayInError: boolean = false;

  // aliases variables
  // defaultProductiveAlias: string = '';
  // productiveAlias: string = '';
  // productiveAliasInError: boolean = false;
  // productiveErrorMessage: string;
  // defaultNonProductiveAlias: string = '';
  // nonProductiveAlias: string = '';
  // nonProductiveErrorMessage: string;
  // nonProductiveAliasInError: boolean = false;
  translation: any;
  settingsChanged = false;

  @Input() showSaveAndResetButtons: boolean = true;
  @Output() saveButtonDisabledState: EventEmitter<boolean> = new EventEmitter();
  @Output() resetButtonVisiblity: EventEmitter<boolean> = new EventEmitter();
  @Output() workLogImpactedConfigChanged: EventEmitter<void> = new EventEmitter();
  previousValue: number = 0;
  previousEmailTValue: number = 0;
  //@Output() isDirty: EventEmitter<boolean> = new EventEmitter();
  //@Input() namesNotAllowedForAlias = [];
  othersWorklogEmailSubscriptionThreshold: number | null = 0;
  othersWorklogEmailSubscriptionThresholdInError: boolean = false;
  defaulothersWorklogEmailSubscriptionThreshold = 0;
  instanceDetails: InstanceDetails;
  instanceFeaturesStatus: InstanceFeaturesStatus;
  accessLevelsStatus: UserAccessLevelsStatus;

  private subscription = new Subscription();

  isCategorizationAndTeamRemainderEnabled: boolean;

  constructor(private store: Store<AppState>) { }

  ngOnInit(): void {
    this.store.dispatch(fetchConfigs({ propKeys: [WORKLOG_DAY_HOUR_CONFIG] }));

    const translation$ = this.store.pipe(selectTranslation);
    this.subscription.add(
      translation$.subscribe((data) => {
        this.translation = data;
      })
    );

    const workLogHoursPerDay$ = this.store.pipe(
      selectWorkLogGeneralSettings,
      filter((cfg) => cfg.worklogDayHour > 0)
    );
    const instanceDetails$ = this.store.pipe(
      selectInstanceDetail,
      filter((instanceDetails) => instanceDetails != undefined)
    );
    const instanceFeaturesStatus$ = this.store.pipe(selectInstanceFeaturesStatus);
    const accessLevelsStatus$ = this.store.pipe(selectAccessLevelsStatus);

    this.subscription.add(
      workLogHoursPerDay$.subscribe((cfg) => {
        if (this.hasChanges() && !this.settingsChanged) return;
        this.settingsChanged = false;
        this.workLogHoursPerDay = this.defaultWorkLogHoursPerDay = this.previousValue = cfg.worklogDayHour;
        // this.productiveAlias = this.defaultProductiveAlias = cfg.productiveAlias;
        // this.nonProductiveAlias = this.defaultNonProductiveAlias = cfg.nonProductiveAlias;
        this.othersWorklogEmailSubscriptionThreshold = this.defaulothersWorklogEmailSubscriptionThreshold = this.previousEmailTValue = cfg.othersWorklogEmailSubscriptionThreshold;
      })
    );

    this.subscription.add(
      combineLatest([instanceDetails$]).subscribe(([instanceDetails]) => {
        this.instanceDetails = instanceDetails;
        //checking if instance features have worklog remainder feature and categorization
        const isWorklogRemainder = instanceDetails?.features?.some((feature) => feature.id == Features.TEAM_VIEW) || false;
        const isWorklogCategorizationEnabled = instanceDetails?.features?.some((feature) => feature.id == Features.WORK_LOG_CATEGORIZATION) || false;

        this.isCategorizationAndTeamRemainderEnabled = isWorklogRemainder && isWorklogCategorizationEnabled;

        if (this.isCategorizationAndTeamRemainderEnabled) {
          this.store.dispatch(fetchConfigs({ propKeys: [WORKLOG_MAIN_CATEGORIES_ALIAS, WORKLOG_OTHER_CATEGORIES_ALIAS, OTHERS_WORKLOG_EMAIL_SUBSCRIPTION_THRESHOLD] }));
        }
      })
    );

    this.subscription.add(
      instanceFeaturesStatus$.subscribe((data) => {
        this.instanceFeaturesStatus = data;
      })
    );

    this.subscription.add(
      accessLevelsStatus$.subscribe((data) => {
        this.accessLevelsStatus = data;
      })
    );
  }

  onSave() {
    let props: EvalConfig[] = [{ propKey: WORKLOG_DAY_HOUR_CONFIG, propValue: this.workLogHoursPerDay }];

    if (this.isCategorizationAndTeamRemainderEnabled) {
      props.push({ propKey: OTHERS_WORKLOG_EMAIL_SUBSCRIPTION_THRESHOLD, propValue: this.othersWorklogEmailSubscriptionThreshold });
    }

    this.store.dispatch(updateEvalConfigInBatch({ props }));
    this.workLogImpactedConfigChanged.emit();
    this.settingsChanged = true;
  }

  protected resetToPreviouState() {
    //this.productiveAlias = this.defaultProductiveAlias;
    this.workLogHoursPerDay = this.defaultWorkLogHoursPerDay;
    //this.nonProductiveAlias = this.defaultNonProductiveAlias;
    this.othersWorklogEmailSubscriptionThreshold = this.defaulothersWorklogEmailSubscriptionThreshold;
    //this.productiveAliasInError = false;
    //this.nonProductiveAliasInError = false;
    this.workLogHoursPerDayInError = false;
    this.othersWorklogEmailSubscriptionThresholdInError = false;
  }

  protected anyFieldInErrorState(): boolean {
    //this.productiveAliasInError
    //|| this.nonProductiveAliasInError
    return this.workLogHoursPerDayInError || this.othersWorklogEmailSubscriptionThresholdInError;
  }

  protected checkForErrorInWorklogDayHour(value: number | null | undefined) {
    // Allow empty while editing so users can replace values (e.g. 8 → 7)
    if (value === null || value === undefined || (value as unknown) === '') {
      this.workLogHoursPerDayInError = true;
      return;
    }
    if (value < 1 || value > 16) {
      this.workLogHoursPerDayInError = true;
      return;
    }
    this.workLogHoursPerDayInError = false;
    this.previousValue = value;
  }

  protected checkForErrorInPercentage(value: number | null | undefined) {
    // Allow empty while editing so users can replace values (e.g. 25 → 10)
    if (value === null || value === undefined || (value as unknown) === '') {
      this.othersWorklogEmailSubscriptionThresholdInError = true;
      return;
    }
    if (value < 0 || value > 100) {
      this.othersWorklogEmailSubscriptionThresholdInError = true;
      return;
    }
    this.othersWorklogEmailSubscriptionThresholdInError = false;
    this.previousEmailTValue = value;
  }

  // protected checkForErrorInAlias(value, field) {
  //   const regex = /^[A-Za-z ]{1,16}$/;
  //   const aliasNameError = this.namesNotAllowedForAlias.some(item => item.toLowerCase() === value.toLowerCase())
  //   if (field === 'P') {
  //     if (regex.test(value) && !aliasNameError) {
  //       this.productiveAliasInError = false;
  //     } else {
  //       this.productiveAliasInError = true;
  //       this.productiveErrorMessage = aliasNameError ? this.translation.generalSettings.duplicateAliasNameError : this.translation.generalSettings.alphabetOnlyErrorMessage
  //     }
  //   } else {
  //     if (regex.test(value) && !aliasNameError) {
  //       this.nonProductiveAliasInError = false;
  //     } else {
  //       this.nonProductiveAliasInError = true;
  //       this.nonProductiveErrorMessage = aliasNameError ? this.translation.generalSettings.duplicateAliasNameError : this.translation.generalSettings.alphabetOnlyErrorMessage
  //     }
  //   }
  // }

  protected hasChanges(): boolean {
    return (
      this.defaultWorkLogHoursPerDay !== this.workLogHoursPerDay ||
      //&& this.productiveAlias === this.defaultProductiveAlias
      //&& this.nonProductiveAlias === this.defaultNonProductiveAlias
      this.othersWorklogEmailSubscriptionThreshold !== this.defaulothersWorklogEmailSubscriptionThreshold
    );
  }

  handleSaveChanges() {
    if (this.accessLevelsStatus.hasAdminAccess) {
      this.onSave();
    }

    const showToast = !this.accessLevelsStatus.hasAdminAccess;
    this.leaveTicketSettingsComponent?.saveChanges(showToast);
  }

  public saveButtonDisabledStateFunc() {
    const saveButtonState = (!this.hasChanges() && !this.leaveTicketSettingsComponent?.hasChanges()) || this.anyFieldInErrorState();
    this.saveButtonDisabledState.emit(saveButtonState);
    return saveButtonState;
  }

  public resetButtonVisible() {
    const visibility = this.hasChanges() || this.anyFieldInErrorState() || this.leaveTicketSettingsComponent?.hasChanges();
    this.resetButtonVisiblity.emit(visibility);
    return visibility;
  }

  public resetToPreviousState() {
    this.resetToPreviouState();
    this.leaveTicketSettingsComponent?.reset()
  }

  ngOnDestroy(): void {
    if (this.settingsChanged) {
      this.store.dispatch(resetGivenServerConfigs({ propKey: [OTHERS_WORKLOG_EMAIL_SUBSCRIPTION_THRESHOLD, WORKLOG_MAIN_CATEGORIES_ALIAS, WORKLOG_OTHER_CATEGORIES_ALIAS, WORKLOG_DAY_HOUR_CONFIG] }));
    }

    this.subscription.unsubscribe();
  }
}
