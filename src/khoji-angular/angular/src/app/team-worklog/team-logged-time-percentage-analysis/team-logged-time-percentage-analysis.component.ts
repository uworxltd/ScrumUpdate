/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Component, OnInit, TemplateRef } from '@angular/core';
import { Store } from '@ngrx/store';
import { Constants } from 'app/constants';
import { TeamWorklog, TeamWorklogStatistics } from 'app/interface/team-worklog-stats';
import { ChartComponent } from 'app/shared/chart/chart.component';
import { PrimeNgTableScroller } from 'app/shared/datatable/primeng-table/datatable-scroller';
import { AppState, LoadingState } from 'app/states/app-states';
import { selectTeamWorklogStats } from 'app/states/global-statistics.selector';
import { selectTranslation } from 'app/states/global-translations.selector';
import { Subscription, combineLatest } from 'rxjs';
import { calculateTotalForJsonObject, getTotalWorklogOfGivenCategory } from 'app/shared/helper-functions';
import { selectServerConfig } from 'app/states/global-configs.selector';
import { WORKLOG_OTHER_PERCENTAGE_THRESHOLD } from 'app/constants.configs';
import { ComponentNavigation, TrackingService } from 'app/services/tracking';
import { FeatureFlagService } from 'app/services/feature.flag.service';

@Component({
  selector: 'khoji-team-logged-time-percentage-analysis',
  templateUrl: './team-logged-time-percentage-analysis.component.html',
  styleUrls: ['./team-logged-time-percentage-analysis.component.scss']
})
export class TeamLoggedTimePercentageAnalysisComponent extends ChartComponent implements OnInit {
  subscription = new Subscription();
  translation: any;
  constants: typeof Constants;
  teamWorklogStatisticsLoadingState: LoadingState;
  teamWorklogData: TeamWorklogStatistics;
  ragData: {
    teamName: any;
    percentage: number;
    thresholdColor: string;
    membersDistribution: any;
  }[];
  previousSelectedTeamRow: any;
  selectedTeamName: string;

  ragOtherThresholdValue:any;
  tableId = Constants.MEMBER_WORKLOG_PERCENTAGE_ANALYSIS_TABLE_ID;

  constructor(store: Store<AppState>, private flag: FeatureFlagService, private trackingService: TrackingService) {
    super(store);
    this.constants = Constants;
  }

  ngOnInit() {
    // select translation
    this.subscription.add(this.store.pipe(selectTranslation)
      .subscribe(translation => {
        this.translation = translation;
      }));

    const process$ = this.store.select('loadingStates');
    const stats$ = this.store.pipe(selectTeamWorklogStats);
    const serverConfig$ = this.store.pipe(selectServerConfig);

    this.subscription.add(combineLatest([stats$, process$, serverConfig$]).subscribe(data => {
      const [statsData, processData] = data;
      statsData['teamWorklogs'].sort((a, b) => b.percentage - a.percentage);
      this.teamWorklogData = statsData;
      this.ragOtherThresholdValue = data[2][WORKLOG_OTHER_PERCENTAGE_THRESHOLD];
      this.ragData = this.getRagsDistribution();
      this.teamWorklogStatisticsLoadingState = processData.teamWorklogLoadingState;

      if (this.teamWorklogStatisticsLoadingState == LoadingState.Loading) {
        this.loading();
      }
      else if (this.teamWorklogStatisticsLoadingState == LoadingState.Error) {
        this.loadingError();
      }
      else if (this.teamWorklogStatisticsLoadingState == LoadingState.Done) {
        this.loadingDone(this.teamWorklogData.teamWorklogs.length > 0)
      }
    }))
  }

  getRagsDistribution() {
    let rags = [];
    this.teamWorklogData.teamWorklogs.forEach(tw => {
      let object: any = {};
      let worklog = this.calculateWorklog(tw);
      const mainCategoryWorklog = !isNaN(worklog.mainCategory)? worklog.mainCategory : 0;
      const otherCategoryWorklog = !isNaN(worklog?.otherCategory)? worklog.otherCategory : 0
      object.teamName = tw.teamName
      object.thresholdColor = this.setTeamRagStatusColor(tw),
      object.percentage = tw.percentage,
      object.otherThresholdColor = this.calculateWorklogThresholdColor(otherCategoryWorklog, mainCategoryWorklog);
      object.membersDistribution = this.getMembersDistribution(tw.memberWorklogs);
      rags.push(object);
    });

    return rags;
  }

  setTeamRagStatusColor(teamWorklog: any) {
    if (teamWorklog.avgPercents["Worklog"] > this.teamWorklogData.thresholdPercentage["Normal"]) {
      teamWorklog.thresholdColor = this.teamWorklogData.thresholdColors["Normal"];
    }
    else if (teamWorklog.avgPercents["Worklog"] > this.teamWorklogData.thresholdPercentage["Medium"]) {
      teamWorklog.thresholdColor = this.teamWorklogData.thresholdColors["Medium"];
    }
    else {
      teamWorklog.thresholdColor = this.teamWorklogData.thresholdColors["Low"];
    }
    return teamWorklog.thresholdColor;
  }

  navigateToTable(teamName: any) {
    const scroller = new PrimeNgTableScroller();
    scroller.navigateToTab(this.constants.TEAM_WORKLOG_DETAIL_TAB_ID);

    setTimeout(function () {
      const paginatorDropdown = <HTMLElement>document.querySelector('.p-paginator .p-dropdown .p-dropdown-label');
      paginatorDropdown.click();
    }, 1000)

    setTimeout(function () {
      const paginatorOptions = <HTMLElement>document.querySelector('.p-paginator .p-dropdown .p-dropdown-panel .p-dropdown-item span');
      paginatorOptions.click();
    }, 1000)
    this.highlightSelectedRow(teamName);
  }

  highlightSelectedRow(teamName: any) {
    const self = this;

    setTimeout(function () {
      const selectedTeamRow = <HTMLElement>document.querySelector("[id='" + teamName.replace(' ', '_') + "-row']");
      const selectedTeamRowStickyChild = <HTMLElement>selectedTeamRow.firstElementChild;
      self.expandWorklogRow(teamName);
      selectedTeamRow.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      if (this.previousSelectedTeamRow) {
        const previousTeamRowStickyChild = <HTMLElement>this.previousSelectedTeamRow.firstElementChild;
        previousTeamRowStickyChild.removeAttribute("style");
        this.previousSelectedTeamRow.removeAttribute("style");

      }

      selectedTeamRowStickyChild.style.setProperty("background-color", "lightblue", "important");
      selectedTeamRow.style.setProperty("background-color", "lightblue", "important");
      this.previousSelectedTeamRow = selectedTeamRow;
    }, 1000);

  }

  expandWorklogRow(teamName: any) {
    const rowExpandCollapseButton = <HTMLElement>document.querySelector("[id='" + teamName.replace(' ', '_') + "-row'] td:first-child button span:first-child");
    if (!rowExpandCollapseButton.className.includes("pi-chevron-up")) {
      rowExpandCollapseButton.click();
    }
  }

  modalRef;
  showTeamDetails(teamName: string, teamDetailsTpl: TemplateRef<any>) {
    this.trackingService.captureNavigationStep(ComponentNavigation.TeamWorkLogAnalysis, { Component: ComponentNavigation.TeamWorkLogAnalysis.TeamWorklogComparisonTableComponent });
    this.selectedTeamName = teamName;
    //this.modalRef = this.modalService.show(teamDetailsTpl, { class: 'modal-auto' });
  }

  private getMembersDistribution(members) {
    let membersDistribution = {};
    members.forEach((element: { thresholdColor: string; }) => {
      membersDistribution
      for (let key in this.teamWorklogData.thresholdColors) {
        if (this.teamWorklogData.thresholdColors[key] == element.thresholdColor) {
          if (membersDistribution[key] !== undefined) {
            membersDistribution[key][0] = this.teamWorklogData.thresholdColors[key];
            membersDistribution[key][1] = membersDistribution[key][1] + 1;
          } else {
            membersDistribution[key] = [];
            membersDistribution[key].push(this.teamWorklogData.thresholdColors[key]);
            membersDistribution[key].push(1);
          }
        }
      }
    });
    return membersDistribution;
  }

  /***
 * Method to calculate mostly time spent issue category and categories percentages
 */
  calculateWorklog(worklogData: TeamWorklog) {
    let mainCategories = new Object();
    let otherCategories = new Object();
    worklogData.memberWorklogs.forEach((member) => {
      getTotalWorklogOfGivenCategory(member.workLogDistribution.values, mainCategories);
      getTotalWorklogOfGivenCategory(member.workLogDistribution.others, otherCategories);
    });

    const totalPercentage = calculateTotalForJsonObject(mainCategories) + calculateTotalForJsonObject(otherCategories);

    return {
      [Constants.MAIN_CATEGORY]: this.restrictToDecimalPlace((calculateTotalForJsonObject(mainCategories) / totalPercentage) * 100),
      [Constants.OTHER_CATEGORY]: this.restrictToDecimalPlace((calculateTotalForJsonObject(otherCategories) / totalPercentage) * 100)
    }
  }

  restrictToDecimalPlace(value: number) {
    return Number(value.toFixed(2));
  }

  calculateOtherThresholdValue(thresholdValue: number) {
    let backgroundColor = '';

    if ((thresholdValue < this.ragOtherThresholdValue?.Medium) &&
      (thresholdValue > this.ragOtherThresholdValue?.Normal)) {
      backgroundColor = Constants.AMBER_COLOR_CODE;
    }
    else if (thresholdValue > this.ragOtherThresholdValue?.Medium) {
      backgroundColor = Constants.RED_COLOR_CODE;
    }
    
    return backgroundColor;
  }

  calculateWorklogThresholdColor(otherThresholdValue: number, mainThresholdValue: number) {
    const backgroundColor = this.calculateOtherThresholdValue(otherThresholdValue);

    const mainCategoryThresholdValue = {
      value: mainThresholdValue,
      color: Constants.BLACK_COLOR_CODE,
      backgroundColor: ''
    };

    const otherCategoryThresholdValue = {
      value: otherThresholdValue,
      color: backgroundColor ? Constants.WHITE_COLOR_CODE : Constants.BLACK_COLOR_CODE,
      backgroundColor: backgroundColor
    };

    return [mainCategoryThresholdValue, otherCategoryThresholdValue]
  }
  

}
