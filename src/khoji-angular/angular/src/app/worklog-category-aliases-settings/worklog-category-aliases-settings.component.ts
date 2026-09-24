/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AppState, EvalConfig } from 'app/states/app-states';
import { Store } from '@ngrx/store';
import { selectServerConfig, selectWorkLogGeneralSettings } from 'app/states/global-configs.selector';
import { WORKLOG_DISTRIBUTION, WORKLOG_MAIN_CATEGORIES_ALIAS, WORKLOG_OTHER_CATEGORIES_ALIAS } from 'app/constants.configs';
import { updateEvalConfigInBatch } from 'app/states/app.actions';
import { selectTranslation } from 'app/states/global-translations.selector';
import { InputTextModule } from 'primeng/inputtext';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'khoji-worklog-category-aliases-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule],
  templateUrl: './worklog-category-aliases-settings.component.html',
  styleUrls: ['./worklog-category-aliases-settings.component.scss']
})
export class WorklogCategoryAliasesSettingsComponent implements OnInit, OnDestroy {
  subscription = new Subscription();
  translation;
  defaultProductiveAlias: string = '';
  productiveAlias: string = '';
  productiveAliasInError: boolean = false;
  productiveErrorMessage: string;
  defaultNonProductiveAlias: string = '';
  nonProductiveAlias: string = '';
  nonProductiveErrorMessage: string;
  nonProductiveAliasInError: boolean = false;
  namesNotAllowedForAlias;
  productiveAliasValidated = '';
  settingsChanged = false;
  @Output() settingsUpdated = new EventEmitter<void>();

  constructor(private store: Store<AppState>) {}

  ngOnInit(): void {
    const translation$ = this.store.pipe(selectTranslation);
    const workLogHoursPerDay$ = this.store.pipe(
      selectWorkLogGeneralSettings,
      filter((cfg) => cfg.productiveAlias)
    );
    const serverConfigs$ = this.store.pipe(selectServerConfig);

    this.subscription.add(translation$.subscribe((t) => (this.translation = t)));

    this.subscription.add(
      workLogHoursPerDay$.subscribe((cfg) => {
        if (this.hasChanges() && !this.settingsChanged) return;
        this.settingsChanged = false;
        this.productiveAlias = this.productiveAliasValidated = this.defaultProductiveAlias = cfg.productiveAlias;
        this.nonProductiveAlias = this.defaultNonProductiveAlias = cfg.nonProductiveAlias;
      })
    );

    this.subscription.add(
      serverConfigs$.subscribe((serverConfig) => {
        this.namesNotAllowedForAlias = Object.keys(serverConfig[WORKLOG_DISTRIBUTION]);
      })
    );
  }

  protected checkForErrorInAlias(value, field) {
    value = value ? value.trim() : value;
    const regex = /^[A-Za-z ]{1,16}$/;
    const aliasNameError = this.namesNotAllowedForAlias.some((item) => item.toLowerCase() === value.toLowerCase());

    if (field === 'P') {
      if (regex.test(value) && !aliasNameError) {
        this.productiveAliasInError = false;
      } else {
        this.productiveAliasInError = true;
        if (!value) {
          this.productiveErrorMessage = this.translation?.generalSettings.requiredAliasNameError;
        } else this.productiveErrorMessage = aliasNameError ? this.translation?.generalSettings.duplicateAliasNameError : this.translation?.generalSettings.alphabetOnlyErrorMessage;
      }
    } else {
      if (regex.test(value) && !aliasNameError) {
        this.nonProductiveAliasInError = false;
      } else {
        this.nonProductiveAliasInError = true;
        if (!value) {
          this.nonProductiveErrorMessage = this.translation?.generalSettings.requiredAliasNameError;
        } else this.nonProductiveErrorMessage = aliasNameError ? this.translation?.generalSettings.duplicateAliasNameError : this.translation?.generalSettings.alphabetOnlyErrorMessage;
      }
    }
  }

  saveChanges() {
    if (!this.hasChanges()) return;

    this.settingsUpdated.emit();

    let props: EvalConfig[] = [];

    props.push({ propKey: WORKLOG_MAIN_CATEGORIES_ALIAS, propValue: this.productiveAlias });
    props.push({ propKey: WORKLOG_OTHER_CATEGORIES_ALIAS, propValue: this.nonProductiveAlias });

    this.store.dispatch(updateEvalConfigInBatch({ props }));
    this.settingsChanged = true;
  }

  reset() {
    if (!this.hasChanges()) return;
    
    this.productiveAlias = this.productiveAliasValidated = this.defaultProductiveAlias;
    this.nonProductiveAlias = this.defaultNonProductiveAlias;
    this.productiveAliasInError = false;
    this.nonProductiveAliasInError = false;
  }

  hasErrors() {
    return this.productiveAliasInError || this.nonProductiveAliasInError;
  }

  hasChanges() {
    return this.productiveAlias !== this.defaultProductiveAlias || this.nonProductiveAlias !== this.defaultNonProductiveAlias;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
