import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
import { AdminEffects } from 'app/admin/state/admin.effects';
import { adminReducer } from 'app/admin/state/admin.reducer';
import { DropdownsModule } from 'app/dropdowns/dropdowns.module';
import { Routes as Route } from 'app/interface/routes.enum';
import { PicklistModule } from 'app/shared/picklist/picklist.module';
import { SharedModule } from 'app/shared/shared.module';
import { SplitContainerComponent } from 'app/shared/split-container/split-container.component';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { RadioButtonModule } from 'primeng/radiobutton';
import { StepsModule } from 'primeng/steps';
import { OnboardingDashboardComponent } from './dashboard/dashboard.component';
import { TeamOnboardingComponent } from './team-onboarding/team-onboarding.component';
import { WorklogCategoriesComponent } from './worklog-categories/worklog-categories.component';
import { NgOptimizedImage } from '@angular/common';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

const routes: Routes = [{
  path: Route.TEAM_SETUP,
  component: OnboardingDashboardComponent,
}];

@NgModule({
  declarations: [
    OnboardingDashboardComponent,
  ],
  imports: [
    StepsModule,
    PicklistModule,
    FormsModule,
    ProgressSpinnerModule,
    RadioButtonModule,
    CommonModule,
    FormsModule,
    ChipModule,
    DropdownsModule,
    ButtonModule,
    CardModule,
    NgOptimizedImage,
    WorklogCategoriesComponent,
    TeamOnboardingComponent,
    SplitContainerComponent,
    SharedModule,
    RouterModule.forChild(routes),
    StoreModule.forFeature('admin', adminReducer),
    EffectsModule.forFeature([AdminEffects])
  ],
})
export class OnboardingModule { }
