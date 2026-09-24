/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { Store } from '@ngrx/store';
import { fetchKhojiTeamsList, setKhojiTeamsList, setKhojiTeamsLoadingState } from 'app/admin/state/admin.actions';
import { Constants } from 'app/constants';
import { ADMIN_TABLE_CONFIGS, INCLUDE_WEEKENDS_IN_WORKLOG_STATS, OTHERS_WORKLOG_EMAIL_SUBSCRIPTION_THRESHOLD, RAG_COLOR_CODES, WORKLOG_DAY_HOUR_CONFIG, WORKLOG_DISTRIBUTION, WORKLOG_MAIN_CATEGORIES_ALIAS, WORKLOG_OTHER_CATEGORIES_ALIAS, WORKLOG_OTHER_PERCENTAGE_THRESHOLD, WORKLOG_OTHER_RAG_SLIDER_CONFIG, WORKLOG_PERCENTAGE_THRESHOLD, WORKLOG_RAG_SLIDER_CONFIG, WORKLOG_RAG_STATUS_CATEGORY_EMAIL } from 'app/constants.configs';
import { TeamboardDataModel } from 'app/datamodels/teamboardsResponse.datamodel';
import { DateRangeComponent, getDateLabel, getDateRange } from 'app/dropdowns/date-range/date-range.component';
import { DropdownItem } from 'app/dropdowns/dropdown-item';
import { DropdownName } from 'app/element-names';
import { KhojiComponent } from 'app/interface/khoji-component.interface';
import { WorklogConfigAction } from 'app/interface/worklog-config-action';
import { ComponentVisibilityService } from 'app/services/component.visibility.service';
import { FeatureFlagService } from 'app/services/feature.flag.service';
import { RootNav, TrackingService } from 'app/services/tracking/';
import { checkDateValidity, checkIfUserIsAdmin, getParentActivatedRoute, getStartingDateLimitOfCustomDateRange, isComponentEnabled, itemsWithoutGroups, updateUrlParams } from 'app/shared/helper-functions';
import { AppState, ControlState, GlobalFilters, LoadingState, LoadingStates } from 'app/states/app-states';
import { setTeamWorklogUpdated } from 'app/states/app.actions';
import { getComponentConfigs, selectWorklogConfigSync } from 'app/states/global-configs.selector';
import { selectTeamWorklogForThisMonthLoadingStateAll, selectTeamWorklogLoadingState } from 'app/states/global-process.selector';
import { selectTranslation } from 'app/states/global-translations.selector';
import { MessageService } from 'primeng/api';
import { combineLatest, fromEvent, Subscription } from 'rxjs';
import { selectDateRange } from 'app/states/global-filters.selector';
import { Member, Team } from 'app/admin/admin.entities';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';
import { InstanceComponent } from 'app/instance/instance.component';
import { SpaceComponent } from 'app/space/space.component';
import { defaultTeamWorklogStats } from 'app/states/global-team-worklog.reducer';
import { CacheService } from 'app/caching/cache.service';
import { selectUserProfile } from 'app/user-profile/state/user-profile.selectors';
import { selectKhojiTeamsLoadingStateSelector } from 'app/admin/state/admin.selector';
import { CommonModule } from '@angular/common';
import { DropdownsModule } from 'app/dropdowns/dropdowns.module';
import { NgxSpinnerModule } from 'ngx-spinner';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TeamWorklogStatsModule } from '../team-worklog-stats/team-worklog-stats.module';
import { SharedModule } from 'app/shared/shared.module';
import { TabViewModule } from 'primeng/tabview';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import * as filterSelectors from 'app/states/global-filters.selector';
import * as actions from 'app/states/app.actions';
import { addDays, format as formatDate, isBefore as isDateBefore, isSameDay, parse as parseDate } from 'date-fns';

const isSameOrAfter = (date: Date, dateToCompare: Date) => isSameDay(date, dateToCompare) || isDateBefore(date, dateToCompare);

@Component({
  selector: 'khoji-team-worklog-reminder',
  templateUrl: './team-worklog-reminder.component.html',
  styleUrls: ['./team-worklog-reminder.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    DropdownsModule,
    TeamWorklogStatsModule,
    NgxSpinnerModule,
    ProgressSpinnerModule,
    TabViewModule,
    CardModule,
    ButtonModule,
    DateRangeComponent,
  ]
})
export class TeamWorklogReminderComponent implements OnInit, OnDestroy {
  dropdownName = DropdownName;
  translation: any;

  /** reInit subscription */
  subscription = new Subscription();
  /** init subscription */
  subscription2 = new Subscription();
  quickSearchSubscription = new Subscription();
  worklogTeamItems: DropdownItem[] = [];
  memberItems: DropdownItem[] = [];
  worklogTeamsSelected: any;
  queryParamTeamName = '';
  queryParamTeamNameHandled: boolean;
  queryParams: any;

  submitBtn: ControlState;
  worklogTeamDrp: ControlState;
  memberDrp: ControlState;
  dateRange: ControlState;

  selectedDate: string;
  fetchedDate = `${formatDate(addDays(new Date(), 7), Constants.DATE_FORMAT)}-${formatDate(new Date(), Constants.DATE_FORMAT)}`;

  fetchedWorklogTeams: string[] = [];
  selectedWorklogTeams: string[] = [];

  firstResponseReceived = false;
  statsLoading = false;
  teamWorklogStatisticsLoadingState: LoadingState;
  requestSubmittedFromRequestParams = false;

  requestChanged: boolean;
  validRequest: boolean;
  dataRecieved: boolean;
  constants = Constants;
  selectedMembers: Member[] = [];
  dateparams: { dateFrom: string; dateTo: string; };
  filters: GlobalFilters;
  componentConfigs: KhojiComponent[];
  cloudFeatureEnabled = FeatureFlagService.isEnabled(Constants.CLOUD_FEATURE_KEY);
  submitRequestForInvalidDateRange = false;
  memberFilterClassNames: string = 'mr-2 member-filter';
  reinitializeComponent: boolean = false;

  constructor(
    private messageService: MessageService,
    private store: Store<AppState>,
    private ref: ChangeDetectorRef,
    private componentVisibilityService: ComponentVisibilityService,
    private route: ActivatedRoute,
    private trackingService: TrackingService,
    private ngZone: NgZone,
    private cacheService: CacheService
  ) { }
  isConfigOnSourceUpdated: boolean = false;
  suggestedWorklogActions: WorklogConfigAction[] = [];
  fetchButtonTriggered = false;
  url: string;
  accessibleAccessLevels: string[];
  queryParamsHandled = false;

  requestPanelShadow = false;
  firstRender = true;
  scrollTop$ = fromEvent(document.querySelector('.main-content-area'), 'scroll').pipe(map(event => event['target']['scrollTop']));

  ngAfterContentChecked() {
    this.ref?.detectChanges();
  }

  updatePageState(filters: GlobalFilters, loadingStates: LoadingStates) {
    // state flags
    this.selectedWorklogTeams = filters?.worklogTeams;
    this.selectedMembers = filters?.members;
    this.selectedDate = `${filters?.dateFrom}-${filters?.dateTo}`;
    this.worklogTeamsSelected = this.getSelectedTeams(filters?.worklogTeamsList, filters?.worklogTeams || []);

    // template state
    this.teamWorklogStatisticsLoadingState = loadingStates.teamWorklogLoadingState;
    this.statsLoading = this.teamWorklogStatisticsLoadingState === LoadingState.Loading;

    // calculated state
    const dateChanged = this.fetchedDate !== this.selectedDate;
    this.requestChanged =
      JSON.stringify(this.fetchedWorklogTeams) !==
      JSON.stringify(this.selectedWorklogTeams) || dateChanged;
    this.validRequest = this.worklogTeamsSelected.length > 0;

    // controls state
    this.worklogTeamDrp = { visible: filters.worklogTeamsList.length > 1, disabled: this.statsLoading };
    this.memberDrp = {
      ...this.memberDrp,
      disabled: this.requestChanged || this.statsLoading,
    };
    this.dateRange = { visible: true, disabled: this.statsLoading };
    this.submitBtn = {
      visible: true,
      disabled: !this.validRequest || this.statsLoading,
    };
    this.updateVisibiltyState();

    // dispatch calculated state
    this.store.dispatch(
      actions.setTeamWorklogRequestFilterState({
        requestChanged: this.requestChanged,
        validRequest: this.validRequest,
      })
    );
  }

  updateVisibiltyState() { }

  ngOnInit() {
    this.trackingService.captureNavigationStep(RootNav.TeamView.WorklogInsightsAndReminders);

    // reinitialize subscription on route change
    const spaceRoute$ = getParentActivatedRoute(SpaceComponent, this.route)?.paramMap;
    const instanceRoute$ = getParentActivatedRoute(InstanceComponent, this.route)?.paramMap;

    // if spaceRoute$ and instanceRoute$ are available, then subscribe to them
    if (spaceRoute$ && instanceRoute$) {
      const routeSubs = combineLatest([spaceRoute$, instanceRoute$]).subscribe(([spaceRoute, instanceRoute]) => {
        // first unsubscribe old subscriptions
        this.subscription.unsubscribe();
        // then reinitialize subscription
        this.subscription = new Subscription();
        // then reset teams state and worklog loading state as these are being used in the component for logic
        this.queryParamTeamNameHandled = false;
        this.queryParamsHandled = false;
        this.requestSubmittedFromRequestParams = false;
        this.queryParamTeamName = '';

        this.store.dispatch(actions.setWorklogTeamsList({ list: [] }))
        this.store.dispatch(setKhojiTeamsList({ khojiTeamsList: [] }));
        this.store.dispatch(actions.setTeamWorkLogLoadingState({ teamWorklogLoadingState: LoadingState.Pending }));
        this.store.dispatch(actions.setTeamWorkLogForThisMonthLoadingState({ loadingState: LoadingState.Pending }));
        this.store.dispatch(actions.setTeamWorklogStats({ stats: defaultTeamWorklogStats }));

        setTimeout(() => {
          this.reinitializeComponent = false;
        }, 0);

        this.reInit();
      });

      this.subscription2.add(routeSubs);
    }
  }

  reInit() {
    if (!this.firstRender) {
      //this.store.dispatch(actions.fetchWorkSpaces());
    }

    this.firstRender = false;

    //giving little delay to rerender the component
    setTimeout(() => {
      this.reinitializeComponent = true;
    }, 0);

    this.subscription.add(this.scrollTop$.subscribe((scrollTop) => this.ngZone.run(() => this.requestPanelShadow = scrollTop > 0)));

    const componentConfigs$ = this.store.pipe(getComponentConfigs);

    this.subscription.add(
      componentConfigs$.subscribe((cfgs) => {
        this.componentConfigs = cfgs;
      })
    );

    const userProfile$ = this.store.pipe(selectUserProfile)
    const teamWorklogLoadingState$ = this.store.pipe(selectTeamWorklogLoadingState);
    const teamWorklogThisMonthLoadingState$ = this.store.pipe(selectTeamWorklogForThisMonthLoadingStateAll);

    this.subscription.add(userProfile$.subscribe(userProfile => {
      this.accessibleAccessLevels = userProfile.accessibleAccessLevels;
    }));

    // fetch data
    this.store.dispatch(actions.fetchTranslations({ locale: 'en_GB' }));
    this.store.dispatch(setKhojiTeamsLoadingState({ loadingState: LoadingState.Pending }));
    this.store.dispatch(fetchKhojiTeamsList());

    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe((translation) => {
        this.translation = translation;
      })
    );

    this.store.pipe(selectDateRange).subscribe((dateRange) => {
      const startDate = dateRange.dateFrom;
      const endDate = dateRange.dateTo;

      this.dateparams = {
        dateFrom: startDate,
        dateTo: endDate
      };
    });

    this.subscription.add(
      this.route.queryParams.subscribe(queryParams => {
        this.queryParams = queryParams;
        this.queryParamTeamName = queryParams['teamName'] || '';
      })
    );

    const filters$ = this.store.select('globalFilters');
    const process$ = this.store.select('loadingStates');
    this.memberDrp = { visible: false };

    this.subscription.add(filters$.subscribe(data => {
      this.filters = data;
    }));

    this.subscription.add(
      combineLatest([filters$, process$]).subscribe((data) => {
        this.updatePageState(data[0], data[1]);
      })
    );

    const teamsLoadingState$ = this.store.pipe(selectKhojiTeamsLoadingStateSelector);
    const selectWorklogTeams$ = this.store.pipe(
      filterSelectors.selectWorklogTeamsList,
      distinctUntilChanged((a, b) => a.length === b.length && a.every((val, index) => val.item_id === b[index].item_id))
    );
    // select team list

    //get team data only when loading state is done
    this.subscription.add(
      combineLatest([selectWorklogTeams$, teamsLoadingState$]).pipe(
        filter(([teams, loadingState]) => loadingState === LoadingState.Done)  // Assuming we want to avoid loading state and only process when there are teams
      ).subscribe((data) => {
        this.worklogTeamItems = data[0];

        if (this.queryParamTeamName?.length > 0 && !this.queryParamTeamNameHandled && this.worklogTeamItems.length > 0) {
          this.queryParamTeamNameHandled = true;

          const paramTeamNames = this.queryParamTeamName.split(',');
          const filteredTeamboards = this.worklogTeamItems.filter(item => paramTeamNames.includes((<TeamboardDataModel><any>item).teamName));
          if (filteredTeamboards.length > 0 && !this.statsLoading) {
            const teamNames = filteredTeamboards.map(board => board.item_text);
            this.selectedWorklogTeams = teamNames;
            this.selectWorklogTeams(filteredTeamboards);
            this.selectDateParams(this.route.snapshot.queryParams);

            setTimeout(this.onSubmit.bind(this), 100);
          }
          else {
            //this.showNoDataAccessMessage();
          }
        }
        else if (this.worklogTeamItems.length >= 1 && this.worklogTeamsSelected.length === 0) {
          if (this.teamWorklogStatisticsLoadingState !== 2 && this.teamWorklogStatisticsLoadingState !== 1) {
            this.selectedWorklogTeams = this.worklogTeamItems.map(item => item.item_text);
            updateUrlParams({ teamName: this.selectedWorklogTeams.join(",") });
            this.selectWorklogTeams(this.worklogTeamItems);
            setTimeout(this.onSubmit.bind(this), 100);
          }
        }
        else {
          this.handleRequestParameters();
          this.handleQueryParams(this.route.snapshot.queryParams, data[0]);
        }
      })
    );

    // select member names
    this.subscription.add(
      this.store
        .pipe(filterSelectors.selectMembersList)
        .subscribe((data) => (this.memberItems = data))
    );

    this.subscription.add(combineLatest([teamWorklogLoadingState$, teamWorklogThisMonthLoadingState$]).subscribe(([loadingState1, loadingState2]) => {
      if (loadingState1 === LoadingState.Error || loadingState2 === LoadingState.Error) {
        this.componentVisibilityService.showRequestPanel();
      }
    }));

    // select team-worklog stats

    const teamWorklogStatistics$ = this.store.select('teamWorklogStatistics');

    this.subscription.add(teamWorklogStatistics$
      .subscribe(data => {
        this.dataRecieved = data.teamWorklogs.length > 0;
        if (this.dataRecieved) {
          this.firstResponseReceived = true;

          setTimeout(() => {
            this.memberDrp = { ...this.memberDrp, visible: true };
          }, 0);

          this.store.dispatch(
            setTeamWorklogUpdated({ teamWorklogUpdated: true })
          );
        }
      })
    );

    this.subscription.add(
      this.store.pipe(selectWorklogConfigSync).subscribe((data) => {
        this.suggestedWorklogActions = data;
        this.isConfigOnSourceUpdated = data.length > 0;
      })
    );
  }

  isComponentEnabled(compId: string) {
    return isComponentEnabled(this.componentConfigs, compId);
  }

  onSubmit() {
    // clear cache in case of refresh
    if (!(this.requestChanged || !this.firstResponseReceived)) {
      this.cacheService.clearCache();
    }

    this.store.dispatch(actions.updateRequestFilters({ filters: this.filters }));
    // resetting loading state
    this.store.dispatch(actions.trackingWorklogRequest());
    this.store.dispatch(actions.setTeamWorkLogLoadingState({ teamWorklogLoadingState: LoadingState.Pending }));
    this.firstResponseReceived = false;
    this.fetchedWorklogTeams = this.selectedWorklogTeams;
    this.fetchedDate = this.selectedDate;
    const encodedNames = this.selectedWorklogTeams.map(teamName => encodeURIComponent(teamName)).join(',');
    updateUrlParams({ teamName: encodedNames });
    updateUrlParams(this.dateparams);
    this.store.dispatch(actions.fetchKhojiConfigs());
    this.store.dispatch(actions.fetchTeamWorklogStats());
    this.store.dispatch(actions.fetchMembers());
    this.store.dispatch(actions.setFetchButton({ fetchButton: this.fetchButtonTriggered }));
    this.fetchButtonTriggered = !this.fetchButtonTriggered;

    //Added a check if the user id admin
    if (checkIfUserIsAdmin(this.accessibleAccessLevels)) {
      this.store.dispatch(actions.fetchConfigs({ propKeys: [ADMIN_TABLE_CONFIGS, WORKLOG_RAG_SLIDER_CONFIG, WORKLOG_OTHER_RAG_SLIDER_CONFIG,] }));
    }

    this.store.dispatch(actions.fetchConfigs({
      propKeys: [WORKLOG_DISTRIBUTION, WORKLOG_OTHER_CATEGORIES_ALIAS, OTHERS_WORKLOG_EMAIL_SUBSCRIPTION_THRESHOLD, WORKLOG_OTHER_PERCENTAGE_THRESHOLD, WORKLOG_PERCENTAGE_THRESHOLD, RAG_COLOR_CODES, WORKLOG_RAG_STATUS_CATEGORY_EMAIL, WORKLOG_MAIN_CATEGORIES_ALIAS,
        WORKLOG_OTHER_CATEGORIES_ALIAS,
        WORKLOG_DAY_HOUR_CONFIG,
        INCLUDE_WEEKENDS_IN_WORKLOG_STATS
      ]
    }));

    this.componentVisibilityService.submitRefreshButtonClicked();
  }

  selectWorklogTeams(selectedItems: DropdownItem[]) {
    const ids = selectedItems.map((r) => r.item_id);
    this.store.dispatch(actions.selectWorklogTeams({ ids: ids }));
  }

  selectMembers(selectedItems: DropdownItem[]) {
    if (selectedItems.length == 0) this.memberFilterClassNames = 'member-filter-unselected'; else this.memberFilterClassNames = 'mr-2 member-filter';
    const members = <Member[]><any>selectedItems.map(r => ({ id: Number(r.item_id), memberEmail: r.item_subtext, fullName: r.item_text, role: r.item_value.role, status: r.item_value.status, accountId: r.item_value.accountId }));
    this.store.dispatch(actions.selectMembers({ members: members }));
  }

  singleTeamUser() {
    const worklogTeams = itemsWithoutGroups(this.worklogTeamItems);
    return worklogTeams && worklogTeams.length === 1;
  }

  selectDateParams(params: Params) {
    if (!this.queryParamsHandled) {
      this.queryParamsHandled = true;
      let dateStart = decodeURIComponent(params['dateFrom'] || '');
      let dateEnd = decodeURIComponent(params['dateTo'] || '');

      if (dateStart && dateEnd) {
        let dateFrom = parseDate(dateStart, Constants.DATE_FORMAT, new Date());
        let dateTo = parseDate(dateEnd, Constants.DATE_FORMAT, new Date());
        const isValidDateRange = checkDateValidity(dateFrom, dateTo);

        const startDateLimitOfCustomDateRange = getStartingDateLimitOfCustomDateRange();
        const isWithinAllowedRange = isSameOrAfter(dateFrom, startDateLimitOfCustomDateRange) && isSameOrAfter(dateTo, dateFrom);

        let dateLabel = getDateLabel(dateFrom, dateTo);
        const isValid = isValidDateRange && isWithinAllowedRange;

        if (!isValid) {
          dateLabel = 'Last 7 Days';
          const dateRange = getDateRange(dateLabel);
          dateFrom = dateRange[0];
          dateTo = dateRange[1];
          this.submitRequestForInvalidDateRange = true;
        }

        this.store.dispatch(actions.selectDateRange({
          dateFrom: formatDate(dateFrom, Constants.DATE_FORMAT),
          dateTo: formatDate(dateTo, Constants.DATE_FORMAT)
        }));

        this.store.dispatch(actions.selectDateLabel({ dateLabel }));
      }
    }
  }

  private handleQueryParams(params: Params, teamList: DropdownItem[]) {
    // team selection from url
    const teamName = decodeURIComponent(params['team'] || '');
    const team = teamName && teamList.find(t => (t as any as Team).teamName === teamName);

    if (team && !this.queryParamsHandled) {
      this.queryParamsHandled = true;
      this.selectWorklogTeams([team]);

      // date selection from url
      let dateStart = decodeURIComponent(params['dateFrom'] || '');
      let dateEnd = decodeURIComponent(params['dateTo'] || '');

      if (dateStart && dateEnd) {
        const dateFrom = parseDate(dateStart, Constants.DATE_FORMAT, new Date());
        const dateTo = parseDate(dateEnd, Constants.DATE_FORMAT, new Date());
        const dateLabel = getDateLabel(dateFrom, dateTo);

        this.store.dispatch(actions.selectDateRange({
          dateFrom: formatDate(dateFrom, Constants.DATE_FORMAT),
          dateTo: formatDate(dateTo, Constants.DATE_FORMAT)
        }));

        this.store.dispatch(actions.selectDateLabel({ dateLabel }));
      }

      setTimeout(this.onSubmit.bind(this), 100);
    }
  }

  /**
   * Handle the submission of worklog by
   * fetching teams, and dateFrom and dateTo
   * from query parameters
   */
  handleRequestParameters(): void {
    if (this.requestSubmittedFromRequestParams) {
      return;
    }

    const queryParams = this.route.snapshot.queryParams;
    if (!this.requestSubmittedFromRequestParams && queryParams?.teams && queryParams?.dateTo && queryParams?.dateFrom) {
      const teams = queryParams.teams.split(',');
      const accessibleTeamsIncludeRequestedTeams = teams.every(team => this.worklogTeamItems.map(wlt => wlt.item_id).includes(team));
      this.requestSubmittedFromRequestParams = true;

      this.store.dispatch(actions.selectWorklogTeams({ ids: teams }));
      this.store.dispatch(actions.selectDateRange({
        dateFrom: queryParams.dateFrom,
        dateTo: queryParams.dateTo
      }));

      if (!accessibleTeamsIncludeRequestedTeams) {
        this.showNoDataAccessMessage();
        return;
      }

      this.selectedWorklogTeams = teams;
      this.selectedDate = `${queryParams.dateFrom}-${queryParams.dateTo}`;
      this.onSubmit();
    }
  }

  getSelectedTeams(worklogTeamsList: Team[], worklogTeams: string[]) {
    const selectedTeams = [];
    for (const team of worklogTeams) {
      const filteredList = worklogTeamsList.filter(w => w.teamName.includes(team)).map(t => t.id)[0];
      if (filteredList) {
        selectedTeams.push(filteredList);
      }
    }
    return selectedTeams;
  }

  showNoDataAccessMessage(): void {
    this.messageService.add({
      key: 'message',
      severity: "error",
      summary: "Error!",
      detail: this.translation.quickSearch.noDataAccess
    });
  }

  ngOnDestroy() {
    this.cacheService.clearCache();
    this.subscription.unsubscribe();
    this.quickSearchSubscription.unsubscribe();
    this.subscription2.unsubscribe();
  }
}
