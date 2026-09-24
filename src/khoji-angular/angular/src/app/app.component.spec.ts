
/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { TestBed, ComponentFixture, async } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { HttpService } from './services/common/http.service';
import { ActivatedRoute, Router } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { APP_BASE_HREF } from '@angular/common';
import { CookiesService } from './services/common/cookies.service';
import { MessageService } from 'primeng/api';
import { TrackingService } from './services/tracking';
import { NgcCookieConsentService } from 'ngx-cookieconsent';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let activatedRoutes: any = {};
  let router: any = {};
  let httpService: any = {};

  beforeEach(async(() => {
    givenDependendiesAreMocked();
    TestBed.configureTestingModule({
      declarations: [
        AppComponent
      ],
      providers: [
        { provide: APP_BASE_HREF, useValue: '/khoji' },
        { provide: CookiesService, useValue: CookiesService },
        { provide: HttpService, useValue: httpService },
        { provide: ActivatedRoute, useValue: activatedRoutes },
        { provide: Router, useValue: router },
        { provide: MessageService, useValue: { add: jest.fn() } },
        { provide: TrackingService, useValue: { init: jest.fn(), captureUserAction: jest.fn() } },
        { provide: NgcCookieConsentService, useValue: { statusChange$: { subscribe: jest.fn() }, hasConsented: jest.fn() } },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create the Khoji app', () => {
    fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'app'`, () => {
    fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app.title).toBeUndefined();
  });

  function givenDependendiesAreMocked() {
    httpService.initializePeriodicCallToRefreshVarianceConfigs = () => {
      return {};
    };
    jest.spyOn(httpService, 'initializePeriodicCallToRefreshVarianceConfigs');
  }
});
