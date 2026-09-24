import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { JiraIssueSelectorInputComponent } from './jira-issue-selector-input.component';
import { JiraService } from 'app/services/jira.service';

describe('JiraIssueSelectorInputComponent', () => {
  let component: JiraIssueSelectorInputComponent;
  let fixture: ComponentFixture<JiraIssueSelectorInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ JiraIssueSelectorInputComponent ],
      providers: [
        {
          provide: JiraService,
          useValue: {
            getSearchResults: () => of([]),
            searchIssues: jest.fn()
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JiraIssueSelectorInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
