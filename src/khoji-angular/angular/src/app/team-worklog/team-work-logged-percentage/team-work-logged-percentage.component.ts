import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { TeamWorklog } from 'app/interface/team-worklog-stats';
import { ChartComponent } from 'app/shared/chart/chart.component';
import { calculateTotalForJsonObject, getTotalWorklogOfGivenCategory, getUniqueMembers, restrictToDecimalPlace } from 'app/shared/helper-functions';
import { AppState } from 'app/states/app-states';
import { selectWeekendStatsTooltip } from 'app/states/global-configs.selector';
import { selectTeamWorklogStats } from 'app/states/global-statistics.selector';
import { selectTranslation } from 'app/states/global-translations.selector';
import { Observable, Subscription } from 'rxjs';

export interface WorklogSummaryData {
  loggedPercentage: number;
  availableCapacity: number;
  availableCapacityInHours: number;
  loggedTime: number;
  loggedTimeInHours: number;
  color: string,
  workLogHoursPerDayConfig?: number
}

@Component({
  selector: 'khoji-team-work-logged-percentage',
  templateUrl: './team-work-logged-percentage.component.html',
  styleUrls: ['./team-work-logged-percentage.component.scss'],
})
export class TeamWorkLoggedPercentageComponent extends ChartComponent implements OnInit {
  translation$: Observable<any>;
  totalTeams: number = 0;
  totalMembers: number = 0;
  teamWorklogs$: Observable<TeamWorklog[]>;
  subscription = new Subscription();
  summaryData: WorklogSummaryData = {
    loggedPercentage: 0,
    availableCapacity: 0,
    availableCapacityInHours: 0,
    loggedTime: 0,
    loggedTimeInHours: 0,
    color: '',
  };
  tooltipForAvailableCapacity: string = '';

  constructor(store: Store<AppState>) {
    super(store);
  }
  ngOnInit(): void {
    this.translation$ = this.store.pipe(selectTranslation);
    const worklog$ = this.store.pipe(selectTeamWorklogStats);

    const weekendStatsTooltip$ = this.store.pipe(selectWeekendStatsTooltip);

    this.subscription.add(
      weekendStatsTooltip$.subscribe((tooltip) => {
        this.tooltipForAvailableCapacity = tooltip;
      })
    );

    this.subscription.add(
      worklog$.subscribe(worklog => {
        this.totalTeams = worklog.teamWorklogs.length;
        this.totalMembers = this.getUniqueMemberCount(worklog.teamWorklogs)
        this.summaryData.loggedPercentage = this.calculateTotalWorkloggedInPercentage(worklog.teamWorklogs);
        this.summaryData.availableCapacity = this.calculateTotalAvailableCapacity(worklog.teamWorklogs);
        this.summaryData.loggedTime = this.calculateTotalLoggedTime(worklog.teamWorklogs);
        this.summaryData.color = this.getColorBasedOnPercentage(worklog.thresholdColors, worklog.thresholdPercentage)
        this.prepareChart();
      })
    );
  }

  getColorBasedOnPercentage(threshold: { [level: string]: string }, thresholdPercentage: { [level: string]: number }): string {

    const percentage = this.summaryData.loggedPercentage;
    if (percentage <= thresholdPercentage.Medium) {
      return threshold.Low;
    } else if (percentage > thresholdPercentage.Medium && percentage <= thresholdPercentage.Normal) {
      return threshold.Medium;
    } else {
      return threshold.Normal;
    }
  }

  getUniqueMemberCount(teamWorklog: TeamWorklog[]): number {
    const uniqueMembers = getUniqueMembers(teamWorklog);
    return uniqueMembers.length;
  }

  calculateTotalWorkloggedInPercentage(teamsWorklog: TeamWorklog[]) {
    let totalPercentages = 0;

    const uniqueMembers = getUniqueMembers(teamsWorklog);

    uniqueMembers.forEach(member => {
      totalPercentages += member.totalMainPercents['Worklog'];
    });

    const numberOfMembers = uniqueMembers.length;

    if (numberOfMembers === 0) {
      return 0;
    }

    const averagePercentage = (totalPercentages / numberOfMembers);
    return restrictToDecimalPlace(averagePercentage);
  }

  calculateTotalAvailableCapacity(teamsWorklog: TeamWorklog[]): number {
    let totalAvailableDays = 0;

    const uniqueMembers = getUniqueMembers(teamsWorklog);

    uniqueMembers.forEach(member => {
      totalAvailableDays += member.totalAvailableDays;
    });

    return restrictToDecimalPlace(totalAvailableDays);
  }

  calculateTotalLoggedTime(worklog: TeamWorklog[]) {
    let mainCategories = {};
    let otherCategories = {};

    const uniqueMembers = getUniqueMembers(worklog);
    uniqueMembers.forEach((member) => {
      getTotalWorklogOfGivenCategory(member.workLogDistribution.values, mainCategories);
      getTotalWorklogOfGivenCategory(member.workLogDistribution.others, otherCategories)
    });

    const totalWorkloggedInDays = calculateTotalForJsonObject(mainCategories) + calculateTotalForJsonObject(otherCategories);
    return restrictToDecimalPlace(totalWorkloggedInDays);
  }



  prepareChart() {
    this.chartOption = {
      series: [
        {
          type: 'gauge',
          startAngle: 90,
          endAngle: -269.99,
          pointer: {
            show: false
          },
          center: ['50%', '50%'],
          axisLine: {
            lineStyle: {
              width: 15,
              color: [
                [this.summaryData.loggedPercentage / 100, this.summaryData.color],
                [1, '#e0e0e0']
              ]
            }
          },
          splitLine: {
            show: false
          },
          axisTick: {
            show: false
          },
          axisLabel: {
            show: false
          },
          detail: {
            color: this.summaryData.color,
            formatter: '{value}%',
            fontSize: 24,
            offsetCenter: [0, '0%']
          },
          data: [{ value: this.summaryData.loggedPercentage }],
          radius: '80%'
        }
      ]
    };
  }
}
