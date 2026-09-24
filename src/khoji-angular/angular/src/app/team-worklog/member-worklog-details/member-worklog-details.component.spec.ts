/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { ComponentFixture, TestBed } from '@angular/core/testing';

import 'extensions';
import { MemberWorklogDetailsComponent } from './member-worklog-details.component';
import { ExportService } from '../../services/export.service';

describe('MemberWorklogDetailsComponent', () => {
  let component: MemberWorklogDetailsComponent;
  let fixture: ComponentFixture<MemberWorklogDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MemberWorklogDetailsComponent ],
      providers: [
        { provide: ExportService, useValue: { exportCsv: jest.fn() } },
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MemberWorklogDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
