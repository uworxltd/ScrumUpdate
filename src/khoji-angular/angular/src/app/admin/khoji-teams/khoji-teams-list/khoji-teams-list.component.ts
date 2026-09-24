/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit, TemplateRef, ViewChild, ViewContainerRef, } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from "@ngrx/store";
import { selectKhojiTeamsLoadingStateSelector, selectTeamLimitation, selectTeamsList } from 'app/admin/state/admin.selector';
import { ComponentsIds } from 'app/components-constants';
import { Constants } from "app/constants";
import { ADMIN_TABLE_CONFIGS } from 'app/constants.configs';
import { HttpService } from 'app/services/common/http.service';
import { AppState, LoadingState } from "app/states/app-states";
import { fetchConfigs, fetchUserSetting } from "app/states/app.actions";
import { environment } from "environments/environment";
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { Subscription, combineLatest } from "rxjs";
import { FeatureFlagService } from '../../../services/feature.flag.service';
import { AdminActions, RootNav, TrackingService } from '../../../services/tracking';
import { getUsername } from '../../../shared/helper-functions';
import { deleteTeams, fetchKhojiTeamsList, fetchRoles, fetchSourceUsers, fetchUserDetail } from '../../state/admin.actions';
import { PrimengTableComponent } from './../../../shared/datatable/primeng-table/primeng-table.component';
import { Member, Team, Teamboard } from './../../admin.entities';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { InputTextModule } from 'primeng/inputtext';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { SharedModule } from 'app/shared/shared.module';
import { ManageSupervisorComponent } from '../manage-supervisor/manage-supervisor.component';
import { FormsModule } from '@angular/forms';
import { AllocateSupervisorComponent } from '../allocate-supervisor/allocate-supervisor.component';
import { CreateKhojiTeamsComponent } from '../create-teams/create-khoji-teams.component';

@Component({
  selector: 'app-khoji-teams-list',
  templateUrl: './khoji-teams-list.component.html',
  styleUrls: ['./khoji-teams-list.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    MenuModule,
    InputTextModule,
    ToolbarModule,
    TooltipModule,
    ConfirmDialogModule,
    DialogModule,
    ManageSupervisorComponent,
    SharedModule,
    AllocateSupervisorComponent,
    CreateKhojiTeamsComponent,
    FormsModule
  ]
})
export class KhojiTeamsListComponent extends PrimengTableComponent implements OnInit, OnDestroy, AfterViewInit {

  //menuItems
  teamsMenuItems: MenuItem[] = [];

  subscription = new Subscription();
  constants = Constants;
  khojiTeamsList: Team[];
  configs: any;
  tableId = Constants.VIEW_TEAMS_TABLE_ID;
  newTeam: any;
  openCreateTeamModal: any;
  editTeamData: any;
  deletingSingleTeam = false;
  waitingForDeleteResponse = false;
  teamIdsToDelete: any;
  tempSelectedRows: any[];
  openManageSupervisors: boolean;
  environment = environment;
  iframeLoading = false;
  userName: string;
  loadingState = LoadingState;
  showUsersList = true;
  showUserTeamsList = false;
  queryParamsHandled = false;
  khojiTeamsLoadingState = LoadingState.Pending;
  isDashboardInsightsEnabled: boolean;
  showEditComponent = false;
  teamLimitation = 0;

  @ViewChild('outlet', { read: ViewContainerRef }) outletRef: ViewContainerRef;
  @ViewChild('content', { read: TemplateRef }) contentRef: TemplateRef<any>;

  get columnsData() {
    return this.adminTablesConfigs.view_teams_table.columns;
  }

  constructor(
    protected store: Store<AppState>,
    messageService: MessageService,
    private confirmationService: ConfirmationService,
    private httpService: HttpService,
    private feature: FeatureFlagService,
    private trackingService: TrackingService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    super(store, messageService);
    this.httpService.loadDropdownGroupingConfigs();
  }

  ngAfterViewInit() {
    this.cdr.detectChanges();
    if (this.openCreateTeamModal) {
      this.openCreateTeamsModal(false);
    }
  }

  ngOnInit(): void {
    this.store.dispatch(fetchSourceUsers({ sourceSystem: null }));
    this.store.dispatch(fetchRoles());
    this.tableData = [];
    this.khojiTeamsList = [];
    this.componentId = ComponentsIds.ADMIN_VIEW_TABLE;
    this.khojiTeamsLoadingState = LoadingState.Pending;
    this.openCreateTeamModal = history.state.showModal

    const khojiTeamsList$ = this.store.pipe(selectTeamsList);
    const khojiTeamsLoadingState$ = this.store.pipe(selectKhojiTeamsLoadingStateSelector);
    const khojiTeamLimitation$ = this.store.pipe(selectTeamLimitation);
    this.userName = getUsername();

    this.subscription.add(
      combineLatest([khojiTeamsLoadingState$, khojiTeamLimitation$])
        .subscribe(data => {
          this.khojiTeamsLoadingState = data[0];
          if (this.khojiTeamsLoadingState === LoadingState.Done) {
            this.teamLimitation = data[1];
          }
        }));


    this.subscription.add(combineLatest([khojiTeamsList$, this.init(gc => !!gc.serverConfigs[ADMIN_TABLE_CONFIGS])]).subscribe(data => {
      this.khojiTeamsList = data[0];

      if (this.newTeam && !this.editTeamData) {
        this.displayNewTeam();
      }
      else {
        this.setColumns(this.columnsData);

        if (this.cols.length > 0 && this.khojiTeamsList.length > 0) {
          this.prepareData();
          const teamNameParam = decodeURIComponent(this.route.snapshot.queryParams['team'] || '');

          if (teamNameParam && !this.queryParamsHandled) {
            this.queryParamsHandled = true;
            const modalData = this.tableData.find(data => data.teamName === teamNameParam);

            setTimeout(() => {
              this.openEditTeamsModal(modalData);
            }, 1000);
          }
        } else {
          this.tableData = [];
        }
      }

      this.feature.isDashboardInsightsEnabled().then(value => this.isDashboardInsightsEnabled = value);
    }));

    const $loadingState = this.store.select("loadingStates");

    this.subscription.add($loadingState.subscribe(data => {
      if (data.deleteTeamLoadingState == LoadingState.Done && this.waitingForDeleteResponse) {
        this.updateDeleteTeamsStatus();
        this.store.dispatch(fetchUserSetting());
      }
      else if (data.deleteTeamLoadingState == LoadingState.Error && this.waitingForDeleteResponse) {
        this.waitingForDeleteResponse = false;
      }
    }));

    this.store.dispatch(fetchConfigs({ propKeys: [ADMIN_TABLE_CONFIGS] }));
    this.store.dispatch(fetchKhojiTeamsList());
    this.trackingService.captureNavigationStep(RootNav.ManageApp.AdminPanel.ManageTeams);
  }

  displayNewTeam() {
    let team = this.khojiTeamsList.find(data => data.teamName === this.newTeam.teamData.teamName);

    let row = {
      ...team,
      organizations: "",
      members: this.getMembersList(team.members),
      teamBoards: this.getTeamsBoardsList([]),
      supervisors: this.getSupervisorsList(team.supervisors)
    }

    this.tableData.unshift(row);
    this.selectedRows = this.tempSelectedRows;
    this.removeSortIcon();
    this.newTeam = null;
    this.tempSelectedRows = [];
  }

  updateDeleteTeamsStatus() {
    if (this.deletingSingleTeam) {
      this.selectedRows = this.selectedRows.filter(row => row.id != this.teamIdsToDelete);
    }
    else {
      this.selectedRows = [];
    }

    this.waitingForDeleteResponse = false;
  }

  prepareData() {
    this.tableData = [];

    this.khojiTeamsList = this.khojiTeamsList.filter(teamList => {
      return teamList.teamName !== Constants.ALL_STATUS_FILTER;
    });

    for (let teamData of this.khojiTeamsList) {

      let row = {
        ...teamData,
        id: teamData.id,
        organizations: "",
        members: this.getMembersList(teamData.members),
        teamBoards: this.getTeamsBoardsList([]),
        supervisors: this.getSupervisorsList(teamData.supervisors),
      }

      this.tableData.push(row);
    }
  }

  getMembersList(members: Member[]) {
    const membersList = [];

    for (let memberData of members) {
      membersList.push(" " + memberData.fullName)
    }

    return membersList;
  }

  getSupervisorsList(members: Member[]) {
    if (!members || !Array.isArray(members) || !members.length) {
      return [];
    }

    const supervisorsList = [];

    for (let memberData of members) {
      supervisorsList.push(" " + memberData.fullName)
    }

    return supervisorsList;
  }


  getTeamsBoardsList(boards: Teamboard[]) {
    const boardsList = [];

    for (let boardData of boards) {
      boardsList.push(" " + boardData.boardName);
    }

    return boardsList;
  }

  displayData(data: string[], field: string) {
    if (Array.isArray(data) && field == Constants.TEAM_TEAMBOARDS || field == Constants.TEAM_MEMBERS || field == Constants.TEAM_SUPERVISORS) {
      return data.join(', ').length > Constants.VIEW_TEAMS_MAX_LENGTH ? this.truncateData(data) : data.join(', ');
    }

    return data;
  }

  setTeamNameClass(field: string) {
    return field === Constants.TEAM_NAME ? 'data-bold' : '';
  }

  private truncateData(data: string[]) {
    let newData = [], currentCount = 0;
    const maxCount = Constants.VIEW_TEAMS_MAX_LENGTH;

    if (data.length == 1) {
      return data;
    }
    else if (data[0].length >= maxCount) {
      return (data[0].substring(0, maxCount - 5) + '..., +' + (data.length - 1).toString());
    }

    for (let value of data) {
      if (currentCount + value.toString().length < maxCount) {
        currentCount += value.toString().length;
        newData.push(value);
      }
      else {
        return newData.toString() + ', +' + (data.length - newData.length).toString();
      }
    }
    return newData.toString();

  }

  openCreateTeamsModal(logTrackingEvent: boolean = true) {
    this.selectedRows = [];
    this.editTeamData = null;
    if (logTrackingEvent) {
      this.trackingService.captureNavigationStep(RootNav.AdminDashboard.ManageTeams.CreateTeam);
    }
    this.showEditComponent = true;
  }


  openEditTeamsModal(teamData: any) {
    this.trackingService.captureNavigationStep(RootNav.AdminDashboard.ManageTeams.EditTeam)
    this.selectedRows = [];
    this.editTeamData = this.khojiTeamsList.find(team => team.id === teamData.id);
    this.showEditComponent = true;
  }

  allocateSupervisors() {
    this.openManageSupervisors = true;
    this.trackingService.captureNavigationStep(RootNav.AdminDashboard.ManageTeams.ViewSupervisors)
  }


  onDialogClose() {
    this.showUsersList = true;
    this.showUserTeamsList = false;
    this.store.dispatch(fetchUserSetting());
  }

  private rerender() {
    this.outletRef.clear();
    this.selectedRows = [];
    this.outletRef.createEmbeddedView(this.contentRef);
  }

  insertNewTeam(team: any) {
    if (team) {
      this.newTeam = team;

      if (this.editTeamData) {
        this.tableData = this.tableData.filter(data => data.id !== this.editTeamData.id);
      }

      this.store.dispatch(fetchKhojiTeamsList());

      if (!this.editTeamData) {
        this.tempSelectedRows = this.selectedRows;
        this.rerender();
      }
    }
  }

  removeSortIcon() {
    let sort = document.querySelector("p-sorticon i");
    sort.classList.remove("pi-sort-amount-down");
    sort.classList.remove("pi-sort-amount-up-alt");
    sort.classList.add("pi-sort-alt");
    document.querySelector<HTMLButtonElement>(".p-paginator-first")?.click();
  }

  trimExtraProps<T>(obj: T, props: { field: string }[]) {
    return {
      ...(props.reduce((tableData, column) => {
        tableData[column.field] = obj[column.field];
        return tableData;
      }, {}))
    };
  }

  deleteTeams(rowData) {
    if (rowData) {
      this.selectedRows = [];
      this.teamIdsToDelete = rowData.id;
      this.deletingSingleTeam = true;
    }
   
    this.confirmationService.confirm({
      key: 'deleteTeamConfirm',
      message: this.deletingSingleTeam ? this.translation?.adminPanel.dashboard.createTeams.deleteTeamDialog.message : this.translation?.adminPanel.dashboard.createTeams.deleteTeamDialog.multipleTeamsMessage,
      acceptLabel: this.translation?.adminPanel.dashboard.createTeams.deleteTeamDialog.acceptLabel,
      rejectLabel: this.translation?.adminPanel.dashboard.createTeams.deleteTeamDialog.rejectLabel,
      // @ts-ignore
      data: rowData
    });
  }

  deleteTeamConfirm() {
    let teamstoDelete = [];
    if (!Array.isArray(this.teamIdsToDelete)) {
      teamstoDelete = [this.teamIdsToDelete];
      this.trackingService.captureUserAction(AdminActions.TeamDeleted)
    }
    else {
      teamstoDelete = this.teamIdsToDelete;
      this.trackingService.captureUserAction(AdminActions.TeamDeletedBulk)
    }

    this.store.dispatch(deleteTeams({ ids: teamstoDelete }));
    this.waitingForDeleteResponse = true;
    this.confirmationService.close();
  }

  crossIconClick() {
    this.confirmationService.close();
  }

  deleteTeamReject() {
    this.confirmationService.close();
  }

  displayEmptyMessage() {
    return this.tableData.length > 0 ? this.translation.error.noRecordsFoundMessage : this.translation.error.noTeamsAvailable;
  }

  ngOnDestroy() {
    super.ngOnDestroy()
  }

  /**
  * @param event event
  * method to show user list and hide user teams list
  */
  navigateToLists(event: any, showUsersList: boolean) {
    this.showUsersList = showUsersList;
    if (!showUsersList) {
      this.store.dispatch(fetchUserDetail({ userId: event }));
      this.showUserTeamsList = !showUsersList;
    }
  }

}
