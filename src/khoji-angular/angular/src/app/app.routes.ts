/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/



import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, Routes } from '@angular/router';
import { AuthGuardNewCloudAIImpl } from './core/guards/cloud-auth.guard';
import { Routes as Route } from './interface/routes.enum';
import { AppProfileSidebarLayoutComponent } from './layout/app.profilesidebar.layout.component';
import { NotAuthenticatedGuard } from './core/guards/not-authenticated.guard';
import { SessionExpiredGuard } from './core/guards/session-expired.guard';
import { RouteHistoryService } from './services/route-history.service';
import { inject } from '@angular/core';
import { IntegrationLoadingComponent } from './integration-loading/integration-loading/integration-loading.component';
import { LinkToMSTeamsComponent } from './link-to-msteams/link-to-msteams.component';

const canActivateAccessDenied: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const enableNav = inject(RouteHistoryService).isAccessDenidedTemplateEnabled();
  if (enableNav) return true;
  else inject(Router).navigate(['/login']);
  return false;
};

export const routes: Routes = [
  {
    path: Route.LOGIN,
    canActivate: [NotAuthenticatedGuard],
    loadChildren: () => import('./login/login.module').then(
      module => module.LoginModule
    )
  },
  {
    title: 'Onboarding',
    path: Route.ONBOARDING,
    loadComponent: () => import('./onboarding/onboarding.component').then(c => c.OnboardingComponent),
    children: [
      {
        title: 'Choose Role',
        path: 'choose-role',
        loadComponent: () => import('./onboarding/choose-role/choose-role.component').then(c => c.ChooseRoleComponent)
      }
    ]
  },
  {
    path: Route.SPACE,
    canActivate: [AuthGuardNewCloudAIImpl],
    loadChildren: () => import('./space/space.module').then(
      module => module.SpaceModule
    )
  },
  {
    path: Route.USER_PROFILE,
    component: AppProfileSidebarLayoutComponent,
    canActivate: [AuthGuardNewCloudAIImpl],
    loadChildren: () => import('./user-profile/user-profile.module').then(
      module => module.UserProfileModule
    ),
  },
  {
    path: Route.SESSION_EXPIRED,
    canActivate: [SessionExpiredGuard],
    loadChildren: () => import('./session-expired/session-expired.module').then(
      module => module.SessionExpiredModule
    )
  },
  {
    path: Route.ACCESS_DENIED,
    canActivate: [canActivateAccessDenied],
    loadChildren: () => import('./accessdenied/accessdenied.module').then(
      module => module.AccessdeniedModule
    )
  },
  {
    path: Route.INTEGRATING,
    component: IntegrationLoadingComponent
  },
  {
    path: Route.LINK_TO_MS_TEAMS_STATUS,
    canActivate: [AuthGuardNewCloudAIImpl],
    component: LinkToMSTeamsComponent,
  },
  {
    path: '**',
    redirectTo: Route.LOGIN,
    pathMatch: 'full'
  }
];
