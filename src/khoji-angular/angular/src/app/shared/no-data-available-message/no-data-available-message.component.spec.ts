/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoDataAvailableMessageComponent } from './no-data-available-message.component';

describe('NoDataAvailableMessageComponent', () => {
  let component: NoDataAvailableMessageComponent;
  let fixture: ComponentFixture<NoDataAvailableMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NoDataAvailableMessageComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NoDataAvailableMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
