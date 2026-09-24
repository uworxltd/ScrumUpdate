/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Component, HostListener, Input, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Member } from 'app/admin/admin.entities';
import { ComponentsIds } from 'app/components-constants';
import { Constants } from 'app/constants';
import { WORKLOG_DISTRIBUTION } from 'app/constants.configs';
import { TeamWorklogStatistics } from 'app/interface/team-worklog-stats';
import { ConfigService } from 'app/services/config.service';
import { TrackingService } from 'app/services/tracking';
import { AppStatus } from 'app/services/tracking/app-status';
import { ChartComponent } from 'app/shared/chart/chart.component';
import { checkIfUserHasAdminOrHigherLevelAccess, getUniqueMembers, parseParametrizedString } from 'app/shared/helper-functions';
import { AppState, LoadingState } from 'app/states/app-states';
import { othersChartDataAvailable } from 'app/states/app.actions';
import { selectServerConfig, selectWorkLogGeneralSettings } from 'app/states/global-configs.selector';
import { selectTeamWorklogLoadingState } from 'app/states/global-process.selector';
import { selectTeamWorklogStats } from 'app/states/global-statistics.selector';
import WorklogDistributionConfig from 'app/types/worklog-distribution.config';
import { selectAccessibleAccessLevels } from 'app/user-profile/state/user-profile.selectors';
import { EChartsOption } from 'echarts';
import { combineLatest, Subject } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';

@Component({
  selector: 'khoji-team-worklog-distribution-analysis',
  templateUrl: './team-worklog-distribution-analysis.component.html',
  styleUrls: ['./team-worklog-distribution-analysis.component.scss']
})
export class TeamWorklogDistributionAnalysisComponent extends ChartComponent implements OnInit {
  chartId = 'team-worklog-distribution-analysis';
  minChartWidth = 380;
  componentId = ComponentsIds.TIMELOG_ANALYSIS_GRAPH;
  pieChartColors = {};
  constants: typeof Constants;
  teamWorklogData: TeamWorklogStatistics;
  othersTotalDays: number;
  mainTotalDays: number;
  updateOption: EChartsOption = {};
  worklogDistribution: { [key: string]: WorklogDistributionConfig; };

  @Input() category: string;
  isMainChartDataAvailable: boolean;
  isOthersChartDataAvailable: boolean;
  @Input() unassignedWorklogLegendsCount: number = 5;
  private trackedNoData = false;

  trackSubject = new Subject();
  selectedWorklogTeams: string[];
  selectedMembers: Member[];
  selectedDate: string;

  tooltipText: string = '';
  isAdmin: boolean = false;
  isWorklogCategoryEnabled = false;

  constructor(store: Store<AppState>, private trackingService: TrackingService, private configService: ConfigService) {
    super(store);
    this.constants = Constants;
  }

  ngOnInit() {
    const process$ = this.store.select('loadingStates').pipe(filter(gp => gp.teamWorklogLoadingState !== LoadingState.Pending));
    const stats$ = this.store.pipe(selectTeamWorklogStats)
    const worklogDistribution$ = this.store.pipe(selectServerConfig);

    this.trackSubject.pipe(debounceTime(5000)).subscribe(() => {
      this.trackedNoData = false
    });

    const configSub = this.configService.isComponentEnabled$(Constants.TEAM_WORKLOG_CATEGORIZATION).subscribe((enabled) => {
      this.isWorklogCategoryEnabled = enabled;
    });

    this.subscription.add(configSub);

    const filters$ = this.store.select('globalFilters');
    this.subscription.add(filters$.subscribe((data) => {
      this.selectedWorklogTeams = data?.worklogTeams;
      this.selectedMembers = data?.members;
      this.selectedDate = `${data?.dateFrom}-${data?.dateTo}`;
    })
    );

    const teamWorklogLoadingState$ = this.store.pipe(selectTeamWorklogLoadingState);
    const generalSettings$ = this.store.pipe(selectWorkLogGeneralSettings);
    const accessLevels$ = this.store.pipe(selectAccessibleAccessLevels);

    this.subscription.add(
      accessLevels$.subscribe(us => {
        this.isAdmin = checkIfUserHasAdminOrHigherLevelAccess(us);
      })
    )

    this.subscription.add(combineLatest([teamWorklogLoadingState$, stats$, generalSettings$]).subscribe(([loadingState, stats, settings]) => {
      if (loadingState == LoadingState.Done) {
        this.trackSubject.next();
        const worklogChartData = this.prepareData(stats, settings);
        this.isMainChartDataAvailable = worklogChartData.innerData.length > 0;
        this.isOthersChartDataAvailable = worklogChartData.outerData.length > 0;
        this.category === 'Other' ? this.loadingDone(this.isOthersChartDataAvailable) : this.loadingDone(this.isMainChartDataAvailable);
        const dataAvailable = (this.category == 'Other' && this.isOthersChartDataAvailable) || (this.category == 'Main' && this.isMainChartDataAvailable);
        if (!dataAvailable && this.category == 'Main') {
          this.trackNoDataAvailablity();
        }
      }
    })
    )

    this.subscription.add(combineLatest([process$, stats$, worklogDistribution$, this.init(), generalSettings$])
      .subscribe(data => {
        this.tooltipText = `1 day = ${data[4].worklogDayHour} hours`
        const teamWorklogData = this.teamWorklogData = data[1];
        const loadingState = data[0];
        this.worklogDistribution = data[2][WORKLOG_DISTRIBUTION];
        Object.keys(this.worklogDistribution).map((key) => {
          this.pieChartColors[key] = this.worklogDistribution[key].color;
        })
        this.pieChartColors[data[4].nonProductiveAlias] = Constants.OTHERS;
        if (loadingState.teamWorklogLoadingState == LoadingState.Done) {
          const worklogChartData = this.prepareData(teamWorklogData, data[4]);
          this.isMainChartDataAvailable = worklogChartData.innerData.length > 0;
          this.isOthersChartDataAvailable = worklogChartData.outerData.length > 0;
          this.store.dispatch(othersChartDataAvailable({ value: this.isOthersChartDataAvailable }));
          this.mainTotalDays = worklogChartData.mainTotalDays;
          this.othersTotalDays = worklogChartData.othersTotalDays;
          this.drawChart(worklogChartData, data[4]);
          this.category === 'Other' ? this.loadingDone(this.isOthersChartDataAvailable) : this.loadingDone(this.isMainChartDataAvailable);

        }

        else if (loadingState.teamWorklogLoadingState === LoadingState.Loading) {
          this.loading();
        }

        else if (loadingState.teamWorklogLoadingState === LoadingState.Error) {
          this.loadingError();
        }
      }));
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    const legendsMinLength = 10;
    const chartWidth = document.querySelector<HTMLDivElement>(`#${this.chartId}`)?.getBoundingClientRect()?.width;
    const legendsLength = legendsMinLength + (chartWidth - this.minChartWidth) / legendsMinLength;
    this.updateOption = {
      ...this.updateOption,
      legend: {
        ...this.chartOption.legend,
        formatter: function (name) {
          return name.length > legendsLength ? name.substring(0, legendsLength) + '...' : name;
        },
      }
    };
  }
  

  trackNoDataAvailablity() {
    if (this.trackedNoData) return;
    this.trackedNoData = true;
    const SELECTED_DATES = this.selectedDate;
    this.trackingService.captureApplicationStatus(AppStatus.Team_Worklog_Analysis.No_Data, { SELECTED_DATES });
  }

  prepareData(worklogChartData: TeamWorklogStatistics, settings) {
    let pieData: any = new Object();
    if (worklogChartData != null) {
      let totalMainDays: number = 0;
      let legendData = new Object();
      let otherColumns: Array<string> = [];
      let mainColumns: Array<string> = [];
      let mainData: any = new Object();
      let otherData: any = new Object();
      const uniqueMembers = getUniqueMembers(worklogChartData.teamWorklogs);

      uniqueMembers.forEach((member) => {
        this.getWorklogData(member.workLogDistribution.values, mainData);
        this.getWorklogData(member.workLogDistribution.others, otherData)
      });
      let othersTotal: number = this.getTotlalWorkLogValues(otherData);
      totalMainDays = this.getTotlalWorkLogValues(mainData);
      const otherMapped = this.sortChartData(otherData);
      pieData.outerData = otherMapped;
      this.fillColNamesAndLegendData(otherMapped, otherColumns, legendData);
      pieData.columns = otherColumns;

      let mainMappedObject = this.sortChartData(mainData);
      this.fillColNamesAndLegendData(mainMappedObject, mainColumns, legendData);
      pieData.innerData = this.applyChartColours(mainMappedObject);
      pieData.mainColumns = mainColumns;
      pieData.legendData = legendData;
      pieData.mainTotalDays = totalMainDays.toFixed(2);
      pieData.othersTotalDays = othersTotal.toFixed(2);

    }
    return pieData;
  }

  private getWorklogData(categoryData, ObjectToMap) {
    if (categoryData != undefined && categoryData != null) {
      const mainMapped = Object.keys(categoryData).map(key => ({ key: key, value: categoryData[key] }));
      mainMapped.forEach(element => {
        ObjectToMap[element.key] == undefined ? ObjectToMap[element.key] = element.value.totalDaysSpent : ObjectToMap[element.key] += element.value.totalDaysSpent;
      });
    }
  }
  private getTotlalWorkLogValues(workLog: any) {
    let mainTotal: number = 0;
    if (workLog != null) {
      for (let key in workLog) {
        if (workLog.hasOwnProperty(key)) {
          mainTotal += workLog[key];
        }
      }
    }
    return mainTotal;
  }

  private sortChartData(chartData: any) {
    let dataArray: any;
    if (chartData != null) {
      dataArray = Object.keys(chartData).map(key => (chartData[key] > 0 ? { name: key, value: chartData[key].toFixed(2) } : {})).filter(element => element.name != undefined);
      dataArray.sort((a, b) => (Number(a.value) < Number(b.value)) ? 1 : -1);
    }
    return dataArray;
  }

  private fillColNamesAndLegendData(dataArray: any, columnNames: Array<string>, legendData: any) {
    if (dataArray != null) {
      let counter: number = 0;
      dataArray.forEach((element) => {
        columnNames.push(element.name);
        legendData[element.name] = this.unassignedWorklogLegendsCount !== undefined ? counter < this.unassignedWorklogLegendsCount : true;
        counter++;
      });
    }
  }

  private applyChartColours(mainMappedObject: any) {
    if (mainMappedObject != null && this.pieChartColors != null) {
      for (let key in this.pieChartColors) {
        mainMappedObject.forEach(element => {
          if (key.toLowerCase() === element.name.toLowerCase()) {
            element.itemStyle = { color: this.pieChartColors[key] }
          }
        });
      }
    }
    return mainMappedObject;
  }

  drawChart(pieData, settings) {
    this.chartOption = {
      tooltip: {
        position: 'right',
        trigger: 'item',
        formatter: '{b}: {c}d ({d}%)'
      },
      // @ts-ignore
      legend: {
        type: 'scroll',
        pageIconSize: [10, 30],
        orient: 'vertical',
        right: '2%',
        top: 'center',
        icon: 'circle',
        data: this.category == 'Other' ? pieData.columns : pieData.mainColumns,
        selected: pieData.legendData,
        padding: 5,
        tooltip: { show: true }
      },
      textStyle: { fontFamily: this.constants.ECHARTS_FONT_STYLE },
      grid: { containLabel: true },
      // @ts-ignore
      series: [this.PieChartDistCategories(pieData, settings)],

      animation: super.defaultOptions.animation
    };

    console.log('options', this.chartOption)

    setTimeout(() => this.onResize(new Event('resize')), 50);
  }

  private PieChartDistCategories(pieData, settings) {
    return {
      name: this.category == 'Other' ? parseParametrizedString(this.translation.timelog.charts.others, settings.nonProductiveAlias) : this.translation.timelog.charts.mainCategories,
      type: 'pie',
      width: 'auto',
      left: "-40%",
      radius: ['35%', '45%'],
      animation: true,
      animationDuration: 500,
      itemStyle: {
        borderRadius: 5,
        borderColor: '#fff',
        normal: {
          borderWidth: this.category == 'Other' && pieData.columns.length === 1 ? 0 : pieData.mainColumns.length === 1 ? 0 : 1,
          borderColor: '#fff',
        }
      },
      label: {
        show: true,
        formatter: function (params) {
          return params.percent + '%';
        },
        labelLine: {
          show: true,
        },
      },
      labelLine: {
        length: 4
      },
      markPoint: {
        tooltip: { show: false },
        label: {
          show: true,
          formatter: '{b}',
          color: 'black',
          fontSize: 20,
        },
        data: [{
          name: this.category == 'Other' ? this.othersTotalDays : this.mainTotalDays,
          value: '-',
          symbol: 'circle',
          itemStyle: { color: 'transparent' },
          x: '30%',
          y: '49%',
          label: {
            show: true,
            formatter: '{b}',
            fontSize: 20,
            fontWeight: 'bold',
          },
        }, {
          name: 'days',
          value: '-',
          symbol: 'circle',
          itemStyle: { color: 'transparent', fontSize: '14px' },
          x: '30%',
          y: '55%',
          label: {
            show: true,
            formatter: '{b}',
            fontSize: 14,
          },
        }],
      },
      data: this.category == 'Other' ? pieData.outerData : pieData.innerData
    }
  }

  
  readyGraphForScreenshot() {
    this.updateOption = this.chartOption;
    let legends: any = document.querySelector('[data-rpa="' + this.constants.RPA_TEAM_WORKLOG_DISTRIBUTION_GRAPH_LEGENDS + '"]').textContent;
    this.updateOption = {
      tooltip: {
        show: false
      },
      toolbox: {
        show: false
      },
      legend: {
        selected: JSON.parse(legends),
        show: false,
      },
      series: [{
        radius: [0, 130],
        center: ['50%', '50%']
      }]
    };
  }

  navigateToSettings() {
    if (this.isAdmin) {
      const settingsIcon: HTMLElement = document.querySelector('.settings-icon-wl');
      if (settingsIcon) settingsIcon.click();
    }
    return;
  }
}
