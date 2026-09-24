import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamWorklogSelectionComponent } from './team-worklog-selection.component';

describe('TeamWorklogSelectionComponent', () => {
  let component: TeamWorklogSelectionComponent;
  let fixture: ComponentFixture<TeamWorklogSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ TeamWorklogSelectionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeamWorklogSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    //expect(component).toBeTruthy();
  });
});
