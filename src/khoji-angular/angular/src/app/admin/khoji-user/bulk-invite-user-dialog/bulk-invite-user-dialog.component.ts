import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, TemplateRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ProjectComponentUsers, ProjectIntegrationUser, Role } from 'app/admin/admin.entities';
import { RoleNew } from 'app/admin/edit-user-modal/edit-user-modal.component';
import { addJiraUsers, fetchUsers, onboardingInviteUserModalStatus } from 'app/admin/state/admin.actions';
import { selectFetchUsersLoadingState, selectOnboardingInviteUserModalStatus, selectTeamOnboardingObjects } from 'app/admin/state/admin.selector';
import { Constants } from 'app/constants';
import { DropdownsModule } from 'app/dropdowns/dropdowns.module';
import { AdminActions, TrackingService } from 'app/services/tracking';
import { AppState, LoadingState } from 'app/states/app-states';
import { getKhojiLimitations } from 'app/states/global-configs.selector';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { combineLatest, Subscription } from 'rxjs';

@Component({
  selector: 'khoji-bulk-invite-user-dialog',
  templateUrl: './bulk-invite-user-dialog.component.html',
  styleUrls: ['./bulk-invite-user-dialog.component.scss'],
  standalone: true,
  imports: [
    DialogModule,
    CommonModule,
    FormsModule,
    AutoCompleteModule,
    ButtonModule,
    ChipModule,
    DropdownsModule,
    SkeletonModule
  ]
})
export class BulkInviteUserDialogComponent implements OnInit, OnDestroy {
  /**
   * show modal behaves like ngmodel a 2 way data-binding [(showModal)]
   *
   * @private
   * @type {boolean}
   * @memberof BulkInviteUserDialogComponent
   */
  private _showModal: boolean = false;
  @Output()
  showModalChange: EventEmitter<boolean> = new EventEmitter();

  @Input()
  get showModal() {
    return this._showModal;
  }
  set showModal(value: boolean) {
    this.selectedUsers = [];

    if (value) this.store.dispatch(fetchUsers({}));

    if (value === false && this._showModal === true) {
      this.trackingService.captureUserAction(AdminActions.ManageTeams.AddFromJira.ClosedButton);
    }

    this._showModal = value;
    this.showModalChange.emit(value);
  }

  /**
   * header of the modal or standalone component
   *
   * @type {string}
   * @memberof BulkInviteUserDialogComponent
   */
  @Input() header: string = '';

  /**
   * display inside a dialog/modal or as a standalone component
   *
   * @type {boolean}
   * @memberof BulkInviteUserDialogComponent
   */
  @Input() modal: boolean = true;

  @Input() headerTemplate: TemplateRef<any>;
  @Input() bodyTemplate: TemplateRef<any>;
  @Input() footerTemplate: TemplateRef<any>;


  // users variables
  protected selectedUsers: ProjectComponentUsers[] = [];
  private users: ProjectComponentUsers[] = [];
  protected filteredUsers: ProjectComponentUsers[] = [];
  protected usersLoaded: boolean = false;
  protected existingUsers: ProjectComponentUsers[] = [];

  // roles variables
  roles: RoleNew[] = [];
  unMappedRoles: Role[] = [];
  defaultKhojiRole: RoleNew;
  selectedRoleCode: string;
  activeRoute: string;

  // limits variables
  remainingLimit: number = 0;

  // subscription variables
  subscription = new Subscription();

  constructor(private store: Store<AppState>, private trackingService: TrackingService) { }

  ngOnInit() {
    const url = new URL(location.href);
    this.activeRoute = url.searchParams.get("tab");
 
    // assign required elements from subscription to variables
    this.subscription.add(
      combineLatest([
        this.store.pipe(selectTeamOnboardingObjects),
        this.store.pipe(selectFetchUsersLoadingState),
        this.store.pipe(getKhojiLimitations),
      ])
        .subscribe(
          ([ob, loadingState, limitations]) => {
            // TODO: add functionality after fixing limitations
            const allowedUsers = Number(limitations.find(l => l.id === Constants.USERS_ALLOWED)?.value);
            this.existingUsers = ob.users.filter(u => ob.existingUsers.includes(u.accountId));
            this.remainingLimit = allowedUsers - ob.existingUsers.length + ob.revokedUsersIds.length;
            this.users = this.filteredUsers = ob.users.filter(u => !ob.existingUsers.includes(u.accountId));
            this.defaultKhojiRole = ob.defaultKhojiRole;
            this.unMappedRoles = ob.roles;
            this.populateRoleDropdown(ob.roles);
            this.usersLoaded = ob.usersLoadingState === LoadingState.Done && loadingState === LoadingState.Done;
          }
        )
    );

    // closing modal on success of the api call
    this.subscription.add(
      this.store.pipe(selectOnboardingInviteUserModalStatus)
      .subscribe(status => {
        this.showModal = status;
        this.store.dispatch(onboardingInviteUserModalStatus({ status: !status }));
      })
    );
  }


  /**
   * Maps the roles to the type that is required by the Khoji-single-select
   *
   * @private used internally
   * @param {Role[]} roles unmapped roles in default state
   * @memberof BulkInviteUserDialogComponent
   */
  private populateRoleDropdown(roles: Role[]) {
    this.roles = roles
      .map(role => ({
        code: role.code,
        name: role.name
      }));
  }

  /**
   * Searches for the user and returns the array in which either all
   * the users are set or the ones that are matched based on name
   * @protected used internally
   * @param {*} event event that is returned from the autocomplete component
   * @memberof BulkInviteUserDialogComponent
   */
  protected searchUsers(event) {
    // dont think of it as bad code, this cloning is required as given in
    // https://www.primefaces.org/primeng-v14-lts/autocomplete

    //     Change Detection of Suggestions
    // AutoComplete uses setter based checking to realize if the suggestions has changed to update the UI.
    // In order this to work, your changes such as adding or removing a record should always create a new array
    // reference instead of manipulating an existing array as Angular does not trigger setters if the reference does not change.

    // Note that if no suggestions are available after searching, provide an empty array instead of a null value.
    const selectedUserids = this.selectedUsers.map(u => u.accountId);
    let filtered = [];

    if (event.query) filtered = [...this.users.filter(u => u.name.toLowerCase().includes(event.query.toLowerCase()) && !selectedUserids.includes(u.accountId))];
    else filtered = this.users.filter(u => !selectedUserids.includes(u.accountId));

    this.filteredUsers = [...filtered];
  }

  /**
   * Remove extra props from the object and make an api call so that user selection can be persisted
   *
   * @protected used internally
   * @memberof BulkInviteUserDialogComponent
   */
  protected addSelectedUsers() {
    const selectedRole = this.unMappedRoles.find(r => r.code === this.selectedRoleCode);

    const users: ProjectIntegrationUser[] = this.selectedUsers.map(u => {
      const { isEdited, alreadyExisting, isSelected, ...rest } = u;
      return {
        ...rest,
        userRole: selectedRole
      };
    });

    this.store.dispatch(addJiraUsers({ users, tab: this.activeRoute }));

    this.selectedRoleCode = this.defaultKhojiRole.code;
    
    if (this.activeRoute === "manage-users") {
      this.trackingService.captureUserAction(AdminActions.ManageUsers.BulkAddUsers.AddUsers);
    } else {
      this.trackingService.captureUserAction(AdminActions.ManageTeams.AddFromJira.AddUsers);
    }
  }

  /**
   * checks if the limit is reached and users are added more than allowed
   *
   * @readonly
   * @protected used internally
   * @memberof BulkInviteUserDialogComponent
   */
  protected get limitReached() {
    return this.remainingLimit - this.selectedUsers.length < 0
  }

  /**
   * checks if the limit is reached and users are added more than allowed
   * then return 0 else the remaining limit
   * @readonly
   * @protected used internally
   * @memberof BulkInviteUserDialogComponent
   */
  protected get limit() {
    return this.limitReached ? 0 : this.remainingLimit - this.selectedUsers.length;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
