/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Store } from '@ngrx/store';
import { Constants } from 'app/constants';
import { AdminActions, TrackingService } from 'app/services/tracking/';
import { getActiveAccessLevels } from 'app/shared/helper-functions';
import { AppState } from 'app/states/app-states';
import { fetchUpdatedUser } from 'app/states/app.actions';
import { selectTranslation } from 'app/states/global-translations.selector';
import { Subscription } from 'rxjs';
import { Member, Role, User } from '../admin.entities';
import { editUser, emailUpdated, emailUpdatedStatus, getAccessLevels } from '../state/admin.actions';
import { selectUserUpdateSuccess } from '../state/admin.selector';
import { StringUtils } from 'app/shared/string-utils';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DropdownsModule } from 'app/dropdowns/dropdowns.module';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

export interface RoleNew {
  code: string;
  name: string;
}

@Component({
  selector: 'khoji-edit-user-modal',
  templateUrl: './edit-user-modal.component.html',
  styleUrls: ['./edit-user-modal.component.css'],
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    DropdownsModule,
    TooltipModule,
    InputTextModule,
    ButtonModule
  ]
})
export class EditUserModalComponent implements OnInit {

  currentOrganization: string;
  currentRole: string;
  currentAccessLevel: any;
  editingUserID: string;

  accessLevelsDropdownDisabled: boolean;

  accessLevels: any[] = [];
  owningOrganizations: {
    code: string,
    name: string;
  }[] = [];
  rolesDropdownValues: RoleNew[] = [];

  accessibleAccessLevels: string[];

  subscription = new Subscription();
  constants = Constants;
  translation: any;

  userModel = {
    firstName: '',
    lastName: '',
    email: '',
    // location: '',
    accessLevel: '',
    userRole: {
      id: 0,
      code: '',
      name: '',
      description: '',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  };

  roles: Role[] = [];

  @Input() selectedUser: User;
  @Input() disableEmailField: boolean = true;
  @Input() isAccessLevelEditable: boolean = true;
  @Output() onClose: EventEmitter<boolean> = new EventEmitter();

  constructor(private store: Store<AppState>,
    private trackingService: TrackingService,
    private cdr: ChangeDetectorRef
  ) { }


  ngOnInit(): void {
    this.store.dispatch(getAccessLevels());
    this.store.dispatch(fetchUpdatedUser({ userId: this.selectedUser.id }));
    const adminState$ = this.store.select("admin");
    const emailSuccess$ = this.store.pipe(selectUserUpdateSuccess);
    const userProfile$ = this.store.select('userProfile');
    const globalConfigs$ = this.store.select('globalConfigs');

    this.subscription.add(userProfile$.subscribe(userProfile => {
      if (userProfile.accessibleAccessLevels) {
        this.accessibleAccessLevels = userProfile.accessibleAccessLevels;
        this.editingUserID = userProfile.userSettings.user.id;
      }
    }));

    this.subscription.add(emailSuccess$.subscribe(data => {
      if (data) {
        this.closeModal(true);
        this.store.dispatch(emailUpdatedStatus({ success: false }));
      }
    }));

    this.subscription.add(adminState$.subscribe(data => {
      this.roles = data.roles;
      if (data.accessLevels) {
        this.accessLevels = getActiveAccessLevels(data.accessLevels, this.accessibleAccessLevels);
      }
      if (data.roles != null) {
        this.populateRoles(data.roles);
      }
    }));

    this.subscription.add(globalConfigs$.subscribe(user => {
      if (user.updatedUser?.updatedUser) {
        this.selectedUser = user.updatedUser.updatedUser;
        this.userModel.firstName = this.selectedUser.member.fullName.split(' ')[0];
        this.userModel.lastName = this.selectedUser.member.fullName.split(' ')[1];
        this.userModel.email = this.selectedUser.email;
        this.currentAccessLevel = this.selectedUser.accessLevel;
        this.currentRole = this.selectedUser.member.role.code;
        this.userModel.userRole = this.selectedUser.member.role;
        this.accessLevelsDropdownDisabled = !this.accessibleAccessLevels.includes(this.currentAccessLevel);
      }
    }));

    // select translation
    this.subscription.add(this.store.pipe(selectTranslation)
      .subscribe(translation => { this.translation = translation; }));
  }



  hasChanges() {
    return !(
      this.userModel.email === this.selectedUser.email &&
      this.userModel.accessLevel === this.selectedUser.accessLevel &&
      this.userModel.userRole.code === this.selectedUser.member.role.code);
  }

  populateRoles(roles: Role[]) {
    this.rolesDropdownValues = roles
      .map(role => ({
        code: role.code,
        name: role.name
      }))
      .sort((a, b) => StringUtils.compare(a.name, b.name));
  }

  getAccessLevelValue(value) {
    this.userModel.accessLevel = value;
  }

  submit() {
    const updatedMember: Member = {
      ...this.selectedUser.member,
      fullName: this.userModel.firstName,
      //lastName: this.userModel.lastName,
      role: this.userModel.userRole,
      memberEmail : this.userModel.email,
    };

    const updatedUser: User = { ...this.selectedUser, member: updatedMember, email: this.userModel.email, accessLevel: this.userModel.accessLevel };

    this.trackingService.captureUserAction(AdminActions.ManageUsers.MenuButtonOnUserRow.EditUser.UserUpdated);
    if (this.userModel.email == this.selectedUser.email) {
      this.store.dispatch(editUser({ selectedUser: updatedUser, editingUserID: this.editingUserID }));
    }
    else {
      this.store.dispatch(emailUpdated({ selectedUser: updatedUser }));
    }
  }

  showErrorMessage(obj: any, place: string) {
    if (obj?.required) {
      return this.translation.adminPanel.projectIntegration.users.fieldErrors[place].requiredFieldError;
    }
    if (obj?.pattern) {
      return this.translation.adminPanel.projectIntegration.users.fieldErrors[place].invalidPatternError;
    }
    if (obj?.minlength) {
      return this.translation.adminPanel.projectIntegration.users.fieldErrors.invalidLengthError;
    }
    return this.constants.EMPTY_STRING;
  }

  isAnyInputFieldEmpty(): boolean {
    return false;
  }

  roleChanged(value: string) {
    this.userModel.userRole = this.roles.filter(role => role.code === value)[0];
  }

  roleMatched(id: number) {
    return this.userModel.userRole.id === Number(id);
  }

  closeModal(updateUserButtonClicked: boolean) {
    if (!updateUserButtonClicked) {
      this.trackingService.captureUserAction(AdminActions.ManageUsers.MenuButtonOnUserRow.EditUser.ClosedButton);
    }
    this.onClose.emit(true);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

}
