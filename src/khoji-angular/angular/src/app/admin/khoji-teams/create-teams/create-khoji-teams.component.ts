/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { DropDownUser, Organization, ProjectIntegrationUser, Team, TeamOnboarding, User } from 'app/admin/admin.entities';
import { BulkInviteUserDialogComponent } from 'app/admin/khoji-user/bulk-invite-user-dialog/bulk-invite-user-dialog.component';
import { fetchUsersInTeams, setCreateTeamsLoadingState, setJiraSelectedUserIds, setSelectedSupervisorIds, setSelectedTeamboardIds, setSelectedUserIds, setUpdateTeamLoadingState, updateTeam } from 'app/admin/state/admin.actions';
import { mapUsersToDropdownItems, mapUserToDropDownUser, selectAddJiraUsersLoadingState, selectAllUsersList, selectDropDownKhojiAndSourceUserItems, selectSelectedJiraUsersIds, selectSupervisorDropdownItems, selectTeamsList } from 'app/admin/state/admin.selector';
import { ComponentsIds } from 'app/components-constants';
import { Constants } from 'app/constants';
import { DropdownItem } from 'app/dropdowns/dropdown-item';
import { DropdownsModule } from 'app/dropdowns/dropdowns.module';
import { KhojiComponent, KhojiLimitation } from 'app/interface/khoji-component.interface';
import { TeamOnboardingComponent } from 'app/onboarding/team-onboarding/team-onboarding.component';
import { PrimengTableComponent } from 'app/shared/datatable/primeng-table/primeng-table.component';
import { isComponentEnabled } from 'app/shared/helper-functions';
import { SharedModule } from 'app/shared/shared.module';
import { AppState, LoadingState, LoadingStates, UserAccessLevelsStatus } from 'app/states/app-states';
import { fetchUserSetting } from 'app/states/app.actions';
import { getKhojiLimitations } from 'app/states/global-configs.selector';
import { selectLoadingStates } from 'app/states/global-process.selector';
import { selectTranslation } from 'app/states/global-translations.selector';
import { ConfirmationService, Message, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { combineLatest } from 'rxjs';
import { AdminActions, RootNav, TrackingService } from '../../../services/tracking';
import { areArraysEqual } from '../../../shared/helper-functions';
import { fetchKhojiTeamsList } from '../../state/admin.actions';
import { createNewTeam } from './../../state/admin.actions';
import { selectAccessLevelsStatus } from 'app/user-profile/state/user-profile.selectors';

/**
 * The impacted areas of the component are:
 * - CreateTeam
 * - EditTeam
 * - QuickSetup
 */

@Component({
  selector: 'create-khoji-teams',
  templateUrl: './create-khoji-teams.component.html',
  styleUrls: ['./create-khoji-teams.component.scss'],
  standalone: true,
  imports: [
    ButtonModule,
    FormsModule,
    CommonModule,
    SharedModule,
    DialogModule,
    DropdownModule,
    DropdownsModule,
    InputTextModule,
    TableModule,
    TooltipModule,
    ToolbarModule,
    CheckboxModule,
    ConfirmDialogModule,
    ReactiveFormsModule,
    BulkInviteUserDialogComponent
  ]
})
export class CreateKhojiTeamsComponent extends PrimengTableComponent implements OnInit, OnDestroy {
  @ViewChild('teamOnboarding') teamOnboardingComponent: TeamOnboardingComponent;

  @Input() updateTeamData: any;
  @Input() quickSetup = false;
  @Input() openAddUserModal = false;
  @Output() onClose = new EventEmitter<any>();

  constants: typeof Constants;

  translation: any;
  teamsList: Team[] = [];
  organizations: Organization[] = [];
  memberDropdownItems: DropdownItem[] = [];
  supervisorDropdownItems: DropdownItem[] = [];
  teamboardDropdownItems: DropdownItem[] = [];
  noRecordsFound: string;
  disableSaveButton = true;
  noMembersAvailable: string;
  tableId = Constants.CREATE_TEAMS_TABLE_ID;
  message: string;
  team: any;
  showMultiTeamMembers: boolean = false;
  showRows = Constants.INITIAL_ROWS_PER_PAGE;
  usersList: User[] = [];
  jiraUserLimitReached: boolean = false;
  createTeamForm: FormGroup;
  errorMessage = '';
  teamModel = {
    teamName: '',
    users: [],
    teamBoards: [],
    supervisors: []
  }
  persistenceTeamModel = {
    teamName: null,
    users: null,
    teamBoards: null,
    supervisors: null
  };

  limitReachedTooltipText: string;
  componentConfigs: KhojiComponent[];
  messages: Message[] = [];
  loadingStates = LoadingState;
  renderAddJiraUsersComponent = false;
  addJiraUsersLoadingState = LoadingState.Pending;
  jiraUsersIds: string[] = [];
  newlyAddedJiraUsers: DropdownItem[] = [];
  accessLevelsStatus: UserAccessLevelsStatus;


  constructor(
    protected store: Store<AppState>,
    messageService: MessageService,
    private confirmationService: ConfirmationService,
    private trackingService: TrackingService,
    private cdr: ChangeDetectorRef
  ) {
    super(store, messageService);
  }

  get columnsData() {
    return this.adminTablesConfigs.create_teams_table.columns;
  }

  ngOnInit(): void {
    const accessLevelsStatus$ = this.store.pipe(selectAccessLevelsStatus);
    this.subscription.add(accessLevelsStatus$.subscribe((data) => (this.accessLevelsStatus = data)));
    
    this.initializeDefaults();
    this.initializeTeamNameInputForm();
    this.initializeSubscriptions();
    this.dispatchInitialActions();
  }

  private initializeDefaults(): void {
    this.store.dispatch(setJiraSelectedUserIds({ ids: [] }));
    setTimeout(() => this.renderAddJiraUsersComponent = this.openAddUserModal, 300);
    this.messages = [{ severity: 'info', detail: 'Maximum members limit reached. Contact support for upgrade.' }];
    this.constants = Constants;
    this.componentId = ComponentsIds.ADMIN_CREATE_TABLE;
  }

  private initializeTeamNameInputForm(): void {
    this.createTeamForm = new FormGroup({
      name: new FormControl('', [
        Validators.required,
        Validators.minLength(1),
        Validators.maxLength(50),
        this.duplicateCategoryValidator,
        this.invalidInputValidator(Constants.VALID_TEAMNAME_REGEX)
      ])
    });
  }

  private initializeSubscriptions(): void {
    this.setupTranslationsSubscription();
    this.setupJiraUsersSubscription();
    this.setupLoadingStateSubscriptions();
    this.setupDropdownItemsSubscription();
    this.setupUsersAndLimitationsSubscription();
    this.setupTeamsSubscription();
    this.setupInitializationSubscription();
  }

  private dispatchInitialActions(): void {
    this.store.dispatch(fetchUsersInTeams());
  }

  private setupJiraUsersSubscription(): void {
    const JiraUsersIds$ = this.store.pipe(selectSelectedJiraUsersIds);

    this.subscription.add(
      JiraUsersIds$.subscribe(ids => {
        this.jiraUsersIds = ids;
        if (this.jiraUsersIds.length) {
          this.updateNewlyAddedJiraUsers();
        }
      })
    );
  }

  private updateNewlyAddedJiraUsers(): void {
    const jiraUsers = this.usersList.filter(user => this.jiraUsersIds.includes(user.member.accountId));
    const dropdownUsers = mapUsersToDropdownItems(jiraUsers);
    this.newlyAddedJiraUsers = this.newlyAddedJiraUsers.filter(user => this.jiraUsersIds.includes(user.item_id));
    this.newlyAddedJiraUsers = [
      ...new Map(
        [
          ...this.newlyAddedJiraUsers,
          ...dropdownUsers,
          ...this.teamModel.users
        ].map(user => [user.id, user])
      ).values()
    ];
    this.selectMembers(this.newlyAddedJiraUsers);
    this.store.dispatch(setJiraSelectedUserIds({ ids: [] }));
  }


  private setupLoadingStateSubscriptions(): void {
    const loadingState$ = this.store.pipe(selectLoadingStates);
    const addJiraUsersLoadingState$ = this.store.pipe(selectAddJiraUsersLoadingState);

    this.subscription.add(loadingState$.subscribe(data => {
      this.handleLoadingStateChanges(data);
    }));

    this.subscription.add(addJiraUsersLoadingState$.subscribe(state => {
      this.handleAddJiraUsersLoadingState(state);
    }));
  }

  private handleLoadingStateChanges(loadingStates: LoadingStates): void {
    if (loadingStates.createTeamLoadingState === LoadingState.Done) {
      this.closeModal();
      this.store.dispatch(setCreateTeamsLoadingState({ loadingState: LoadingState.Pending }));
    }
    if (loadingStates.updateTeamLoadingState === LoadingState.Done) {
      this.closeModal();
      this.store.dispatch(fetchKhojiTeamsList());
      this.store.dispatch(setUpdateTeamLoadingState({ loadingState: LoadingState.Pending }));
    }
  }

  private handleAddJiraUsersLoadingState(state: LoadingState): void {
    this.addJiraUsersLoadingState = state;

    if (state === LoadingState.Done) {
      this.renderAddJiraUsersComponent = false;
      this.trackingService.captureUserAction(AdminActions.ManageTeams.AddFromJira.ClosedButton);
      this.store.dispatch(fetchUsersInTeams());
      this.store.dispatch(fetchKhojiTeamsList());
    }
  }

  private setupTranslationsSubscription(): void {
    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe(translation => {
        this.translation = translation;
        this.noRecordsFound = this.translation.error.noRecordsFoundMessage;
        this.noMembersAvailable = this.translation.error.noMembersAvailable;
      })
    );
  }

  private setupDropdownItemsSubscription(): void {
    const memberDropdownItems$ = this.store.pipe(selectDropDownKhojiAndSourceUserItems);
    const supervisorDropdownItems$ = this.store.pipe(selectSupervisorDropdownItems);

    this.subscription.add(
      memberDropdownItems$.subscribe(members => {
        this.memberDropdownItems = this.populateMemberDropdown(members);
      })
    );

    this.subscription.add(
      supervisorDropdownItems$.subscribe(supervisors => {
        this.supervisorDropdownItems = this.populateSupervisorDropdown(supervisors);
      })
    );
  }

  private setupUsersAndLimitationsSubscription(): void {
    const usersList$ = this.store.pipe(selectAllUsersList);
    const limitations$ = this.store.pipe(getKhojiLimitations);

    // TODO: add limitations once fixed
    this.subscription.add(combineLatest([usersList$, limitations$]).subscribe(([users, limitations]) => {
      this.handleUsersAndLimitations(users, limitations);
    }));
  }

  private handleUsersAndLimitations(users: User[], limitations: KhojiLimitation[]): void {
    this.usersList = users;
    // TODO: add limitations once fixed
    const unrevokedUsersLength = this.usersList.filter(u => u.status !== Constants.MEMBER_REVOKED_STATUS).length;
    const sourceUsersLimit = Number(limitations.find(l => l.id === Constants.USERS_ALLOWED)?.value);
    this.jiraUserLimitReached = unrevokedUsersLength >= sourceUsersLimit;
    this.limitReachedTooltipText = this.jiraUserLimitReached
      ? `Maximum user limit of ${sourceUsersLimit} reached. Contact support for upgrade.`
      : '';

    if (this.updateTeamData) {
      this.populateMembers();
      this.populateSupervisors();
    }
  }

  private setupTeamsSubscription(): void {
    const teamsList$ = this.store.pipe(selectTeamsList);

    this.subscription.add(teamsList$.subscribe(teamList => {
      this.teamsList = teamList;
      if (this.updateTeamData) {
        this.updateTeamModelFromInputData();
      }
    })
    );
  }

  private setupInitializationSubscription(): void {
    this.subscription.add(this.init().subscribe(() => {
      this.setColumns(this.columnsData);
    }));
  }


  isComponentEnabled(compId: string) {
    return isComponentEnabled(this.componentConfigs, compId);
  }

  populateMemberDropdown(data: any[]) {
    return data.filter(value => !(!this.teamModel.users.find(user => user.id === value.id) && value?.status === Constants.MEMBER_REVOKED_STATUS));
  }

  populateSupervisorDropdown(data: any[]) {
    return data.filter(value => !(!this.teamModel.supervisors.find(user => user.id === value.id) && value.hasOwnProperty("status") && value.status === Constants.MEMBER_REVOKED_STATUS));
  }

  teamNameError = () => {
    const teamName = this.createTeamForm.controls['name'];
    const invalid = teamName.invalid && (teamName.dirty || teamName.touched);

    if (teamName.hasError('maxlength')) {
      return this.translation.adminPanel.projectIntegration.users.fieldErrors.teamNameValidation.lengthLimitExceed;
    }
    else if (invalid && (teamName.errors.required || teamName.errors.minLength)) {
      return this.translation.adminPanel.projectIntegration.users.fieldErrors.teamNameValidation.requiredFieldError;
    }
    else if ((invalid && teamName.hasError('invalidInput')) || (teamName.hasError('invalidInput') && teamName.untouched && this.updateTeamData)) {
      return this.translation.adminPanel.projectIntegration.users.fieldErrors.teamNameValidation.invalidPatternError;
    }
    else if (invalid && teamName.hasError('duplicateTeamName')) {
      return this.translation.adminPanel.projectIntegration.users.fieldErrors.teamNameValidation.teamNameAlreadyExistMessage;
    }
    else {
      return null;
    }
  };

  setSaveButtonState = () => {
    const teamName = this.createTeamForm.controls['name'];
    const invalid = teamName.invalid && (teamName.dirty || teamName.touched);
    return ((teamName.errors && !this.quickSetup) || (this.updateTeamData && this.matchPreviousAndUpdatedData()))
  }

  matchPreviousAndUpdatedData() {
    return (this.updateTeamData.teamName == this.teamModel.teamName) &&
      this.matchMembers() && this.matchSupervisors(); // && this.matchTeamboards();
  }

  matchMembers() {
    return areArraysEqual(this.teamModel.users.map(user => user.id), this.updateTeamData.members.map(member => member.accountId));
  }

  matchSupervisors() {
    return areArraysEqual(this.teamModel.supervisors.map(user => user.member).map(member => member.id), this.updateTeamData.supervisors.map(member => member.id));
  }

  // TODO: add fix when team boards are required
  // matchTeamboards() {
  //   return areArraysEqual(this.teamModel.teamBoards.map(board => board.id), this.updateTeamData.boards?.map(board => board.id));
  // }

  populateMembers(): void {
    this.updateTeamUsers();
    this.updateJiraUsers();
    this.ensureUniqueUsers();
    this.dispatchSelectedUserIds();
    this.prepareData(this.teamModel.users);
    this.detectChangesIfQuickSetup();
  }

  private updateTeamUsers(): void {
    this.teamModel.users = this.usersList
      .filter(user => this.isUserInTeam(user))
      .map(user => mapUserToDropDownUser(user));
  }

  private isUserInTeam(user: User): boolean {
    return this.updateTeamData.members.some(memberId => memberId.id === user.member.id);
  }

  private updateJiraUsers(): void {
    const jiraUsers = this.usersList
      .filter(user => this.jiraUsersIds.includes(user.member.accountId))
      .map(user => mapUserToDropDownUser(user));

    if (this.persistenceTeamModel.users) {
      this.persistenceTeamModel.users.push(...jiraUsers);
    } else {
      this.teamModel.users.push(...jiraUsers);
    }
  }

  private ensureUniqueUsers(): void {
    if (this.persistenceTeamModel.users) {
      this.persistenceTeamModel.users = this.getUniqueUsers(this.persistenceTeamModel.users);
      this.teamModel.users = this.persistenceTeamModel.users;
    }
  }

  private getUniqueUsers(users: User[]): User[] {
    const uniqueUsersMap = new Map<string, User>();
    users.forEach(user => uniqueUsersMap.set(user.id, user));
    return Array.from(uniqueUsersMap.values());
  }

  private dispatchSelectedUserIds(): void {
    const selectedUserIds = this.teamModel.users.map(user => user.id);
    this.store.dispatch(setSelectedUserIds({ ids: selectedUserIds }));
  }


  populateSupervisors() {
    this.teamModel.supervisors = this.usersList.filter(user => this.updateTeamData.supervisors.find(memberId => memberId.id == user.member.id));
    if (this.persistenceTeamModel.supervisors) {
      this.persistenceTeamModel.supervisors = [...this.persistenceTeamModel.supervisors];
      this.teamModel.supervisors = this.persistenceTeamModel.supervisors;
    } else {
      this.teamModel.supervisors = [...this.teamModel.supervisors]
    }
    const selectedSupervisorIds = this.teamModel.supervisors.map(user => user.id);
    this.store.dispatch(setSelectedSupervisorIds({ ids: selectedSupervisorIds }));
    this.detectChangesIfQuickSetup();
  }

  private detectChangesIfQuickSetup(): void {
    if (this.quickSetup) {
      this.cdr.detectChanges();
    }
  }

  updateTeamModelFromInputData() {
    if (this.updateTeamData) {
      if (!this.teamModel.teamName) this.teamModel.teamName = this.updateTeamData.teamName;
    }
  }

  private invalidInputValidator = (regex: RegExp) => {
    return (control) =>
      regex.test(control.value) ? null : { invalidInput: true };
  };

  selectMembers(selectedItems: DropdownItem[]) {
    const selectedUsersId = selectedItems.map(item => item.item_id);

    this.adjustTableRowDisplay(selectedItems.length);
    this.updateTeamModel(selectedItems);
    this.filterJiraUsers(selectedUsersId);
    this.filterSelectedRows(selectedItems);
    this.prepareData(this.teamModel.users);
    this.updateSelectedMemberIdsForDropdown();
    this.clearJiraSelectedUserIdsOnEmptySelection(selectedItems);
    this.detectChangesIfQuickSetup();
  }

  private adjustTableRowDisplay(selectedItemCount: number) {
    if (this.showRows === this.teamModel.users.length) {
      this.showRows = selectedItemCount;
    }
  }

  private updateTeamModel(selectedItems: DropdownItem[]) {
    this.teamModel.users = selectedItems;
    this.persistenceTeamModel.users = selectedItems;
  }

  private filterJiraUsers(selectedUsersId: string[]) {
    this.jiraUsersIds = this.jiraUsersIds.filter(id => selectedUsersId.includes(id));
  }

  private filterSelectedRows(selectedItems: DropdownItem[]) {
    this.selectedRows = this.selectedRows.filter(row =>
      selectedItems.some(item => item.item_id === row.id)
    );
  }

  private updateSelectedMemberIdsForDropdown() {
    const ids = this.tableData.map(row => row.id);
    this.store.dispatch(setSelectedUserIds({ ids }));
  }

  private clearJiraSelectedUserIdsOnEmptySelection(selectedItems: DropdownItem[]) {
    if (selectedItems.length === 0) {
      this.store.dispatch(setJiraSelectedUserIds({ ids: [] }));
    }
  }

  selectSupervisors(selectedItems: DropdownItem[]) {
    const selectedSupervisorsIds = selectedItems.map(item => item.item_id);

    this.updateTeamModelSupervisors(selectedItems);
    this.dispatchSelectedSupervisorIds(selectedSupervisorsIds);
  }

  private updateTeamModelSupervisors(selectedItems: DropdownItem[]) {
    this.teamModel.supervisors = selectedItems;
    this.persistenceTeamModel.supervisors = selectedItems;
  }

  private dispatchSelectedSupervisorIds(supervisorsIds: string[]) {
    this.store.dispatch(setSelectedSupervisorIds({ ids: supervisorsIds }));
  }


  checkDuplicationName() {
    let teamName = this.teamModel.teamName;
    let tempTeamList = this.teamsList;
    if (this.updateTeamData) {
      tempTeamList = tempTeamList.filter(data => data.id !== this.updateTeamData.id);
    }

    return tempTeamList.filter(data => data.teamName.toLowerCase() == teamName.toLowerCase()).length > 0;
  }


  private duplicateCategoryValidator = (control) =>
    Boolean(
      Object.values(this.getTeamListArray()).find(
        (key) =>
          key !== this.teamModel.teamName?.toLowerCase() &&
          key.toLowerCase() === control.value.toLowerCase()
      )
    )
      ? { duplicateTeamName: true }
      : null;


  private getTeamListArray = () => {
    let tempTeamList = this.teamsList;
    if (this.updateTeamData) {
      tempTeamList = tempTeamList.filter(data => data.id !== this.updateTeamData.id);
    }
    return tempTeamList.map(data => data.teamName);
  }

  submitData() {
    let team = {} as TeamOnboarding;
    team.teamName = this.teamModel.teamName;
    //team.boards = this.teamModel.teamBoards;

    let supervisorsArr = [];

    for (let sup of this.teamModel.supervisors) {
      supervisorsArr.push(sup.member)
    }

    let membersArr = [];

    team.khojiUsers = [];
    team.sourceUsers = [];

    this.teamModel.users.forEach(user => {
      if (user.roleName === Constants.SOURCE_USERS) team.sourceUsers.push(this.mapDropDownUserToProjectIntegrationUser(user));
      else team.khojiUsers.push(this.mapDropDownUserToProjectIntegrationUser(user));
    })

    team.members = membersArr;
    team.supervisors = supervisorsArr;

    if (this.updateTeamData) {
      team.id = this.updateTeamData.id;
      team.teamId = team.id;
      this.trackingService.captureUserAction(AdminActions.ManageTeams.EditTeam.UpdateTeam)
      this.store.dispatch(updateTeam({ teamData: team }));
    }
    else {
      this.trackingService.captureUserAction(AdminActions.TeamCreated)
      this.store.dispatch(createNewTeam({ teamData: team }));
    }

    this.team = {
      teamData: team,
    }
  }


  showEmptyMessage() {
    return this.cols.length > 0 ? this.tableData.length === 0 ? this.noMembersAvailable : this.noRecordsFound : this.translation.dataTables.noDatatableConfigFound;
  }

  closeModalButton() {
    if (!this.setSaveButtonState()) {
      this.cancelButtonClick();
    }
    else {
      this.closeModal();
    }
  }

  closeModal() {
    this.trackingService.captureUserAction(AdminActions.ManageTeams.EditTeam.ClosedButton)
    this.store.dispatch(fetchUserSetting());
    this.onClose.emit(this.team);
  }

  prepareData(users: DropDownUser[]) {
    this.tableData = [];
    if (this.cols.length > 0) this.tableData = users;
  }


  cancelButtonClick() {
    if (!this.setSaveButtonState()) {
      this.trackingService.captureNavigationStep(RootNav.AdminDashboard.ManageTeams.EditTeam.ConfirmationModal)
      this.confirmationService.confirm({
        key: 'tabSwitchConfirm',
        header: "Confirmation",
        message: "Are you sure your want to leave without saving your changes?",
        acceptLabel: "Proceed",
        rejectLabel: "Cancel",
        accept: () => {
          this.closeModal();
        }
      });
    }
    else {
      this.closeModal();
    }
  }

  tabSwitchCloseIconClick() {
    this.confirmationService.close();
    this.trackingService.captureUserAction(AdminActions.ManageTeams.EditTeam.ClosedButton)
  }

  onTabSwitchConfirm() {
    this.submitData();
  };

  onTabSwitchReject() {
    this.confirmationService.close();
    this.closeModal();
  };

  removeMember(rowData: DropDownUser) {
    this.trackingService.captureUserAction(AdminActions.ManageTeams.EditTeam.RemoveMember);

    // Filter out the removed user from all relevant arrays
    this.tableData = this.tableData.filter(row => row.id !== rowData.id);
    this.selectedRows = this.selectedRows.filter(row => row.id !== rowData.id);
    this.teamModel.users = this.teamModel.users.filter(row => row.id !== rowData.id);
    this.jiraUsersIds = this.jiraUsersIds.filter(id => id !== rowData.id);
    this.newlyAddedJiraUsers = this.newlyAddedJiraUsers.filter(user => user['id'] !== rowData.id);
    this.persistenceTeamModel.users = [...this.teamModel.users]; // Ensure persistence is updated

    // Update the store with the remaining user IDs to populate the member dropdown
    const ids = this.tableData.map(row => row.id);
    this.store.dispatch(setSelectedUserIds({ ids }));

    if (this.tableData.length === 0) {
      this.store.dispatch(setJiraSelectedUserIds({ ids: [] }));
    }
  }


  removeMultipleMembers() {
    this.tableData = this.tableData.filter(tableData => !this.selectedRows.find(element => element.id === tableData.id));
    this.teamModel.users = this.teamModel.users.filter(memberData => !this.selectedRows.find(element => element.id === memberData.id));
    this.persistenceTeamModel.users = this.teamModel.users;
    const ids = this.tableData.map(r => r.id);
    this.newlyAddedJiraUsers = this.newlyAddedJiraUsers.filter(user => ids.includes(user.item_id));
    this.selectedRows = [];
    this.store.dispatch(setSelectedUserIds({ ids: ids }));
    if (this.tableData.length == 0) {
      this.store.dispatch(setJiraSelectedUserIds({ ids: [] }));
    }
  }

  trackUserActivity() {
    this.trackingService.captureNavigationStep(RootNav.ManageApp.AdminPanel.ManageTeams.AddFromJira);
  }

  handleAddFromJira() {
    if (!this.accessLevelsStatus.hasTenantAdminAccess) return;
    
    this.renderAddJiraUsersComponent = true; 
    this.trackUserActivity()
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.store.dispatch(setSelectedUserIds({ ids: [] }));
    this.store.dispatch(setJiraSelectedUserIds({ ids: [] }))
    this.store.dispatch(setSelectedSupervisorIds({ ids: [] }));
    this.store.dispatch(setSelectedTeamboardIds({ ids: [] }));
  }

  mapDropDownUserToProjectIntegrationUser(user: DropDownUser): ProjectIntegrationUser {
    return ({
      name: user.fullName,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.memberEmail,
      accountId: user.id,
      userRole: user.role,
      avatarURL: user.avatarURL,
    });
  }
}
