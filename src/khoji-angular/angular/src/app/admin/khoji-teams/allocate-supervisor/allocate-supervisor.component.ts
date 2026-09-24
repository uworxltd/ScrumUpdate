/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Store } from '@ngrx/store';
import { AppState } from 'app/states/app-states';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PrimengTableComponent } from '../../../shared/datatable/primeng-table/primeng-table.component';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Subscription, combineLatest } from 'rxjs';
import { Constants } from 'app/constants';
import { Team, User } from 'app/admin/admin.entities';
import { selectTeamsList, selectUserDetail, selectUserTeamsList } from 'app/admin/state/admin.selector';
import { assignTeamsAccessToUser, fetchKhojiTeamsList, removeUserAccessToTeam } from 'app/admin/state/admin.actions';
import { ComponentsIds } from 'app/components-constants';
import { areArraysEqual } from 'app/shared/helper-functions';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { TableModule } from 'primeng/table';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'khoji-allocate-supervisor',
  templateUrl: './allocate-supervisor.component.html',
  styleUrls: ['./allocate-supervisor.component.scss'],
  standalone: true,
  imports: [
    MultiSelectModule,
    ButtonModule,
    ToolbarModule,
    TableModule,
    ConfirmDialogModule,
    CommonModule,
    FormsModule
  ]
})
export class AllocateSupervisorComponent extends PrimengTableComponent implements OnInit {
  subscription = new Subscription();
  constants = Constants;
  userDetail: User;
  selectedTeams = [];
  teamsList = [];
  khojiTeamsList: Team[] = [];
  removeTeamId = 0;
  disableDropdown: boolean
  @Output() navigationEvent = new EventEmitter();
  constructor(protected store: Store<AppState>, messageService: MessageService, private confirmationService: ConfirmationService) {
    super(store, messageService);
  }

  get columnsData() {
    return this.adminTablesConfigs.user_teams_table.columns;
  }

  ngOnInit(): void {
    this.tableId = Constants.ALLOCATE_SUPERVISOR_MANAGE_USER_TEAMS_TABLE_ID;
    this.componentId = ComponentsIds.ADMIN_ALLOCATE_SUPERVISORS_USERS_TEAMS_TABLE;
    const teamsList$ = this.store.pipe(selectTeamsList);
    const user$ = this.store.pipe(selectUserDetail);
    const userTeamList$ = this.store.pipe(selectUserTeamsList);
    this.subscription.add(combineLatest([teamsList$, user$, userTeamList$, this.init()]).subscribe(data => {
      this.tableData = [];
      this.selectedTeams = [];
      this.khojiTeamsList = data[0];
      this.getTeamsList(data[0]);
      this.userDetail = data[1];
      this.setColumns(this.columnsData);
      if (data[1]?.teams && this.cols.length > 0) {
          this.tableData = data[2];
        }
    }));
  }

  /**
   * Method to emit event to parent to navigate to supervisors list
   */
  navigateToSupervisorList() {
    this.navigationEvent.emit();
  }

  /***
   * Method to get teams list
   */
  getTeamsList(teams: Team[]) {
    const userTeamIds = this.userDetail?.teams.map(data => data.id);

    // Separate selected teams from available teams
    const availableTeams = [];

    for (const team of teams) {
      const data = {
        "teamName": team.teamName,
        "id": team.id
      };

      if (userTeamIds?.includes(team.id)) {
        data["disabled"] = true; // Set 'disabled' property to true if user has been allocated as the supervisor of this team
        this.selectedTeams.push(data);
      } else {
        availableTeams.push(data);
      }
    }
    this.teamsList = [...this.selectedTeams, ...availableTeams];
  }

  /***
   * Method to show empty message
   */
  showEmptyMessage() {
    if (this.teamsList.length === 0) {
      return this.translation?.adminPanel.dashboard.createTeams.manageSupervisors.noTeamsText;
    } else {
      return this.cols.length > 0 ?
        this.tableData.length === 0 ?
          this.translation?.adminPanel.dashboard.createTeams.manageSupervisors.noUserTeamsText :
          this.translation.error.noRecordsFoundMessage :
        this.translation.dataTables.noDatatableConfigFound;
    }
  }

  /***
   * Method to assign teams to user
   * This method will dispatch a action that will assign teams to supervisor
   */
  assignTeamsAccessToUser() {

    if (this.disableAddToTeamButton()) {
      return;
    }

    const selectedTeamIds = this.selectedTeams.map(data => data.id);
    const userTeamIds = this.userDetail?.teams.map(data => data.id);
    const teamsToAdd = this.khojiTeamsList.filter(team => selectedTeamIds.includes(team.id) && !userTeamIds.includes(team.id));

    const teamsToRemove = this.userDetail?.teams.filter(team => !selectedTeamIds.includes(team.id));

    if (teamsToAdd.length >= 0) {
      this.store.dispatch(assignTeamsAccessToUser({ teams: teamsToAdd, userId: this.userDetail?.id }));
    }

    if (teamsToRemove.length > 0) {
      for (const team of teamsToRemove) {
        this.removeUserAccess(team.id, false);
      }
    }

  }

  /***
   * Method to remove user access from a team
   */
  removeUserAccess(teamId: number, showModal: boolean) {
    if (showModal) {
      this.removeTeamId = teamId;
      this.confirmationService.confirm({
        key: 'removeUserAccessToTeam',
        message: this.translation?.adminPanel.dashboard.createTeams.manageSupervisors.removeUserTeamAccessDescription,
        acceptLabel: this.translation?.adminPanel.dashboard.createTeams.deleteTeamDialog.acceptLabel,
        rejectLabel: this.translation?.adminPanel.dashboard.createTeams.deleteTeamDialog.rejectLabel,
      });
    }
    else {
      this.store.dispatch(removeUserAccessToTeam({ teamId: teamId, userId: this.userDetail.id }));
      this.closeRemoveAccessToTeamModal();
    }
  }


  /***
   * Method to disable button
   */
  disableAddToTeamButton() {
    const selectedTeamIds = this.selectedTeams.map(data => data.id);
    const userTeamIds = this.userDetail?.teams.map(data => data.id);
     // Disable the button if no teams are selected
    if (!selectedTeamIds || selectedTeamIds.length === 0) {
      return true;
    }

    if (selectedTeamIds && userTeamIds) {
      return areArraysEqual(selectedTeamIds, userTeamIds);
    }
    return true;
  }

  closeRemoveAccessToTeamModal() {
    this.confirmationService.close();
  }

  getMultiSelectTitle() {
    // Disable the dropdown if there are no columns (cols.length === 0)
    if (this.cols.length === 0) {
      this.disableDropdown = true;
    } else {
      this.disableDropdown = false;
      if (this.teamsList.length === 0) {
        return this.translation?.adminPanel.dashboard.createTeams.manageSupervisors.noTeamExist;
      } else if (this.selectedTeams.length > 0) {
        const teamNames = this.selectedTeams.map(teamData => teamData.teamName);
        return teamNames.join(', ');
      }
      return '';
    }
    return "";
  }

}
