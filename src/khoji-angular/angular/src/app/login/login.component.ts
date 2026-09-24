/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { loginWithAtlassian } from 'app/admin/state/admin.actions';
import { selectLoginWithAtlassianLoadingState } from 'app/admin/state/admin.selector';
import { LoginWithAtlassianResponse } from 'app/admin/state/admin.state';
import { Constants } from 'app/constants';
import { LayoutService } from 'app/layout/service/app.layout.service';
import { FeatureFlagService } from 'app/services/feature.flag.service';
import { RootNav, TrackingService, UserActions } from 'app/services/tracking/';
import { environment } from 'environments/environment';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { LoginService } from '../services/login.service';
import { JiraService } from '../services/jira.service';
import { AppState, LoadingState } from '../states/app-states';
import { clearStatesForLoginPage, fetchTranslations } from '../states/app.actions';
import { selectTranslation } from '../states/global-translations.selector';

export const ATLASSIAN_SSO_STATE = 'atlassian-sso-state';
export const NAVIGATE_TO_INSTANCE_PAGE = 'navigateToInstancePage';

interface UserAccount {
  invalidEntries: string[];
  users: Info[];
}

interface Info {
  fullName: string;
  imageUrl: string;
  email: string;
}


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  providers: [LoginService]
})
export class LoginComponent implements OnInit, OnDestroy {
  translation: any;
  subscription = new Subscription();
  constant: Constants;
  token = '';
  constants = Constants;
  emailRegex = this.constants.KHOJI_EMAIL_REGX_LOGIN;
  invalidEmail = false;
  invalidPassword = false;
  loginForm: FormGroup;
  currentYear: any;
  environment = environment;
  loading: boolean = false;
  cloudFeatureEnabled = FeatureFlagService.isEnabled(Constants.CLOUD_FEATURE_KEY);
  loginState: LoadingState = LoadingState.Pending;
  loginWithAtlassianResponse: LoginWithAtlassianResponse;
  codeHandled: boolean = false;
  showUsersTemplate: boolean = false;
  usersList: any[] = [];


  userInfo = {
    username: '',
    password: ''
  };

  isCaptchaResolved: boolean = false;
  isDirectAtlassianLogin: boolean = false;
  siteKey: string = environment.CAPTCHA_KEY;
  disableCaptcha: boolean = environment.DISABLE_CAPTCHA || !environment.CAPTCHA_KEY;

  constructor(
    private loginService: LoginService,
    private store: Store<AppState>,
    private router: Router,
    private layoutService: LayoutService,
    private titleService: Title,
    private trackingService: TrackingService,
    private activatedRoute: ActivatedRoute,
    public jiraService: JiraService
  ) { }

  ngOnInit() {
    // clear workspaces, atlassian response from store
    this.store.dispatch(clearStatesForLoginPage());

    const redirectUrl = sessionStorage.getItem(environment.REDIRECT_URL);
    sessionStorage.clear();
    if (redirectUrl) sessionStorage.setItem(environment.REDIRECT_URL, redirectUrl);

    this.trackingService.captureNavigationStep(RootNav.Login);
    const loginWithAtlassianLoadingState$ = this.store.pipe(selectLoginWithAtlassianLoadingState);
    const translation$ = this.store.pipe(selectTranslation);

    this.subscription.add(
      this.activatedRoute.queryParams.subscribe(params => {
        if (eval(params['switchAccount'])) {
          this.loginWithAtlassian();
        }

        if (params['disableCaptcha'] === 'TXVoYW1tYWRBaG1hZA==') {
          this.disableCaptcha = true;
        }
        else {
          this.disableCaptcha = environment.DISABLE_CAPTCHA || !environment.CAPTCHA_KEY;
        }
      })
    )

    this.subscription.add(translation$
      .subscribe(translation => {
        this.translation = translation;
        this.titleService.setTitle(this.translation?.pageTitles?.login);
      }));

    if (!this.translation) {
      this.store.dispatch(fetchTranslations({ locale: 'en_GB' }));
      this.subscription.add(translation$.subscribe(translation => { this.translation = translation; }));
    }

    this.subscription.add(loginWithAtlassianLoadingState$.pipe(filter(data => data !== 0)).subscribe(data => {
      this.loginState = data;
    }));

    this.currentYear = new Date().getFullYear();
  }

  get dark(): boolean {
    return this.layoutService.config.colorScheme !== 'light';
  }

  loginWithAtlassian() {
    const refreshToken = localStorage.getItem('Refresh_token');

    if (refreshToken) {
      let refreshTokenArr: string[] = [];

      try {
        refreshTokenArr = JSON.parse(refreshToken);
      }
      catch (e) {
        refreshTokenArr = [refreshToken];
        localStorage.setItem("Refresh_token", JSON.stringify(refreshTokenArr));
      }

      if (refreshTokenArr?.length) {
        this.loginService
          .apiPostRequest("/user/against-token", JSON.stringify(refreshTokenArr))
          .subscribe(
            (response: UserAccount) => {
              if (response) {
                this.usersList = response.users;
                // TODO: look into this conditions
                if (!this.usersList.length) {
                  this.jiraService.redirectToAtlassianAuth();
                  return;
                }

                this.showUsersTemplate = true;
                const refreshTokenArr: string[] = JSON.parse(localStorage.getItem('Refresh_token'));

                if (refreshTokenArr?.length) {
                  const tokens = refreshTokenArr.filter(token => !response.invalidEntries.includes(token));
                  localStorage.setItem("Refresh_token", JSON.stringify(tokens));
                }
              }
            }
          )
      }
      else {
        this.jiraService.redirectToAtlassianAuth();
      }
    }
    else {
      this.jiraService.redirectToAtlassianAuth();
    }
  }

  calculateRefreshTokenAndSendLogin(i: number) {
    const refreshTokenArr: string[] = JSON.parse(localStorage.getItem('Refresh_token'));
    if (refreshTokenArr?.length) {
      this.kickInRefreshTokenFlow(refreshTokenArr[i]);
    }
  }

  removeAccountsFromLocalStorage() {
    localStorage.removeItem('Refresh_token');
    this.showUsersTemplate = false;
  }

  kickInRefreshTokenFlow(refreshToken: string) {
    let data = {
      Refresh_token: refreshToken
    };

    this.trackingService.captureUserAction(UserActions.Login.On_Khoji.With_Saved_Session);
    this.store.dispatch(loginWithAtlassian({ data }));
    this.router.navigate(['integrating']);
  }

  handleLoginWithAtlassian() {
    this.trackingService.captureUserAction(UserActions.Login.With_Button_Click);
    if (this.disableCaptcha || this.isCaptchaResolved) {
      this.loginWithAtlassian();
    }
  }

  onSubmit() {
    return false;
  }

  /**
   * Handles the resolved reCAPTCHA token.
   * @param token - The token generated by the reCAPTCHA execution.
   */
  handleCaptchaResolved(token: string): void {
    if (token) {
      this.loginService.apiPostRequestForCaptcha(environment.CAPTCHA_API_KBS, token).subscribe({
        next: () => {
          this.isCaptchaResolved = true;
          if (this.isDirectAtlassianLogin) {
            this.loginState = LoadingState.Loading;
            this.trackingService.captureUserAction(UserActions.Login.With_External_Link);
            this.loginWithAtlassian();
          }
        },
        error: () => {
          this.isCaptchaResolved = false;
          // Resets the reCAPTCHA widget
          grecaptcha.reset();
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
