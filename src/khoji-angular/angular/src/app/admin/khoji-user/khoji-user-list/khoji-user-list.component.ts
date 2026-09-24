/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Role, User } from 'app/admin/admin.entities';
import { editUserInBulk, enableAccess, fetchKhojiTeamsList, fetchRoles, fetchSourceUsers, fetchUsers, resetUsers, revokeUserAccess, setNewJiraUserId } from 'app/admin/state/admin.actions';
import { selectFetchUsersLoadingState, selectNewJiraUser, selectUsers } from 'app/admin/state/admin.selector';
import { Constants } from 'app/constants';
import { KhojiComponent } from 'app/interface/khoji-component.interface';
import { FeatureFlagService } from 'app/services/feature.flag.service';
import { getActiveAccessLevels, getUsername, isComponentEnabled } from 'app/shared/helper-functions';
import { AppState, LoadingState } from 'app/states/app-states';
import { fetchKhojiConfigs, fetchTranslations, setUpdatedUser } from 'app/states/app.actions';
import { getComponentConfigs, getKhojiLimitations, selectUpdatedUser } from 'app/states/global-configs.selector';
import { selectTranslation } from 'app/states/global-translations.selector';
import { BlockableUI, ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { EditUserModalComponent, RoleNew } from 'app/admin/edit-user-modal/edit-user-modal.component';
import { BehaviorSubject, Subscription, combineLatest } from 'rxjs';
import { AdminActions, RootNav, TrackingService } from '../../../services/tracking';
import { selectEditUserInBulkLoadingState } from 'app/states/global-process.selector';
import { hasChanges } from 'app/core/guards/has-changes.guard';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { SharedModule } from 'app/shared/shared.module';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { KhojiInviteUserDialogComponent } from '../khoji-invite-user-dialog/khoji-invite-user-dialog.component';
import { BulkInviteUserDialogComponent } from '../bulk-invite-user-dialog/bulk-invite-user-dialog.component';
import { BulkRoleAllocationDialogComponent } from '../bulk-role-allocation-dialog/bulk-role-allocation-dialog.component';
import { TooltipModule } from 'primeng/tooltip';
import { ToolbarModule } from 'primeng/toolbar';
import { SplitButtonModule } from 'primeng/splitbutton';
import { selectAccessibleAccessLevels, selectUserProfile } from 'app/user-profile/state/user-profile.selectors';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { SkeletonModule } from 'primeng/skeleton';
import { InputTextModule } from 'primeng/inputtext';
import { BlockUIModule } from 'primeng/blockui';
import { delay } from 'rxjs/operators';

@Component({
  selector: 'app-khoji-user-list',
  templateUrl: './khoji-user-list.component.html',
  styleUrls: ['./khoji-user-list.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToolbarModule,
    TableModule,
    DropdownModule,
    DialogModule,
    ConfirmDialogModule,
    TooltipModule,
    SplitButtonModule,
    SkeletonModule,
    SharedModule,
    KhojiInviteUserDialogComponent,
    BulkInviteUserDialogComponent,
    BulkRoleAllocationDialogComponent,
    InputTextModule,
    EditUserModalComponent,
    BlockUIModule,
  ]
})
export class KhojiUserListComponent implements OnInit, OnDestroy, hasChanges, BlockableUI {
  constructor(
    private store: Store<AppState>,
    private feature: FeatureFlagService,
    private trackingService: TrackingService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {
  }

  static pageNo = '1';
  static itemToSet = 'page';

  userMenuItems: MenuItem[] = [];
  suspendUserModal: boolean = false;

  usersList: User[] = [];
  modifiedUsersList: User[] = [];
  filteredData: User[] = [];
  subscription = new Subscription();
  translation: any;
  tableHeaders: string[];
  inviteAgainUserEmail: string;
  nameOfUser: string;
  userIdToRevoke: number;
  constants = Constants;
  userName: string;
  selectedUser: User;
  editingUser: Map<string, User> = new Map();
  editingUserIndex: number;
  savingEditUsersState = LoadingState.Pending;
  loadingStates = LoadingState;
  location: string;
  showEditUserModal = false;
  searchText = '';
  isDashboardInsightsEnabled: boolean;

  restrictAdminToRevokeSourceUser = false;
  usersLimitationCount = 0;

  showNoDataAvailableAfterLoadingIsDone = false;
  orgName: string = '';
  componentConfigs: KhojiComponent[];

  userLimit: number = 0;
  limitReached: boolean = false;
  _showInviteModal: boolean = false;
  _showInviteBulkModal = false;

  get showInviteModal() {
    return this._showInviteModal;
  }
  set showInviteModal(value: boolean) {
    this._showInviteModal = value;
  }

  get showInviteBulkModal() {
    return this._showInviteBulkModal;
  }
  set showInviteBulkModal(value: boolean) {
    if (value === false && this._showInviteBulkModal === true) {
      this.trackingService.captureUserAction(AdminActions.ManageUsers.BulkAddUsers.ClosedButton);
    }
    this._showInviteBulkModal = value;
  }

  showBulkRoleAllocationModal: boolean = false;
  inviteButtonItems: MenuItem[];
  roles: Role[] = [];
  accessLevels: any[] = [];
  accessibleAccessLevels: string[];
  rolesDropdownValues: RoleNew[] = [];
  currentMemberId = "";
  blockUI = false;
  blockUI$ = new BehaviorSubject(false);
  usersFetched = false;

  ngOnInit(): void {
    this.initMenuItems();
    this.trackingService.captureNavigationStep(RootNav.ManageApp.AdminPanel.ManageUsers);
    this.store.dispatch(fetchUsers({}));
    this.store.dispatch(fetchSourceUsers({ sourceSystem: null }));
    this.store.dispatch(fetchRoles());
    this.store.dispatch(fetchTranslations({ locale: 'en_GB' }));
    this.store.dispatch(fetchKhojiConfigs());
    this.store.dispatch(fetchKhojiTeamsList());

    const componentConfigs$ = this.store.pipe(getComponentConfigs);
    const newJiraUserId$ = this.store.pipe(selectNewJiraUser);
    const adminState$ = this.store.select("admin");
    const userProfile$ = this.store.pipe(selectUserProfile);
    const selectEditUserInBulkLoadingState$ = this.store.pipe(selectEditUserInBulkLoadingState);

    this.subscription.add(selectEditUserInBulkLoadingState$.subscribe((data) => {
      this.savingEditUsersState = data;
      if (data == LoadingState.Done) {
        if (this.editingUserIndex) {
          this.editingUserIndex = null;
        }
      }
      else if (data === LoadingState.Error) {
        if (this.editingUserIndex) {
          this.usersList[this.editingUserIndex] = { ...this.editingUser[this.editingUserIndex] };
          this.editingUserIndex = null;
        }
      }
    }));

    this.subscription.add(userProfile$.subscribe(userProfile => {
      this.currentMemberId = userProfile.khojiUserProfile.email;
    }));

    this.subscription.add(
      this.store.pipe(selectAccessibleAccessLevels).subscribe(al => {
        if (al && al.length) {
          this.accessibleAccessLevels = al;
        }
      })
    )

    this.subscription.add(adminState$.subscribe(data => {
      this.roles = data.roles;

      if (data.accessLevels) {
        this.accessLevels = getActiveAccessLevels(data.accessLevels, this.accessibleAccessLevels);
      }

      if (data.roles != null) {
        this.populateRoles(data.roles);
      }

      //this.accessLevels.sort((a, b) => a.name.localeCompare(b.name));
      this.roles = structuredClone(this.roles);
      this.roles.sort((a, b) => a.name.localeCompare(b.name));
    }));

    this.subscription.add(
      componentConfigs$.subscribe((cfgs) => {
        this.componentConfigs = cfgs;
      })
    );

    this.userName = getUsername();
    sessionStorage.setItem(KhojiUserListComponent.itemToSet, KhojiUserListComponent.pageNo);

    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe((translation) => {
        this.translation = translation;
      })
    );

    const usersState$ = this.store.pipe(selectUsers);
    const limitations$ = this.store.pipe(getKhojiLimitations);

    this.subscription.add(
      combineLatest([usersState$, newJiraUserId$, limitations$]).subscribe(([data, newJiraUserId, limitations]) => {
        this.usersList = structuredClone(data);
        this.usersList = this.usersList.map(user => {
          const updatedUser = this.modifiedUsersList.find(u => u.id === user.id);

          // If a matching user is found, replace the original with the updated data
          const mergedUser = updatedUser ? { ...user, ...updatedUser } : user;
          return { ...mergedUser, roleCode: mergedUser.roleCode || user.member.role.code };
        });

        this.usersList.sort((a, b) => a.member.fullName.localeCompare(b.member.fullName));
        this.userLimit = Number(limitations.find(l => l.id === Constants.USERS_ALLOWED)?.value);
        this.limitReached = this.userLimit <= this.getUsersAddedLength();
        this.handleNewJiraUserId(newJiraUserId);
      })
    );

    const $updatedUserState = this.store.pipe(selectUpdatedUser);
    this.subscription.add(
      combineLatest([$updatedUserState, limitations$]).subscribe(([data, limitations]) => {
        if (data) {
          let updatedUser = { ...data.updatedUser, currentStatus: data.updatedUser.status, roleCode: data.updatedUser.member.role.code };
          const updatedUserIndex = this.usersList.findIndex(u => u.id === data.userId);
          this.usersList[updatedUserIndex] = updatedUser;
          this.userLimit = Number(limitations.find(l => l.id === Constants.USERS_ALLOWED).value);
          this.limitReached = this.userLimit <= this.getUsersAddedLength();
        }
      })
    );

    const usersLoadingState$ = this.store.pipe(selectFetchUsersLoadingState);
    this.subscription.add(usersLoadingState$.subscribe((data) => {
      if (data == LoadingState.Done) {
        this.usersFetched = true;
        this.showNoDataAvailableAfterLoadingIsDone = true;
      }
      this.blockUI$.next(!this.usersFetched && data === LoadingState.Loading);
    }));

    this.subscription.add(this.blockUI$.pipe(delay(100)).subscribe((block) => (this.blockUI = block)));

    this.feature.isDashboardInsightsEnabled().then((value) => (this.isDashboardInsightsEnabled = value));

    this.inviteButtonItems = [
      {
        label: 'Bulk add users',
        icon: 'pi pi-plus',
        command: () => {
          this.openInviteBulkModal();
        }
      }
    ];
  }

  handledNewJiraUserId = false;
  handleNewJiraUserId(id: string) {
    if (this.handledNewJiraUserId || !id || !this.usersList?.length) return;

    this.handledNewJiraUserId = true;

    let userExists = (accountId: string) => this.usersList.findIndex(u => u.member?.accountId == accountId) > -1;

    if (userExists(id)) {
      return this.messageService.add({
        key: 'message',
        severity: 'info',
        summary: this.translation?.toastMessages.summaries.info,
        detail: this.translation?.toastMessages.messages.userAlreadyExists
      });
    }
    else if (this.limitReached) {
      return this.messageService.add({
        key: 'message',
        severity: 'info',
        summary: this.translation?.toastMessages.summaries.info,
        detail: this.translation?.toastMessages.messages.userLimitReached
      });
    }

    this.openInviteModal();
  }

  private initMenuItems() {
    this.userMenuItems = [
      {
        label: 'Edit user',
        icon: 'pi pi-user-edit',
        command: (event) => this.openModalForEditUser()
      }
    ];
  }

  isComponentEnabled(compId: string) {
    return isComponentEnabled(this.componentConfigs, compId);
  }

  openModalForEditUser = function () {
    this.trackingService.captureNavigationStep(RootNav.AdminDashboard.ManageUsers.EditUser);
    setTimeout(() => {
      this.showEditUserModal = true;
    }, 100);
  }

  closeEditUserModal(event: boolean) {
    if (event) {
      this.showEditUserModal = false;
    }
  }

  isFeatureEnabled() {
    return this.feature.isEnabled(this.constants.NEW_TENANT_ADMIN_DASHBOARD_KEY);
  }

  onInviteUserClick(): void {
    this.trackingService.captureNavigationStep(RootNav.AdminDashboard.ManageUsers.InviteUser);
  }

  openInviteModal() {
    if (!this.limitReached) this.showInviteModal = true;
    this.trackingService.captureNavigationStep(RootNav.AdminDashboard.ManageUsers.AddJiraUser)
  }

  openInviteBulkModal() {
    if (!this.limitReached) this.showInviteBulkModal = true;
    this.trackingService.captureNavigationStep(RootNav.ManageApp.AdminPanel.ManageUsers.BulkAddUsers);
  }

  openBulkRoleAllocationModal() {
    this.showBulkRoleAllocationModal = true;
    this.trackingService.captureNavigationStep(RootNav.ManageApp.AdminPanel.ManageUsers.AssignRoleToUsers);
  }

  confirmPopupKey = 'khoji-user-list-confirm-popup'
  confirm = (target: any, header: string, message: string, actionFunction: () => void) => {
    this.confirmationService.confirm({
      key : this.confirmPopupKey,
      target,
      header,
      message,
      accept: () => actionFunction(),
      reject: () => {
        this.trackingService.captureUserAction(AdminActions.ManageUsers.MenuButtonOnUserRow.SuspendUserAccess.ClosedButton);
      }
    });
  }

  inviteUserAgainAfterRevoked(userIdToUnRevoke: number) {
    this.trackingService.captureUserAction(AdminActions.ManageUsers.MenuButtonOnUserRow.RestoreUserAccess)
    this.store.dispatch(enableAccess({ revokeAccessUsername: userIdToUnRevoke }));
  }

  handleInviteUserAgainAfterRevoked(user: User) {
    this.inviteUserAgainAfterRevoked(Number(user.id));
  }

  revokeUserAccess(userIdToRevoke: number) {
    this.trackingService.captureUserAction(AdminActions.ManageUsers.MenuButtonOnUserRow.SuspendUserAccess.ConfrimButton);
    this.store.dispatch(revokeUserAccess({ revokeAccessUsername: userIdToRevoke }));
  }

  handleRevokeUserAccess({ target }, user: User) {
    this.confirm(
      target,
      `Suspend ${user.member?.fullName}?`,
      `This will also remove the user from all associated teams in Khoji. Do you want to proceed?`,
      () => this.revokeUserAccess(Number(user.id))
    );
  }

  editUser(user: User, index: number) {
    this.trackingService.captureUserAction(AdminActions.ManageUsers.EditUser);
    this.modifiedUsersList.push({ ...user });
    this.editingUserIndex = index;
    this.editingUser[user.id] = { ...user };
  }

  cancelEditUser(user: User, index: number) {
    this.modifiedUsersList = this.modifiedUsersList.filter(u => u.id !== user.id);
    const newIndex = this.usersList.findIndex(u => u.id === user.id);
    this.usersList[newIndex] = { ...this.editingUser[user.id] };
    this.editingUser[user.id] = null;
    this.editingUserIndex = null;
    this.usersList = [...this.usersList];
    this.trackingService.captureUserAction(AdminActions.ManageUsers.EditUser.CancelEditUser);
  }


  #hasChanges(user: User, index: string) {
    const _editingUser = this.editingUser[user.id];

    if (!_editingUser) return false;

    return Object.keys(_editingUser).some(key => this.editingUser[user.id][key] !== user[key]);
  }

  hasChanges() {
    return this.usersList.some((user) => this.#hasChanges(user, user.id));
  }

  updateUserInmodifiedUsersList(rowData: User, field: string) {
    const existingUser = this.modifiedUsersList.find(u => u.id === rowData.id);

    if (existingUser) {
      existingUser[field] = rowData[field];
    } else {
      const newUser = { ...rowData };
      this.modifiedUsersList.push(newUser);
    }
  }

  saveEditUser(user: User, index: number) {
    // Remove the user with the specified `id` from the `modifiedUsersList`
    this.modifiedUsersList = this.modifiedUsersList.filter(u => u.id !== user.id);

    const _user: User = this.usersList.find(u => u.id === user.id);
    _user.member.role = this.roles.find(role => role.code === user['roleCode']);

    const hasChanges = this.#hasChanges(user, user.id);

    if (!hasChanges) return;

    const users = [{
      accountId: user.member.accountId,
      email: user.email,
      roleCode: user.member.role.code,
      accessLevelCode: user.accessLevel,
      id: user.id
    }];

    this.store.dispatch(editUserInBulk({ users, isBulkEdit: false }));
    this.trackingService.captureUserAction(AdminActions.ManageUsers.EditUser.SaveEditUser);
  }

  validateEmail(email: string) {
    let error = '';

    if (email === undefined || email === null) return { error };

    email = email.toString();

    const emailIsInvalid = () => !(new RegExp(Constants.KHOJI_EMAIL_REGX).test(email));
    const emailAlreadyExists = () => this.usersList.filter(u=>u.email === email).length > 1;

    error = email ? (emailIsInvalid() ? 'INVALID' : emailAlreadyExists() ? 'DUPLICATE' : '') : '';

    return { error };
  }

  populateRoles(roles: Role[]) {
    this.rolesDropdownValues = roles.map(role => ({
      code: role.code,
      name: role.name
    }));
  }

  getUsersAddedLength(): number {
    return this.usersList.filter(u => u.currentStatus !== 'REVOKED').length;
  }

  displayEmptyMessage() {
    return this.translation.error.noRecordsFoundMessage;
  }

  onMenuButtonClick() {
    this.trackingService.captureUserAction(AdminActions.ManageUsers.MenuButtonOnUserRow);
  }

  getDateInBetterFormat(date: string) {
    if (!date) return '-';

    const givenDate = new Date(date);
    return `${givenDate.getMonth() + 1}/${givenDate.getDate()}/${givenDate.getFullYear()}`;
  }

  getBlockableElement() {
    return document.querySelector('.main-content-area') as HTMLElement;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.store.dispatch(setUpdatedUser({ updatedUser: undefined }))
    this.store.dispatch(resetUsers());
    this.store.dispatch(setNewJiraUserId({ id: '' }));
  }
}
