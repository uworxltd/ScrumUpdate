/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Constants } from 'app/constants';
import { environment } from 'app/../environments/environment';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { HTTPClientService } from './http-client.service';
import { Store } from '@ngrx/store';
import * as actions from 'app/states/app.actions';
import { API_URL, isJsonValid } from 'app/shared/helper-functions';
import { map, takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { Actions, ofType } from '@ngrx/effects';
import { discardSentCallsAfterNavigate } from 'app/states/app.actions';

@Injectable()
export class HttpService {
  http: HttpClient;
  alertIsConfirmedByUserKey: string = Constants.ALERT_CONFIRM_BY_USER;
  evaluatorUrl = environment.EVALUATOR_URL;

  constructor(
    private httpClientService: HTTPClientService,
    private httpClient: HttpClient,
    private store: Store,
    private router: Router,
    private messageService: MessageService,
    private actions$: Actions
  ) {
    this.http = this.httpClientService.getHttpClient();
    localStorage.removeItem(this.alertIsConfirmedByUserKey);
  }

  getAuthTokenHeader(): HttpHeaders {
    let headerContent: any;
    if (localStorage.getItem(Constants.TOKEN_SESSION_KEY)) {
      let headers = {
        Authorization: localStorage.getItem(Constants.TOKEN_SESSION_KEY)
      };

      headerContent = new HttpHeaders(headers);
    }
    return headerContent;
  }

  appGetRequest<T>(url: string) {
    return this.httpClient.get<T>(`${url}`, { headers: this.getAuthTokenHeader() });
  }

  appPutRequest<T>(url: string, params) {
    return this.httpClient.put<T>(`${url}`, params, { headers: this.getAuthTokenHeader() });
  }

  appPostRequest<T>(url: string, params) {
    return this.httpClient.post<T>(`${url}`, params, { headers: this.getAuthTokenHeader() });
  }

  apiGetRequest<T>(url: string) {
    //Only auth header is added
    if (!url) return of({} as T);
    return this.http.get<T>(API_URL + url, { headers: this.getAuthTokenHeader() });
  }

  apiPostRequest<T>(url: string, requestParams: any, quickSearch: boolean = false, requestId?: string, templateId?: string) {
    if (!url) return of({} as T);
    let headerContents = new HttpHeaders(this.getHeaderContent(quickSearch, templateId ? templateId : null, requestId));
    return this.http.post<T>(API_URL + url, requestParams, { headers: headerContents });
  }

  apiPostRequestCustom(url, body: { [key: string]: any }, headers: { [key: string]: any }) {
    if (!url) return of({});
    return this.http.post(API_URL + url, body, { headers: new HttpHeaders(headers) });
  }

  apiDeleteRequest(url: string, requestParams: any, quickSearch: boolean) {
    if (!url) return of({});
    let headerContents = new HttpHeaders(this.getHeaderContent(quickSearch));
    return this.http.delete(API_URL + url + requestParams, { headers: headerContents });
  }

  apiPutRequest(url: string, requestParams: any, quickSearch: boolean) {
    if (!url) return of({});
    let headerContents = new HttpHeaders(this.getHeaderContent(quickSearch));
    return this.http.put(API_URL + url, requestParams, { headers: headerContents });
  }

  getRequestWithoutUserHeaders<T>(url: string, params: any, callback: any) {
    if (!url) return of({});
    //Only auth header is added
    return this.http.get<T>(API_URL + url, { headers: this.getAuthTokenHeader() });
  }

  apiPostRequestForReport(url: string, requestParams: any, quickSearch: boolean, templateId: string, requestId?: string) {
    if (!url) return of({});
    let headerContents = new HttpHeaders(this.getHeaderContent(quickSearch, templateId, requestId));
    return this.http.post(API_URL + url, requestParams, { headers: headerContents });
  }

  postRequestWithOutHeaders(url: string, requestParam: any) {
    if (!url) return of({});
    //Only auth header is added
    return this.http.post(API_URL + url, requestParam, { headers: this.getAuthTokenHeader() });
  }

  getHeaderContent(quickSearch: boolean, templateId?: string, requestId?: string) {
    const res: any = {
      username: this.getUserNameorEmpty(),
      page: this.router.url.split('?')[0],
      quickSearch: quickSearch.toString(),

    };

    if (localStorage.getItem(Constants.TOKEN_SESSION_KEY)) {
      res.Authorization = localStorage.getItem(Constants.TOKEN_SESSION_KEY);
    }

    if (templateId && templateId != null) {
      res.templateId = templateId;
    }

    if (requestId && requestId != null) {
      res.requestId = requestId;
    }

    return res;
  }

  getUserNameorEmpty(): string {
    try {
      let username = localStorage.getItem(Constants.USERNAME_SESSION_KEY);
      if (username == null) {
        username = '';
      }
      return username;
    } catch (error) {
      console.log("Unable to load user name from localstorage." + error);
      return '';
    }
  }

  loadKhojiConfigs() {
    this.store.dispatch(actions.fetchKhojiConfigs());
  }

  loadDropdownGroupingConfigs() {
    const path = (new URL(location.href.replace('/#', ''))).searchParams.get('config-path');
    const configPath = path ? '/assets/config/groupingconfigsmock/' + path : environment.DROPDOWN_GROUPING_CONFIG;
    this.appGetRequest(configPath)
      .subscribe(data => {
        const config = JSON.parse(JSON.stringify(data));
        this.store.dispatch(actions.setDropdownGroupingConfig({ config: config }));
      });
  }

  //TODO: Remove this endpoint and use the one from evaluator service to get config values
  public getConfigValue(propKeys: string[]) {
    let params = new HttpParams();
    propKeys.forEach((propKey) => {
      params = params.append('propKey', propKey);
    });
    return this.http
      .get<Object>(API_URL + environment.GET_CONFIGS, {
        headers: this.getAuthTokenHeader(),
        params,
      })
      .pipe(
        takeUntil(
          this.actions$.pipe(
            ofType(
              discardSentCallsAfterNavigate
            )
          )
        ),
        map((response) => {
          Object.keys(response).forEach(
            (key) => {
              try {
                return (response[key] = isJsonValid(response[key]) ? JSON.parse(response[key]) : response[key]);
              } catch (error) {
                console.error(`Parsing failed for config: ${key}`);
                console.debug(`Config value: ${response[key]}`);
                console.error(`Parsing Error: ${error}`);
              }
            }
          );
          return response;
        })
      );
  }

  private showErrorToast = (message: string) => {
    this.messageService.clear();
    this.messageService.add({
      key: 'message',
      severity: 'error',
      summary: 'Error!',
      detail: message,
    });
  };
}
