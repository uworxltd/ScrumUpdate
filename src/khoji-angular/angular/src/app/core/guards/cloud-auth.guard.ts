import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Store } from '@ngrx/store';
import { hasToken, isTokenExpired, saveRedirectUrl } from 'app/shared/helper-functions';
import { AppState } from 'app/states/app-states';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthGuardNewCloudAIImpl {
  constructor(private router: Router, private store: Store<AppState>) { }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    if (hasToken() && !isTokenExpired()) {
      return true;
    }
    else if (hasToken() && isTokenExpired()) {
      saveRedirectUrl();
      this.router.navigate([environment.SESSION_EXPIRED]);
      return false;
    }
    else {
      saveRedirectUrl();
      return this.router.createUrlTree(['/login']);
    }
  }
}
