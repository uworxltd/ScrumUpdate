import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Role, User, UserEditDetails } from 'app/admin/admin.entities';
import { RoleNew } from 'app/admin/edit-user-modal/edit-user-modal.component';
import { editUserInBulk, setEditUserInBulkLoadingState } from 'app/admin/state/admin.actions';
import { selectRoles, selectTeamOnboardingObjects, selectUserWithRoleName } from 'app/admin/state/admin.selector';
import { Constants } from 'app/constants';
import { DropdownsModule } from 'app/dropdowns/dropdowns.module';
import { AdminActions, TrackingService } from 'app/services/tracking';
import { StringUtils } from 'app/shared/string-utils';
import { AppState, LoadingState } from 'app/states/app-states';
import { selectUpdatedUser } from 'app/states/global-configs.selector';
import { selectEditUserInBulkLoadingState } from 'app/states/global-process.selector';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { combineLatest, Subscription } from 'rxjs';

@Component({
  selector: 'khoji-bulk-role-allocation-dialog',
  standalone: true,
  templateUrl: `./bulk-role-allocation-dialog.component.html`,
  styleUrls: ['./bulk-role-allocation-dialog.component.scss'],
  imports: [
    DialogModule,
    CommonModule,
    ButtonModule,
    DropdownsModule,
    AutoCompleteModule,
    FormsModule
  ]
})
export class BulkRoleAllocationDialogComponent implements OnInit, OnDestroy {

  private _showModal: boolean = false;
  users: User[];

  roles: Role[] = [];
  selectedRole: Role;
  defaultKhojiRole: Role;
  roleNew: RoleNew[] = [];
  roleSelectionChange = false;

  selectedUsers: User[] = [];
  private initialUsers: User[] = [];

  userDetails: UserEditDetails[] = [];

  @Input() get showModal() {
    return this._showModal;
  }
  set showModal(value: boolean) {
    this.selectedUsers = [];
    this.roleSelectionChange = false;
    this.showModalChange.emit(value);
    if (value === false && this._showModal === true) {
      this.trackingservice.captureUserAction(AdminActions.ManageUsers.AssignRoleToUsers.ClosedButton);
    }
    this._showModal = value;
  }

  @Output() showModalChange: EventEmitter<boolean> = new EventEmitter();

  private subscription = new Subscription();

  constructor(private store: Store<AppState>, private trackingservice: TrackingService) { }


  ngOnInit() {
    const userWithRoles$ = this.store.pipe(selectUserWithRoleName);
    const updatedUserState$ = this.store.pipe(selectUpdatedUser);
    const roles$ = this.store.pipe(selectRoles);
    const selectTeamOnboardingObjects$ = this.store.pipe(selectTeamOnboardingObjects);
    const editUserInBulkLoadingState$ = this.store.pipe(selectEditUserInBulkLoadingState);


    this.subscription.add(editUserInBulkLoadingState$.subscribe(loadingState => {
      if (loadingState === LoadingState.Done) {
        this.showModal = false;
      }
    }));

    this.subscription.add(
      combineLatest([userWithRoles$, updatedUserState$]).subscribe(([users, updatedUsers]) => {
        const activeUsers: User[] = this.getActiveUsers(users, updatedUsers).filter(user => user.status !== Constants.MEMBER_REVOKED_STATUS);
        this.initialUsers = activeUsers;
        this.users = activeUsers;
      })
    );

    this.subscription.add(combineLatest([roles$, selectTeamOnboardingObjects$]).subscribe(([roles, ob]) => {
      this.roles = roles;
      this.defaultKhojiRole = ob.defaultKhojiRole;
      this.populateRoleDropdown(this.roles);
    }));
  }


  private getActiveUsers(users, updatedUsers): User[] {

    if (!updatedUsers) return users;

    return users.map(user => {
      if (user.id === updatedUsers.userId) {
        return {
          ...user,
          userStatuses: updatedUsers.updatedUser.userStatuses,
        };
      }
      return user;
    });
  }

  private populateRoleDropdown(roles: Role[]) {
    this.roleNew = roles
      .map(role => ({
        code: role.code,
        name: role.name
      })).sort((a, b) => StringUtils.compare(a.name, b.name));
  }

  searchUsers(event) {
    const selectedUserids = this.selectedUsers.map(u => u.member.id);
    const query = event.query.toLowerCase();
    this.users = this.initialUsers.filter(user =>
      user.member.fullName.toLowerCase().includes(query) && !selectedUserids.includes(user.member.id)
    );
  }

  selectedRoleForUsers(event) {
    this.selectedRole = event;
    this.roleSelectionChange = true;
  }

  private mapUsersToEditDetails() {
    return this.selectedUsers.map(user => ({
      accountId: user.member.accountId,
      roleCode: this.roleSelectionChange ? this.selectedRole : this.defaultKhojiRole.code,
      email: user.email,
      accessLevelCode: user.accessLevel
    }));
  }

  updateUsersRoleInBulk() {
    const edittedUserDetails = this.mapUsersToEditDetails();
    this.trackingservice.captureUserAction(AdminActions.ManageUsers.AssignRoleToUsers.Update);
    this.store.dispatch(editUserInBulk({ users: edittedUserDetails, isBulkEdit: true }))
  }

  ngOnDestroy() {
    this.store.dispatch(setEditUserInBulkLoadingState({ loadingState: LoadingState.Pending }));
    this.subscription.unsubscribe();
  }
}
