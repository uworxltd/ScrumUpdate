/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Constants } from 'app/constants';
import { ISSUE_SOURCE_TYPE_CONFIGS, ISSUE_SOURCE_TYPE_FETCH_FREQUENCY, RAG_COLOR_CODES, WORKLOG_DISTRIBUTION, WORKLOG_OTHER_PERCENTAGE_THRESHOLD, WORKLOG_OTHER_RAG_SLIDER_CONFIG, WORKLOG_RAG_STATUS_CATEGORY_EMAIL } from 'app/constants.configs';
import { DropdownItem } from 'app/dropdowns/dropdown-item';
import { IssueType, WorkLogCategory } from 'app/interface/worklog-catagory';
import { WorklogConfigAction, WorklogConfigActionType } from 'app/interface/worklog-config-action';
import { TrackingService, UserActions } from 'app/services/tracking';
import { convertISOtoCustomDateAndTimeFormat, isComponentEnabled, parseParametrizedString, sortDropdownItems } from 'app/shared/helper-functions';
import { AppState, LoadingState } from 'app/states/app-states';
import { fetchSourceIssueTypes, isConfigsUpdated, setWorklogRAGConfigLoadingState, setWorklogRAGEmailLoadingState, updateConfig, updateOtherWorklogRAGThresholdConfig, updateWorklogRAGEmailSetting } from 'app/states/app.actions';
import { getComponentConfigs, selectServerConfig, selectUnassignedIssueTypes, selectWorklogConfigSync } from 'app/states/global-configs.selector';
import { selectSourceIssueTypesLoadingState } from 'app/states/global-process.selector';
import { selectTranslation } from 'app/states/global-translations.selector';
import WorklogDistributionConfig from 'app/types/worklog-distribution.config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subscription, combineLatest } from 'rxjs';
import { SourceIssueTypeConfig } from '../../interface/worklog-catagory';
import { FeatureFlagService } from '../../services/feature.flag.service';
import { KhojiComponent } from 'app/interface/khoji-component.interface';

@Component({
  selector: 'khoji-manage-worklog-categories',
  templateUrl: './manage-worklog-categories.component.html',
  styleUrls: ['./manage-worklog-categories.component.scss'],
})
export class ManageWorklogCategoriesComponent implements OnInit, OnDestroy {
  worklogDialogVisible: boolean;
  workLogCategories: Array<WorkLogCategory> = [];
  dropdownIssueTypes: DropdownItem[] = [];
  translation: any;
  subscription = new Subscription();
  @Output() onClose = new EventEmitter();
  worklogCategoryForm: FormGroup;
  worklogDistribution: { [key: string]: WorklogDistributionConfig; };
  unAssignedIssueTypes: IssueType[] = [];
  editCategory: null | string = '';
  showAddNewHint = false;
  selectedWorklogCategories: WorkLogCategory[] = [];
  @Output() configUpdated = new EventEmitter();
  worklogOthersRow = Constants.WORKLOG_CATEGORY_OTHER;
  workLogSubModalHeading: string;
  constants = Constants;
  showErrorToastMessage = true;

  //sync time stamp and tooltip message
  syncTimeStamp: string = '';
  toolTipText: string = '';


  @Input() isConfigOnSourceUpdated: boolean = false;
  suggestedWorklogActions: WorklogConfigAction[] = [];
  issueTypes: IssueType[] = [];
  deletedIssues: string[] = [];
  editedIssues: string[] = [];

  isNewTenantAdminDashboardEnabled = false;
  @Input() isOnNewTenantAdminPanel = false;

  //Other category variables
  otherCategoryDialogVisible: boolean
  otherCategoryName = Constants.OTHER_CATEGORY_NAME;
  otherRagThresholdConfig = {};
  otherRagSliderConfig: any;
  ragColorCodes: any;
  otherCategoryThresholdPropKey = WORKLOG_OTHER_PERCENTAGE_THRESHOLD;
  ragSliderValueChange = false;
  ragThresholdCategoryValueChange = false;
  selectedRagThreshold: any[] = [];
  ragThresholdCategories: any[] = [];
  updatedRagThreshold: any;
  defaultRagThresholdCategory = null;
  deletingSingleCategory: boolean;
  showSpinner: boolean = true;
  sourceIssueTypeLoadingState: LoadingState;
  componentConfigs: KhojiComponent[];

  constructor(
    private store: Store<AppState>,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private flag: FeatureFlagService, private trackingService: TrackingService
  ) { }

  ngOnInit() {

    const componentConfigs$ = this.store.pipe(getComponentConfigs);

    this.subscription.add(
      componentConfigs$.subscribe((cfgs) => {
        this.componentConfigs = cfgs;
      })
    )

    this.store.dispatch(fetchSourceIssueTypes());
    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe((translation) => {
        this.translation = translation;
        this.ragThresholdCategories = [];
        this.ragThresholdCategories.push({ name: this.translation.ragConfig.ragStatuses.amber, key: Constants.AMBER });
        this.ragThresholdCategories.push({ name: this.translation.ragConfig.ragStatuses.red, key: Constants.RED });
      })
    );

    const unAssignedIssueTypes$ = this.store.pipe(selectUnassignedIssueTypes);
    const worklogDistribution$ = this.store.pipe(selectServerConfig);
    const selectWorklogConfigSync$ = this.store.pipe(selectWorklogConfigSync);
    const sourceIssueTypesLoadingState$ = this.store.pipe(selectSourceIssueTypesLoadingState);
    const loadingState$ = this.store.select('loadingStates');


    this.subscription.add(loadingState$.subscribe(loadingState => {
      if (loadingState.updateWorklogRAGEmailState == LoadingState.Done && loadingState.updateWorklogRAGConfigState == LoadingState.Done) {
        this.isRAGThresholdConfigUpdated();
      }
      else if (loadingState.updateWorklogRAGEmailState == LoadingState.Error || loadingState.updateWorklogRAGConfigState == LoadingState.Error) {
        this.store.dispatch(setWorklogRAGEmailLoadingState({ loadingState: LoadingState.Pending }));
        this.store.dispatch(setWorklogRAGConfigLoadingState({ loadingState: LoadingState.Pending }));
        this.showToastMessage(this.translation.toastMessages.severities.error, this.translation.toastMessages.summaries.error, this.translation.toastMessages.messages.changesNotSaved);
      }
    }));

    this.subscription.add(
      combineLatest([
        unAssignedIssueTypes$,
        worklogDistribution$,
        selectWorklogConfigSync$,
        sourceIssueTypesLoadingState$
      ]).subscribe(
        ([
          unAssignedIssueTypes,
          serverConfig,
          suggestedWorklogActions,
          sourceIssueTypeLoadingState
        ]) => {
          this.sourceIssueTypeLoadingState = sourceIssueTypeLoadingState;
          if (sourceIssueTypeLoadingState === LoadingState.Done) {
            this.issueTypes = serverConfig[ISSUE_SOURCE_TYPE_CONFIGS].sourceIssueTypes;

            this.unAssignedIssueTypes = unAssignedIssueTypes;
            this.worklogDistribution = serverConfig[WORKLOG_DISTRIBUTION];
            this.otherRagSliderConfig = serverConfig[WORKLOG_OTHER_RAG_SLIDER_CONFIG];
            this.otherRagThresholdConfig = this.updatedRagThreshold = serverConfig[WORKLOG_OTHER_PERCENTAGE_THRESHOLD];
            this.ragColorCodes = serverConfig[RAG_COLOR_CODES];
            if (this.otherRagThresholdConfig && this.ragColorCodes && this.otherRagSliderConfig) this.showSpinner = false;
            this.defaultRagThresholdCategory = serverConfig[WORKLOG_RAG_STATUS_CATEGORY_EMAIL];
            this.populateRAGStatusEmail();
            this.suggestedWorklogActions = suggestedWorklogActions;
            this.showAddNewHint = Object.keys(this.worklogDistribution).length < 1;
            this.initializeData();

            //To display source issue frequency and last sync time
            this.showIssueTypesSyncAndTooltipMessage(serverConfig[ISSUE_SOURCE_TYPE_CONFIGS], serverConfig[ISSUE_SOURCE_TYPE_FETCH_FREQUENCY]);
          }
        }
      )
    );

    if (this.flag.isEnabled(this.constants.NEW_TENANT_ADMIN_DASHBOARD_KEY)) {
      this.isNewTenantAdminDashboardEnabled = true;
    }

  }

  private showIssueTypesSyncAndTooltipMessage(sourceIssueTypeConfig: SourceIssueTypeConfig, sourceIssueFrequency: number) {
    //To show last successful time stamp, if time is not available it will show not available message
    this.syncTimeStamp = sourceIssueTypeConfig.lastSuccessfulSyncTime != '' ? this.translation?.workLogConfig.issueSyncMessage + this.getTime(sourceIssueTypeConfig.lastSuccessfulSyncTime) : this.translation?.workLogConfig.noLastSyncTimeMessage;
    this.toolTipText = parseParametrizedString(this.translation?.workLogConfig.issueSyncMessageTooltip, sourceIssueFrequency.toFixed(2).toString());
  }

  private getTime(lastSyncTime: string) {
    return convertISOtoCustomDateAndTimeFormat(lastSyncTime)
  }

  //This check shows the message hint for adding category
  checkIfNoMainCategoryIsAvailable(categories: any) {
    return categories.filter((categories) => categories.name != Constants.WORKLOG_CATEGORY_OTHER).length > 0;
  }

  //custom sort is implemented because the Others (last row) is excluded from sorting
  customSort(event: { data: WorkLogCategory[]; order: number; }) {
    const index = event.data.findIndex((object) => {
      return object.name === Constants.WORKLOG_CATEGORY_OTHER;
    });

    let othersObject;

    if (index != -1) {
      othersObject = event.data.find((config) => config.name == Constants.WORKLOG_CATEGORY_OTHER);
      event.data.splice(index, 1);
    }

    event.data.sort((data1, data2) => {
      let value1 = data1.name;
      let value2 = data2.name;
      let result = null;

      if (value1 == null && value2 != null) result = -1;
      else if (value1 != null && value2 == null) result = 1;
      else if (value1 == null && value2 == null) result = 0;
      else if (typeof value1 === 'string' && typeof value2 === 'string')
        result = value1.localeCompare(value2);

      return event.order * result;
    });

    if (index != -1) {
      event.data.push(othersObject);
    }
  }

  //When user clicks on edit button from row
  updateCategoryIssueTypes(selectedIssueTypes: DropdownItem[]) {
    const updatedIssueTypes: IssueType[] = selectedIssueTypes.map((dropdownItem) => {
      return {
        id: dropdownItem.item_id,
        name: dropdownItem.item_text
      };
    });
    this.worklogCategoryForm.controls['includedIssueTypes'].setValue(updatedIssueTypes);
    this.worklogCategoryForm.controls['includedIssueTypes'].markAsDirty();
  }

  //If user made changes in form and clicks on cancel button
  //from warning modal
  hideDialog() {
    if (this.worklogCategoryForm.dirty && !this.worklogCategoryForm.invalid) {
      this.confirmationService.confirm({
        message: 'Want to save your changes made to the work log distribution?',
        header: 'Warning! Unsaved Changes',
      });
    } else {
      if (this.editCategory) {
        this.editCategory = null;
      }
      this.closeWorklogDialog();
    }
  }

  //When user click on Save from warning modal
  accept() {
    const key = this.worklogCategoryForm.controls['name'].value;
    const description = this.editCategory
      ? this.worklogDistribution[this.editCategory].description
      : '';
    const color = this.editCategory
      ? this.worklogDistribution[this.editCategory].color
      : Constants.NEW_WORKLOG_CATEGORY;
    const issueTypes =
      this.worklogCategoryForm.controls['includedIssueTypes'].value;
    const value: WorklogDistributionConfig = {
      description,
      color,
      issueTypes,
    };
    const propValue = structuredClone(this.worklogDistribution);
    if (this.editCategory) {
      delete propValue[this.editCategory];
    }
    propValue[key] = value;
    this.saveCategory(JSON.stringify(propValue));
    this.confirmationService.close();
  }

  //When user click on Don't Save from warning modal
  reject() {
    if (this.editCategory) {
      this.editCategory = null;
    }
    this.closeWorklogDialog();
    this.confirmationService.close();
  }

  //When the work log category is closed with cross icon
  closeModal() {
    this.onClose.emit();
  }

  //Method that updates the configuration
  saveCategory = (propValue: string) => {
    this.trackingService.captureUserAction(UserActions.Worklog.WorklogCategoriesChanged);
    this.store.dispatch(updateConfig({ propKey: WORKLOG_DISTRIBUTION, propValue }));
    this.subscription.add(this.store.subscribe((state) => {
      if (state.globalConfigs.configsUpdatedState[WORKLOG_DISTRIBUTION]) {
        this.configUpdated.emit();
        this.closeWorklogDialog();
        this.editCategory = null;
        this.store.dispatch(isConfigsUpdated({ propKey: WORKLOG_DISTRIBUTION, propState: false }));
      }
    }));

  };

  //This method is responsible for showing data in modal
  //for editing
  editWorklogCategory = (worklogCategory: WorkLogCategory) => {
    this.editCategory = worklogCategory.name;
    const includedIssueTypes =
      this.worklogDistribution[this.editCategory].issueTypes;
    this.dropdownIssueTypes = includedIssueTypes.map(({ id, name }) => ({
      item_id: id,
      item_text: name,
      item_selected: true,
    }));
    this.dropdownIssueTypes = this.dropdownIssueTypes.concat(
      this.getUnassignedDropdownItems()
    );
    this.sortDropdownIssueTypes();
    this.worklogCategoryForm = new FormGroup({
      name: new FormControl(worklogCategory.name, [
        Validators.required,
        Validators.minLength(Constants.CATEGORY_MIN_LENGTH),
        Validators.maxLength(Constants.CATEGORY_MAX_LENGTH),
        this.duplicateCategoryValidator,
        this.invalidInputValidator(
          Constants.INVALID_WORKLOG_CATEGORY_NAME_REGEX
        ),
      ]),
      includedIssueTypes: new FormControl(includedIssueTypes),
    });
    this.showWorklogDialog(
      this.translation.workLogConfig.editNewCategoryHeader
    );
  };

  //This method displays empty form
  newWorklogCategory = () => {
    this.dropdownIssueTypes = this.getUnassignedDropdownItems();
    this.sortDropdownIssueTypes();
    this.worklogCategoryForm = new FormGroup({
      name: new FormControl('', [
        Validators.required,
        Validators.minLength(Constants.CATEGORY_MIN_LENGTH),
        Validators.maxLength(Constants.CATEGORY_MAX_LENGTH),
        this.duplicateCategoryValidator,
        this.invalidInputValidator(Constants.INVALID_WORKLOG_CATEGORY_NAME_REGEX)
      ]),

      includedIssueTypes: new FormControl([]),
    });
    //Reinitializing edit category to null
    this.editCategory = null;
    this.showWorklogDialog(this.translation.workLogConfig.addNewCategoryHeader);
  };

  //This method shows errors from translations according to condition
  categoryNameError = () => {
    const worklogCategory = this.worklogCategoryForm.controls['name'];

    const invalid =
      worklogCategory.invalid &&
      (worklogCategory.dirty || worklogCategory.touched);
    if (worklogCategory.hasError('maxlength')) {
      return this.translation.adminPanel.projectIntegration.users.fieldErrors.teamNameValidation.lengthLimitExceed;
    }
    else if (worklogCategory.hasError("minlength")) {
      return parseParametrizedString(this.translation.adminPanel.projectIntegration.users.fieldErrors.teamNameValidation.minimumLengthError, Constants.CATEGORY_MIN_LENGTH);
    }
    else if (invalid) {
      if (worklogCategory.errors.required || worklogCategory.errors.minLength)
        return this.translation?.workLogConfig.modalNameRequiredError;
      if (worklogCategory.errors.duplicateCategory)
        return this.translation?.workLogConfig.modalDuplicateNameError;
      if (worklogCategory.errors.invalidInput)
        return this.translation?.workLogConfig.invalidInput;
    } else {
      return null;
    }
  };

  //Method to get issue types which are not the part of
  //any main category
  private getUnassignedDropdownItems = () =>
    this.unAssignedIssueTypes.map<DropdownItem>(({ id, name }) => ({
      item_id: id,
      item_text: name,
    }));

  //Others check is hardcoded for now, It is because of the existing
  //implementation is not allowing to set user
  private duplicateCategoryValidator = (control) =>
    Boolean(
      Object.keys(this.worklogDistribution).find(
        (key) =>
          key.toLowerCase() !== this.editCategory?.toLowerCase() &&
          key.toLowerCase() === control.value.toLowerCase()
      )
      || control.value.toLowerCase() === Constants.WORKLOG_CATEGORY_OTHER.toLowerCase()
      || control.value.toLowerCase() === 'others'
    )
      ? { duplicateCategory: true }
      : null;

  private showWorklogDialog = (title: string) => {
    this.workLogSubModalHeading = title;
    this.worklogDialogVisible = true;
  };

  private closeWorklogDialog = () => {
    this.worklogDialogVisible = false;
  };

  private invalidInputValidator = (regex: RegExp) => {
    return (control) =>
      regex.test(control.value) ? null : { invalidInput: true };
  };

  //Method to delete category
  deleteWorklogCategory = (worklogCategory: WorkLogCategory) => {
    const accept = () => {
      const propValue = { ...this.worklogDistribution };
      delete propValue[worklogCategory.name];
      this.selectedWorklogCategories = this.selectedWorklogCategories.filter(category => category.name !== worklogCategory.name);
      this.saveCategory(JSON.stringify(propValue));
    };
    this.deletingSingleCategory = true;
    this.confirmDelete(accept);
  };

  //Method to delete selected categories from check boxes
  deleteSelectedCategories = () => {
    const accept = () => {
      const propValue = { ...this.worklogDistribution };
      this.selectedWorklogCategories.forEach(
        ({ name }) => delete propValue[name]
      );
      this.selectedWorklogCategories = [];
      this.saveCategory(JSON.stringify(propValue));
    };
    this.deletingSingleCategory = this.selectedWorklogCategories.length === 1 ? true : false;
    this.confirmDelete(accept);
  };

  updateWorklogConfig = () => {
    const deletedIssuesIds = this.suggestedWorklogActions
      .filter(({ action }) => action === WorklogConfigActionType.DELETE)
      .map(({ issueType: { id } }) => id);
    const editedIssuesIds = this.suggestedWorklogActions
      .filter(({ action }) => action === WorklogConfigActionType.EDIT)
      .map(({ issueType: { id } }) => id);
    const propValue = Object.keys(this.worklogDistribution).reduce<{
      [key: string]: WorklogDistributionConfig;
    }>((previousValue, key) => {
      const distribution = this.worklogDistribution[key];
      previousValue[key] = {
        ...distribution,
        issueTypes: distribution.issueTypes
          .filter(({ id }) => !deletedIssuesIds.includes(id))
          .map((issueType) =>
            editedIssuesIds.includes(issueType.id)
              ? this.issueTypes.find(({ id }) => issueType.id === id)
              : issueType
          ),
      };
      return previousValue;
    }, {});
    this.saveCategory(JSON.stringify(propValue));
  };

  private confirmDelete = (accept: Function) => {
    this.confirmationService.confirm({
      key: 'delete',
      header: this.deletingSingleCategory ? this.translation?.workLogConfig.deleteConfirmationHeader : this.translation?.workLogConfig.deleteConfirmationHeaderForMultipleCategories,
      message: this.deletingSingleCategory ? this.translation?.workLogConfig.deleteConfirmation : this.translation?.workLogConfig.deleteConfirmationForMultipleCategories,
      accept,
      acceptLabel: this.translation?.workLogConfig.yes,
      rejectLabel: this.translation?.workLogConfig.cancel
    });
  };

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  onColorSelected(selectedColor: string, category: string) {
    let propValue = structuredClone(this.worklogDistribution);
    propValue[category].color = selectedColor;
    this.saveCategory(JSON.stringify(propValue));
  }

  private sortDropdownIssueTypes() {
    this.dropdownIssueTypes = sortDropdownItems(this.dropdownIssueTypes);
  }

  getMappedIssueTypesToName(issuetypes: IssueType[]) {
    return issuetypes.map(({ name }) => name);
  }

  private initializeData = () => {
    this.deletedIssues = this.suggestedWorklogActions
      .filter(({ action }) => action === WorklogConfigActionType.DELETE)
      .map(({ issueType }) => issueType.id);

    this.editedIssues = this.suggestedWorklogActions
      .filter(({ action }) => action === WorklogConfigActionType.EDIT)
      .map(({ issueType }) => issueType.id);

    this.workLogCategories = Object.keys(
      this.worklogDistribution
    ).map<WorkLogCategory>((key) => {

      const issueTypes = this.worklogDistribution[key].issueTypes;

      const editedIssues = issueTypes.filter(({ id }) =>
        this.editedIssues.includes(id)
      );

      const deletedIssues = issueTypes.filter(({ id }) =>
        this.deletedIssues.includes(id)
      );

      const remainingIssues = issueTypes.filter(
        ({ id }) => !editedIssues.map(({ id }) => id).includes(id) && !deletedIssues.map(({ id }) => id).includes(id)
      );

      const includedIssueTypes = [
        ...editedIssues,
        ...deletedIssues,
        ...remainingIssues,
      ]
        .map(issueType => {
          const obj = { ...issueType };
          obj.toString = () => obj.name;
          return obj;
        });

      return { name: key, color: this.worklogDistribution[key].color, includedIssueTypes, order: undefined };
    });

    this.workLogCategories.push({
      name: Constants.WORKLOG_CATEGORY_OTHER,
      color: Constants.OTHERS,
      includedIssueTypes: this.unAssignedIssueTypes,
    });

  };

  private showToastMessage(severity: string, title: string, subTitle: string) {
    this.messageService.clear();
    this.messageService.add(
      {
        key: "message",
        severity: severity,
        summary: title,
        detail: subTitle
      }
    )
  }
  //This method is responsible for showing data in other category modal
  //for editing
  editOtherCategory = (worklogCategory: WorkLogCategory) => {
    this.editCategory = worklogCategory.name;
    const includedIssueTypes = worklogCategory.includedIssueTypes;
    this.dropdownIssueTypes = includedIssueTypes.map(({ id, name }) => ({
      item_id: id,
      item_text: name,
      item_selected: true,
    }));
    this.dropdownIssueTypes = this.dropdownIssueTypes.concat(
      this.getUnassignedDropdownItems()
    );

    this.sortDropdownIssueTypes();
    this.showOtherCategoryDialog(
      this.translation.workLogConfig.editNewCategoryHeader
    );
  };


  /***
   * Method to show other category dialog box
   */
  private showOtherCategoryDialog = (title: string) => {
    this.workLogSubModalHeading = title;
    this.otherCategoryDialogVisible = true;
  };

  /***
   * Method to close other category dialog box
   */
  private closeOtherCategoryDialog = () => {
    this.ragSliderValueChange = false;
    this.ragThresholdCategoryValueChange = false;
    this.otherCategoryDialogVisible = false;
  };

  /***
   * Method to modify RAG threshold value
   * Because in case of other rag threshold value For example normal: 25, medium:50
   * So Khoji rag slider show unexpected behavior on these values. It works fine for normal:50, medium:25
   */
  modifyRAGThresholdValue(thresholdValue) {
    const ragStatus = {
      "Medium": 0,
      "Normal": 0
    }
    ragStatus.Normal = thresholdValue?.Medium;
    ragStatus.Medium = thresholdValue?.Normal;
    return ragStatus;
  }

  /***
   * Method to get updated threshold value from RAG slider
   */
  sliderValueChanged(event: any) {
    this.updatedRagThreshold = this.modifyRAGThresholdValue(JSON.parse(event));
    this.ragSliderValueChange = true;
  }

  /***
   * Method to upsert updated data
   */
  saveOtherCategoryData() {
    const selectedValue = this.getSelectValueKeys();
    this.store.dispatch(updateWorklogRAGEmailSetting({ ragEmailSetting: selectedValue }));
    this.store.dispatch(updateOtherWorklogRAGThresholdConfig({ thresholdConfig: this.updatedRagThreshold }));
  }

  /***
   * Method to populate RAG status checkboxes
   */
  populateRAGStatusEmail() {
    this.selectedRagThreshold = [];
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

  /***
   * Method to enable submit button
   */
  enableSubmitButton() {
    return this.ragSliderValueChange || this.ragThresholdCategoryValueChange;
  }

  closeOtherCategoryModal() {
    if (this.enableSubmitButton()) {
      this.confirmationService.confirm({
        key: 'otherCategoryConfirm',
        header: this.translation.ragConfig.warningDialog.header,
        message: this.translation.ragConfig.warningDialog.burnupRagMessage,
        acceptLabel: this.translation.ragConfig.warningDialog.acceptLabel,
        rejectLabel: this.translation.ragConfig.warningDialog.rejectLabel
      });
    }
    else {
      this.closeOtherCategoryDialog();
    }
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
    const userRAGEmailSetting = this.defaultRagThresholdCategory ? this.defaultRagThresholdCategory.toUpperCase() : null;
    const keys = this.getSelectValueKeys();
    this.ragThresholdCategoryValueChange = userRAGEmailSetting !== keys;
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
   * Method to check if both threshold and RAG email values are successfully updated
   */
  isRAGThresholdConfigUpdated() {
    this.closeOtherCategoryDialog();
    this.ragThresholdCategoryValueChange = false;
    this.ragSliderValueChange = false
    this.showToastMessage(this.translation.toastMessages.severities.success, this.translation.toastMessages.summaries.success, this.translation.toastMessages.messages.changesSaved);
    this.store.dispatch(setWorklogRAGEmailLoadingState({ loadingState: LoadingState.Pending }));
    this.store.dispatch(setWorklogRAGConfigLoadingState({ loadingState: LoadingState.Pending }));
  }

  /***
   *  Method to close confirmation modal and save changes
   */
  onTabSwitchConfirm() {
    this.saveOtherCategoryData();
    this.confirmationService.close();
  }

  /***
   * Method to close both modals (confirmation + worklog category)
   */
  onTabSwitchReject() {
    this.updatedRagThreshold = this.otherRagThresholdConfig;
    this.populateRAGStatusEmail();
    this.confirmationService.close();
    this.closeOtherCategoryDialog();
  }

  /***
   * Method to close confirmation modal
   */
  tabSwitchCloseIconClick() {
    this.confirmationService.close();
  }

  otherCategoryShowHide(worklogCategory: WorkLogCategory) {
    if (worklogCategory.name == this.worklogOthersRow) return isComponentEnabled(this.componentConfigs, Constants.KHOJI_USER_EMAIL_SETTINGS);
    else return true;
  }

  setEditButtonState(category: WorkLogCategory) {
    if (category.name == this.worklogOthersRow && category.includedIssueTypes.length == 0) {
      return true;
    }
    else {
      return false;
    }
  }

  showTooltipOnDropdown(dropdownItems: DropdownItem[]) {
    let issuesList = [];
    dropdownItems.filter(issues => issuesList.push(issues.item_text));
    issuesList = [...new Set(issuesList)];
    return issuesList.toString().replace(Constants.COMMA_WITH_SPACE_REGEX, ", ");
  }

}

