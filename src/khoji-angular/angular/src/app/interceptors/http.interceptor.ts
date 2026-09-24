/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Observable, throwError } from 'rxjs';
import { catchError, takeUntil, tap } from 'rxjs/operators';
import { HttpRequest, HttpHandler, HttpResponse, HttpEvent } from '@angular/common/http';
import { HttpInterceptor } from '@angular/common/http';
import { Injectable } from "@angular/core";
import { MessageService } from 'primeng/api';
import { environment } from 'environments/environment';
import { Constants } from 'app/constants';
import { Store } from '@ngrx/store';
import { AppState, LoadingState } from 'app/states/app-states';
import { cancelAllRequests, discardSentCallsAfterNavigate, fetchUserSetting, resetLoadingStates } from 'app/states/app.actions';
import { FieldError } from 'app/admin/admin.models';
import { setSourceProjectsLoadingState, setSourceUsersLoadingState } from 'app/admin/state/admin.actions';
import { resetAdminStateToDefault } from 'app/admin/state/admin.actions';
import { Subscription } from 'rxjs';
import { selectTranslation } from 'app/states/global-translations.selector';
import { Router } from '@angular/router';
import { hasTheSameAccessLevel, isTokenExpired, hasToken, clearLocalStorage } from 'app/shared/helper-functions';
import { KhojiSpinnerService } from 'app/services/spinner.service';
import { ComponentVisibilityService } from 'app/services/component.visibility.service';
import { RouteHistoryService } from 'app/services/route-history.service';
import { JiraService } from 'app/services/jira.service';
import { Actions, ofType } from '@ngrx/effects';


/**
 * Interceptor for handling all server requests made by the Khoji application.
 * This interceptor is responsible for fetching the authorization header (token)
 * from Khoji's business server requests and updating it in local storage.
 *
 * If there is an error, the handleError method checks for an expired token in
 * the response headers. If the subscription is expired, the interceptor updates
 * the token. The expired token is available in the response headers along with a
 * 401 status code. If there is no access, only a 401 status code is returned and
 * the same token already available in the browser is used.
 */

@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {

  subscription = new Subscription();
  translation: any;

  static REQUESTED_INFO = 'requested_info';

  constructor(
    private messageService: MessageService,
    private store: Store<AppState>,
    private router: Router,
    private spinner: KhojiSpinnerService,
    private componentVisibilityService: ComponentVisibilityService,
    private rhs: RouteHistoryService,
    private actions$: Actions,
    private jiraService: JiraService
  ) { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const instanceId = sessionStorage.getItem(Constants.INSTANCE_ID);

    if (instanceId) {
      request = request.clone({
        setHeaders: {
          'instance_id': instanceId,
        }
      });
    }

    return next.handle(request).pipe(
      // below code cancels all http requests
      takeUntil(this.actions$.pipe(ofType(cancelAllRequests))),
      // TDOD: update the logic behind adding the refresh token after taking the consent from the user
      tap((response: HttpResponse<any>) => {
        if (response instanceof HttpResponse && response.headers != null) {
          const token = response.headers.get('Authorization');
          const refresh_token = response.headers.get('Refresh_token');


          if (refresh_token) {
            const token = localStorage.getItem('Refresh_token');
            if (token) {
              let array: string[] = JSON.parse(token);
              array.push(refresh_token);
              localStorage.setItem('Refresh_token', JSON.stringify(array));
            } else localStorage.setItem('Refresh_token', JSON.stringify([refresh_token]));
          }

          if (token) {
            const storedToken = localStorage.getItem(Constants.TOKEN_SESSION_KEY);
            if (storedToken && !hasTheSameAccessLevel(storedToken, Constants.TOKEN_SESSION_START_VALUE + token)) {
              //to get the updated user profile due to access change
              this.store.dispatch(fetchUserSetting({ force: true }));
            }
            localStorage.removeItem(Constants.TOKEN_SESSION_KEY);
            localStorage.setItem(Constants.TOKEN_SESSION_KEY, Constants.TOKEN_SESSION_START_VALUE + token);
          }
        }
      }),
      catchError((errResponse) => {
        const refresh_token = errResponse.headers.get('Refresh_token');
        if (refresh_token) {
          const token = localStorage.getItem('Refresh_token');
          if (token) {
            let array: string[] = JSON.parse(token);
            array.push(refresh_token);
            localStorage.setItem('Refresh_token', JSON.stringify(array));
          } else localStorage.setItem('Refresh_token', JSON.stringify([refresh_token]));
        }
        return throwError(this.handleError(errResponse, request));
      })
    );
  }

  handleError(errResponse: any, request: HttpRequest<any>) {
    this.messageService.clear('message');
    this.subscription.add(this.store.pipe(selectTranslation).subscribe(translation => {
      this.translation = translation;
    }));

    if (request.url.includes(environment.ISSUE_TYPES) || request.url.includes(environment.GET_CONFIGS) || request.url.includes(environment.DATA_SYNC_STATUS)) {
      //to prevent showing error toast
      return;
    }

    if (errResponse.status == "401") {
      const token = errResponse.headers.get("Authorization");
      if (token) {
        localStorage.removeItem(Constants.TOKEN_SESSION_KEY);
        localStorage.setItem(Constants.TOKEN_SESSION_KEY, Constants.TOKEN_SESSION_START_VALUE + token);
      }
      if (!hasToken()) {
        const customError = errResponse.headers.get("CUSTOM_ERROR");
        if (customError && customError === "SE008") {
          localStorage.removeItem("Refresh_token");
          //move this to a generic method
          this.jiraService.redirectToAtlassianAuth();
        }

        if (customError && customError === "SE006") {
          const accessToken = errResponse.headers.get("Requested_user_info");
          this.navigateToRequestAccessPage(accessToken);
          return;
        }

        if (customError && customError !== "SE008" && customError !== "SE006") {
          this.messageService.add({
            key: 'message',
            severity: 'error',
            summary: 'Error!',
            detail: this.translation?.loginErrorMessage[customError]
          });
        }
      }
      else if (hasToken() && isTokenExpired()) {
        this.saveRedirectUrl(this.router.url);
        this.router.navigate([environment.SESSION_EXPIRED]);
      }
      else if (hasToken() && !isTokenExpired()) {
        clearLocalStorage();
        sessionStorage.clear();
        this.router.navigate([environment.LOGIN_PAGE]);
        this.store.dispatch(discardSentCallsAfterNavigate());
      }
      this.store.dispatch(resetAdminStateToDefault());
      return errResponse;
    }

    if (errResponse.status == "406") {
      return errResponse;
    }

    if (errResponse.status == "403") {
      //User limit has been reached
      if (errResponse?.error?.response_code === 'UL0400') {
        this.messageService.add({
          key: 'message',
          severity: 'error',
          summary: 'Error!',
          detail: 'Maximum users limit reached. Contact support for upgrade.'
        });
      } else if (errResponse?.error?.response_code === 'SE002') {
        this.store.dispatch(discardSentCallsAfterNavigate());

        this.messageService.add({
          key: 'message',
          severity: 'error',
          summary: 'Error!',
          detail: 'It seems like you no longer have access to this resource. Please contact your administrator.'
        });

        this.router.navigate(['space']);
      } else {
        this.store.dispatch(discardSentCallsAfterNavigate());
        this.rhs.enableAccessDenidedTemplate();
        this.router.navigate([environment.ACCESS_DENIED]);
      }
      return;
    }


    if (this.isFetchSourceProjectsError(errResponse)) {
      return this.store.dispatch(setSourceProjectsLoadingState({ loadingState: LoadingState.Error }));
    }

    if (this.isFetchSourceUsersError(errResponse)) {
      return this.store.dispatch(setSourceUsersLoadingState({ loadingState: LoadingState.Error }));
    }

    if (errResponse != null && this.isErrorResponseReceivedFromServer(errResponse)) {

      if (this.isAFieldError(errResponse)) {

        let fieldErrorsList: FieldError[] = [];

        errResponse["error"]["field_errors"].forEach((error => {
          const fieldPresent = fieldErrorsList.find(fieldError => fieldError.field === error["field"]);

          if (fieldPresent) {
            fieldPresent.message += "\n" + error["message"];
          } else {
            fieldErrorsList.push(error);
          }
        }));

        return fieldErrorsList;

      }

      if (this.isAnApiWarning(errResponse)) {
        const count = this.messageService[Constants.WARNING_COUNT] || 0;
        this.messageService[Constants.WARNING_COUNT] = count + 1;
        this.spinner.hideAll();

        if (count > 0) return;
        this.messageService.add({
          key: 'warning',
          severity: 'warn',
          summary: "Warning!",
          detail: errResponse["error"]["detail"],
          life: environment.NO_SPRINT_WARNING_TOAST_DURATION,
          // @ts-ignore
          preventOpenDuplicates: true,
          preventDuplicates: true,
        });

        //showing request panel and resetting component states
        this.componentVisibilityService.showRequestPanel();
        this.resetAllComponentsStates();

        return;
      }

      if (errResponse.status == 500) {

        if (errResponse?.error?.response_code === 'UA400') {
          this.router.navigate(['space']);
          return errResponse;
        } else if (errResponse?.error?.response_code === 'IN000') {
          this.messageService.add({
            key: 'network',
            severity: 'error',
            summary: Constants.TITLE_ERROR,
            detail: errResponse["error"]["detail"],
          })
          this.router.navigate(['space']);
          return;
        } else {
          this.messageService.add({
            key: 'network',
            severity: 'error',
            summary: Constants.TITLE_ERROR,
            detail: Constants.FAILED_TO_LOAD_RESPONSE,
            // @ts-ignore
            preventOpenDuplicates: true,
            preventDuplicates: true,
          });
        }

      }

      else {
        this.messageService.add({
          key: 'message',
          severity: 'error',
          summary: 'Error!',
          detail: errResponse["error"]["detail"]
        });

        return errResponse;
      }
    }
    else {
      /**
       * None of preventOpenDuplicates: true or preventDuplicates: true, is working to stop duplicate messages.
       * Until this is fixed by PrimeNG in future versions, we have implemented a work around to stop duplicate messages.
       * A ['network-count'] property is attached to message service and is increased whenever a call is received to show network toast.
       * If count > 0, no need to show duplicate message. This count is reset in app.component.ts when network toast is closed.
       */
      const count = this.messageService[Constants.NETWORK_COUNT] || 0;
      this.messageService[Constants.NETWORK_COUNT] = count + 1;
      //TODO: this is a temp fix for offline scenario
      // this.spinner.hide();
      if (count > 0) return;

      this.messageService.add({
        key: 'network',
        severity: 'error',
        summary: Constants.TITLE_ERROR,
        detail: Constants.FAILED_TO_LOAD_RESPONSE,
        // @ts-ignore
        preventOpenDuplicates: true,
        preventDuplicates: true,
      });
    }
  }


  navigateToRequestAccessPage(acessToken: string) {
    sessionStorage.setItem(HttpErrorInterceptor.REQUESTED_INFO, acessToken);
    this.router.navigate([environment.REQUEST_ACCESS_PAGE]);
  }

  private isAFieldError(err: any) {
    return err["error"].hasOwnProperty("field_errors") ? true : false;
  }

  private isErrorResponseReceivedFromServer(err: any) {
    if (err["error"])
      return err.hasOwnProperty("error") && err["error"].hasOwnProperty("status") && err["error"].hasOwnProperty("detail");
  }

  private isIviteUserCodeExpirationError(err: any) {
    return err['error'] !== null && err["error"]["response_code"] === 'SU0001';
  }

  private isFetchSourceProjectsError(err: any) {
    return err['error'] !== null && err["error"]["response_code"] === 'PS0108';
  }

  private isFetchSourceUsersError(err: any) {
    return err['error'] !== null && err["error"]["response_code"] === 'PS0109';
  }

  private isAnApiWarning(err: any) {
    return err['error'] !== null && err["error"]["response_type"] === 'warning';
  }

  private resetAllComponentsStates() {
    this.store.dispatch(resetLoadingStates());
  }

  saveRedirectUrl(url: string) {
    sessionStorage.setItem(environment.REDIRECT_URL, url);
  }
}
