/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { updateProfile } from './../../states/app.actions';
import { User, Member } from './../../admin/admin.entities';
import { Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { AppState, LoadingState } from 'app/states/app-states';
import { Constants } from 'app/constants';
import { selectUpdatedUserProfileLoadingState } from 'app/states/global-process.selector';
import { resetLoadingStates } from 'app/states/app.actions';
import { TrackingService, UserActions } from 'app/services/tracking';

@Component({
  selector: 'khoji-update-profile',
  templateUrl: './update-profile.component.html',
})
export class UpdateProfileComponent implements OnInit, OnDestroy {

  translation: any;
  subscription = new Subscription();
  constants = Constants;
  updatedUser: User;
  updatedMember: Member;
  blobImage: any;

  ButtonDisabled: boolean = true;
  imageDeleted: boolean = false;
  imageModified: boolean = false;

  model = {
    firstName: '',
    lastName: '',
    image: null,
    email: ''
  }

  constructor(private store: Store<AppState>, private trackingService: TrackingService) { }

  ngOnInit(): void {
    // reset save button state everytime the component is rendered
    this.store.dispatch(resetLoadingStates());

    const globalTranslation$ = this.store.select('globalTranslations');
    const userProfile$ = this.store.select('userProfile');
    const updateLoadingState$ = this.store.pipe(selectUpdatedUserProfileLoadingState);

    this.subscription.add(updateLoadingState$.subscribe(loadingState => {
      this.ButtonDisabled = loadingState === LoadingState.Error ? false : true;
      this.imageDeleted = loadingState === LoadingState.Done ? false : this.imageDeleted;
      this.imageModified = loadingState === LoadingState.Done ? false : this.imageModified;
    }));

    this.subscription.add(userProfile$.subscribe(userProfile => {
      this.updatedUser = userProfile.userSettings?.user;
      this.updatedMember = userProfile.userSettings?.user.member;
      this.model = {
        ...this.model,
        firstName: userProfile.userSettings?.user.member.fullName,
        lastName: userProfile.userSettings?.user.member.lastName,
        email: userProfile.userSettings?.user.member.memberEmail,
        image: userProfile?.userProfileBase64String
      }
    }));

    this.subscription.add(globalTranslation$.subscribe(globalTranslation => {
      if (globalTranslation) {
        this.translation = globalTranslation.translation;
      }
    }));
  }

  /**
   * Function to return custom errors on form field validation
   * @param obj input object on which the validations are to be checked
   * @param place the validation object from translation file to show the error
   * @returns error message to be displayed
   */
  showErrorMessage(obj: any, place: string) {
    if (obj.required) {
      return this.translation.adminPanel.projectIntegration.users.fieldErrors[place].requiredFieldError;
    }
    if (obj.pattern) {
      return this.translation.adminPanel.projectIntegration.users.fieldErrors[place].invalidPatternError;
    }
    if (obj.minlength) {
      return this.translation.adminPanel.projectIntegration.users.fieldErrors.invalidLengthError;
    }
    return this.constants.EMPTY_STRING;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /**
   * The function to calculate the save button state
   * @returns save button state true if enabled, false if disabled
   */
  saveButtonDisabled(): boolean {
    // Enable the button if any of the following is true
    if (!this.ButtonDisabled || this.imageModified || this.imageDeleted) {
      return false;
    }

    // Enable the button if the member information has been updated
    return this.model.firstName === this.updatedMember.fullName && this.model.lastName === this.updatedMember.lastName;
  }

  /**
   * This function is called on the click of save button which dispatches the request to backend to update the user
   */
  saveChanges() {
    this.trackingService.captureUserAction(UserActions.Profile.ProfileSettings);
    this.updatedMember = {
      ...this.updatedMember,
      fullName: this.model.firstName,
      lastName: this.model.lastName
    }

    this.updatedUser = {
      ...this.updatedUser,
      member: this.updatedMember,
      avatarURL: this.blobImage,
      userProfileImage: this.imageDeleted ? null : this.updatedUser.userProfileImage,
    }

    this.store.dispatch(updateProfile({ updatedUser: this.updatedUser }));
  }

  /**
   *this function captures the event of image changed and then updates the check accordingly
   * @param event image that is emitted from the UploadImageComponent and captured as an event
   */
  imageChanged(event: any) {
    this.blobImage = event;
    this.imageModified = true;
  }
}
