import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ProjectComponentUsers, ProjectIntegrationUser, Role } from 'app/admin/admin.entities';
import { RoleNew } from 'app/admin/edit-user-modal/edit-user-modal.component';
import { inviteOnboardingUser, onboardingInviteUserModalStatus, setNewJiraUserId } from 'app/admin/state/admin.actions';
import { selectAccessLevels, selectNewJiraUser, selectOnboardingInviteUserModalStatus, selectTeamOnboardingObjects } from 'app/admin/state/admin.selector';
import { Constants } from 'app/constants';
import { DropdownsModule } from 'app/dropdowns/dropdowns.module';
import { AdminActions, TrackingService } from 'app/services/tracking';
import { getActiveAccessLevels } from 'app/shared/helper-functions';
import { AppState, LoadingState } from 'app/states/app-states';
import { selectonboardingInviteUserTranslatiions } from 'app/states/global-translations.selector';
import { selectAccessibleAccessLevels } from 'app/user-profile/state/user-profile.selectors';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { Subscription, combineLatest } from 'rxjs';

interface InviteUserTranslations {
  header: string;
  selectUser: string;
  selectUserPlaceholder: string;
  selectRole: string;
  selectAccessLevel: string;
  emailLabel: string;
  emailPlaceholder: string;
  emailInvalidPatternError: string;
  buttons: Buttons;
}

interface Buttons {
  save: string;
  cancel: string;
}

@Component({
  selector: 'khoji-invite-user-dialog',
  templateUrl: './khoji-invite-user-dialog.component.html',
  styleUrls: ['./khoji-invite-user-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    DropdownModule,
    DropdownsModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    FormsModule,
    SkeletonModule,
  ]
})
export class KhojiInviteUserDialogComponent implements OnInit, OnDestroy {

  // [(ngModel)] like variable [(showMoadl)] for 2 way binding
  private _showModal: boolean = false;
  @Output() showModalChange: EventEmitter<boolean> = new EventEmitter();
  @Input() get showModal() {
    return this._showModal;
  }
  set showModal(value: boolean) {
    this.clearStates();
    this._showModal = value;
    this.showModalChange.emit(value);
  }

  // user variables
  users: ProjectComponentUsers[] = [];
  dropDownUsers: { name: string, code: string }[];
  selectedUserCode: string;
  selectedUser: ProjectComponentUsers;
  userEmail: string;
  emailValid: boolean = true;

  // roles variables
  roles: RoleNew[];
  rolesUnMapped: Role[];
  defaultKhojiRole: Role;

  // loading variables
  usersLoaded: boolean = false;

  // accessLevel Variables
  accessLevels: any[]; //TODO: add type
  defaultAccessLevel: string = 'USER';

  // translation variables
  translation: InviteUserTranslations;

  subscription = new Subscription;
  constants = Constants;
  formSubmitted: boolean = false;

  constructor(
    private store: Store<AppState>, private trackingService: TrackingService,
  ) { }

  ngOnInit(): void {
    const translations$ = this.store.pipe(selectonboardingInviteUserTranslatiions);
    const sourceUsers$ = this.store.pipe(selectTeamOnboardingObjects);
    const accessLevels$ = this.store.pipe(selectAccessLevels);
    const newJiraUserId$ = this.store.pipe(selectNewJiraUser);
    const userAccessLevels$ = this.store.pipe(selectAccessibleAccessLevels);
    const modalStatus$ = this.store.pipe(selectOnboardingInviteUserModalStatus);

    this.subscription.add(
      translations$.subscribe(translations => {
        this.translation = translations;
      })
    );

    this.subscription.add(
      modalStatus$.subscribe(status => {
        this.showModal = status;
        this.store.dispatch(onboardingInviteUserModalStatus({ status: !status }));
      })
    )

    this.subscription.add(
      combineLatest([accessLevels$, userAccessLevels$]).subscribe(([al, ual]) => {
        this.accessLevels = getActiveAccessLevels(al, ual);
      })
    );

    this.subscription.add(combineLatest([sourceUsers$, newJiraUserId$])
      .subscribe(([onboarding, userId]) => {
        if (onboarding.usersLoadingState === LoadingState.Done && onboarding.users.length > 0) this.usersLoaded = true;

        this.defaultKhojiRole = onboarding.defaultKhojiRole;
        this.users = onboarding.users.filter(user => !onboarding.existingUsers.includes(user.accountId));
        this.populateUsersDropdown(this.users);
        this.rolesUnMapped = onboarding.roles;
        this.populateRoleDropdown(onboarding.roles);

        if (userId && this.users?.length) {
          this.selectedUserCode = userId;
          this.userChanged(userId);
        }
      })
    );
  }


  /**
   * mapping items to singleSelect Dropdown model
   *
   * @protected
   * @param {ProjectIntegrationUser[]} users
   * @memberof KhojiInviteUserDialogComponent
   */
  private populateUsersDropdown(users: ProjectIntegrationUser[]) {
    this.dropDownUsers = users.map(user => ({
      code: user.accountId,
      name: user.name
    }))
  }


  /**
   * clear states and assign default values to selected user
   *
   * @protected
   * @param {string} event account id of the user
   * @memberof KhojiInviteUserDialogComponent
   */
  protected userChanged(event: string) {
    this.clearStates();
    this.selectedUser = this.users.find(user => user.accountId == event);

    if (this.selectedUser) {
      this.selectedUser.userRole = this.defaultKhojiRole;
      this.selectedUser.accessLevel = this.defaultAccessLevel;
    }
  }


  /**
   * mapping items to singleSelect dropdown model
   *
   * @private
   * @param {Role[]} roles
   * @memberof KhojiInviteUserDialogComponent
   */
  private populateRoleDropdown(roles: Role[]) {
    this.roles = roles
      .map(role => ({
        code: role.code,
        name: role.name
      }));
  }


  /**
   * assign role selected by user from dropdown
   *
   * @protected
   * @param {string} value
   * @memberof KhojiInviteUserDialogComponent
   */
  protected roleChanged(value: string) {
    this.selectedUser.userRole = this.rolesUnMapped.filter(role => role.code === value)[0];
  }


  /**
   * assign access level selected by user from singleSelect dropdown
   *
   * @protected
   * @param {string} value
   * @memberof KhojiInviteUserDialogComponent
   */
  protected accessLevelChanged(value: string) {
    this.selectedUser.accessLevel = value;
  }


  /**
   * Send api call to save the userDetails selected by the user,
   * remove extra props that are not require i.e isEdited
   *
   * @protected
   * @memberof KhojiInviteUserDialogComponent
   */
  protected sendInvite() {
    if (this.formSubmitted) return;

    this.formSubmitted = true;
    this.trackingService.captureUserAction(AdminActions.ManageUsers.AddJiraUser)
    this.selectedUser.email = this.userEmail;
    const { isEdited, alreadyExisting, isSelected, ...rest } = this.selectedUser;
    this.store.dispatch(inviteOnboardingUser({ users: [rest] }));

    setTimeout(() => {
      this.formSubmitted = false;
    }, 1000);
  }


  /**
   * clear the selections made by the user
   *
   * @private
   * @memberof KhojiInviteUserDialogComponent
   */
  private clearStates() {
    this.selectedUser = null;
    this.userEmail = null;
  }


  /**
   * handle close moddal event,
   * selected user id is reset from both local state and ngrx store
   *
   * @protected
   * @param {*} ev
   * @memberof KhojiInviteUserDialogComponent
   */
  protected handleModalClose(ev) {
    this.selectedUserCode = "";
    this.store.dispatch(setNewJiraUserId({id: ''}));
    this.trackingService.captureUserAction(AdminActions.ManageUsers.AddJiraUser.ClosedButton)
  }


  /**
   * check email validity against a regex
   *
   * @protected
   * @memberof KhojiInviteUserDialogComponent
   */
  protected checkEmailValidity() {
    if (!this.userEmail) {
      this.emailValid = true;
    } else {
      const emailRegex = new RegExp(this.constants.KHOJI_EMAIL_REGX);
      this.emailValid = emailRegex.test(this.userEmail);
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
