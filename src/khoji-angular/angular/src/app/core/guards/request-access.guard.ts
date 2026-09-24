/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Store } from '@ngrx/store';
import { HttpErrorInterceptor } from 'app/interceptors/http.interceptor';
import { hasToken } from 'app/shared/helper-functions';
import { selectTranslation } from 'app/states/global-translations.selector';
import { environment } from 'environments/environment';
import { MessageService } from 'primeng/api';
import { Observable, Subscription } from 'rxjs';
import { filter, first, take } from 'rxjs/operators';
import { AppState } from '../../states/app-states';

@Injectable({
  providedIn: 'root'
})
export class RequestAccessGuard implements CanActivate {

  subscription = new Subscription();
  environment = environment;

  constructor(private store: Store<AppState>, private router: Router, private messageService: MessageService) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
    return this._handleUrl(route, state);
  }

  private _handleUrl(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean | UrlTree> {
    return new Promise((res, rej) => {
      const translations$ = this.store.pipe(selectTranslation, filter(value => value !== undefined), take(1));

      this.subscription.add(
        translations$
          .pipe(first())
          .subscribe(translations => {
            res(this._protectRoute(translations));
          })
      );
    });
  }

  private _showToastAndNavigateToTarget(type: string, title: string, subtitle: string, targetRoute: string): UrlTree {
    this.messageService.clear();
    this.messageService.add(
      {
        key: 'message',
        severity: type,
        summary: title,
        detail: subtitle
      }
    );

    return this.router.createUrlTree([targetRoute]);
  }

  private _protectRoute(translation: any): boolean | UrlTree {
    if (sessionStorage.getItem(HttpErrorInterceptor.REQUESTED_INFO)) return true;

    return this._showToastAndNavigateToTarget(
      'info',
      'Info!',
      translation?.accessDenied.accessDeniedDescription,
      environment.LOGIN_PAGE
    );
  }
}
