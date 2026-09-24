import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TrackingService } from '../../services/tracking';

import { WorklogRagSettingsComponent } from './worklog-rag-settings.component';

describe('WorklogRagSettingsComponent', () => {
  let component: WorklogRagSettingsComponent;
  let fixture: ComponentFixture<WorklogRagSettingsComponent>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WorklogRagSettingsComponent ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideMockStore(),
        { provide: TrackingService, useValue: { captureUserAction: jest.fn() } },
      ]
    })
    .compileComponents();

    store = TestBed.inject(MockStore);
    store.setState({
      globalConfigs: {
        serverConfigs: {
          'worklog.day.hour.config': '8',
          'worklog.main.category.alias': 'Main',
          'worklog.other.category.alias': 'Other',
          'worklog.other.email.subscription.threshold': '1'
        }
      },
      globalTranslations: {
        translation: {
          ragConfig: { edit: 'Edit', subHeading: 'Sub heading' }
        }
      }
    });

    fixture = TestBed.createComponent(WorklogRagSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
