/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TrackingService } from 'app/services/tracking';
import { ScriptLoaderService } from 'app/services/script-loader';
import { chargeBeeService } from './chargebee.service';

import { ManageSubscriptionComponent } from './manage-subscription.component';

describe('ManageSubscriptionComponent', () => {
  let component: ManageSubscriptionComponent;
  let fixture: ComponentFixture<ManageSubscriptionComponent>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ManageSubscriptionComponent ],
      providers: [
        provideMockStore(),
        { provide: chargeBeeService, useValue: { openManageSubscriptonModal: jest.fn(), closeHostedPage: jest.fn() } },
        { provide: TrackingService, useValue: { captureUserAction: jest.fn(), captureNavigationStep: jest.fn() } },
        { provide: ScriptLoaderService, useValue: { loadScript: jest.fn().mockResolvedValue(undefined) } },
      ]
    })
    .compileComponents();

    store = TestBed.inject(MockStore);
    store.setState({
      globalConfigs: {
        khoji: {
          paymentSite: 'test-site'
        }
      },
      globalTranslations: {
        translation: {}
      },
      paymentHostedObject: {
        closedPopup: false,
        hostedPage: { body: '' }
      }
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageSubscriptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
