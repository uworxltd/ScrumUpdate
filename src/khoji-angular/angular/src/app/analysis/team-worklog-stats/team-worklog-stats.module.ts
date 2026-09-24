/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { SharedModule } from 'app/shared/shared.module';
import { TeamWorklogModule } from 'app/team-worklog/team-worklog.module';
import { NgxEchartsModule } from 'ngx-echarts';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TeamWorklogStatsComponent } from './team-worklog-stats.component';
import { CardModule } from 'primeng/card';
import { TeamWorklogSummaryComponent } from 'app/team-worklog/team-worklog-summary/team-worklog-summary.component';
import { DialogModule } from 'primeng/dialog';
import { TeamWorklogStatisticsComponent } from 'app/team-worklog/team-worklog-statistics/team-worklog-statistics.component';
import { TeamWorklogDetailsComponent } from 'app/team-worklog/team-worklog-details/team-worklog-details.component';
import { TabViewModule } from 'primeng/tabview';

@NgModule({
  declarations: [
    TeamWorklogStatsComponent
  ],
  imports: [
    CommonModule,
    NgxEchartsModule,
    SharedModule,
    TableModule,
    TeamWorklogModule,
    DialogModule,
    ButtonModule,
    CardModule,
    TeamWorklogSummaryComponent,
    TeamWorklogStatisticsComponent,
    TeamWorklogDetailsComponent,
    TabViewModule,
  ],
  exports: [
    TeamWorklogStatsComponent
  ]
})
export class TeamWorklogStatsModule { }
