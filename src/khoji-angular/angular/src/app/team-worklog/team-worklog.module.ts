/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { CommonModule, NgOptimizedImage } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DropdownsModule } from 'app/dropdowns/dropdowns.module';
import { TeamOnboardingComponent } from 'app/onboarding/team-onboarding/team-onboarding.component';
import { WorklogCategoriesComponent } from 'app/onboarding/worklog-categories/worklog-categories.component';
import { SharedModule } from 'app/shared/shared.module';
import { TeamWorkLogCardsComponent } from 'app/team-worklog/team-work-log-cards/team-work-log-cards.component';
import { NgxEchartsModule } from 'ngx-echarts';
import { AccordionModule } from 'primeng/accordion';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { ManageWorklogCategoriesComponent } from './manage-worklog-categories/manage-worklog-categories.component';
import { MemberWorklogDetailsComponent } from './member-worklog-details/member-worklog-details.component';
import { TeamLoggedTimePercentageAnalysisComponent } from './team-logged-time-percentage-analysis/team-logged-time-percentage-analysis.component';
import { TeamWorklogDistributionAnalysisComponent } from './team-worklog-distribution-analysis/team-worklog-distribution-analysis.component';
import { TimelogRagComponent } from './timelog-rag/timelog-rag.component';
import { StoreModule } from '@ngrx/store';
import { adminReducer } from 'app/admin/state/admin.reducer';
import { EffectsModule } from '@ngrx/effects';
import { AdminEffects } from 'app/admin/state/admin.effects';
import { CreateKhojiTeamsComponent } from 'app/admin/khoji-teams/create-teams/create-khoji-teams.component';
import { WorklogRagSettingsComponent } from './worklog-rag-settings/worklog-rag-settings.component';
import { TeamWorkLoggedPercentageComponent } from './team-work-logged-percentage/team-work-logged-percentage.component';
import { WorklogReminderComponent } from './worklog-reminder/worklog-reminder.component';
import { InputTextareaModule } from 'primeng/inputtextarea';
import {TreeTableModule} from 'primeng/treetable';
import {SkeletonModule} from 'primeng/skeleton';
import { WorklogPopoverTootipComponent } from "./worklog-popover-tootip/worklog-popover-tootip.component";

@NgModule({
  declarations: [
    TeamLoggedTimePercentageAnalysisComponent,
    TeamWorkLogCardsComponent,
    TeamWorklogDistributionAnalysisComponent,
    TeamWorkLoggedPercentageComponent,
    TimelogRagComponent,
    MemberWorklogDetailsComponent,
    ManageWorklogCategoriesComponent,
    WorklogRagSettingsComponent,
    WorklogReminderComponent
  ],
  imports: [
    CommonModule,
    DividerModule,
    RouterModule,
    FormsModule,
    NgxEchartsModule,
    SharedModule,
    TableModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    TooltipModule,
    ToolbarModule,
    RadioButtonModule,
    InputTextModule,
    InputNumberModule,
    DividerModule,
    DropdownsModule,
    ButtonModule,
    CardModule,
    TagModule,
    CheckboxModule,
    AccordionModule,
    TeamOnboardingComponent,
    WorklogCategoriesComponent,
    TreeTableModule,
    CreateKhojiTeamsComponent,
    NgOptimizedImage,
    SkeletonModule,
    ReactiveFormsModule,
    InputTextareaModule,
    StoreModule.forFeature('admin', adminReducer),
    EffectsModule.forFeature([AdminEffects]),
    WorklogPopoverTootipComponent
],
  exports: [
    TeamLoggedTimePercentageAnalysisComponent,
    TeamWorkLogCardsComponent,
    TeamWorklogDistributionAnalysisComponent,
    TeamWorkLoggedPercentageComponent,
    MemberWorklogDetailsComponent,
    ManageWorklogCategoriesComponent,
    WorklogReminderComponent,
    WorklogRagSettingsComponent,
    NgOptimizedImage
  ],
  providers: [ConfirmationService],
})
export class TeamWorklogModule {}
