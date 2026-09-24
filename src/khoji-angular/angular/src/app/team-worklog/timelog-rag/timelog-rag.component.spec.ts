/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimelogRagComponent } from './timelog-rag.component';

describe('TimelogRagComponent', () => {
  let component: TimelogRagComponent;
  let fixture: ComponentFixture<TimelogRagComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TimelogRagComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TimelogRagComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
