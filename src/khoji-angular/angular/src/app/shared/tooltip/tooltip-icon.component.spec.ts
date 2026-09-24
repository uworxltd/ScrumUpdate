/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TooltipIconComponent } from './tooltip-icon.component';

describe('TooltipIconComponent', () => {
  let component: TooltipIconComponent;
  let fixture: ComponentFixture<TooltipIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TooltipIconComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TooltipIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
