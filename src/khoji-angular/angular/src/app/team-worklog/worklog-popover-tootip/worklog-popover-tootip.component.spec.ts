import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';

import { WorklogPopoverTootipComponent } from './worklog-popover-tootip.component';

describe('WorklogPopoverTootipComponent', () => {
  let component: WorklogPopoverTootipComponent;
  let fixture: ComponentFixture<WorklogPopoverTootipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ WorklogPopoverTootipComponent ],
      providers: [
        provideMockStore(),
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WorklogPopoverTootipComponent);
    component = fixture.componentInstance;
    // The template reads worklogStats.thresholdColors/thresholdPercentage.
    // Pre-populate so the initial render does not throw.
    component.worklogStats = {
      thresholdColors: { Normal: '#000000', Medium: '#000000', Low: '#000000' },
      thresholdPercentage: { Normal: 100, Medium: 50 },
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
