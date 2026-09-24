/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { FeatureFlagService } from 'app/services/feature.flag.service';
import { UnleashService } from 'app/services/unleash.service';
import { TrackingService } from 'app/services/tracking';

import { ProfileComponent } from './profile.component';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProfileComponent ],
      providers: [
        provideMockStore(),
        { provide: ActivatedRoute, useValue: { queryParams: of({}), snapshot: {} } },
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: Title, useValue: { setTitle: jest.fn() } },
        { provide: MessageService, useValue: { add: jest.fn(), clear: jest.fn() } },
        { provide: FeatureFlagService, useValue: { isEnabled: jest.fn().mockReturnValue(false) } },
        { provide: UnleashService, useValue: { isFeatureEnabled: jest.fn().mockReturnValue(of(false)) } },
        { provide: TrackingService, useValue: { captureUserAction: jest.fn(), captureNavigationStep: jest.fn() } },
      ]
    })
    .compileComponents();

    store = TestBed.inject(MockStore);
    store.setState({
      userProfile: {
        workspaces: []
      },
      globalTranslations: {
        translation: {
          pageTitles: { profileSettings: 'Profile Settings' },
          accessDenied: { accessDeniedDescription: 'Access denied' }
        }
      }
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
