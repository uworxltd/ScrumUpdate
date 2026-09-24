/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { CacheService } from 'app/caching/cache.service';
import { Constants } from 'app/constants';
import { DropdownsModule } from 'app/dropdowns/dropdowns.module';
import { InstanceComponent, redirect_to_teams_link } from 'app/instance/instance.component';
import { RootNav, TrackingService, UserActions } from 'app/services/tracking';
import { connectMSCalendar, getParentActivatedRoute, MS_OAUTH_ENABLED } from 'app/shared/helper-functions';
import { UserWorklogSummaryRequest } from 'app/shared/picklist/interfaces';
import { SharedModule } from 'app/shared/shared.module';
import { SpaceComponent } from 'app/space/space.component';
import { AILogMyWorkSummaryData, AppState, LoadingState } from 'app/states/app-states';
import { selectAiGeneratedWorklogLoadingState, selectInstanceUserMetaDataLoadingState, selectLogMyWorkSummaryLoadingState } from 'app/states/global-process.selector';
import { selectTranslation } from 'app/states/global-translations.selector';
import { CalendarModule } from 'primeng/calendar';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { combineLatest, fromEvent, Subscription } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { getTimeZoneDate, getWeek, isSameWeek, WeekInputComponent } from "app/shared/week-input/week-input.component";
import { GenerateWorklogComponent } from '../generate-worklog/generate-worklog.component';
import { fetchInstanceUserMetaData, fetchWorklogSummary, pingAiCachePrompt, setAIGeneratedWorklogSubmissionLoadingState, setAIWorklogSummaryData, setGenerateAIWorklogLoadingState, setInstanceUserMetaDataLoadingState, setWeeklyWorklogSummaryDates, setWeeklyWorklogSummaryLoadingState } from '../state/log-my-work.action';
import { selectInstanceUser, selectUserPreferencesUpdated } from '../state/log-my-work.selector';
import { SummaryComponent } from '../summary/summary.component';
import { DetailComponent as WorklogDetailsComponent } from '../worklog-details/worklog-details.component';
import { animate, style, transition, trigger } from '@angular/animations';
import { MiniSummaryComponent } from '../mini-summary/mini-summary.component';
import { INCLUDE_WEEKENDS_IN_WORKLOG_STATS } from 'app/constants.configs';
import { fetchConfigs } from 'app/states/app.actions';
import { LogMyWorkTabService } from '../services/log-my-work-tab.service';

@Component({
  selector: 'khoji-my-worklog',
  standalone: true,
  imports: [CommonModule, SharedModule, DropdownsModule, CalendarModule, SummaryComponent, GenerateWorklogComponent, ProgressSpinnerModule, DialogModule, WeekInputComponent, WorklogDetailsComponent, MiniSummaryComponent],
  templateUrl: './my-worklog.component.html',
  styleUrls: ['./my-worklog.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('.5s ease-in', style({ opacity: 1 }))
      ]),
    ])
  ],
})
export class MyWorklogComponent implements OnInit, OnDestroy {
  @ViewChild('worklogDetailsComponent') worklogDetailsComponent: WorklogDetailsComponent
  translation: any;
  subscription = new Subscription();
  constants = Constants;
  instanceUserMetaDataLoadingState: LoadingState;
  worklogSummaryLoadingState: LoadingState;
  aiGeneratedWorklogLoadingState: LoadingState;
  showModal = false;
  isIntegrationDone = false;
  msOAuthEnabled = MS_OAUTH_ENABLED;
  summaryGeneratedData: any;

  recentDateValue: string = undefined;
  missingHours: any;
  openModal = {
    showModal: false,
    date: '',
    hours: 0
  };

  selectedWeek: [Date, Date];
  instanceUserAccountId: string;
  requestPanelShadow = false;
  scrollTop$ = fromEvent(document.querySelector('.main-content-area'), 'scroll').pipe(map(event => event['target']['scrollTop']));
  loadingStates = LoadingState;
  maxDate = new Date();
  maxWeek = getWeek();
  timeZone: string;
  isNextWeekAvailable = false;
  summaryData: AILogMyWorkSummaryData = {
    hours: 0,
    date: '',
    accountId: '',
  };

  isSummaryView = true;
  userPreferencesUpdated = 0;
  userPreferencesFetched = 0;

  constructor(
    private store: Store<AppState>,
    private titleService: Title,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private cacheService: CacheService,
    private router: Router,
    private trackingService: TrackingService,
    private logMyWorkTabService: LogMyWorkTabService,
  ) { }

  ngOnInit() {
    this.logMyWorkTabService.setSelectedTab('MyWorklogs/Tab');

    if (redirect_to_teams_link(this.router)) {
      return;
    }

    this.trackingService.captureNavigationStep(RootNav.LogMyWork);

    this.subscription.add(this.scrollTop$.subscribe((scrollTop) => this.ngZone.run(() => this.requestPanelShadow = scrollTop > 0)));

    const instanceUserLoadingState$ = this.store.pipe(selectInstanceUserMetaDataLoadingState);
    const instanceUser$ = this.store.pipe(selectInstanceUser, filter(instanceUser => !!instanceUser?.accountId));
    const worklogSummaryLoadingState$ = this.store.pipe(selectLogMyWorkSummaryLoadingState);
    const aiGeneratedWorklogLoadingState$ = this.store.pipe(selectAiGeneratedWorklogLoadingState);
    const spaceRoute$ = getParentActivatedRoute(SpaceComponent, this.route)?.paramMap;
    const instanceRoute$ = getParentActivatedRoute(InstanceComponent, this.route)?.paramMap;
    const userPreferencesUpdated$ = this.store.pipe(selectUserPreferencesUpdated);

    if (spaceRoute$ && instanceRoute$) {
      this.subscription.add(combineLatest([spaceRoute$, instanceRoute$]).subscribe(([spaceRoute, instanceRoute]) => {
        this.store.dispatch(setWeeklyWorklogSummaryLoadingState({ loading: LoadingState.Loading }));
        this.selectedWeek = getWeek();
      }))
    }

    this.subscription.add(worklogSummaryLoadingState$.subscribe((loadingState) => {
      this.worklogSummaryLoadingState = loadingState;
    }));

    this.subscription.add(
      aiGeneratedWorklogLoadingState$.subscribe((loadingState) => {
        this.aiGeneratedWorklogLoadingState = loadingState;
      })
    );

    this.subscription.add(instanceUserLoadingState$.subscribe((loadingState) => {
      this.instanceUserMetaDataLoadingState = loadingState;
    }));

    this.subscription.add(
      instanceUser$.subscribe(instanceUser => {
        this.summaryData = { ...this.summaryData, accountId: instanceUser.accountId };
        this.timeZone = instanceUser.timeZone;
        this.maxDate = getTimeZoneDate(new Date(), this.timeZone)
        this.isIntegrationDone = instanceUser.calendarIntegration && instanceUser.calendarTokenValid;
        this.instanceUserAccountId = instanceUser.accountId;
        this.submit();
      })
    );

    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe((translation) => {
        this.translation = translation;
        this.titleService.setTitle(this.translation?.pageTitles?.logMyWork);
      })
    );

    this.subscription.add(userPreferencesUpdated$.subscribe((value) => (this.userPreferencesUpdated = value)));
    this.store.dispatch(pingAiCachePrompt());
  }

  handleWeekChange(week: [Date, Date]) {
    if (isSameWeek(this.selectedWeek, week)) return;
    this.preloadWeekData(week);
  }

  preloadWeekData(week: [Date, Date]) {
    this.worklogDetailsComponent?.hideTicketSearch()

    this.selectedWeek = week;
    this.store.dispatch(setAIGeneratedWorklogSubmissionLoadingState({ loadingState: LoadingState.Pending }));
    this.store.dispatch(setGenerateAIWorklogLoadingState({ loadingState: LoadingState.Pending }));
    this.store.dispatch(fetchConfigs({ propKeys: [INCLUDE_WEEKENDS_IN_WORKLOG_STATS] }));

    if (this.userPreferencesUpdated > this.userPreferencesFetched) {
      this.userPreferencesFetched = this.userPreferencesUpdated;
      this.cacheService.clearCache();
      this.store.dispatch(fetchInstanceUserMetaData());
    }

    this.submit();
  }

  submit() {
    const [startDate, endDate] = this.selectedWeek;

    const payload: UserWorklogSummaryRequest = {
      accountId: this.instanceUserAccountId,
      startDate: startDate.formatISODateOnly(),
      endDate: endDate.formatISODateOnly(),
      timeZone: this.timeZone
    };

    this.trackingService.captureUserAction(UserActions.LogMyWork.WorkLogSummaryRequest);

    if (payload.accountId) {
      this.store.dispatch(setWeeklyWorklogSummaryDates({ dateRange: this.selectedWeek }));
      this.store.dispatch(fetchWorklogSummary({ payload }));
    }

    this.cdr.detectChanges();
  }

  handleModalEvent(modalEvent: any) {
    this.summaryData = {
      ...this.summaryData,
      hours: modalEvent.hours,
      date: modalEvent.date,
    }

    this.openModal = modalEvent;
    this.showModal = this.openModal.showModal && !this.isIntegrationDone && this.msOAuthEnabled;

    if (!this.showModal) {
      this.generateWorkLogClick();
    }

    if (!this.isIntegrationDone) {
      this.trackingService.captureNavigationStep(RootNav.LogMyWork.IntegrationModal);
    }
  }

  generateWorkLogClick() {
    this.store.dispatch(setAIWorklogSummaryData({ summaryData: this.summaryData }));
    this.showModal = false;
  }

  parseDate(formattedDate: string): string {
    const date = new Date(formattedDate);
    return date.formatISODateOnly();
  }

  handleNextWeek(isNextWeekAvailable: boolean) {
    this.isNextWeekAvailable = isNextWeekAvailable;
  }

  connectMSCalendar() {
    connectMSCalendar(this.trackingService);
  }

  ngOnDestroy() {
    this.cacheService.clearCache();
    this.subscription.unsubscribe();
    this.logMyWorkTabService.setSelectedTab('');
    this.selectedWeek = undefined;
  }
}
