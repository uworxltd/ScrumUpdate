import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Constants } from 'app/constants';
import { WORKLOG_OTHER_PERCENTAGE_THRESHOLD, WORKLOG_RAG_STATUS_CATEGORY_EMAIL } from 'app/constants.configs';
import { ConfigService } from 'app/services/config.service';
import { AdminActions, TrackingService, UserActions } from 'app/services/tracking';
import { AppState } from 'app/states/app-states';
import { isConfigsUpdated, updateConfig } from 'app/states/app.actions';
import { selectTranslation } from 'app/states/global-translations.selector';
import { ConfirmationService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { RagStatusComponent } from '../rag-status/rag-status.component';
import { CacheService } from 'app/caching/cache.service';

@Component({
  selector: 'khoji-rag-status-wrapper',
  templateUrl: './rag-status-wrapper.component.html',
  styleUrls: ['./rag-status-wrapper.component.scss']
})
export class RagStatusWrapperComponent implements OnInit {

  translation: any;
  subscription = new Subscription();
  dirtyState: boolean = false;
  updatedRagThreshold: string = '';
  updatedOtherRagThreshold: string = '';
  isRagThresholdUpdated = false;
  inError: boolean = false;

  selectedRagThreshold: any[] = [];
  ragThresholdCategoryValueChange = false;
  defaultRagThresholdCategory = null;
  @Input() isWorklogCategoryEnabled: boolean = false;


  @ViewChild(RagStatusComponent) ragStatusComponent!: RagStatusComponent;

  @Input() set ragThresholdCategory(value) {
    this.defaultRagThresholdCategory = value;
    this.populateRAGStatusEmail();
  }

  @Input() ragColors;
  @Input() ragThresholds;
  @Input() sliderConfigs;
  @Input() showAboveText: boolean = true;
  @Input() propKey;
  @Input() burnupRagStatus = false;
  @Input() subHeading;
  @Input() heading;
  @Input() showSpinner: boolean;
  @Input() optimizeButtonsForAdminDashboard: boolean = false;
  @Input() showSkeletalLoading: boolean = false;

  @Input() showOthersRag = false;
  @Input() otherRagThresholds;
  @Input() otherSliderConfigs;

  @Output() onClose = new EventEmitter<boolean>();
  @Output() onDirtyStateChange = new EventEmitter<boolean>();
  @Output() errorState = new EventEmitter<boolean>();
  @Output() configUpdated = new EventEmitter();

  @Input() showSaveAndResetButtons = true;
  @Output() saveButtonDisabled: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() resetButtonVisible: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() anyFieldInError: EventEmitter<boolean> = new EventEmitter<boolean>();

  ragThresholdCategories: any;


  constructor(private confirmationService: ConfirmationService, private store: Store<AppState>, private trackingService: TrackingService, private configService: ConfigService, private cacheService: CacheService) { }

  ngOnInit(): void {

    const configSub = this.configService.isComponentEnabled$(Constants.TEAM_WORKLOG_CATEGORIZATION).subscribe((enabled) => {
      this.isWorklogCategoryEnabled = enabled;
    });

    this.subscription.add(configSub);

    this.subscription.add(this.store.pipe(selectTranslation).subscribe((translation) => {
      this.translation = translation;
      this.ragThresholdCategories = [];
      this.ragThresholdCategories.push({ name: this.translation.ragConfig.ragStatuses.amber, key: Constants.AMBER });
      this.ragThresholdCategories.push({ name: this.translation.ragConfig.ragStatuses.red, key: Constants.RED });
      this.populateRAGStatusEmail();
    }));
  }

  clearMethod(){
    this.ragStatusComponent.clear();
  }

  handleChange(updatedRagThreshold: string) {
    if (updatedRagThreshold !== JSON.stringify(this.ragThresholds)) {
      this.dirtyState = true;
      this.onDirtyStateChange.emit(this.dirtyState);
      this.updatedRagThreshold = updatedRagThreshold;
    } else {
      this.dirtyState = false;
      this.onDirtyStateChange.emit(this.dirtyState);
    }
  }

  modifyRAGThresholdValue(thresholdValue) {
    const newthresholdValue = JSON.parse(thresholdValue);
    const ragStatus = {
      "Medium": 0,
      "Normal": 0
    }
    ragStatus.Normal = newthresholdValue?.Medium;
    ragStatus.Medium = newthresholdValue?.Normal;
    return ragStatus;
  }

  handleChangeForOther(updatedRagThreshold: string) {
    const changedValues = JSON.stringify(this.modifyRAGThresholdValue(updatedRagThreshold))
    if (changedValues !== JSON.stringify(this.otherRagThresholds)) {
      this.dirtyState = true;
      this.onDirtyStateChange.emit(this.dirtyState);
      this.updatedOtherRagThreshold = changedValues;
    } else {
      this.dirtyState = false;
      this.onDirtyStateChange.emit(this.dirtyState);
    }
  }

  handleClear() {
    this.clearMethod();
    this.trackingService.captureUserAction(AdminActions.WorklogRAGSettingsTab.ResetButton);
    this.populateRAGStatusEmail();
    this.dirtyState = false;
    this.onDirtyStateChange.emit(this.dirtyState);
  }

  saveButtonDisabledFunc() {
    const state = !this.dirtyState || this.inError;
    this.saveButtonDisabled.emit(state);
    this.anyFieldInError.emit(this.inError)
    return state;
  }

  resetButtonVisibleFunc() {
    const state = this.dirtyState || this.inError;
    this.resetButtonVisible.emit(state);
    return state;
  }


  handleSave = (calledFromParent = false) => {
    this.cacheService.clearCache();
    this.trackingService.captureUserAction(AdminActions.WorklogRAGSettingsTab.SaveButton);
      this.trackingService.captureUserAction(UserActions.Worklog.RagValuesChanged);
      let propsToUpdate: { propKey: string, propValue: string }[] = [];

      if (this.updatedRagThreshold) propsToUpdate.push({ propKey: this.propKey, propValue: this.updatedRagThreshold });
      if (this.updatedOtherRagThreshold) propsToUpdate.push({ propKey: WORKLOG_OTHER_PERCENTAGE_THRESHOLD, propValue: this.updatedOtherRagThreshold })
      if (this.ragThresholdCategoryValueChange) {
        const selectedValue = this.getSelectValueKeys();
        propsToUpdate.push({ propKey: WORKLOG_RAG_STATUS_CATEGORY_EMAIL, propValue: selectedValue })
      }
      let showToast = true;
      propsToUpdate.forEach(prop => {
        this.store.dispatch(updateConfig({ ...prop, showToast }));
        showToast = false;
      });

    if (!calledFromParent) {
      this.subscription.add(this.store.subscribe((state) => {
        const updatedConfigState = state.globalConfigs.configsUpdatedState;
        if (updatedConfigState[this.propKey]) {
          this.handleConfigUpdated();
          this.store.dispatch(isConfigsUpdated({ propKey: this.propKey, propState: false }));
        }
        if (updatedConfigState[WORKLOG_OTHER_PERCENTAGE_THRESHOLD]) {
          this.handleConfigUpdated();
          this.store.dispatch(isConfigsUpdated({ propKey: WORKLOG_OTHER_PERCENTAGE_THRESHOLD, propState: false }));
        }
        if (updatedConfigState[WORKLOG_RAG_STATUS_CATEGORY_EMAIL]) {
          this.handleConfigUpdated();
          this.store.dispatch(isConfigsUpdated({ propKey: WORKLOG_RAG_STATUS_CATEGORY_EMAIL, propState: false }));
        }
      }));
    }

    this.confirmationService.close();

  };

  handleConfigUpdated() {
    this.dirtyState = false;
    this.onDirtyStateChange.emit(this.dirtyState);
    this.configUpdated.emit();
    this.isRagThresholdUpdated = true;
  }

  handleError(event) {
    this.errorState.emit(event);
    this.inError = event;
  }


  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  /***
   * Method to extract keys form given json array
   */
  private extractKeys(jsonArray) {
    return jsonArray.map(obj => obj.key);
  }

  /***
   * Method to get updated checkboxes value
   */
  changeThresholdCategoryValue() {
    this.trackingService.captureUserAction(AdminActions.WorklogRAGSettingsTab.EmailCheckboxCheck);
    const userRAGEmailSetting = this.defaultRagThresholdCategory ? this.defaultRagThresholdCategory.toUpperCase() : null;
    const keys = this.getSelectValueKeys();
    this.ragThresholdCategoryValueChange = userRAGEmailSetting !== keys;
    this.dirtyState = this.ragThresholdCategoryValueChange;
    this.onDirtyStateChange.emit(this.dirtyState);
  }

  /***
   * Method to get selected checkboxes values
   */
  getSelectValueKeys() {
    let selectedValue = '';
    let includedKeys = this.extractKeys(this.selectedRagThreshold);
    if (includedKeys.includes(Constants.RED) && includedKeys.includes(Constants.AMBER)) {
      selectedValue = Constants.BOTH;
    }
    else if (includedKeys.length == 1) {
      selectedValue = includedKeys[0];
    }
    else {
      selectedValue = null;
    }

    return selectedValue;
  }

  /***
   * Method to populate RAG status checkboxes
   */
  populateRAGStatusEmail() {
    this.selectedRagThreshold = [];
    if (!this.ragThresholdCategories) return;
    if (this.defaultRagThresholdCategory) {
      if (this.defaultRagThresholdCategory.toUpperCase() === Constants.BOTH) {
        this.selectedRagThreshold = this.ragThresholdCategories;
      }
      else if (this.defaultRagThresholdCategory.toUpperCase() === Constants.RED) {
        this.selectedRagThreshold.push(this.ragThresholdCategories[1]);
      }
      else if (this.defaultRagThresholdCategory.toUpperCase() === Constants.AMBER) {
        this.selectedRagThreshold.push(this.ragThresholdCategories[0]);
      }
    }
  }
}
