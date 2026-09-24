/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectTeamsList } from 'app/admin/state/admin.selector';
import { Constants } from 'app/constants';
import { MemberWorklog, TeamWorklog, TeamWorklogStatistics } from 'app/interface/team-worklog-stats';
import { ConfigService } from 'app/services/config.service';
import { ExportService } from 'app/services/export.service';
import { TrackingService } from 'app/services/tracking';
import { checkMultipleTeamMember, getUniqueMembers } from 'app/shared/helper-functions';
import { MemberWorklogPercentage } from 'app/shared/picklist/interfaces';
import { AppState, LoadingState } from 'app/states/app-states';
import { setTeamWorklogUpdated } from 'app/states/app.actions';
import { selectWorkLogGeneralSettings } from 'app/states/global-configs.selector';
import { selectWorklogTeamsFilter, selectWorklogTeamsSelectedByFilter } from 'app/states/global-filters.selector';
import { selectTeamWorklogStats } from 'app/states/global-statistics.selector';
import { workLogCategorizationEnabledSelector } from 'app/user-profile/state/user-profile.selectors';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { combineLatest, Observable, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { TeamWorklogSelectionComponent } from '../team-worklog-selection/team-worklog-selection.component';
import { TeamWorklogModule } from '../team-worklog.module';
import { SharedModule } from '../../shared/shared.module';
import { WorklogPopoverTootipComponent } from "../worklog-popover-tootip/worklog-popover-tootip.component";

@Component({
  selector: 'khoji-team-worklog-details',
  templateUrl: './team-worklog-details.component.html',
  styleUrls: ['./team-worklog-details.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TeamWorklogModule,
    DialogModule,
    TeamWorklogSelectionComponent,
    SharedModule,
    WorklogPopoverTootipComponent
],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('0.5s ease-in', style({ opacity: 1 }))
      ]),
    ])
  ]
})
export class TeamWorklogDetailsComponent implements OnInit {
  categorizationEnabled: boolean;
  worklogTeamsSelected$: Observable<string[]>;
  subscription = new Subscription();
  translation: any;
  anyMultiTeamMember: boolean = false;
  expandedRows: {} = {};
  constants: typeof Constants;
  teamWorklogStatisticsLoadingState: LoadingState;
  accessibleAccessLevels: string[];
  otherCategoryAlias = '';
  mainCategoryAlias = '';
  exportFileName = 'Team View Details';
  showRemindTeamModal: boolean = false;
  instanceOwnerEmail : string = "";
  isUserSupervisor: boolean = false;
  showRemindTeamButton: boolean;
  teamSupervisorMap: Map<string, boolean> = new Map();
  teamReminderMap: Map<string, boolean> = new Map();
  teamNameForReminder: string = '';
  supervisorId: number;

  constructor(
    private store: Store<AppState>,
    private trackingService: TrackingService,
    private exportService: ExportService,
    private configService: ConfigService,
  ) {
    this.constants = Constants;
  }

  worklogStats: TeamWorklogStatistics;
  memberWorklogs: MemberWorklog[];
  teamWorklog: TeamWorklog;

  lastColumnHeader: any;
  columnToolTipsMap: any;

  ngOnInit(): void {
    const selectedTeamList$ = this.store.pipe(selectTeamsList);
    const worklogTeamsFilter$ = this.store.pipe(selectWorklogTeamsFilter);
    this.worklogTeamsSelected$ = this.store.pipe(selectWorklogTeamsSelectedByFilter);
    const generalSettings$ = this.store.pipe(selectWorkLogGeneralSettings);
    const stats$ = this.store.pipe(selectTeamWorklogStats);

    this.subscription.add(
      generalSettings$.subscribe(settings => {
        this.otherCategoryAlias = settings.nonProductiveAlias;
        this.mainCategoryAlias = settings.productiveAlias;
      })
    );

    const userProfile$ = this.store.select('userProfile');

    this.subscription.add(userProfile$.subscribe(userProfile => {
      this.accessibleAccessLevels = userProfile.accessibleAccessLevels;
      this.instanceOwnerEmail  = userProfile.khojiUserProfile.email;
    }));


    this.subscription.add(
      combineLatest([selectedTeamList$, worklogTeamsFilter$, stats$]).subscribe(([teamList, worklogTeamsFilter, stats]) => {

        const isNoSpecificTeamSelected = worklogTeamsFilter.every(filterTeam => !filterTeam.selected);

        const filteredTeams = teamList.filter(team =>
          worklogTeamsFilter.some(filterTeam => filterTeam.name === team.teamName)
        );

        this.isUserSupervisor = false;

        filteredTeams.forEach(team => {
          const isTeamSelected = isNoSpecificTeamSelected || worklogTeamsFilter.some(filterTeam => filterTeam.name === team.teamName && filterTeam.selected);

          if (isTeamSelected) {
            const supervisor = team.supervisors?.find(supervisor => supervisor.memberEmail === this.instanceOwnerEmail);

            if (supervisor) {
              this.isUserSupervisor = true;
              this.supervisorId = supervisor.id;
            }

            this.teamSupervisorMap.set(team.teamName, !!supervisor);
            this.setTeamReminderMap(stats.teamWorklogs);
          }
        });
      })
    );

    const translation$ = this.store.select('globalTranslations').pipe(filter(data => data.translation != undefined));
    const filters$ = this.store.select('globalFilters').pipe(filter(data => data.teamWorklogUpdated == true));

    this.subscription.add(
      stats$.subscribe(worklog => {
        this.addTitlesToWorklogPercentages(this.getMembersWorklogPercentages(worklog));
      })
    );

    this.subscription.add(stats$.subscribe(data => {
      this.worklogStats = structuredClone(data);
      this.teamWorklog = this.worklogStats.teamWorklogs[0] || <any>{ memberWorklogColumns: { main: [], other: [] }, memberWorklogs: [] };
      this.memberWorklogs = this.teamWorklog?.memberWorklogs;
      this.anyMultiTeamMember = checkMultipleTeamMember(this.worklogStats.teamWorklogs);
      this.removeOthersColumnIfNoInfo();
    }));

    this.subscription.add(filters$
      .subscribe(data => {
        this.expandTeamRows();
        this.store.dispatch(setTeamWorklogUpdated({ teamWorklogUpdated: false }));
      }));

    this.subscription.add(translation$
      .subscribe(data => {
        this.translation = data.translation;
      }));

    const workLogCategorizationEnabled$ = this.store.select(workLogCategorizationEnabledSelector);

    this.subscription.add(workLogCategorizationEnabled$.subscribe(workLogCategorizationEnabled => {
      this.categorizationEnabled = workLogCategorizationEnabled;
    }));

    this.lastColumnHeader = this.worklogStats?.teamWorklogColumns[this.worklogStats?.teamWorklogColumns?.length - 1];
    this.columnToolTipsMap = this.worklogStats?.teamWorklogColumns.reduce((acc, column) => {
      acc[column.name] = column.tooltip;
      return acc;
    }, {});

  }

  setTeamReminderMap(worklogs: TeamWorklog[]) {
    worklogs.forEach(teamWorklog => {
      let worklogss = this.getMembersWorklogPercentagesByWorklog(teamWorklog);
      const counts: Record<string, number> = {
        Missing: 0,
        Incomplete: 0,
        Completed: 0
      };

      worklogss.forEach(member => {
        let title: string;

        if (member.percentage === 0) {
          title = this.constants.MISSING;
        } else if (member.percentage > 0 && member.percentage < 100) {
          title = this.constants.INCOMPLETE;
        } else if (member.percentage === 100) {
          title = this.constants.COMPLETED;
        }

        if (counts[title] !== undefined) {
          counts[title]++;
        }
      });

      let isRemindTeamVisible = counts[this.constants.MISSING] > 0 || counts[this.constants.INCOMPLETE] > 0;
      const isSupervisor = this.teamSupervisorMap.get(teamWorklog.teamName);

      isRemindTeamVisible = isRemindTeamVisible && isSupervisor;
      this.teamReminderMap.set(teamWorklog.teamName, isRemindTeamVisible);
    })
  }

  expandTeamRows() {
    let thisRef = this;
    //To give expanded rows view in main table. By Default all team rows would be collapsed.
    this.worklogStats.teamWorklogs.forEach(function (teamWorklog) {
      thisRef.expandedRows[teamWorklog.teamName] = thisRef.worklogStats.teamWorklogs.length > 1 ? null : true;
    });
    this.expandedRows = Object.assign({}, this.expandedRows);
  }

  getMembersWorklogPercentages(worklog: TeamWorklogStatistics): MemberWorklogPercentage[] {
    const uniqueMembers = new Map<string, MemberWorklogPercentage>();

    worklog.teamWorklogs.forEach(teamWorklog => {
      teamWorklog.memberWorklogs.forEach(member => {
        const existing = uniqueMembers.get(member.memberName);

        uniqueMembers.set(member.memberName, {
          memberName: member.memberName,
          percentage: existing ? Math.max(existing.percentage, member.percentage) : member.percentage
        });
      });
    });

    return Array.from(uniqueMembers.values());;
  }

  getMembersWorklogPercentagesByWorklog(worklog: TeamWorklog): MemberWorklogPercentage[] {
    const uniqueMembers = new Map<string, MemberWorklogPercentage>();

    worklog.memberWorklogs.forEach(member => {
      const existing = uniqueMembers.get(member.memberName);

      uniqueMembers.set(member.memberName, {
        memberName: member.memberName,
        percentage: existing ? Math.max(existing.percentage, member.percentage) : member.percentage
      });
    });

    return Array.from(uniqueMembers.values());
  }

  addTitlesToWorklogPercentages(memberPercentages: MemberWorklogPercentage[]) {
    const counts: Record<string, number> = {
      Missing: 0,
      Incomplete: 0,
      Completed: 0
    };

    memberPercentages.forEach(member => {
      let title: string;

      if (member.percentage === 0) {
        title = this.constants.MISSING;
      } else if (member.percentage > 0 && member.percentage < 100) {
        title = this.constants.INCOMPLETE;
      } else if (member.percentage === 100) {
        title = this.constants.COMPLETED;
      }

      if (counts[title] !== undefined) {
        counts[title]++;
      }
    });


    this.showRemindTeamButton = counts[this.constants.MISSING] > 0 || counts[this.constants.INCOMPLETE] > 0;

  }

  // Remove Others Column from teamWorklogColumns when there is no Others data in given date range for a team.
  removeOthersColumnIfNoInfo() {
    let isOthersColumnAvailable: boolean = false;
    this.worklogStats.teamWorklogs.forEach(teamWorklog => {
      if (teamWorklog.memberWorklogColumns.other.length != 0) {
        isOthersColumnAvailable = true;
      }
    });

    if (!isOthersColumnAvailable) {
      this.worklogStats.teamWorklogColumns.splice(this.worklogStats.teamWorklogColumns.findIndex(column => column.name === "Others"), 1);
    }
  }

  getAverageTimeLogFormatted(columnName: string) {
    let avg = this.getAverageTimeLog(columnName);

    if (avg === -1) {
      return "";
    }

    return avg.toFixed(2) + "%";
  }

  getAverageTimeLog(columnName: string) {
    let totalPercentages = 0;
    const uniqueMembers = getUniqueMembers(this.worklogStats.teamWorklogs);

    uniqueMembers.forEach(member => {
      totalPercentages += member.totalMainPercents[columnName];
    });
    const numberOfMembers = uniqueMembers.length;

    if (numberOfMembers === 0) {
      return -1;
    }

    return totalPercentages / numberOfMembers;
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

  exportMemberWorklogCsv() {
    const data =
      this.memberWorklogs.map(mem => (
        {
          ['Member Name']: mem.memberName,
          ...this.teamWorklog.memberWorklogColumns.main.reduce((acc, col) => {
            const colNamePercent = col === 'Worklog' ? `${col} %` : `${col} % - ${this.mainCategoryAlias}`;
            const colNameDays = col === 'Worklog' ? `${col} Days` : `${col} Days - ${this.mainCategoryAlias}`;

            acc[colNamePercent] = mem.totalMainPercents[col].toFixed(2) + '%';
            acc[colNameDays] = mem.totalMainDays[col].toFixed(2);

            return acc;
          }, {}),
          ...this.teamWorklog.memberWorklogColumns.other.reduce((acc, col) => {
            acc[`${col} %${this.categorizationEnabled ? ' - ' + this.otherCategoryAlias : ''}`] = mem.totalOthersPercents[col].toFixed(2) + '%';
            acc[`${col} Days${this.categorizationEnabled ? ' - ' + this.otherCategoryAlias : ''}`] = mem.totalOthersDays[col].toFixed(2);

            return acc;
          }, {}),
        }
      ))

    this.exportService.exportCsv(data, this.exportFileName);
  }

  exportTeamWorklogCsv() {
    const data =
      this.worklogStats.teamWorklogs.flatMap(team =>
        team.memberWorklogs.map(mem => (
          {
            ['Team Name']: team.teamName,
            ['Member Name']: mem.memberName,
            ...this.worklogStats.teamWorklogColumns.filter(c => this.categorizationEnabled ? true : c.name === 'Worklog').reduce((acc, col) => {
              const colName = col.name === 'Others' ? this.otherCategoryAlias : col.name;
              acc[colName] = mem.totalMainPercents[col.name].toFixed(2) + '%';
              return acc;
            }, {}),
          }
        ))
      );

    this.exportService.exportCsv(data, this.exportFileName);
  }

  openWorklogReminderModalForTheTeam(teamName: string) {
    this.showRemindTeamModal = true;
    this.teamNameForReminder = teamName || '';
  }

  onClickRemindTeam() {
    this.showRemindTeamModal = true;
  }

  onModalClosed() {
    this.showRemindTeamModal = false;
  }

  generateToolTipForMainCategoryColumn(columnName: string): string {
    const toolTip = this.columnToolTipsMap[columnName];
    if (toolTip) {
      return this.replaceCharacterInToolTip(toolTip);
    }
  }

  replaceCharacterInToolTip(toolTipText: string): string {
    const index = toolTipText.lastIndexOf(',');
    if (index === -1) {
      return toolTipText + '.';
    }
    else {
      return toolTipText.slice(0, index) + ' and' + toolTipText.slice(index + 1) + '.';
    }
  }

  // For last column we need to show tooltip on the left side
  getToolTipPosition(columnName: string): string {
    const toolTip = this.columnToolTipsMap[columnName];
    if (toolTip) {
      if (this.lastColumnHeader.tooltip === toolTip) {
        return 'left';
      }
      return 'top';
    }

  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
