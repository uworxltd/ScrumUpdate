import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ProjectComponentUsers, Role } from 'app/admin/admin.entities';
import { RoleNew } from 'app/admin/edit-user-modal/edit-user-modal.component';
import { addJiraUsers, fetchKhojiTeamsList, fetchRoles, fetchSourceUsers, updateOnboardingTeam, updateOnboardingTeamLoadingState } from 'app/admin/state/admin.actions';
import { selectTeamOnboardingObjects } from 'app/admin/state/admin.selector';
import { Constants } from 'app/constants';
import { DropdownsModule } from 'app/dropdowns/dropdowns.module';
import { RootNav, TrackingService } from 'app/services/tracking';
import { getCurrentInstance, getCurrentWorkspace } from 'app/shared/helper-functions';
import { SplitContainerComponent } from 'app/shared/split-container/split-container.component';
import { AppState, LoadingState } from 'app/states/app-states';
import { fetchKhojiUserProfile, fetchMembers, fetchTeamWorklogStats, fetchTeamWorklogStatsForThisMonth, fetchUserSetting } from 'app/states/app.actions';
import { getKhojiLimitations } from 'app/states/global-configs.selector';
import { selectDateTo } from 'app/states/global-filters.selector';
import { selectupdateOnboardingTeamLoadingState } from 'app/states/global-process.selector';
import { selectTeamOnboardingTranslations, selectTranslation } from 'app/states/global-translations.selector';
import { selectAvailableFeatures } from 'app/user-profile/state/user-profile.selectors';
import { Message } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessagesModule } from 'primeng/messages';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { Subscription, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

interface TeamTranslation {
  title: string;
  subTitle: string;
  teamName: string;
  enterTeamName: string;
  addMembersToTeam: string;
  members: string;
  buttons: ButtonsTranslation;
}

interface ButtonsTranslation {
  next: string;
  updateTeam: string;
  cancel: string;
  skip: string;
}

@Component({
  selector: 'khoji-team-onboarding',
  templateUrl: './team-onboarding.component.html',
  styleUrls: ['./team-onboarding.component.scss'],
  standalone: true,
  imports: [
    SkeletonModule,
    InputTextModule,
    ButtonModule,
    MultiSelectModule,
    CommonModule,
    FormsModule,
    DropdownsModule,
    TooltipModule,
    MessagesModule,
    CardModule,
    SplitContainerComponent,
    ProgressSpinnerModule,
  ]
})
export class TeamOnboardingComponent implements OnInit {
  // primeNg message component model to display limit reached message
  protected messages: Message[] | undefined;

  // user variables
  protected users: ProjectComponentUsers[] = [];
  selectedUsers: ProjectComponentUsers[] = [];
  protected userLimit: number = 0;
  private allUsers: ProjectComponentUsers[] = [];

  // roles variables
  protected roles: RoleNew[];
  protected rolesUnMapped: Role[];
  protected defaultKhojiRole: Role;
  protected userChangedRoleCode: string;

  // team variables
  protected teamName: string = '';
  protected teamDetails: { name: string; id: number };

  // loading variables
  protected usersLoaded: boolean = false;

  // translation variables
  teamOnboardingTranslation: TeamTranslation;

  private subscription = new Subscription;

  // when using teamOnboarding in modals use this prop so that dropdown remains in modal i.e appendTo="body || cd" where cd is defined as #cd in html
  @Input() appendTo: string = null;
  @Input() quickSetup = false;
  // input tells that is this coming from addJiraUsers modal?
  @Input() addJiraUsers = false;
  @Input() teamToUpdate: { id: number; name: string; membersAccountIds: string[] } = null;
  // this variable will filter the users which are already part of the system and adjust limit accordingly
  @Input() showAlreadyAddedUsers = true;

  /** initComponent is used to track capturing posthog event on onboarding wizard */
  initialized = false;
  onboardingTeamLoadingState = LoadingState.Pending;


  @Input() set initComponent(value) {
    if (value && !this.initialized) {
      this.initialized = true;
      this.trackingService.captureNavigationStep(RootNav.Onboarding.Build_Team);
    }
  }

  @Output() _teamName = new EventEmitter<string>();
  @Output() nextButtonClicked: EventEmitter<boolean> = new EventEmitter();
  availabeFeatures$ = this.store.pipe(selectAvailableFeatures);

  constructor(
    private store: Store<AppState>,
    private trackingService: TrackingService,
    private router: Router,
    private titleService: Title,
  ) { }

  ngOnInit(): void {
    this.store.dispatch(fetchUserSetting({ force: null }));
    this.store.dispatch(fetchKhojiTeamsList());
    this.store.dispatch(fetchKhojiUserProfile());
    this.store.dispatch(fetchSourceUsers({ sourceSystem: null }));
    this.store.dispatch(fetchRoles());
    // if (!this.addJiraUsers) this.store.dispatch(fetchUsersInTeams());

    this.messages = [{ severity: 'info', detail: `Maximum users limit reached. Contact support for upgrade.` }];

    const translations$ = this.store.pipe(selectTeamOnboardingTranslations);
    const limitations$ = this.store.pipe(getKhojiLimitations);
    const sourceUsers$ = this.store.pipe(selectTeamOnboardingObjects);
    const loadingTeamOnboardingLoadingState$ = this.store.pipe(selectupdateOnboardingTeamLoadingState);

    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe((translation) => {
        this.titleService.setTitle(translation?.pageTitles?.appSetup);
      })
    );

    this.subscription.add(
      loadingTeamOnboardingLoadingState$.subscribe(loadingState => {
        this.onboardingTeamLoadingState = loadingState;
        if (loadingState === LoadingState.Done) {
          const workspaceId = getCurrentWorkspace();
          const instanceId = getCurrentInstance();

          if (!workspaceId || !instanceId) {
            console.error("Workspace ID or Instance ID not found in session storage.");
            return;
          }

          this.router.navigate([`/space/${workspaceId}/instance/${instanceId}/feature/team-view`]);
        }
      })
    );

    this.subscription.add(
      translations$.subscribe(translation => {
        this.teamOnboardingTranslation = translation;
      })
    );

    this.subscription.add(
      combineLatest([sourceUsers$, limitations$]).pipe(
        map(([onboarding, limitations]) => {
          var usersLimit = 0;
          var membersLimit = 0;

          if (limitations) {
            usersLimit = Number(limitations.find(l => l.id === Constants.USERS_ALLOWED)?.value);
            membersLimit = Number(limitations.find(l => l.id === Constants.MEMBERS_IN_TEAM)?.value);
            this.userLimit = Math.min(usersLimit, membersLimit);
          }

          if (onboarding) {
            if (onboarding.usersLoadingState === LoadingState.Done && onboarding.users.length > 0 && onboarding.rolesLoadingState === LoadingState.Done) this.usersLoaded = true;

            this.defaultKhojiRole = onboarding.defaultKhojiRole;
            this.teamDetails = onboarding.team;
            this.teamName = this.teamDetails.name;
            this.users = onboarding.users;
            this.allUsers = onboarding.users;
            this.selectedUsers = this.users.filter(user => user.alreadyAddedInSystem);
            this.userChangedRoleCode = this.selectedUsers[0]?.userRole.code;
            if (!this.showAlreadyAddedUsers) {
              const addedUsersCount = this.selectedUsers.length;
              this.users = this.users.filter(user => !user.alreadyAddedInSystem);
              this.selectedUsers = [];
              this.userLimit = usersLimit - addedUsersCount + onboarding.revokedUsersIds.length;
            }
            this.rolesUnMapped = onboarding.roles;
            this.populateRoleDropdown(onboarding.roles);
            this._teamName.emit(this.teamName);
          }
        })
      ).subscribe()
    );
  }

  protected isUserSelected(userId: string): boolean {
    return this.selectedUsers.some(user => user.accountId === userId);
  }

  protected populateRoleDropdown(roles: Role[]) {
    this.roles = roles?.map(role => ({
      code: role.code,
      name: role.name
    }));
  }

  protected roleChanged(value: string, user: ProjectComponentUsers) {
    if (value === this.defaultKhojiRole.code) user.userRole = this.defaultKhojiRole;
    user.userRole = this.rolesUnMapped.find(role => role.code === value);
  }

  protected removeUserFromSelection(user: ProjectComponentUsers) {
    this.selectedUsers = this.selectedUsers.filter(suser => user.accountId !== suser.accountId);
  }

  // this method is being used in this components html and also in the modal wher the component is used
  saveTeam() {
    let team = {
      teamId: this.teamDetails.id,
      teamName: this.teamName,
      // selecting only the required props from the ProjectComponent users
      sourceUsers: this.selectedUsers?.map(({ isEdited, alreadyExisting, isSelected, ...rest }) => ({ ...rest })) || [],
    }

    // if user changes anything send the call to update the details
    if (this.selectedUsers.length > 1 || this.teamName !== this.teamDetails.name || this.selectedUsers[0].userRole.code !== this.defaultKhojiRole.code) {
      this.store.dispatch(updateOnboardingTeam({ team, showToast: this.quickSetup }));
    } else {
      this.store.dispatch(updateOnboardingTeamLoadingState({ loadingState: LoadingState.Done }))
    }

    const Team_Members_Added_Count = team.sourceUsers.length;

    if (this.quickSetup) {
      this.trackingService.captureNavigationStep(RootNav.AdminDashboard.QuickSetup.AddMembers.UpdateTeam, { Team_Members_Added_Count });
    } else {
      this.trackingService.captureNavigationStep(RootNav.Onboarding.Build_Team.Next_Click, { Team_Members_Added_Count });
    }

    this.moveToNextStep(this.teamName);
  }

  get newUsers() {
    return this.selectedUsers.filter(u => !u.alreadyExisting);
  }

  addUsers() {
    const users = this.newUsers;
    this.store.dispatch(addJiraUsers({ users, tab: '' }));
  }

  protected skipTeamOnboarding() {
    this.store.dispatch(updateOnboardingTeamLoadingState({ loadingState: LoadingState.Done }));
    this.trackingService.captureNavigationStep(RootNav.Onboarding.Build_Team.Do_Later_Click);

    this.moveToNextStep(this.teamDetails?.name);
  }

  private moveToNextStep(teamName: string) {
    this.nextButtonClicked.emit(true);
    this._teamName.emit(teamName);
  }

  private refreshWorkLog = () => {
    this.store.dispatch(fetchTeamWorklogStats());
    const dateTo$ = this.store.pipe(selectDateTo).subscribe(dateTo => {
      const currentDate = new Date();
      const currentDay = currentDate.getDate();
      const currentfullYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const selectedMonth = Number(dateTo.split('-')[1]);
      if (currentMonth === selectedMonth) {
        this.store.dispatch(fetchTeamWorklogStatsForThisMonth({
          dateFrom: `${currentfullYear}-${currentMonth >= 10 ? currentMonth : '0' + currentMonth}-01`,
          dateTo: `${currentfullYear}-${currentMonth >= 10 ? currentMonth : '0' + currentMonth}-${currentDay >= 10 ? currentDay : '0' + currentDay}`
        }));
      }
    });
    dateTo$.unsubscribe();
    this.store.dispatch(fetchMembers());
  }

  /**
   * this functions checks for the available height and
   * displays the number of selected users accordingly
   * @returns the amount of users to show in the list
   */
  protected getScreenLimit(): number {
    const windowHeight = window.innerHeight;
    if (windowHeight > 900) return 5;
    else if (windowHeight < 900 && windowHeight > 700) return 4;
    else if (windowHeight < 700 && windowHeight > 600) return 2;
    else return 1;
  }

  // this function has no usage over here but it is used in modals for controlling the state of the buttons
  // quick-setup.component.html:67
  quickSetupButtonDisabled(): boolean {
    return !this.usersLoaded || (this.selectedUsers.length == 1 && this.selectedUsers[0].userRole.code === this.userChangedRoleCode)
  }

  protected getLimitText(): string {
    if (!this.showAlreadyAddedUsers) return `Remaining limit: ${this.userLimit - this.selectedUsers.length}`
    return `${this.selectedUsers.length} / ${this.userLimit}`
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
