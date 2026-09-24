/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { ConfirmationService, MessageService } from 'primeng/api';

import { ManageWorklogCategoriesComponent } from './manage-worklog-categories.component';
import { FeatureFlagService } from '../../services/feature.flag.service';
import { TrackingService } from '../../services/tracking';

describe('ManageWorklogCategoriesComponent', () => {
  let component: ManageWorklogCategoriesComponent;
  let fixture: ComponentFixture<ManageWorklogCategoriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ManageWorklogCategoriesComponent ],
      providers: [
        provideMockStore(),
        { provide: ConfirmationService, useValue: { confirm: jest.fn(), close: jest.fn() } },
        { provide: MessageService, useValue: { add: jest.fn(), clear: jest.fn() } },
        { provide: FeatureFlagService, useValue: { isEnabled: jest.fn().mockReturnValue(false) } },
        { provide: TrackingService, useValue: { captureUserAction: jest.fn() } },
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageWorklogCategoriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
