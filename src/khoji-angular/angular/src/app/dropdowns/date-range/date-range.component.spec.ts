import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { DateRangeComponent } from './date-range.component';
import { FeatureFlagService } from 'app/services/feature.flag.service';

describe('DateRangeComponent', () => {
  let component: DateRangeComponent;
  let fixture: ComponentFixture<DateRangeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [DateRangeComponent],
      providers: [
        { provide: FeatureFlagService, useValue: { isEnabled: jest.fn().mockReturnValue(false) } },
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DateRangeComponent);
    component = fixture.componentInstance;
    component.dateLabel = "Last 7 Days";
    component.startDate = "2-2-2021";
    component.endDate = "9-2-2021";
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
