import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideMockStore } from '@ngrx/store/testing';
import { Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';

import { TeamWorklogSummaryComponent } from './team-worklog-summary.component';
import { TrackingService } from '../../services/tracking';
import { ExportService } from '../../services/export.service';
import { HttpService } from '../../services/common/http.service';
import { KhojiSpinnerService } from '../../services/spinner.service';
import { WizardService } from '../../services/wizard.service';
import { FeatureFlagService } from '../../services/feature.flag.service';
import { ConfigService } from '../../services/config.service';

describe('TeamWorklogSummaryComponent', () => {
  let component: TeamWorklogSummaryComponent;
  let fixture: ComponentFixture<TeamWorklogSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TeamWorklogSummaryComponent,
        StoreModule.forRoot({}),
        EffectsModule.forRoot([]),
      ],
      providers: [
        provideMockStore(),
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: TrackingService, useValue: { captureUserAction: jest.fn() } },
        { provide: ExportService, useValue: { exportCsv: jest.fn() } },
        { provide: HttpService, useValue: {} },
        { provide: KhojiSpinnerService, useValue: {} },
        { provide: WizardService, useValue: {} },
        { provide: FeatureFlagService, useValue: { isEnabled: jest.fn().mockReturnValue(false) } },
        { provide: ConfigService, useValue: {} },
        { provide: MessageService, useValue: { add: jest.fn(), clear: jest.fn() } },
        { provide: ConfirmationService, useValue: { confirm: jest.fn(), close: jest.fn() } },
      ],
      schemas: [ NO_ERRORS_SCHEMA ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeamWorklogSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
