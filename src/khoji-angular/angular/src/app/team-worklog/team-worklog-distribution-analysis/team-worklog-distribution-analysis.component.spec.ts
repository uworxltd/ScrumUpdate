/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrackingService } from 'app/services/tracking';
import { TeamWorklogDistributionAnalysisComponent } from './team-worklog-distribution-analysis.component';

describe('TeamWorklogDistributionAnalysisComponent', () => {
  let component: TeamWorklogDistributionAnalysisComponent;
  let fixture: ComponentFixture<TeamWorklogDistributionAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TeamWorklogDistributionAnalysisComponent ],
      providers: [
        { provide: TrackingService, useValue: {} }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TeamWorklogDistributionAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
