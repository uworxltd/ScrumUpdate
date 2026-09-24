/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileComponent } from './profile/profile.component';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgxSpinnerModule } from 'ngx-spinner';
import { SharedModule } from 'app/shared/shared.module';
import { EffectsModule } from '@ngrx/effects';
import { ChangeSettingComponent } from './change-setting/change-setting.component';
import { StoreModule } from '@ngrx/store';
import { userProfileReducer } from './state/user-profile.reducer';
import { UserProfileEffect } from './state/user-profile.effects';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { AppConfigModule } from 'app/layout/config/app.config.module';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { TabViewModule } from 'primeng/tabview';
import { ManageSubscriptionComponent } from './manage-subscription/manage-subscription.component';
import { UpdateProfileComponent } from './update-profile/update-profile.component';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ConfirmationService } from 'primeng/api';
import { DeleteAccountComponent } from './delete-account/delete-account.component';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';

const routes: Routes = [
  { path: '', component: ProfileComponent }
];

@NgModule({
  declarations: [
    ProfileComponent,
    ChangeSettingComponent,
    ManageSubscriptionComponent,
    UpdateProfileComponent
  ],
  imports: [
    CommonModule,
    CheckboxModule,
    ButtonModule,
    AppConfigModule,
    RippleModule,
    InputTextModule,
    RouterModule.forChild(routes),
    FormsModule,
    RadioButtonModule,
    NgxSpinnerModule,
    SharedModule,
    StoreModule.forFeature('userProfile', userProfileReducer),
    EffectsModule.forFeature([UserProfileEffect]),
    TabViewModule,
    DeleteAccountComponent,
    DialogModule,
    TooltipModule
  ],
  providers: [ConfirmationService]
})
export class UserProfileModule { }
