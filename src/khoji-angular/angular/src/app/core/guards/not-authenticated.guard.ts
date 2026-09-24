/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from "@angular/router";
import { Routes } from "app/interface/routes.enum";
import { hasToken, isTokenExpired } from "app/shared/helper-functions";
import { environment } from "environments/environment";

/*
  This guard protects the /login route to be accessed if the user is already logged in.
*/
@Injectable({
  providedIn: 'root'
})
export class NotAuthenticatedGuard {

  constructor(
    private router: Router,
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (this.isLoginPageAndAnySpecificQueryParamsExists(['code', 'error', 'error_description'])) {
      const queryParams = state.root.queryParams;
      this.router.navigate(['integrating'], { queryParams });
      return false;
    }

    if (this.isLoginPageAndAnySpecificQueryParamsExists(['tab', 'instanceId', 'instance', 'feature'])) {
      var queryParams = state.root.queryParams;
      if (queryParams) localStorage.setItem('queryParamsForAfterLoginNav', JSON.stringify(queryParams));
    }

    if (location.pathname === '/login' && location.search.includes('redirect=msft-teams')) {
      localStorage.setItem('msft-teams', location.search);
      localStorage.setItem(environment.REDIRECT_URL + "msft-teams", "/" + Routes.LINK_TO_MS_TEAMS_STATUS);
    }

    if (hasToken() && !isTokenExpired()) {
      localStorage.removeItem('queryParamsForAfterLoginNav');
      // this.router.navigate(['/space'], { queryParams });
      return true;
    } else if (hasToken() && isTokenExpired()) {
      this.router.navigate([environment.SESSION_EXPIRED]);
      return false;
    }

    return true;
  }

  isLoginPageAndAnySpecificQueryParamsExists(specificQueryParams: string[]) {
    const currentUrl = new URL(window.location.href);
    if (currentUrl.pathname.includes('login')) {
      return specificQueryParams.some(queryParam => currentUrl.search.includes(queryParam));
    }
    return false;
  }
}
