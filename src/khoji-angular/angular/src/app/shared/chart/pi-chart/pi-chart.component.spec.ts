/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PiChartComponent } from './pi-chart.component';

describe('PiChartComponent', () => {
  let component: PiChartComponent;
  let fixture: ComponentFixture<PiChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PiChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PiChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
