/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrackingService } from 'app/services/tracking';
import { TeamLoggedTimePercentageAnalysisComponent } from './team-logged-time-percentage-analysis.component';

describe('TeamLoggedTimePercentageAnalysisComponent', () => {
  let component: TeamLoggedTimePercentageAnalysisComponent;
  let fixture: ComponentFixture<TeamLoggedTimePercentageAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TeamLoggedTimePercentageAnalysisComponent ],
      providers: [
        { provide: TrackingService, useValue: {} }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TeamLoggedTimePercentageAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
