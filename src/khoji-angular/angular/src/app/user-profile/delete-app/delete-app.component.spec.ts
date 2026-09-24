import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { TrackingService } from 'app/services/tracking';
import { UnleashService } from 'app/services/unleash.service';

import { DeleteAppComponent } from './delete-app.component';

describe('DeleteAppComponent', () => {
  let component: DeleteAppComponent;
  let fixture: ComponentFixture<DeleteAppComponent>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        DeleteAppComponent,
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideMockStore(),
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: TrackingService, useValue: { captureUserAction: jest.fn(), captureNavigationStep: jest.fn() } },
        { provide: UnleashService, useValue: { isFeatureEnabled: jest.fn().mockReturnValue(of(false)) } },
      ]
    })
    .compileComponents();

    store = TestBed.inject(MockStore);
    store.setState({
      globalConfigs: {
        serverConfigs: {
          'worklog.data.storage.permission': 'true',
          'worklog.data.sync.permission': 'true'
        }
      },
      globalTranslations: {
        translation: {
          userProfile: {
            deleteAppConfirmation: { message: 'Delete app?' }
          }
        }
      }
    });

    fixture = TestBed.createComponent(DeleteAppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
