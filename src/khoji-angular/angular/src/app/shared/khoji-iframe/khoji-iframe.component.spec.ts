/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KhojiIframeComponent } from './khoji-iframe.component';

describe('KhojiIframeComponent', () => {
  let component: KhojiIframeComponent;
  let fixture: ComponentFixture<KhojiIframeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ KhojiIframeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KhojiIframeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
