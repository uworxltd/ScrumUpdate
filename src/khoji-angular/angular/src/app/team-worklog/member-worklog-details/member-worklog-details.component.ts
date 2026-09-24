/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Component, Input, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { MemberWorklog, TeamWorklog } from 'app/interface/team-worklog-stats';
import { AppState } from 'app/states/app-states';
import { selectTeamWorklogStats } from 'app/states/global-statistics.selector';
import { Constants } from 'app/constants';
import { Table } from 'primeng/table';
import { selectTranslation } from 'app/states/global-translations.selector';
import { Subscription } from 'rxjs';
import { selectWorkLogGeneralSettings } from 'app/states/global-configs.selector';
import { ExportService } from 'app/services/export.service';
import { format as formatDate, parse as parseDate } from 'date-fns';

const _parseDate = (date: string) => formatDate(parseDate(date, Constants.DATE_FORMAT, new Date()), 'MMMM DD, YYYY');

@Component({
  selector: 'khoji-member-worklog-details',
  templateUrl: './member-worklog-details.component.html',
  styleUrls: ['./member-worklog-details.component.scss']
})
export class MemberWorklogDetailsComponent implements OnInit {

  @Input() teamName: string;

  constants: typeof Constants;
  teamWorklogStats: TeamWorklog;
  memberWorklogs: MemberWorklog[] = [];
  dateFrom: string;
  dateTo: string;
  columnNamesForFilters: string[] = [];
  translation: any;
  scrollable = true;
  enablePagination = true;
  subscription = new Subscription();
  otherCategoryAlias: string = "";
  mainCategoryAlias: string = "";
  exportFileName = '{0} Work Log Details';

  constructor(private store: Store<AppState>, private exportService: ExportService) {
    this.constants = Constants;
  }

  ngOnInit(): void {
    this.exportFileName = this.exportFileName.format(this.teamName);
    const stats$ = this.store.pipe(selectTeamWorklogStats)
    const generalSettings$ = this.store.pipe(selectWorkLogGeneralSettings);

    this.subscription.add(
      generalSettings$.subscribe(settings => {
        this.mainCategoryAlias = settings.productiveAlias;
        this.otherCategoryAlias = settings.nonProductiveAlias;
      })
    )

    stats$.subscribe(data => {
      this.dateFrom = _parseDate(data.dateFrom);
      this.dateTo = _parseDate(this.dateTo);
      this.teamWorklogStats = data.teamWorklogs.find(tw => tw.teamName === this.teamName);
      this.setTeamRagStatusColor(data.thresholdPercentage, data.thresholdColors);
      this.memberWorklogs = this.teamWorklogStats.memberWorklogs;
      this.createCloumnNamesListForFilter();
    });

    // select translation
    this.subscription.add(this.store.pipe(selectTranslation)
      .subscribe(translation => {
        this.translation = translation;
      }));
  }

  setTeamRagStatusColor(thresholdPercentages: any, thresholdColors: any) {
    if (this.teamWorklogStats.percentage > thresholdPercentages["Normal"]) {
      this.teamWorklogStats.thresholdColor = thresholdColors["Normal"];
    }
    else if (this.teamWorklogStats.percentage > thresholdPercentages["Medium"]) {
      this.teamWorklogStats.thresholdColor = thresholdColors["Medium"];
    }
    else {
      this.teamWorklogStats.thresholdColor = thresholdColors["Low"];
    }
  }

  getTotalAverageTimeLogPercentage(columnName: any, isMainCategory: boolean) {
    let totalPercents = 0;

    if (isMainCategory) {
      for (let memberWorklog of this.memberWorklogs) {
        totalPercents += memberWorklog.totalMainPercents[columnName];
      }
    }
    else {
      for (let memberWorklog of this.memberWorklogs) {
        totalPercents += memberWorklog.totalOthersPercents[columnName];
      }
    }

    return totalPercents == 0 ? totalPercents.toFixed(2) : (totalPercents / this.memberWorklogs.length).toFixed(2);

  }

  getTotalTimeLogDays(columnName: any, isMainCategory: boolean) {
    let totalDays = 0;

    if (isMainCategory) {
      for (let memberWorklog of this.memberWorklogs) {
        totalDays += memberWorklog.totalMainDays[columnName];
      }
    }
    else {
      for (let memberWorklog of this.memberWorklogs) {
        totalDays += memberWorklog.totalOthersDays[columnName];
      }
    }

    return totalDays.toFixed(2);
  }

  updateTableForRPA() {
    let columns = {
      main: [],
      other: []
    }
    const columnsToShow = this.constants.RPA_TEAM_WORKLOG_DETAILS_TABLE_COLUMNS_TO_SHOW.split(',');
    for (let col of this.teamWorklogStats.memberWorklogColumns.main) {
      if (columnsToShow.includes(col)) {
        columns.main.push(col);
      }
    }
    this.scrollable = false;
    this.enablePagination = false;
    this.teamWorklogStats.memberWorklogColumns = columns;
  }

  onSearch(table: Table) {
    this.memberWorklogs = table.filteredValue || this.teamWorklogStats.memberWorklogs;
    table._filter.apply
  }

  createCloumnNamesListForFilter() {
    let memberWorklogColumns = this.teamWorklogStats.memberWorklogColumns.main.concat(this.teamWorklogStats.memberWorklogColumns.main);
    memberWorklogColumns = [...new Set(memberWorklogColumns)];

    this.columnNamesForFilters.push("memberName");
    memberWorklogColumns.forEach(columnName => {
      this.columnNamesForFilters.push("totalDays." + columnName);
      this.columnNamesForFilters.push("totalPercents." + columnName);
    })
  }

  exportCsv() {
    const data =
      this.memberWorklogs.map(mem => (
        {
          ['Member Name']: mem.memberName,
          ...this.teamWorklogStats.memberWorklogColumns.main.reduce((acc, col) => {
            const colNamePercent = col === 'Worklog' ? `${col} %` : `${col} % - ${this.mainCategoryAlias}`;
            const colNameDays = col === 'Worklog' ? `${col} Days` : `${col} Days - ${this.mainCategoryAlias}`;

            acc[colNamePercent] = mem.totalMainPercents[col].toFixed(2) + '%';
            acc[colNameDays] = mem.totalMainDays[col].toFixed(2);

            return acc;
          }, {}),
          ...this.teamWorklogStats.memberWorklogColumns.other.reduce((acc, col) => {
            acc[`${col} % - ${this.otherCategoryAlias}`] = mem.totalOthersPercents[col].toFixed(2) + '%';
            acc[`${col} Days - ${this.otherCategoryAlias}`] = mem.totalOthersDays[col].toFixed(2);

            return acc;
          }, {}),
        }
      ))

    this.exportService.exportCsv(data, this.exportFileName);
  }
}
