import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { hasToken, isTokenExpired } from 'app/shared/helper-functions';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SessionExpiredGuard  {

  constructor(private router: Router) { }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    if (hasToken() && isTokenExpired()) {
      return true;
    } else {
      return this.router.createUrlTree(['/space']);
    }
  }
}
