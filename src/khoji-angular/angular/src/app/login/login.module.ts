/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { ReactiveFormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LoginComponent } from './login.component';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
import { AppConfigModule } from 'app/layout/config/app.config.module';
import { AppBackgroundModule } from 'app/layout/background/app.background.module';
import { AdminEffects } from 'app/admin/state/admin.effects';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
import { adminReducer } from 'app/admin/state/admin.reducer';
import { RecaptchaModule } from 'ng-recaptcha';
import { DateRangeComponent } from "app/dropdowns/date-range/date-range.component";

const route : Routes = [{ path: '', component: LoginComponent }];
@NgModule({
    imports: [
    CommonModule,
    ButtonModule,
    InputTextModule,
    CheckboxModule,
    ReactiveFormsModule,
    FormsModule,
    AppConfigModule,
    RouterModule.forChild(route),
    AppBackgroundModule,
    EffectsModule.forFeature([AdminEffects]),
    StoreModule.forFeature('admin', adminReducer),
    RecaptchaModule,
    DateRangeComponent
],
    declarations: [LoginComponent],
    exports: [RouterModule]
})
export class LoginModule { }
