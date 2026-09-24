import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { CacheService } from 'app/caching/cache.service';
import { Constants } from 'app/constants';
import { AiWorklogErrorCodes } from 'app/interface/aiWorklogGenerationErrors.enum';
import { HttpService } from 'app/services/common/http.service';
import { RootNav, TrackingService, UserActions } from 'app/services/tracking';
import { GenerateAIWorklogRequest } from 'app/shared/picklist/interfaces';
import { ActivityState, AIGeneratedWorklog, AILogMyWorkSummaryData, AppState, LoadingState, SearchIssuesSuggestions } from 'app/states/app-states';
import { fetchTranslations } from 'app/states/app.actions';
import { selectAiGeneratedWorklogLoadingState, selectLogMyWorkSummaryLoadingState, selectManualWorkLogLoadingState, selectSubmitAIGeneratedWorklogLoadingState } from 'app/states/global-process.selector';
import { selectTranslation } from 'app/states/global-translations.selector';
import { selectCurrentInstance } from 'app/user-profile/state/user-profile.selectors';
import * as _ from 'lodash';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { combineLatest, Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { connectMSCalendar, findElement, MS_OAUTH_ENABLED, parseParametrizedString, preLoadImage, wait } from '../../shared/helper-functions';
import { JiraService } from 'app/services/jira.service';
import { SharedModule } from '../../shared/shared.module';
import {
  generateAIWorklog,
  resetAIWorklogSummaryData,
  setAIGeneratedWorklogSubmissionLoadingState,
  setAIWorklogSummaryData,
  setGenerateAIWorklogLoadingState,
  setManualWorkLogModalState,
  submitManualWorkLog,
  submitWorklogs
} from '../state/log-my-work.action';
import {
  selectAIGeneratedWorklog,
  selectInstanceUser,
  selectManualWorkLogModalState,
  selectManualWorklogSubmitted,
  selectSubmittedWorklogResponse,
  selectUniqueIdentifier,
  selectWorklogActivityState,
  selectWorklogSummaryData,
  selectWorklogSummaryTransformed
} from '../state/log-my-work.selector';
import { environment } from 'environments/environment';
import { getTimeZoneDate } from 'app/shared/week-input/week-input.component';
import { ExportService } from '../../services/export.service';
import { SplitButtonModule } from 'primeng/splitbutton';
import { MenuItem } from 'primeng/api';
import { GuidedTour, GuidedTourModule, GuidedTourService, Orientation } from 'ngx-guided-tour';
import { GenerateWorklogProgressComponent, WORKLOG_TASK, WorklogTaskConfig } from '../generate-worklog-progress/generate-worklog-progress.component';
import { saveUserLeavesPreference } from 'app/admin/state/admin.actions';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextareaModule } from 'primeng/inputtextarea';

@Component({
  selector: 'khoji-generate-worklog',
  standalone: true,
  imports: [
    CommonModule,
    AutoCompleteModule,
    FormsModule,
    TableModule,
    ButtonModule,
    ReactiveFormsModule,
    InputTextModule,
    InputTextareaModule,
    InputNumberModule,
    ButtonModule,
    DialogModule,
    SharedModule,
    TooltipModule,
    ToastModule,
    DividerModule,
    SplitButtonModule,
    GuidedTourModule,
    GenerateWorklogProgressComponent,
    RadioButtonModule,
    InputSwitchModule
  ],
  templateUrl: './generate-worklog.component.html',
  styleUrls: ['./generate-worklog.component.scss'],
  providers: [GuidedTourService]
})
export class GenerateWorklogComponent implements OnInit, OnDestroy {
  private subscription = new Subscription();
  constants = Constants;
  aiWorklogErrorCodes = AiWorklogErrorCodes;
  msOAuthEnabled = MS_OAUTH_ENABLED;
  addManualWorklogForm: FormGroup;
  instanceName: string;
  @Input() dataGenerated = false;
  @Input() isNextWeekAvailable: boolean = false;
  selectedDate = '';
  @Output() openWorkLogModal: EventEmitter<any> = new EventEmitter();
  formattedDate: string = '';
  aiGeneratedWorklogLoadingState: LoadingState = LoadingState.Pending;
  submitAIGeneratedWorklogLoadingState: LoadingState = LoadingState.Pending;
  aiGeneratedWorklogs: AIGeneratedWorklog[];
  remainingHours: number;

  showModal = false;
  accountId: string = '';

  submittedDateForWorklog: string = '';
  submittedHoursForWorklog: number = 0;

  alreadyLoggedHour: number = 0;
  worklogCompleted: boolean = false;
  allWorklogDone: boolean = false;
  clonedAiGeneratedWorklog: { [rowId: string]: AIGeneratedWorklog } = {};
  selectedWorklogs: AIGeneratedWorklog[] = [];
  uniqueIdentifier: any;
  isMSTeamsIntegrated: boolean;

  workingHoursPerDay: number = 8;
  totalLoggedTime: number = 0;
  timeZone: string = '';
  countOfAIGeneratedWorklog = 0;
  worklogActivityState: ActivityState;
  worklogSummaryData: AILogMyWorkSummaryData = {
    hours: null,
    date: '',
    accountId: ''
  };
  worklogModalDate: string = '';
  worklogModalLoadingState: LoadingState;

  debounceTimeInMiliSeconds: number = 100;

  searchSuggestions: SearchIssuesSuggestions[] = [];
  searchLoading: boolean = false;
  successfullySubmittedWorklogsCount: number = 0;
  loggedTimeDate: string = '';
  translation: any;
  isManualWorklogSubmmitted = false;
  editingRowKeys: { [key: string]: boolean } = {};
  tableDetails: any;
  loadingStates = LoadingState;
  menuItemsGenerateWorklogManual: MenuItem[] = [
    {
      label: `
      <div class="flex gap-2 mt-1 mr-2 ml-2">
        <img src="${Constants.MANUAL_WORK_LOG_ICON}" height="22" alt="icon"/>
        <p class="font-light text-color">Add work log manually</p>
      </div>`,
      escape: false,
      command: () => {
        this.addManualWorklog(false, this.formattedDate);
      }
    },
    {
      label: `
      <div class="flex gap-2 mt-1 mr-2 ml-2">
        <i class="fa fa-calendar icon-height" aria-hidden="true"></i>
        <p class="font-light text-color">Mark as leave</p>
      </div>`,
      escape: false,
      command: () => {
        this.addManualWorklog(true, this.formattedDate);
      }
    }
  ];

  tourStepWidth: string;
  skipText: string;
  isEditWorklog = () => Object.keys(this.editingRowKeys).length > 0;
  @ViewChild(GenerateWorklogProgressComponent) generateWorklogProgress: GenerateWorklogProgressComponent;

  ticketIdLeave = {
    key: '',
    summary: ''
  };
  leaveHours = null;
  leaveticket: string = '';
  openModalForLeave = false;
  constant = Constants;
  isAdvancedMode = false;

  constructor(
    private store: Store<AppState>,
    private fb: FormBuilder,
    public cacheService: CacheService,
    private trackingService: TrackingService,
    private exportService: ExportService,
    private guidedTourService: GuidedTourService,
    private jiraService: JiraService
  ) {
    this.addManualWorklogForm = this.fb.group({
      ticketId: ['', Validators.required],
      ticketKey: [''], //created this entry for temproary purpose in order to get data from autocomplete,
      summary: [''],
      hours: [null, [Validators.required, Validators.min(0)]],
      comment: [''],
      id: ['']
    });
  }

  ngOnInit() {
    this.store.dispatch(fetchTranslations({ locale: 'en_GB' }));

    const aiGeneratedWorklogLoadingState$ = this.store.pipe(selectAiGeneratedWorklogLoadingState);
    const instanceUser$ = this.store.pipe(selectInstanceUser);
    const submitAIGeneratedWorklogLoadingState$ = this.store.pipe(selectSubmitAIGeneratedWorklogLoadingState);
    const aiGeneratedWorklog$ = this.store.pipe(selectAIGeneratedWorklog);
    const uniqueIdentifier$ = this.store.pipe(selectUniqueIdentifier);
    const worklogSummary$ = this.store.pipe(selectWorklogSummaryTransformed);
    const activityState$ = this.store.pipe(selectWorklogActivityState);
    const submittedAIGeneratedWorklogResponse$ = this.store.pipe(selectSubmittedWorklogResponse);
    const currentInstance$ = this.store.pipe(selectCurrentInstance);
    const summaryData$ = this.store.pipe(selectWorklogSummaryData);
    const manualWorklogSubmitted$ = this.store.pipe(selectManualWorklogSubmitted);
    const worklogSummaryLoadingState$ = this.store.pipe(selectLogMyWorkSummaryLoadingState);

    this.subscription.add(
      this.store.pipe(selectManualWorkLogModalState).subscribe((state) => {

        if (state.showModal) {
          this.addManualWorklog(state.markAsLeave, this.formatDateToRequiredFormat(state.date));
        }

        this.store.dispatch(setManualWorkLogModalState({ manualWorkLogState: { date: '', markAsLeave: false, showModal: false } }));
      })
    );

    this.subscription.add(
      this.store.pipe(selectManualWorkLogLoadingState).subscribe((loadingState) => {
        this.worklogModalLoadingState = loadingState;
        if (loadingState === LoadingState.Done) {
          this.showModal = false;
        }
      })
    );

    this.subscription.add(
      manualWorklogSubmitted$.subscribe((manualWorklogSubmitted) => {
        this.isManualWorklogSubmmitted = manualWorklogSubmitted;
      })
    );

    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe((translation) => {
        this.translation = translation;
      })
    );

    this.subscription.add(
      combineLatest([summaryData$, worklogSummary$, aiGeneratedWorklogLoadingState$]).subscribe(([data, summary, loading]) => {
        this.workingHoursPerDay = summary.summaryData.workLogHoursPerDayConfig;
        if (loading !== LoadingState.Done) {
          this.formattedDate = this.formatDateToRequiredFormat(data.date);
        }

        if (this.formattedDate === this.formatDateToRequiredFormat(data.date)) {
          this.remainingHours = data?.hours % 1 == 0 ? data?.hours : parseFloat(data?.hours.toFixed(2));
          this.alreadyLoggedHour = this.workingHoursPerDay - data.hours;
        }
      })
    );

    this.subscription.add(
      summaryData$.subscribe((data) => {
        this.worklogSummaryData = data;
        if ((data.hours !== undefined || data.hours !== null) && data.accountId) {
          const payload: GenerateAIWorklogRequest = {
            accountId: data.accountId,
            hoursToGenerate: data.hours > 0 ? data.hours : this.workingHoursPerDay,
            requestedDate: data.date
          };
          this.selectedDate = data.date;
          this.store.dispatch(setAIGeneratedWorklogSubmissionLoadingState({ loadingState: LoadingState.Pending }));
          this.store.dispatch(generateAIWorklog({ payload }));
          this.startProgressTasks(this.isMSTeamsIntegrated);
          this.trackingService.captureUserAction(UserActions.LogMyWork.GenerateAIWorkLogRequest);
        }
      })
    );

    this.subscription.add(
      submitAIGeneratedWorklogLoadingState$.subscribe((loadingState) => {
        this.submitAIGeneratedWorklogLoadingState = loadingState;
      })
    );

    this.subscription.add(
      combineLatest([instanceUser$, worklogSummary$, aiGeneratedWorklogLoadingState$, worklogSummaryLoadingState$]).subscribe(async ([user, { summaryData, tableDetails }, loading, summaryLoading]) => {
        this.accountId = user.accountId;
        this.isMSTeamsIntegrated = user.calendarIntegration;
        this.timeZone = user.timeZone;
        this.leaveticket = this.leaveticket || user.userPreferences?.LEAVES || '';
        this.tableDetails = tableDetails;
        const { workLogHoursPerDayConfig } = summaryData;
        const today = new Date();

        const validWeekdays = tableDetails.dateAndDay.filter((day) => {
          const dayOfWeek = new Date(+day.year, +day.month - 1, +day.date).getDay();
          const currentDay = new Date(+day.year, +day.month - 1, +day.date);

          return dayOfWeek !== 0 && dayOfWeek !== 6 && currentDay <= today;
        });

        const allWorkLogged = validWeekdays.every((day) => day.loggedHour >= workLogHoursPerDayConfig);

        this.allWorklogDone = allWorkLogged;
        this.workingHoursPerDay = workLogHoursPerDayConfig;

        if (this.timeZone && tableDetails && loading === LoadingState.Pending) {
          this.prepareForNextSubmission();
        }

        if (summaryLoading === LoadingState.Done && !allWorkLogged) {
          const tourGenerateAiWorklogStatus = localStorage.getItem(Constants.TOUR_GEN_AI_WORKLOG);
          const tourGenerateAiWorklogTableStatus = localStorage.getItem(Constants.TOUR_GEN_AI_WORKLOG_TABLE);

          if (tourGenerateAiWorklogStatus !== 'true') {
            await wait(700);
            await this.startGuidedTourGenerateAiWorklog();
          }

          if (tourGenerateAiWorklogTableStatus !== 'true') {
            await preLoadImage('assets/gif/edit-worklog-v1.gif');
          }
        }
      })
    );

    this.jiraService
      .getSearchResults(100)
      .subscribe((data) => {
        this.searchSuggestions = data.map((item) => ({
          key: item.key,
          summary: item.summary
        }));
      });

    this.subscription.add(
      combineLatest([submitAIGeneratedWorklogLoadingState$, submittedAIGeneratedWorklogResponse$])
        .pipe(distinctUntilChanged((prev, curr) => _.isEqual(prev, curr)))
        .subscribe(([loadingState, worklogResponse]) => {
          this.submitAIGeneratedWorklogLoadingState = loadingState;
          this.successfullySubmittedWorklogsCount = worklogResponse?.response?.successfullySubmittedWorklogsCount ?? 0;
          if (loadingState === LoadingState.Done) {
            if (worklogResponse.date === this.formatDateToRequiredFormat(this.selectedDate)) {
              this.submittedHoursForWorklog = worklogResponse.submittedHoursForWorklog;
              this.submittedDateForWorklog = worklogResponse.date;
            } else {
              this.store.dispatch(setAIGeneratedWorklogSubmissionLoadingState({ loadingState: LoadingState.Pending }));
              this.store.dispatch(setGenerateAIWorklogLoadingState({ loadingState: LoadingState.Pending }));
            }
          }
        })
    );

    this.subscription.add(
      combineLatest([aiGeneratedWorklog$, aiGeneratedWorklogLoadingState$, activityState$, uniqueIdentifier$, currentInstance$]).subscribe(
        async ([aiGeneratedWorklog, aiGeneratedWorklogLoadingState, activityState, uniqueIdentifier, currentInstance]) => {
          this.instanceName = currentInstance.name;
          this.aiGeneratedWorklogs = aiGeneratedWorklog.map((worklog) => ({
            ...worklog,
            id: uuidv4(),
            taskUrl: this.prepareTaskUrl(worklog.taskId),
            suggestionKey: {
              key: worklog.taskId,
              summary: worklog.taskTitle
            }
          }));
          this.editingRowKeys = {};
          this.selectedWorklogs = [];
          this.worklogActivityState = activityState;
          this.aiGeneratedWorklogLoadingState = aiGeneratedWorklogLoadingState;
          this.selectedWorklogs = this.aiGeneratedWorklogs.filter((worklog) => worklog.hours != 0);
          this.countOfAIGeneratedWorklog = this.aiGeneratedWorklogs.length;
          this.uniqueIdentifier = uniqueIdentifier;

          if (aiGeneratedWorklogLoadingState === LoadingState.Done) {
            this.generateWorklogProgress?.completeAllTasks();
            const tourGenerateAiWorklogTableStatus = localStorage.getItem(Constants.TOUR_GEN_AI_WORKLOG_TABLE);

            if (tourGenerateAiWorklogTableStatus !== 'true') {
              await wait(700);
              await this.startGuidedTourGenerateAiWorklogTable();
            }
          }

          if (aiGeneratedWorklogLoadingState === LoadingState.Error) {
            this.generateWorklogProgress?.failAllTasks();
            this.progressTasksDone = true;
          }
        }
      )
    );

    if (!this.formattedDate) {
      this.worklogCompleted = true;
    }
  }

  async startGuidedTourGenerateAiWorklog() {
    const _tour = this.translation.guidedTours.generateAiWorklog;
    const element = await findElement(_tour.selector);

    if (!element) return;

    this.tourStepWidth = _tour.tourStepWidth;
    this.skipText = _tour.skipText;

    const tour: GuidedTour = {
      tourId: _tour.tourId,
      completeCallback: () => {
        localStorage.setItem(Constants.TOUR_GEN_AI_WORKLOG, 'true');
      },
      steps: [
        {
          selector: _tour.selector,
          title: _tour.title,
          content: _tour.content,
          highlightPadding: 5,
          orientation: Orientation.Top
        }
      ]
    };

    this.guidedTourService.startTour(tour);
    return _tour.tourId;
  }

  async startGuidedTourGenerateAiWorklogTable() {
    const _tour = this.translation.guidedTours.generateAiWorklogTable;
    const element = await findElement(_tour.selector);

    if (!element) return;

    this.tourStepWidth = _tour.tourStepWidth;
    this.skipText = _tour.skipText;

    const tour: GuidedTour = {
      tourId: _tour.tourId,
      completeCallback: () => {
        localStorage.setItem(Constants.TOUR_GEN_AI_WORKLOG_TABLE, 'true');
      },
      steps: [
        {
          selector: _tour.selector,
          title: _tour.title,
          content: _tour.content,
          highlightPadding: 5,
          orientation: Orientation.Top
        }
      ]
    };

    this.guidedTourService.startTour(tour);
  }

  prepareForNextSubmission() {
    this.dispatchAIWorklogSummaryData();
  }

  dispatchAIWorklogSummaryData() {
    const today = getTimeZoneDate(new Date(), this.timeZone);
    let mostRecentValidDate: any = null;

    for (let i = this.tableDetails.dateAndDay.length - 1; i >= 0; i--) {
      const dateDay = this.tableDetails?.dateAndDay[i];
      const dateString = `${dateDay.year}-${dateDay.month}-${dateDay.date}`;
      const dateObj = getTimeZoneDate(new Date(dateString), this.timeZone);

      if (dateDay.day !== 'Sat' && dateDay.day !== 'Sun' && dateObj <= today && dateDay.loggedHour < this.workingHoursPerDay) {
        let tz = new Date(`${dateDay.year}-${dateDay.month.padStart(2, '0')}-${dateDay.date.padStart(2, '0')}`);
        if (!this.isNextWeekAvailable) {
          tz = getTimeZoneDate(new Date(`${dateDay.year}-${dateDay.month.padStart(2, '0')}-${dateDay.date.padStart(2, '0')}`), this.timeZone);
        }
        mostRecentValidDate = { day: tz.toLocaleDateString('en-US', { weekday: 'short' }), date: tz.getDate().toString(), month: (tz.getMonth() + 1).toString(), year: tz.getFullYear().toString(), loggedHour: dateDay.loggedHour };
        break;
      }
    }
    if (mostRecentValidDate) {
      const month = String(mostRecentValidDate.month).padStart(2, '0');
      const date = String(mostRecentValidDate.date).padStart(2, '0');
      const formattedDate = `${mostRecentValidDate.year}-${month}-${date}`;
      const data: AILogMyWorkSummaryData = {
        accountId: '',
        hours: this.workingHoursPerDay - mostRecentValidDate.loggedHour,
        date: formattedDate
      };

      this.store.dispatch(setAIWorklogSummaryData({ summaryData: data }));
    } else {
      this.store.dispatch(resetAIWorklogSummaryData());
    }
  }

  onAiWandClick() {
    this.trackingService.captureUserAction(UserActions.LogMyWork.Ai_Wand.From_Button_Click);
    this.openWorkLogModal.emit({
      showModal: true,
      date: this.worklogSummaryData.date,
      hours: this.worklogSummaryData.hours
    });
  }

  progressTasksDone = false;
  async startProgressTasks(mSTeamsIntegrated: boolean) {
    await wait(500);
    if (this.aiGeneratedWorklogLoadingState !== LoadingState.Loading) {
      return;
    }

    this.progressTasksDone = false;

    let timeout = 0;
    const interval = 3000;
    const taskConfigs: WorklogTaskConfig[] = [];

    if (mSTeamsIntegrated) {
      this.generateWorklogProgress?.addTask(WORKLOG_TASK.Fetching_MS_Calendar_activity, 'Pending');
      this.generateWorklogProgress?.addTask(WORKLOG_TASK.Fetching_Jira_activity, 'Pending');
      this.generateWorklogProgress?.addTask(WORKLOG_TASK.Processing_MS_Calendar_activity, 'Pending');
      this.generateWorklogProgress?.addTask(WORKLOG_TASK.Processing_Jira_activity, 'Pending');

      taskConfigs.push({ id: WORKLOG_TASK.Fetching_MS_Calendar_activity, status: 'Processing', timeout });
      taskConfigs.push({ id: WORKLOG_TASK.Fetching_Jira_activity, status: 'Processing', timeout });
      timeout += interval;
      taskConfigs.push({ id: WORKLOG_TASK.Fetching_MS_Calendar_activity, status: 'Completed', timeout });
      taskConfigs.push({ id: WORKLOG_TASK.Fetching_Jira_activity, status: 'Completed', timeout });
      taskConfigs.push({ id: WORKLOG_TASK.Processing_Jira_activity, status: 'Processing', timeout });
      taskConfigs.push({ id: WORKLOG_TASK.Processing_MS_Calendar_activity, status: 'Processing', timeout });
      timeout += interval;
      taskConfigs.push({ id: WORKLOG_TASK.Processing_Jira_activity, status: 'Completed', timeout });
      taskConfigs.push({ id: WORKLOG_TASK.Processing_MS_Calendar_activity, status: 'Completed', timeout });
    } else {
      this.generateWorklogProgress?.addTask(WORKLOG_TASK.Fetching_Jira_activity, 'Pending');
      this.generateWorklogProgress?.addTask(WORKLOG_TASK.Processing_Jira_activity, 'Pending');

      taskConfigs.push({ id: WORKLOG_TASK.Fetching_Jira_activity, status: 'Processing', timeout });
      timeout += interval;
      taskConfigs.push({ id: WORKLOG_TASK.Fetching_Jira_activity, status: 'Completed', timeout });
      taskConfigs.push({ id: WORKLOG_TASK.Processing_Jira_activity, status: 'Processing', timeout });
      timeout += interval;
      taskConfigs.push({ id: WORKLOG_TASK.Processing_Jira_activity, status: 'Completed', timeout });
    }

    this.generateWorklogProgress?.addTask(WORKLOG_TASK.Calculating_work_log, 'Pending');
    this.generateWorklogProgress?.addTask(WORKLOG_TASK.Generating_timesheet, 'Pending');

    taskConfigs.push({ id: WORKLOG_TASK.Calculating_work_log, status: 'Processing', timeout });
    timeout += interval;
    taskConfigs.push({ id: WORKLOG_TASK.Calculating_work_log, status: 'Completed', timeout });
    // keep showing in progress until worklog is generated
    taskConfigs.push({ id: WORKLOG_TASK.Generating_timesheet, status: 'Processing', timeout });

    this.generateWorklogProgress?.startTasks(taskConfigs);

    this.generateWorklogProgress?.allTasksStatus$(['Completed', 'Failed', 'Cancelled']).subscribe((status) => {
      if (status) {
        this.progressTasksDone = true;
      }
    });
  }

  addManualWorklog(markAsLeave: boolean, date?: string): void {
    this.ticketIdLeave = {
      key: markAsLeave ? this.leaveticket : '',
      summary: this.ticketIdLeave.summary || '',
    };

    this.leaveHours = markAsLeave ? this.workingHoursPerDay : null;
    this.openModalForLeave = markAsLeave;

    if (markAsLeave && this.leaveticket) {
      this.jiraService.searchIssues(this.leaveticket);
      const subscription = this.jiraService.getSearchResults(100).subscribe((data) => {
        const match = data.find((t) => t.key === this.leaveticket) || { key: this.leaveticket, summary: '' };
        this.issueSelected({ key: match.key, summary: match.summary });
        subscription.unsubscribe();
      });
    }

    if (date) this.worklogModalDate = date;

    this.openModal(true);
    this.isManualWorklogSubmmitted = true;
  }

  formatDateToRequiredFormat(formatted: string) {
    const date = new Date(formatted);

    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };

    return new Intl.DateTimeFormat('en-US', options).format(date);
  }

  //year-month-day is converted into Month Date, Year
  formatDate(dateString: string): string {
    const [day, month, year] = dateString.split('-').map(Number);
    const date = new Date(day, month - 1, year);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  deleteWorklog(worklog: AIGeneratedWorklog): void {
    this.trackingService.captureUserAction(UserActions.LogMyWork.Manual_WorkLog.Delete_Entry);

    this.aiGeneratedWorklogs = this.aiGeneratedWorklogs.filter((item) => item.id !== worklog.id);
    this.selectedWorklogs = this.selectedWorklogs.filter((item) => item.id !== worklog.id);
  }

  submitWorklog(): void {
    this.editingRowKeys = {};
    const validWorklogs = this.selectedWorklogs.map((worklog) => this.clonedAiGeneratedWorklog[worklog.id] || worklog).filter((worklog) => !!worklog.taskId && !!worklog.suggestionKey?.key);
    const AIWorklogs = this.convertWorklogs(validWorklogs, this.accountId, this.uniqueIdentifier, this.timeZone);
    this.totalLoggedTime = AIWorklogs.worklogs.reduce((time, worklog) => time + worklog.timelogInSeconds, 0);
    this.totalLoggedTime = this.totalLoggedTime / 3600;
    this.loggedTimeDate = this.formattedDate;
    this.cacheService.clearCache();
    this.store.dispatch(submitWorklogs({ worklogs: AIWorklogs, loggedTimeDate: this.loggedTimeDate }));
    this.trackingService.captureUserAction(UserActions.LogMyWork.SubmitAIGeneratedWorkLogRequest);
    this.store.dispatch(setGenerateAIWorklogLoadingState({ loadingState: LoadingState.Pending }));
  }

  convertWorklogs(aiGeneratedWorklogs: AIGeneratedWorklog[], accountId: string, uniqueIdentifier: string, timeZone: string, useModalDate: boolean = false) {
    const minTime = Constants.MINIMUM_WORKLOG_HOURS_ALLOWED_ON_JIRA;
    const worklogs = aiGeneratedWorklogs.map((worklog) => {
      const logTime = worklog.hours;
      return {
        ticketId: worklog.taskId,
        ticketDescription: worklog.taskTitle,
        timelogInSeconds: (logTime > 0 && logTime < minTime ? minTime : logTime) * 3600,
        comment: worklog.comments,
        startedAt: this._formatDate(new Date(useModalDate ? this.worklogModalDate : this.formattedDate))
      };
    });

    return { accountId, worklogs, uniqueIdentifier, timeZone };
  }

  async addNewWorklog() {
    const worklog = {
      id: uuidv4(),
      taskId: '',
      hours: null,
      comments: '',
      taskUrl: '',
      taskTitle: '',
      suggestionKey: <any>''
    };

    this.aiGeneratedWorklogs = [...this.aiGeneratedWorklogs, worklog];
    this.selectedWorklogs = [...this.selectedWorklogs, worklog];
    this.clonedAiGeneratedWorklog[worklog.id as string] = { ...worklog };
    this.editingRowKeys[worklog.id] = true;

    await wait(100);
    this.focusLastInput();
  }

  focusLastInput(): void {
    const inputs = document.querySelectorAll<HTMLInputElement>('.p-autocomplete-input');
    inputs[inputs.length - 1]?.focus();
  }

  openModal(value: boolean): void {
    this.showModal = value;

    if (value) {
      this.trackingService.captureNavigationStep(RootNav.LogMyWork.AddWorkLogEntryModal);
    }

    if (!value) {
      this.addManualWorklogForm.reset({
        ticketId: '',
        hours: null,
        comment: '',
        ticketKey: '',
        summary: ''
      });
    }
  }

  _formatDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
    return `${year}-${month}-${day}T09:${minutes}:${seconds}.${milliseconds}`;
  }

  isFieldInvalid(field: string): boolean {
    const control = this.addManualWorklogForm.get(field);
    return control?.invalid && control?.touched;
  }

  onBlur(field: string): void {
    const control = this.addManualWorklogForm.get(field);
    if (control) {
      control.markAsTouched();
    }
  }

  onSubmit() {
    this.trackingService.captureUserAction(UserActions.LogMyWork.Manual_WorkLog.Add_Entry);
    //TODO: this can be used in future...
    // this.store.dispatch(fetchIssueIdValidity({ issueId: this.addManualWorklogForm.value.ticketId }));
    this.submitManualWorklog(this.addManualWorklogForm.value, this.openModalForLeave);
  }

  createWorklogEntryWithAIGeneratedWorklog(worklog) {
    let work_log: AIGeneratedWorklog = {
      id: worklog.id ? worklog.id : uuidv4(),
      taskId: worklog.ticketId,
      hours: worklog.hours,
      comments: worklog.comment,
      taskUrl: this.prepareTaskUrl(worklog.ticketId),
      taskTitle: worklog.summary,
      suggestionKey: {
        key: worklog.ticketId,
        summary: worklog.summary
      }
    };

    this.aiGeneratedWorklogs = [...this.aiGeneratedWorklogs, work_log];
    this.selectedWorklogs = [...this.selectedWorklogs, work_log];
  }

  submitManualWorklog(worklog, submittingLeave: boolean): void {
    const work_log: AIGeneratedWorklog = {
      id: uuidv4(),
      taskId: worklog.ticketId,
      hours: worklog.hours,
      comments: worklog.comment,
      taskUrl: this.prepareTaskUrl(worklog.ticketId),
      taskTitle: worklog.summary,
      suggestionKey: {
        key: worklog.ticketId,
        summary: worklog.summary
      }
    };

    this.loggedTimeDate = this.worklogModalDate;
    const manualWorklog = this.convertWorklogs([work_log], this.accountId, this.uniqueIdentifier, this.timeZone, true);
    this.store.dispatch(submitManualWorkLog({ worklogs: manualWorklog, loggedTimeDate: this.loggedTimeDate }));
    this.cacheService.clearCache();

    if (submittingLeave && this.leaveticket !== work_log.taskId) {
      this.store.dispatch(saveUserLeavesPreference({ ticketID: work_log.taskId, showToast: false }));
      this.leaveticket = work_log.taskId;
    }

    this.trackingService.captureUserAction(UserActions.LogMyWork.SubmitAIGeneratedWorkLogRequest);
  }

  onRowEditInit(worklog: AIGeneratedWorklog): void {
    this.trackingService.captureUserAction(RootNav.LogMyWork.EditWorkLogEntry);
    this.clonedAiGeneratedWorklog[worklog.id as string] = { ...worklog };
  }

  onRowEditCancel(worklog: AIGeneratedWorklog, index: number) {
    const { hours, taskId } = this.clonedAiGeneratedWorklog[worklog.id];

    if (hours === 0 || taskId === '') {
      this.deleteWorklog(worklog);
      delete this.clonedAiGeneratedWorklog[worklog.id as string];
    }

    this.trackingService.captureUserAction(RootNav.LogMyWork.CancelEditWorkLogEntry);

    if (this.clonedAiGeneratedWorklog[worklog.id as string]) {
      this.aiGeneratedWorklogs[index] = { ...this.clonedAiGeneratedWorklog[worklog.id as string] };
      this.selectedWorklogs = this.selectedWorklogs.map((worklog) => ({ ...(this.clonedAiGeneratedWorklog[worklog.id] || worklog) }));
    }

    delete this.clonedAiGeneratedWorklog[worklog.id as string];
    this.aiGeneratedWorklogs = [...this.aiGeneratedWorklogs];
  }

  onRowEditSave(worklog: AIGeneratedWorklog) {
    this.trackingService.captureUserAction(RootNav.LogMyWork.SaveWorkLogEntry);
    this.selectedWorklogs = this.selectedWorklogs.map((worklog) => ({ ...(this.aiGeneratedWorklogs.find(wl => wl.id === worklog.id)) }));
    delete this.clonedAiGeneratedWorklog[worklog.id as string];
  }

  getValidWorklogs(worklogs: AIGeneratedWorklog[]) {
    const validWorklogs = worklogs.map((worklog) => this.clonedAiGeneratedWorklog[worklog.id] || worklog).filter((worklog) => !!worklog.taskId && !!worklog.suggestionKey?.key);
    const hours = +validWorklogs.reduce((total, worklog) => total + worklog.hours, 0).toFixed(2);
    return { count: validWorklogs.length, hours };
  }

  reloadPage() {
    // shifting to the resubmit req instead of loading the page again
    this.generateWorklogAgain();
  }

  checkIfErrorOccurs(errorCodes: AiWorklogErrorCodes[]): boolean {
    return errorCodes.some((errorCode) => errorCode === this.worklogActivityState.errorCode);
  }

  generateWorklogAgain() {
    const generateAIWorklogRequest: GenerateAIWorklogRequest = {
      accountId: this.accountId,
      requestedDate: this.convertToDateFormat(this.formattedDate),
      hoursToGenerate: this.worklogSummaryData.hours > 0 ? this.worklogSummaryData.hours : this.workingHoursPerDay
    };

    this.store.dispatch(generateAIWorklog({ payload: generateAIWorklogRequest }));
    this.startProgressTasks(this.isMSTeamsIntegrated);
    this.trackingService.captureUserAction(UserActions.LogMyWork.GenerateAIWorkLogRequest);
  }

  convertToDateFormat(dateStr: string): string {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  prepareTaskUrl(taskId: string): string {
    return `https://${this.instanceName}.atlassian.net/browse/${taskId}`;
  }

  searchIssues(event: any): void {
    if (event.query) {
      this.jiraService.searchIssues(event.query);
    }
  }

  issueSelected(event: SearchIssuesSuggestions): void {
    this.addManualWorklogForm.controls.ticketId.setValue(event.key);
    this.addManualWorklogForm.controls.summary.setValue(event.summary);
  }

  addOrUpdateAiGeneratedWorklogData(worklogsArray: AIGeneratedWorklog[], workLog: AIGeneratedWorklog): void {
    const existingWorklog = worklogsArray.find((worklog) => worklog.id === workLog.id);
    if (existingWorklog) {
      Object.assign(existingWorklog, workLog);
    } else {
      worklogsArray.push(workLog);
    }
  }

  tableIssueSelected(event: SearchIssuesSuggestions, worklog: AIGeneratedWorklog): void {
    worklog.taskId = event.key;
    worklog.taskTitle = event.summary;
    worklog.taskUrl = this.prepareTaskUrl(event.key);
    this.validateTotalHoursPerDay(worklog);
  }

  handleRowSelect(event: any): void {
    this.validateTotalHoursPerDay(event.data);
  }

  isValidSuggestionKey(worklog: AIGeneratedWorklog): boolean {
    return typeof worklog.suggestionKey === 'object';
  }

  getTaskSummaryDetails(worklog: AIGeneratedWorklog): string {
    return `${worklog.taskId} - ${worklog.taskTitle}`;
  }

  parseString(translationString: string, value: string): string {
    return parseParametrizedString(translationString, value);
  }

  validateTotalHoursPerDay(worklog: AIGeneratedWorklog, event?: any): void {
    // If the worklog is not selected, then check if the hours entered is less than 0 and add the error class
    if (event && worklog.hours < 0) {
      event.target.closest('.p-inputwrapper')?.classList.add('ng-invalid');
    } else if (event && worklog.hours > -1) {
      event.target.closest('.p-inputwrapper')?.classList.remove('ng-invalid');
    }

    return; // below code is not needed for now as jira does not restrict the hours logged per day

    // If the worklog is already selected, then check if the total hours logged for the day is greater than the max hours allowed
    if (this.selectedWorklogs.find((wl) => wl.id === worklog.id)) {
      const loggedHours = this.selectedWorklogs.filter((wl) => !!wl.taskId && wl.hours > 0 && !!wl.suggestionKey?.key).reduce((total, wl) => total + wl.hours, 0);

      if (loggedHours > environment.WORKLOG_CONFIG_MAX_HOURS_PER_DAY) {
        const extraHours = loggedHours - environment.WORKLOG_CONFIG_MAX_HOURS_PER_DAY;
        setTimeout(() => {
          worklog.hours = +(worklog.hours - extraHours).toFixed(2);
        }, 0);
      }
    }
  }

  async exportAiGeneratedWorklog(): Promise<void> {
    const headers = ['Ticket ID', 'Hours', 'Worklog Description'];

    const data = this.aiGeneratedWorklogs
      .filter((aiWl) => !this.editingRowKeys[aiWl.id])
      .map((aiWl) => ({
        [headers[0]]: aiWl.taskId,
        [headers[1]]: aiWl.hours,
        [headers[2]]: aiWl.comments
      }));

    const formattedDate = new Intl.DateTimeFormat('en-CA').format(new Date(this.selectedDate));
    const csvFileName = this.translation?.logMyWork?.exportCsvTitle + formattedDate;
    this.exportService.exportCsv(data, csvFileName);
  }

  disableExportButton(): boolean {
    return !(this.aiGeneratedWorklogs.length > 0) || Object.keys(this.editingRowKeys).length > 0;
  }

  onToggleMode() {
    setTimeout(() => {
      this.isAdvancedMode = !this.isAdvancedMode;
    }, 100);
  }

  connectMSCalendar() {
    connectMSCalendar(this.trackingService);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
