import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TrackingService } from 'app/services/tracking';

import { WorklogReminderComponent } from './worklog-reminder.component';

describe('WorklogReminderComponent', () => {
  let component: WorklogReminderComponent;
  let fixture: ComponentFixture<WorklogReminderComponent>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WorklogReminderComponent ],
      providers: [
        provideMockStore(),
        { provide: TrackingService, useValue: { captureNavigationStep: jest.fn(), captureUserAction: jest.fn(), captureUserActionResult: jest.fn() } },
      ]
    })
    .compileComponents();

    store = TestBed.inject(MockStore);
    store.setState({
      globalTranslations: {
        translation: {
          timelog: {
            emailReminder: {
              title: 'Title',
              addEmail: 'Add Email',
              emailReminderNotice: 'Notice',
              noMemberSelected: 'No member selected',
              sendEmailTooltipForSingleMember: 'Send email',
              sendEmailTooltipForMultipleMembers: 'Send emails',
              cancel: 'Cancel',
              missingEmailAddress: {
                title: 'Missing Email',
                placeHolder: 'Enter email',
                duplicateEmailErrorMessage: 'Duplicate email',
                emailInvalidPatternError: 'Invalid email',
                updateEmail: 'Update Email'
              }
            }
          }
        }
      },
      userProfile: {
        khojiUserProfile: { email: 'test@example.com' }
      }
    });

    fixture = TestBed.createComponent(WorklogReminderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
