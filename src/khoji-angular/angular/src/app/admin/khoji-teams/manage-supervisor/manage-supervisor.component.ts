/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Store } from '@ngrx/store';
import { fetchBasicUsers } from 'app/admin/state/admin.actions';
import { selectUsersDetails } from 'app/admin/state/admin.selector';
import { ComponentsIds } from 'app/components-constants';
import { Constants } from 'app/constants';
import { PrimengTableComponent } from 'app/shared/datatable/primeng-table/primeng-table.component';
import { AppState } from 'app/states/app-states';
import { MessageService } from 'primeng/api';
import { Subscription, combineLatest } from 'rxjs';
import { BasicUsers } from '../../state/admin.state';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'khoji-manage-supervisor',
  templateUrl: './manage-supervisor.component.html',
  styleUrls: ['./manage-supervisor.component.scss'],
  standalone: true,
  imports: [
    TableModule,
    ButtonModule,
    ToolbarModule,
    CommonModule,
    FormsModule
  ]
})
export class ManageSupervisorComponent extends PrimengTableComponent implements OnInit {
  subscription = new Subscription();
  constants = Constants;
  basicUsersData: BasicUsers[] = [];
  cols: any;
  @Output() userTeams = new EventEmitter<string>();
  constructor(protected store: Store<AppState>, messageService: MessageService) {
    super(store, messageService);
  }

  get columnsData() {
    return this.adminTablesConfigs.view_users_table.columns;
  }

  ngOnInit(): void {
    this.store.dispatch(fetchBasicUsers());
    this.tableId = Constants.ALLOCATE_SUPERVISOR_MANAGE_USER_TABLE_ID;
    this.componentId = ComponentsIds.ADMIN_ALLOCATE_SUPERVISORS_USERS_TABLE;
    const basicUsers$ = this.store.pipe(selectUsersDetails);
    this.subscription.add(combineLatest([basicUsers$, this.init()]).subscribe(data => {
      this.tableData = [];
      this.setColumns(this.columnsData);
      if (this.cols.length > 0) {
        this.tableData = data[0];
      }
    }));
  }

  /***
   * Method to emit event to parent in order to go to user teams list component
   */
  getUserTeamsList(userId: string) {
    this.userTeams.emit(userId);
  }

  /***
   * Method to show empty message
   */
  showEmptyMessage() {
    return this.cols.length > 0 ? this.tableData.length === 0 ? this.translation?.adminPanel.dashboard.createTeams.manageSupervisors.noUserText : this.translation.error.noRecordsFoundMessage : this.translation.dataTables.noDatatableConfigFound;
  }

}
