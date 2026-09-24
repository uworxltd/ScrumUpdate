/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { FeatureFlagService } from '../../services/feature.flag.service';
import { TrackingService } from 'app/services/tracking';

import { ChangeSettingComponent } from './change-setting.component';

describe('ChangeSettingComponent', () => {
  let component: ChangeSettingComponent;
  let fixture: ComponentFixture<ChangeSettingComponent>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ FormsModule ],
      declarations: [ ChangeSettingComponent ],
      providers: [
        provideMockStore(),
        { provide: FeatureFlagService, useValue: { isEnabled: jest.fn().mockReturnValue(false) } },
        { provide: TrackingService, useValue: { captureUserAction: jest.fn(), captureNavigationStep: jest.fn() } },
      ]
    })
    .compileComponents();

    store = TestBed.inject(MockStore);
    store.setState({
      globalTranslations: {
        translation: {
          userProfile: {
            settings: {
              emailFrequencies: { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }
            }
          }
        }
      },
      userProfile: {
        khojiUserProfile: {
          email: 'test@example.com',
          worklogEmailEnabled: true,
          worklogEmailFrequency: 'DAILY'
        }
      }
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChangeSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
