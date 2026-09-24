import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { loginWithAtlassian } from 'app/admin/state/admin.actions';
import { selectLoginWithAtlassianLoadingState, selectLoginWithAtlassianResponse } from 'app/admin/state/admin.selector';
import { Constants } from 'app/constants';
import { ATLASSIAN_SSO_STATE, NAVIGATE_TO_INSTANCE_PAGE } from 'app/login/login.component';
import { TrackingService, UserActions } from 'app/services/tracking';
import { setDataInLocalStorage } from 'app/shared/helper-functions';
import { JIRA_INSTANCES_URL } from 'app/space/space.module';
import { AppState, LoadingState } from 'app/states/app-states';
import { clearStatesForLoginPage, fetchWorkSpaces } from 'app/states/app.actions';
import { selectTranslation } from 'app/states/global-translations.selector';
import { environment } from 'environments/environment';
import { MessageService } from 'primeng/api';
import { combineLatest, Subscription } from 'rxjs';
import { LoginService } from './../../services/login.service';
import { selectWorkspacesWithLoadingStates } from 'app/user-profile/state/user-profile.selectors';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Workspace } from 'app/user-profile/state/user-profile.states';

@Component({
  selector: '',
  template: `
    <div class="flex align-items-center justify-content-center w-full h-screen">
      <p-progressSpinner
        [style]="{ width: '70px', height: '70px' }"
        strokeWidth="4"
        animationDuration="1s"
      ></p-progressSpinner>
    </div>
  `,
  providers: [LoginService],
  standalone: true,
  imports: [CommonModule, HttpClientModule, ProgressSpinnerModule]
})
export class IntegrationLoadingComponent implements OnInit, OnDestroy {
  constructor(
    private store: Store<AppState>,
    private route: ActivatedRoute,
    private trackingService: TrackingService,
    private router: Router,
    private messageService: MessageService,
    private loginService: LoginService,
    private http: HttpClient
  ) { }

  workSpacesWithLoadingState: {
    workspaces: Workspace[];
    loadingState: LoadingState;
  };

  subscription = new Subscription();
  codeHandled = false;

  ngOnInit(): void {
    this.store.dispatch(clearStatesForLoginPage());

    const redirectUrl = sessionStorage.getItem(environment.REDIRECT_URL);
    sessionStorage.clear();
    if (redirectUrl) sessionStorage.setItem(environment.REDIRECT_URL, redirectUrl);

    const translation$ = this.store.pipe(selectTranslation);
    const routeParams$ = this.route.queryParams;
    const loginWithAtlassianLoadingState$ = this.store.pipe(selectLoginWithAtlassianLoadingState);
    const loginWithAtlassianResponse$ = this.store.pipe(selectLoginWithAtlassianResponse);
    const workspacesWithLoadingState$ = this.store.pipe(selectWorkspacesWithLoadingStates);

    // step 1: process the response from jira/ms in url params
    this.subscription.add(
      combineLatest([translation$, routeParams$]).subscribe(([translation, params]) => {
        const code = params['code'];
        const error_description = params['error_description'];
        let error = params['error'];

        if (localStorage.getItem('ms-teams') === 'clicked') {
          let redirectUrl = sessionStorage.getItem(environment.REDIRECT_URL);
          localStorage.removeItem('ms-teams');
          sessionStorage.removeItem(environment.REDIRECT_URL);
          const url = new URL(location.origin + redirectUrl);
          redirectUrl = url.pathname;
          const queryParams = { ...Object.fromEntries(url.searchParams.entries()), code, error };
          this.router.navigate([redirectUrl], { queryParams });
          return;
        }

        const navigateToJiraInstanceValue = localStorage.getItem(NAVIGATE_TO_INSTANCE_PAGE);
        if (navigateToJiraInstanceValue?.includes(JIRA_INSTANCES_URL)) {
          localStorage.removeItem(NAVIGATE_TO_INSTANCE_PAGE);
          localStorage.setItem('Source_code', code);
          this.router.navigate([navigateToJiraInstanceValue]);
          return;
        }

        if (code && !this.codeHandled) {
          this.codeHandled = true;
          const state = params['state'];
          const savedState = localStorage.getItem(ATLASSIAN_SSO_STATE);

          if (state === savedState) {
            const data = {
              SSOCode: code,
              loginViaSSO: 'true'
            };

            this.trackingService.captureUserActionResult(UserActions.Login.Request_Jira_Access, 'Success');
            this.trackingService.captureUserAction(UserActions.Login.On_Khoji.With_SSO_Code);
            // Proceed with Khoji login flow
            this.store.dispatch(loginWithAtlassian({ data }));

            // Call the /api/login/sso endpoint to exchange code for token
            // setTimeout(() => {
            //this.loginWithAtlassian(code);
            // }, 1000); // Adding a slight delay to ensure the login flow starts before token exchange
          } else {
            error = 'request_state_invalid';
            this.trackingService.captureUserActionResult(UserActions.Login.Request_Jira_Access, 'Failure', { error });
            this.messageService.add({
              key: 'message',
              severity: 'error',
              summary: 'Error!',
              detail: translation?.loginErrorMessage['SE008']
            });
          }
        } else if (error) {
          this.router.navigate(['login']);
          this.messageService.add({
            key: 'message',
            severity: 'error',
            summary: 'Error!',
            detail: 'Consent request has been denied.'
          });

          this.trackingService.captureUserActionResult(UserActions.Login.Request_Jira_Access, 'Failure', { error, error_description });
        }
      })
    );

    // step 2: there should be a response(token) if it was login call
    this.subscription.add(
      combineLatest([loginWithAtlassianLoadingState$, loginWithAtlassianResponse$, workspacesWithLoadingState$]).subscribe(([loadingState, response, workspacesState]) => {
        if (loadingState === LoadingState.Done) {
          if (response) {
            this.khojiLoginFlow(response);
            //Capture space/workspace ID with login success
            this.trackingService.captureUserActionResult(UserActions.Login.On_Khoji, 'Success');
          }
        } else if (loadingState === LoadingState.Error) {
          this.trackingService.captureUserActionResult(UserActions.Login.On_Khoji, 'Failure');
        }
      })
    );

    // step 3: if it was the login call either redirect to the user last page or do some things based on the new setup
    this.subscription.add(
      workspacesWithLoadingState$.subscribe((workSpacesWithLoadingState) => {
        this.workSpacesWithLoadingState = workSpacesWithLoadingState;
        if (workSpacesWithLoadingState.loadingState === LoadingState.Done && workSpacesWithLoadingState.workspaces.length) {
          const redirectionParams = localStorage.getItem('queryParamsForAfterLoginNav');

          if (workSpacesWithLoadingState.workspaces.length && redirectionParams) {
            const queryParams = JSON.parse(redirectionParams);
            localStorage.removeItem('queryParamsForAfterLoginNav');
            this.router.navigate(['space'], { queryParams });
          } else if (workSpacesWithLoadingState.workspaces.length === 1 && workSpacesWithLoadingState.workspaces[0].instances.length === 0) {
            this.router.navigateByUrl(`/space/${workSpacesWithLoadingState.workspaces[0].id}/jira-instances`);
          } else if (redirectUrl && redirectUrl !== '/integrating') {
            this.router.navigateByUrl(redirectUrl);
          } else {
            if (workSpacesWithLoadingState.workspaces.length === 1 && workSpacesWithLoadingState.workspaces[0].instances.length > 1) {
              this.router.navigateByUrl(`/space/${workSpacesWithLoadingState.workspaces[0].id}/home`);
            } else if (workSpacesWithLoadingState.workspaces.length === 1 && workSpacesWithLoadingState.workspaces[0].instances[0].instanceFeatures[0].id === 1) {
              this.router.navigateByUrl(`/space/${workSpacesWithLoadingState.workspaces[0].id}/instance/${workSpacesWithLoadingState.workspaces[0].instances[0].id}/feature/my-work`);
            } else if (workSpacesWithLoadingState.workspaces.length === 1 && workSpacesWithLoadingState.workspaces[0].instances[0].instanceFeatures[0].id === 2) {
              this.router.navigateByUrl(`/space/${workSpacesWithLoadingState.workspaces[0].id}/instance/${workSpacesWithLoadingState.workspaces[0].instances[0].id}/feature/team-view`);
            } else {
              this.router.navigateByUrl(`/space/${workSpacesWithLoadingState.workspaces[0].id}/home`);
            }
          }
        }
      })
    );
  }

  private loginWithAtlassian(code: any) {
    this.http.post<any>('/api/login/sso', { SSOCode: code }).subscribe(
      (response) => {
        if (response.success) {
          console.log('[SSO] Login successful, token received');
          // Store the access token
          if (response.token) {
            localStorage.setItem('jira_access_token', response.token);
          }
        } else {
          console.error('[SSO] Login failed:', response.error);
          this.messageService.add({
            key: 'message',
            severity: 'error',
            summary: 'Error!',
            detail: `SSO login failed: ${response.error}`
          });
        }
      },
      (error) => {
        console.error('[SSO] HTTP error:', error);
        this.trackingService.captureUserActionResult(UserActions.Login.On_Khoji, 'Failure', { error: error.message });
        this.messageService.add({
          key: 'message',
          severity: 'error',
          summary: 'Error!',
          detail: 'Failed to exchange SSO code with server'
        });
      }
    );
  }

  private khojiLoginFlow(data: Object) {
    if (data) setDataInLocalStorage(Constants.TOKEN_SESSION_KEY, Constants.TOKEN_SESSION_START_VALUE + data[Constants.TOKEN_SESSION_KEY]);
    setDataInLocalStorage(Constants.USERNAME_SESSION_KEY, '');
    this.verifyTokenSetInLocalStorage();
    this.loginService.loadKhojiConfigs();
    this.loginService.loadDropdownGroupingConfigs();

    if (!this.workSpacesWithLoadingState?.workspaces?.length) {
      this.store.dispatch(fetchWorkSpaces());
    }
  }

  verifyTokenSetInLocalStorage(): boolean {
    return !!localStorage.getItem(Constants.TOKEN_SESSION_KEY);
  }

  ngOnDestroy() {
    sessionStorage.removeItem(environment.REDIRECT_URL);
    this.subscription.unsubscribe();
  }
}
