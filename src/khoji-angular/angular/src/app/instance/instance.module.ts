/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { CommonModule } from '@angular/common';
import { importProvidersFrom, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InstanceComponent } from './instance.component';
import { AppLayoutComponent } from 'app/layout/app.layout.component';
import { RoutesCode } from 'app/interface/routes.enum';
import { AppManagementLayout } from 'app/layout/app.management.layout';
import { StoreModule } from '@ngrx/store';
import { adminReducer } from 'app/admin/state/admin.reducer';
import { EffectsModule } from '@ngrx/effects';
import { AdminEffects } from 'app/admin/state/admin.effects';
import { AuthGuardNewCloudAIImpl } from 'app/core/guards/cloud-auth.guard';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

const route: Routes = [
  {
    path: ':instanceId',
    canActivate: [AuthGuardNewCloudAIImpl],
    component: InstanceComponent,
    children: [
      {
        path: 'build-team',
        canActivate: [AuthGuardNewCloudAIImpl],
        loadComponent: () => import('../onboarding/team-onboarding/team-onboarding.component').then(mod => mod.TeamOnboardingComponent)
      },
      {
        path: 'work-log-categorization',
        canActivate: [AuthGuardNewCloudAIImpl],
        loadComponent: () => import('../onboarding/worklog-categories/worklog-categories.component').then(mod => mod.WorklogCategoriesComponent)
      },
      {
        path: 'feature',
        canActivate: [AuthGuardNewCloudAIImpl],
        component: AppLayoutComponent,
        children: [
          {
            path: 'my-work',
            canActivate: [AuthGuardNewCloudAIImpl],
            loadComponent: () => import('../log-my-work/log-my-work.component')
              .then(mod => mod.LogMyWorkComponent)
          },
          {
            path: 'team-view',
            canActivate: [AuthGuardNewCloudAIImpl],
            loadComponent: () => import('../analysis/team-worklog-analysis/team-worklog-analysis.component').then(
              module => module.TeamWorklogAnalysisComponent
            ),
            data: {
              code: RoutesCode.TEAM_WORKLOG_ANALYSIS,
              preload: true
            }
          }
        ]
      },
      {
        path: 'manage-app',
        canActivate: [AuthGuardNewCloudAIImpl],
        component: AppManagementLayout,
        children: [
          {
            path: '',
            loadComponent: () => import('../instance-admin-panel/instance-admin-panel.component').then(mod => mod.InstanceAdminPanelComponent),
            providers: [
              importProvidersFrom(
                StoreModule.forFeature('admin', adminReducer),
                EffectsModule.forFeature([AdminEffects])
              )
            ]
          }
        ]
      }
    ]
  },
  {
    path: '',
    redirectTo: '/space',
    pathMatch: 'full'
  }
];
@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(route),
    ProgressSpinnerModule
  ],
  declarations: [InstanceComponent],
  exports: [RouterModule]
})
export class InstanceModule { }
