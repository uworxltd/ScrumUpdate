/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SpaceComponent } from './space.component';
import { AppLayoutComponent } from 'app/layout/app.layout.component';
import { SpaceRedirectorComponent } from './space-redirector/space-redirector.component';
import { AuthGuardNewCloudAIImpl } from 'app/core/guards/cloud-auth.guard';

export const JIRA_INSTANCES_URL = 'jira-instances';
const route: Routes = [
  {
    path: ':spaceId',
    canActivate: [AuthGuardNewCloudAIImpl],
    component: SpaceComponent,
    children: [
      {
        path: 'instance',
        canActivate: [AuthGuardNewCloudAIImpl],
        loadChildren: () => import('../../app/instance/instance.module').then(m => m.InstanceModule)
      },
      {
        path: 'jira-instances',
        loadComponent: () => import('../jira-instances/jira-instances.component').then(mod => mod.JiraInstancesComponent)
      },
      {
        path: 'account-setup',
        canActivate: [AuthGuardNewCloudAIImpl],
        loadComponent: () => import('../account-setup/account-setup.component').then(mod => mod.AccountSetupComponent)
      },
      {
        path: 'user-pains/:featureId',
        canActivate: [AuthGuardNewCloudAIImpl],
        loadComponent: () => import('../onboarding/user-pains/user-pains.component').then(mod => mod.UserPainsComponent)
      },
      {
        path: 'invite-error',
        canActivate: [AuthGuardNewCloudAIImpl],
        loadComponent: () => import('../invite-error-template/invite-error-template.component').then(mod => mod.InviteErrorTemplateComponent)
      },
      {
        path: 'home',
        canActivate: [AuthGuardNewCloudAIImpl],
        component: AppLayoutComponent,
        children: [
          {
            path: '',
            loadComponent: () => import('../../app/home/home.component').then(mod => mod.HomeComponent)
          }
        ]
      },
      {
        path: '**',
        redirectTo: '/space',
        pathMatch: 'full'
      }
    ],
  },
  {
    path: '',
    component: SpaceRedirectorComponent
  }
];
@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(route),
  ],
  declarations: [SpaceComponent, SpaceRedirectorComponent],
  exports: [RouterModule]
})
export class SpaceModule { }
