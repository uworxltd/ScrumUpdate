/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { TeamWorklogDetailsComponent } from './team-worklog-details.component';
import { TrackingService } from '../../services/tracking';
import { ExportService } from '../../services/export.service';
import { ConfigService } from '../../services/config.service';
import { HttpService } from '../../services/common/http.service';
import { KhojiSpinnerService } from '../../services/spinner.service';
import { WizardService } from '../../services/wizard.service';
import { FeatureFlagService } from '../../services/feature.flag.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Router } from '@angular/router';

describe('TeamWorklogDetailsComponent', () => {
  let component: TeamWorklogDetailsComponent;
  let fixture: ComponentFixture<TeamWorklogDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TeamWorklogDetailsComponent,
        StoreModule.forRoot({}),
        EffectsModule.forRoot([]),
      ],
      providers: [
        provideMockStore(),
        { provide: TrackingService, useValue: { captureUserAction: jest.fn() } },
        { provide: ExportService, useValue: { exportCsv: jest.fn() } },
        { provide: ConfigService, useValue: {} },
        { provide: HttpService, useValue: {} },
        { provide: KhojiSpinnerService, useValue: {} },
        { provide: WizardService, useValue: {} },
        { provide: FeatureFlagService, useValue: { isEnabled: jest.fn().mockReturnValue(false) } },
        { provide: MessageService, useValue: { add: jest.fn(), clear: jest.fn() } },
        { provide: ConfirmationService, useValue: { confirm: jest.fn(), close: jest.fn() } },
        { provide: Router, useValue: {} },
      ],
      schemas: [ NO_ERRORS_SCHEMA ],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TeamWorklogDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
