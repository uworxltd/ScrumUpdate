/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TrackingService } from 'app/services/tracking';

import { UpdateProfileComponent } from './update-profile.component';

describe('UpdateProfileComponent', () => {
  let component: UpdateProfileComponent;
  let fixture: ComponentFixture<UpdateProfileComponent>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ FormsModule ],
      declarations: [ UpdateProfileComponent ],
      providers: [
        provideMockStore(),
        { provide: TrackingService, useValue: { captureUserAction: jest.fn(), captureNavigationStep: jest.fn() } },
      ]
    })
    .compileComponents();

    store = TestBed.inject(MockStore);
    store.setState({
      userProfile: {
        userSettings: {
          user: {
            member: {
              fullName: 'John',
              lastName: 'Doe',
              memberEmail: 'john@example.com'
            }
          }
        },
        userProfileBase64String: null
      },
      globalTranslations: {
        translation: {
          signupUser: {
            signupPage: {
              firstNameTitle: 'First Name',
              lastNameTitle: 'Last Name'
            }
          },
          adminPanel: {
            projectIntegration: {
              users: {
                usernameInputToolTip: 'Enter username'
              }
            }
          },
          adminMenuUser: {
            buttons: { save: 'Save' }
          }
        }
      }
    });

    fixture = TestBed.createComponent(UpdateProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
