/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { animate, style, transition, trigger } from '@angular/animations';
import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Member } from 'app/admin/admin.entities';
import { Constants } from 'app/constants';
import { WORKLOG_OTHER_PERCENTAGE_THRESHOLD, WORKLOG_PERCENTAGE_THRESHOLD } from 'app/constants.configs';
import { MemberWorklog, TeamWorklog, TeamWorklogStatistics } from 'app/interface/team-worklog-stats';
import { ConfigService } from 'app/services/config.service';
import { PrimeNgTableScroller } from 'app/shared/datatable/primeng-table/datatable-scroller';
import { calculateTotalForJsonObject, checkIfUserIsAdmin, checkMultipleTeamMember, getTotalWorklogOfGivenCategory, getUniqueMembers, parseParametrizedString, toReferrer } from 'app/shared/helper-functions';
import { AppState, LoadingState } from 'app/states/app-states';
import { fetchTeamWorklogStatsForThisMonth } from 'app/states/app.actions';
import { selectServerConfig, selectWorkLogGeneralSettings } from 'app/states/global-configs.selector';
import { selectDateTo, selectUnqiueTeamMembers } from 'app/states/global-filters.selector';
import { selectTeamWorkLogForThisMonthLoadingState } from 'app/states/global-process.selector';
import { selectTeamWorklogStats, selectTeamWorklogStatsForThisMonth } from 'app/states/global-statistics.selector';
import { selectTranslation } from 'app/states/global-translations.selector';
import { environment } from "environments/environment";
import { Subscription, combineLatest } from 'rxjs';

/**
 * temproary worklog summary interface
 */
interface WorklogSummary {
  categoryName: string;
  worklogInDays: number;
  worklogInPercentage: number;
  worklogRagStatus: string;
  currentMonthWorklogInDays: number;
  currentMonthWorklogInPercentage: number;
  currentMonthWorklogRagStatus: string;
}
@Component({
  selector: 'khoji-team-work-log-cards',
  templateUrl: './team-work-log-cards.component.html',
  styleUrls: ['./team-work-log-cards.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('0.5s ease-in', style({ opacity: 1 }))
      ]),
    ])
  ]
})
export class TeamWorkLogCardsComponent implements OnInit {

  environment = environment;
  subscription = new Subscription();
  translation: any;
  @Input() currentMonthInSelectedRange: boolean = true;
  loadingStateForThisMonthStats: LoadingState;
  dateTo = '';
  dateFrom = '';
  membersWorklogRag = [];
  constants: typeof Constants;
  commulativeWorklog: WorklogSummary;
  otherCategoriesData: WorklogSummary;
  mainCategoriesData: WorklogSummary;
  tableData: WorklogSummary[] = [];
  commulativeWorklogHeading = '';
  revokedMembersName = [];
  worklogStats: TeamWorklogStatistics;
  anyMultiTeamMember: boolean = false;
  isUserAdmin: boolean = false;
  ragStatusColors:any;
  mainCategoryTitle: string = '';
  othersCategoryTitle: string = '';
  othersCategoryWorklogEmailSubscriptionThreshold: number;
  othersCategoryAlias: string = '';
  isWorklogCategoryEnabled = false;

  constructor(
    private store: Store<AppState>,
    private router: Router,
    private configService: ConfigService
  ) {
    this.constants = Constants;
  }

  ngOnInit(): void {
    const thisMonthWorklogLoadingState$ = this.store.pipe(selectTeamWorkLogForThisMonthLoadingState);
    const stats$ = this.store.pipe(selectTeamWorklogStats);
    const statsForThisMonth$ = this.store.pipe(selectTeamWorklogStatsForThisMonth);
    const serverConfigs$ = this.store.pipe(selectServerConfig);
    const translations$ = this.store.pipe(selectTranslation);
    const uniqueMembers$ = this.store.pipe(selectUnqiueTeamMembers);
    const userProfile$ = this.store.select('userProfile');
    const generalSettings$ = this.store.pipe(selectWorkLogGeneralSettings);

    const worklogGeneralSettings$ = this.store.pipe(selectWorkLogGeneralSettings);

    const configSub = this.configService.isComponentEnabled$(Constants.TEAM_WORKLOG_CATEGORIZATION).subscribe((enabled) => {
      this.isWorklogCategoryEnabled = enabled;
    });

    this.subscription.add(configSub);

    this.subscription.add(
      worklogGeneralSettings$.subscribe(cfg => {
       this.othersCategoryWorklogEmailSubscriptionThreshold = cfg.othersWorklogEmailSubscriptionThreshold
       this.othersCategoryAlias = cfg.nonProductiveAlias;
      })
    )

    this.subscription.add(combineLatest([stats$, serverConfigs$, statsForThisMonth$, translations$, uniqueMembers$, userProfile$, thisMonthWorklogLoadingState$, generalSettings$]).subscribe((data) => {
      if(data[1][WORKLOG_OTHER_PERCENTAGE_THRESHOLD] && data[1][WORKLOG_PERCENTAGE_THRESHOLD] && data[6] === LoadingState.Done) {
        this.loadingStateForThisMonthStats = data[6];
      }
      else {
        this.loadingStateForThisMonthStats = data[6] === LoadingState.Done ? LoadingState.Loading : data[6];
      }

      this.worklogStats = JSON.parse(JSON.stringify(data[0]));
      this.anyMultiTeamMember = checkMultipleTeamMember(this.worklogStats.teamWorklogs);
      this.translation = data[3];
      this.commulativeWorklogHeading = this.translation?.timelog?.cardLabels?.cumulativeWorklog;
      this.initlizeObjects(data[7]);
      this.ragStatusColors = data[0].thresholdColors;
      this.calculateWorklogDetails(data[0].teamWorklogs, data[1][WORKLOG_OTHER_PERCENTAGE_THRESHOLD], false, data[1][WORKLOG_PERCENTAGE_THRESHOLD]);
      this.calculateWorklogDetails(data[2].teamWorklogs, data[1][WORKLOG_OTHER_PERCENTAGE_THRESHOLD], true, data[1][WORKLOG_PERCENTAGE_THRESHOLD]);
      this.calculateStartAndEndDate(new Date(data[0].dateTo), new Date(data[0].dateFrom));
      this.getRevokedMembers(data[4]);
      this.populateTableData();
      this.isUserAdmin = checkIfUserIsAdmin(data[5].accessibleAccessLevels);
    }));
  }

  /***
   * Method to calculate details against worklog data
   */
  calculateWorklogDetails(worklog: TeamWorklog[], othersCategoryThreshold: any, percentageOnly: boolean = false, worklogSliderConfig?:any) {
    let mainCategories = {};
    let otherCategories = {};

    const uniqueMembers = getUniqueMembers(worklog);
    uniqueMembers.forEach((member) => {
        getTotalWorklogOfGivenCategory(member.workLogDistribution.values, mainCategories);
        getTotalWorklogOfGivenCategory(member.workLogDistribution.others, otherCategories)
      });


    const totalWorkloggedInDays = calculateTotalForJsonObject(mainCategories) + calculateTotalForJsonObject(otherCategories);
    if (percentageOnly) {
      //calculation for commulative worklog for this month
      this.commulativeWorklog.currentMonthWorklogInDays = this.restrictToDecimalPlace(totalWorkloggedInDays);
      this.commulativeWorklog.currentMonthWorklogInPercentage = this.calculateTotalWorkloggedInPercentage(worklog);
      this.commulativeWorklog.currentMonthWorklogRagStatus = this.calculateCumulativeWorklogRagColor(worklogSliderConfig, this.commulativeWorklog.currentMonthWorklogInPercentage);

      //calculation for current month main categories
      this.mainCategoriesData.currentMonthWorklogInDays = this.restrictToDecimalPlace(calculateTotalForJsonObject(mainCategories));
      this.mainCategoriesData.currentMonthWorklogInPercentage = this.calculatePercentage(mainCategories, totalWorkloggedInDays);

      //calculation for current month other categories
      this.otherCategoriesData.currentMonthWorklogInDays = this.restrictToDecimalPlace(calculateTotalForJsonObject(otherCategories));
      this.otherCategoriesData.currentMonthWorklogInPercentage = this.calculatePercentage(otherCategories, totalWorkloggedInDays);
      this.otherCategoriesData.currentMonthWorklogRagStatus = this.getOthersRagColor(this.otherCategoriesData.currentMonthWorklogInPercentage, othersCategoryThreshold);
    } else {
      //calculation for commulative worklog for selected range
      this.commulativeWorklog.worklogInDays = this.restrictToDecimalPlace(totalWorkloggedInDays);
      this.commulativeWorklog.worklogInPercentage = this.calculateTotalWorkloggedInPercentage(worklog);
      this.commulativeWorklog.worklogRagStatus = this.calculateCumulativeWorklogRagColor(worklogSliderConfig, this.commulativeWorklog.worklogInPercentage);

      //calculation for selected range main categories
      this.mainCategoriesData.worklogInDays = this.restrictToDecimalPlace(calculateTotalForJsonObject(mainCategories));
      this.mainCategoriesData.worklogInPercentage = this.calculatePercentage(mainCategories, totalWorkloggedInDays);

      //calculation for selected range other categories
      this.otherCategoriesData.worklogInDays = this.restrictToDecimalPlace(calculateTotalForJsonObject(otherCategories));
      this.otherCategoriesData.worklogInPercentage = this.calculatePercentage(otherCategories, totalWorkloggedInDays);
      this.otherCategoriesData.worklogRagStatus = this.getOthersRagColor(this.otherCategoriesData.worklogInPercentage, othersCategoryThreshold);

      //getting members RAG values
      this.getMembersWithWorklogRagStatus(worklog, worklogSliderConfig);
    }
  }

  /**
   * Method to restrict values upto 2 decimal places
   * @param value
   * @returns
   */
  restrictToDecimalPlace(value: number) {
    if (Number.isNaN(value)) {
      return 0;
    }
    return Number(value.toFixed(2));
  }

  /**
   * Method to calculate average of total worklogged in percentage
   * @param teamsWorklog
   * @returns average of worklogged in percentage
   */
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
    return parseFloat(averagePercentage.toFixed(2));
  }

  /**
   * Method to get severity color for others category based on percentage value
   * @param othersCategoryPercentage
   * @param thresholdValue
   * @returns
   */
  getOthersRagColor(othersCategoryPercentage: number, thresholdValue: any) {
    let severity = Constants.SEVERITY_SUCCESS;
    if (othersCategoryPercentage > thresholdValue?.Normal && othersCategoryPercentage <= thresholdValue?.Medium) {
      severity = Constants.SEVERITY_WARNING;
    }
    else if (othersCategoryPercentage > thresholdValue?.Medium) {
      severity = Constants.SEVERITY_DANGER;
    }

    return severity;
  }

    /***
   * Method to get RAG color for commulative worklog
   */
    calculateCumulativeWorklogRagColor(sliderConfig: any, commulativeWorklog:number) {
      if (commulativeWorklog <= sliderConfig?.Medium) {
        return Constants.SEVERITY_DANGER;
      }
      else if (commulativeWorklog > sliderConfig?.Medium && commulativeWorklog <= sliderConfig?.Normal) {
        return Constants.SEVERITY_WARNING
      }
      return Constants.SEVERITY_SUCCESS;
    }

      /**
   * method to get number of members against each worklog rag status
   * and add respective message depending on count and rag color code
   * @param teamsWorklog
   */
  getMembersWithWorklogRagStatus(teamsWorklog: TeamWorklog[], worklogSliderConfig: any) {
    let membersList = this.getCommonMembers(teamsWorklog);
    this.membersWorklogRag = [];
    const membersWorklogRags = membersList.reduce((counts, memberWorklog) => {
      const thresholdColor = memberWorklog.thresholdColor;

      if (!counts[thresholdColor]) {
        //adding thresholdValue for sorting purpose
        //Sorting will green, amber and red
        counts[thresholdColor] = { count: 1, thresholdValue: this.getThresholdValue(thresholdColor), colorCode: thresholdColor };
      } else {
        counts[thresholdColor].count++;
      }

      return counts;
    }, {});

    for (const worklogRag in membersWorklogRags) {
      this.membersWorklogRag.push({
        ...membersWorklogRags[worklogRag],
        message: this.getWorklogRagMessage(worklogRag, worklogSliderConfig, membersWorklogRags[worklogRag]["count"])
      });
    }

    this.membersWorklogRag = this.membersWorklogRag.sort((a, b) => {
      if (a.thresholdValue < b.thresholdValue) {
        return -1;
      }
    });
  }

  /**
   * Method to get common members to avoid showing muliple rag colors for one member
   * @param teamWorklog
   * @returns
   */
  getCommonMembers(teamWorklog: TeamWorklog[]) {
    let membersList: MemberWorklog[] = [];
    teamWorklog.forEach(teamData => {
      membersList = membersList.concat(teamData.memberWorklogs);
    });

    let newMembersList: MemberWorklog[] = [];
    const membersAccountIdsAndEmailSet = new Set<string>();

    membersList.forEach(memberData => {
      if (membersAccountIdsAndEmailSet.has(this.concatenateMemberAccountIdAndEmail(memberData.email, memberData.accountId))) {
        newMembersList = this.replaceMemberInList(newMembersList, memberData);
      }
      else {
        newMembersList.push(memberData);
        membersAccountIdsAndEmailSet.add(this.concatenateMemberAccountIdAndEmail(memberData.email, memberData.accountId));
      }
    });

    return newMembersList;
  }

  /***
   * Method to get RAG worklog Message
   */
  getWorklogRagMessage(colorKey: any, worklogSliderConfig: any, count:number) {
    if (colorKey == this.ragStatusColors.Low) {
      return parseParametrizedString(count == 1 ? this.translation?.timelog?.cardLabels?.membersWorklogRagSubHeading?.red :
        this.translation?.timelog?.cardLabels?.membersWorklogRagSubHeading?.redForMultipleMembers, worklogSliderConfig?.Medium)
    }
    else if (colorKey == this.ragStatusColors.Medium) {
      return parseParametrizedString( count == 1 ? this.translation?.timelog?.cardLabels?.membersWorklogRagSubHeading?.amber :
        this.translation?.timelog?.cardLabels?.membersWorklogRagSubHeading?.amberForMultipleMembers,  (Number(worklogSliderConfig?.Medium)+.01).toFixed(2) , worklogSliderConfig?.Normal);
    }
    return parseParametrizedString(count == 1 ? this.translation?.timelog?.cardLabels?.membersWorklogRagSubHeading?.green :
      this.translation?.timelog?.cardLabels?.membersWorklogRagSubHeading?.greenForMultipleMembers, worklogSliderConfig?.Normal);
  }

  replaceMemberInList(membersList: MemberWorklog[], memberDetail: MemberWorklog) {
    const memberIndex = membersList.findIndex(data => data.accountId == memberDetail.accountId);
    if (memberIndex >= 0) {

      if (memberDetail.thresholdColor !== Constants.RED_COLOR_CODE) {
        membersList[memberIndex] = memberDetail;
      }
    }
    return membersList
  }

  concatenateMemberAccountIdAndEmail(memberEmail: string, memberAccountId: string) {
    let email = memberEmail ? memberEmail : "*";
    let accountId = memberAccountId ? memberAccountId : "*";
    return email.concat("-").concat(accountId);
  }

  /***
   * Method to get date to and date from
   */
  calculateStartAndEndDate(dateTo: Date, dateFrom: Date) {
    this.dateTo = `${dateTo.toLocaleString('default', { month: 'long' }).substring(0,3).toUpperCase()} ${dateTo.getDate().toString()}`;
    this.dateFrom = `${dateFrom.toLocaleString('default', { month: 'long' }).substring(0,3).toUpperCase()} ${dateFrom.getDate().toString()}`;
  }

  /***
   * Method to request working of this month again
   */
  refreshWorklogForThisMonth() {
    const dateTo$ = this.store.pipe(selectDateTo).subscribe(dateTo => {
      const currentDate = new Date();
      const currentDay = currentDate.getDate();
      const currentfullYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const selectedMonth = Number(dateTo.split('-')[1]);
      if (currentMonth === selectedMonth) {
        this.store.dispatch(fetchTeamWorklogStatsForThisMonth({
          dateFrom: `${currentfullYear}-${currentMonth >= 10 ? currentMonth : '0' + currentMonth}-01`,
          dateTo: `${currentfullYear}-${currentMonth >= 10 ? currentMonth : '0' + currentMonth}-${currentDay >= 10 ? currentDay : '0' + currentDay}`
        }));
      }
    });
    dateTo$.unsubscribe();
  }

  /***
   * method to calculate percentge and restrict it to 2 decimal places
   */
  calculatePercentage(category: any, totalWorklogInDays: number) {
    const worklogPercentage =(calculateTotalForJsonObject(category) / totalWorklogInDays) * 100;
    return this.restrictToDecimalPlace(worklogPercentage);
  }

  /***
   * Method to initilize objects
   */
  initlizeObjects(settings) {
    this.mainCategoriesData = this.initializeWorklogSummary();
    this.otherCategoriesData = this.initializeWorklogSummary();
    this.commulativeWorklog = this.initializeWorklogSummary();
    this.mainCategoriesData.categoryName = settings.productiveAlias;
    this.otherCategoriesData.categoryName = settings.nonProductiveAlias;
    this.commulativeWorklog.categoryName = this.translation?.timelog?.cardLabels?.cumulativeWorklog;
    this.tableData = [];
  }

  /***
   * Method to initilize worklog summary object
   */
  initializeWorklogSummary(): WorklogSummary {
    return {
      categoryName: "",
      worklogInDays: 0,
      worklogInPercentage: 0,
      worklogRagStatus: "",
      currentMonthWorklogInDays: 0,
      currentMonthWorklogInPercentage: 0,
      currentMonthWorklogRagStatus: ""
    }
  }
  /***
   * Method to get list of revoked members name
   */
  getRevokedMembers(members: Member[]) {
    this.revokedMembersName = [];
    this.revokedMembersName = members.filter(teamMembers => teamMembers.status == Constants.MEMBER_REVOKED_STATUS).map(membersData => membersData.fullName);
  }

  /***
   * Method to navigate to worklog details tab
   */
  navigateToWorklogDetailsTab() {
    const scroller = new PrimeNgTableScroller();
    scroller.navigateToTab(Constants.TEAM_WORKLOG_DETAIL_TAB_ID);
  }

  /***
   * Method to populate table data
   */
  populateTableData() {
    this.tableData.push(this.commulativeWorklog);

    if (this.isWorklogCategoryEnabled) {
      this.tableData.push(this.mainCategoriesData);
      this.tableData.push(this.otherCategoriesData);
    }
  }

  /***
   * Using this temproary value for sorting green, amber, red
   */
  getThresholdValue(colorCode: string) {
    if (colorCode == this.ragStatusColors.Low) {
      return 2;
    }
    else if (colorCode == this.ragStatusColors.Medium) {
      return 1;
    }
    return 0;
  }

  navigateToManageTeams() {
    const queryParams = {
      referrer: toReferrer(this.router.url),
    }
    this.router.navigate([environment.MANAGE_TEAMS], { queryParams });
  }

}
