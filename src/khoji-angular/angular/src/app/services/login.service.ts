/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { HTTPClientService } from './common/http-client.service';
import { Constants } from '../constants';
import * as actions from '../states/app.actions';
import { Store } from '@ngrx/store';
import { UserCredentials } from 'app/states/app-states';
import { HttpService } from './common/http.service';
import { API_URL } from 'app/shared/helper-functions';

@Injectable()
export class LoginService {
  http: HttpClient;
  alertIsConfirmedByUserKey: string = Constants.ALERT_CONFIRM_BY_USER;

  constructor(
    private httpClientService: HTTPClientService,
    private httpClient: HttpClient,
    private store: Store,
    private httpService: HttpService,
  ) {
    this.http = this.httpClientService.getHttpClient();
  }



  getAuthTokenHeader(): HttpHeaders {
    let headerContent: any;
    if (localStorage.getItem(Constants.TOKEN_SESSION_KEY)) {
      headerContent = new HttpHeaders({ Authorization: localStorage.getItem(Constants.TOKEN_SESSION_KEY) });
    }
    return headerContent;
  }

  apiPostRequestForLogin(url: string, requestParams: UserCredentials) {
    const headerContents = new HttpHeaders(
      {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    );
    const body = `username=${requestParams.username}&password=${requestParams.password}`;
    return this.httpClient.post(API_URL + url, body, { headers: headerContents });
  }

  apiPostRequestForCaptcha(url: string, requestBody: string) {
    const headerContents = new HttpHeaders(
      {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    );
    return this.httpClient.post(API_URL + url, requestBody, { headers: headerContents });
  }

  apiPostRequest(url: string, requestBody: string) {
		const headerContents = new HttpHeaders({ 'Content-Type': 'application/json' });
		return this.httpClient.post(API_URL + url, requestBody, { headers: headerContents });
	}

  apiGetRequest(url: string) {
    //Only auth header is added
    return this.http.get(API_URL + url, { headers: this.getAuthTokenHeader() });
  }

  appGetRequest(url: string) {
    return this.httpClient.get(`.${url}`, { headers: this.getAuthTokenHeader() });
  }

  loadKhojiConfigs() {
    this.httpService.loadKhojiConfigs();
  }

  loadDropdownGroupingConfigs() {
    const path = (new URL(location.href.replace('/#', ''))).searchParams.get('config-path');
    const configPath = path ? '/assets/config/groupingconfigsmock/' + path : environment.DROPDOWN_GROUPING_CONFIG
    this.appGetRequest(configPath)
      .subscribe(data => {
        const config = JSON.parse(JSON.stringify(data));
        this.store.dispatch(actions.setDropdownGroupingConfig({ config: config }));
      });
  }
}
