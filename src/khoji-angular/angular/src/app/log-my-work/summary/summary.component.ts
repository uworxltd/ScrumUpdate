import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Constants } from 'app/constants';
import { WORKLOG_DAY_HOUR_CONFIG } from 'app/constants.configs';
import { ChartComponent } from 'app/shared/chart/chart.component';
import { getTimeZoneDate } from 'app/shared/week-input/week-input.component';
import { AILogMyWorkSummaryData, AppState, LoadingState, ManualWorkLogModalState, AccessLevels } from 'app/states/app-states';
import { updateWorkingHourPerDayConfig } from 'app/states/app.actions';
import { selectTranslation } from 'app/states/global-translations.selector';
import { WorklogSummaryData } from 'app/team-worklog/team-work-logged-percentage/team-work-logged-percentage.component';
import { NgxEchartsModule } from 'ngx-echarts';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import { TrackingService, UserActions } from '../../services/tracking';
import { selectInstanceUser, selectWorklogSummaryTransformed } from '../state/log-my-work.selector';
import { resetAIWorklogSummaryData, setAIWorklogSummaryData, setManualWorkLogModalState, setManualWorklogSubmitted } from './../state/log-my-work.action';
import { CacheService } from 'app/caching/cache.service';
import { Menu, MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { selectSubmitAIGeneratedWorklogLoadingState, selectWorkingHourPerDayConfigLoadingState } from 'app/states/global-process.selector';
import { environment } from 'environments/environment';
import { selectWorkspacesWithLoadingStates } from 'app/user-profile/state/user-profile.selectors';
import { getParentActivatedRoute } from 'app/shared/helper-functions';
import { ActivatedRoute, Router } from '@angular/router';
import { InstanceComponent } from 'app/instance/instance.component';
import { Workspace } from 'app/user-profile/state/user-profile.states';
import { selectWeekendStatsTooltip } from 'app/states/global-configs.selector';

@Component({
  selector: 'khoji-summary',
  standalone: true,
  imports: [CommonModule, NgxEchartsModule, TableModule, DividerModule, InputNumberModule, FormsModule, TooltipModule, MenuModule, ButtonModule, DialogModule],
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.scss']
})
export class SummaryComponent extends ChartComponent implements OnInit, OnDestroy {
  translation$: Observable<any>;
  subscription = new Subscription();
  constants = Constants;
  @Output() openWorkLogModal: EventEmitter<any> = new EventEmitter();
  @Input() isNextWeekAvailable: boolean = false;

  tableDetails: any;
  summaryData: WorklogSummaryData;
  tableRows: { loggedHours: any }[];
  totalLoggedHours = 0;
  timeZone: string = '';
  accountId: string;
  worklogConfigMaxHoursPerDay = environment.WORKLOG_CONFIG_MAX_HOURS_PER_DAY;
  workLogHoursPerDayConfig = 8;
  numberInputFeildValue: number = 8;
  defaultWorklogHoursPerDayConfig: number = 8;
  defaultWorklogHoursPerDayConfigLoadingState: LoadingState = LoadingState.Pending;
  menuItems: MenuItem[] | undefined;
  disableClickingOnTable: boolean = false;
  disableWorkLogConfigEditing: boolean = true;
  isHours$ = new BehaviorSubject({ value: localStorage.getItem(Constants.IS_HOURS_STORAGE_KEY) === 'true' });
  tooltipForAvailableCapacity: string = '';

  constructor(store: Store<AppState>, private trackingService: TrackingService, private cacheService: CacheService, private cdr: ChangeDetectorRef, private router: Router, private route: ActivatedRoute) {
    super(store);
  }

  ngOnInit() {
    const workspaceWithLoadingState$ = this.store.pipe(selectWorkspacesWithLoadingStates);
    const instanceRoute$ = getParentActivatedRoute(InstanceComponent, this.route)?.paramMap;
    const weekendStatsTooltip$ = this.store.pipe(selectWeekendStatsTooltip);

    this.subscription.add(
      weekendStatsTooltip$.subscribe((tooltip) => {
        this.tooltipForAvailableCapacity = tooltip;
      })
    );

    this.subscription.add(
      combineLatest([workspaceWithLoadingState$, instanceRoute$]).subscribe(([workspaceWithLoadingState, instanceRoute]) => {
        this.checkIfWorkLogDayHourEditingCanBeEnabled(workspaceWithLoadingState, instanceRoute?.get(Constants.INSTANCE_ID));
      })
    );

    this.translation$ = this.store.pipe(selectTranslation);
    const worklogSummary$ = this.store.pipe(selectWorklogSummaryTransformed);
    const instanceUser$ = this.store.pipe(selectInstanceUser);
    const submitLoadingState$ = this.store.pipe(selectSubmitAIGeneratedWorklogLoadingState);

    this.subscription.add(
      submitLoadingState$.subscribe((loadingState) => {
        if (loadingState === LoadingState.Loading) this.disableClickingOnTable = true;
        else this.disableClickingOnTable = false;
      })
    );

    this.subscription.add(
      instanceUser$.subscribe((user) => {
        this.timeZone = user.timeZone;
        this.accountId = user.accountId;
      })
    );

    this.subscription.add(
      worklogSummary$.subscribe((worklogSummary) => {
        this.summaryData = worklogSummary.summaryData;
        this.tableDetails = worklogSummary.tableDetails;
        this.workLogHoursPerDayConfig = worklogSummary.summaryData.workLogHoursPerDayConfig;
        this.numberInputFeildValue = worklogSummary.summaryData.workLogHoursPerDayConfig;
        if (this.workLogHoursPerDayConfig) {
          this.defaultWorklogHoursPerDayConfig = this.workLogHoursPerDayConfig;
        }
        this.tableRows = [
          {
            loggedHours: this.tableDetails.dateAndDay.map((item) => item.loggedHour)
          }
        ];

        this.totalLoggedHours = worklogSummary.tableDetails.dateAndDay.reduce((acc, curr) => acc + curr.loggedHour, 0);
        this.prepareChart();
        if (!worklogSummary.updatedFromEffect) this.sendMostRecentDate();
      })
    );

    this.subscription.add(
      this.store.pipe(selectWorkingHourPerDayConfigLoadingState).subscribe((loadingState) => {
        this.defaultWorklogHoursPerDayConfigLoadingState = loadingState;
        if (loadingState === LoadingState.Error) {
          this.numberInputFeildValue = this.workLogHoursPerDayConfig;
        }
      })
    );

    this.isHours$.subscribe((isHours) => {
      localStorage.setItem(Constants.IS_HOURS_STORAGE_KEY, isHours.value.toString());
    });
  }

  private checkIfWorkLogDayHourEditingCanBeEnabled(workspaceWithLoadingState: { workspaces: Workspace[]; loadingState: LoadingState }, instanceId: string) {
    if (workspaceWithLoadingState.loadingState === LoadingState.Done) {
      const instance = workspaceWithLoadingState.workspaces[0].instances.find((i) => i.id === Number(instanceId));
      if (instance) {
        const userAccessLevel = instance.instanceUser.accessLevelCode;
        if (userAccessLevel === AccessLevels.User) {
          this.disableWorkLogConfigEditing = true;
        } else {
          this.disableWorkLogConfigEditing = false;
        }
      }
    }
  }

  sendMostRecentDate() {
    const today = getTimeZoneDate(new Date(), this.timeZone);
    let mostRecentValidDate: any = null;

    for (let i = this.tableDetails.dateAndDay.length - 1; i >= 0; i--) {
      const dateDay = this.tableDetails?.dateAndDay[i];
      const dateString = `${dateDay.year}-${dateDay.month}-${dateDay.date}`;
      const dateObj = getTimeZoneDate(new Date(dateString), this.timeZone);

      if (dateDay.day !== 'Sat' && dateDay.day !== 'Sun' && dateObj <= today && dateDay.loggedHour < this.workLogHoursPerDayConfig) {
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
        hours: this.workLogHoursPerDayConfig - mostRecentValidDate.loggedHour,
        date: formattedDate
      };

      this.store.dispatch(setAIWorklogSummaryData({ summaryData: data }));
    } else {
      this.store.dispatch(resetAIWorklogSummaryData());
    }
  }

  onAiWandClick(dateDay: any, loggedHours: number): void {
    this.trackingService.captureUserAction(UserActions.LogMyWork.Ai_Wand.From_Table_Click);
    const formattedDate = `${dateDay.year}-${dateDay.month}-${dateDay.date}`;

    this.openWorkLogModal.emit({
      showModal: true,
      date: formattedDate,
      hours: this.workLogHoursPerDayConfig - loggedHours
    });
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
                [+this.summaryData.loggedPercentage.toFixed(2) / 100, this.summaryData.color],
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
            fontWeight: "normal",
            offsetCenter: [0, '0%']
          },
          data: [{ value: parseFloat(this.summaryData.loggedPercentage.toFixed(2)) }],
          radius: '80%'
        }
      ]
    };
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

  formatDate(dateDay: any): string {
    const dateString = `${dateDay.year}-${dateDay.month}-${dateDay.date}`;
    const dateObj = new Date(dateString);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  isFutureDate(dateObj: { date: string; month: string; year: string }): boolean {
    const todayString = new Intl.DateTimeFormat('en-US', {
      timeZone: this.timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const [month, day, year] = todayString.split('/');
    const today = new Date(`${year}-${month}-${day}`);

    const inputDateString = `${dateObj.year}-${dateObj.month.padStart(2, '0')}-${dateObj.date.padStart(2, '0')}`;
    const inputDate = new Date(inputDateString);

    return inputDate > today;
  }

  formatHours(hours: number): string {
    if (hours === undefined || hours === null) return '0h';

    let formattedHours = '';

    if (hours % 1 === 0) {
      formattedHours = hours?.toString(); // Whole number, no decimal
    } else {
      const hoursStr = hours.toString();
      const decimalIndex = hoursStr.indexOf('.');

      if (decimalIndex !== -1) {
        const decimalPart = hoursStr.slice(decimalIndex + 1);
        if (decimalPart.length > 2) {
          formattedHours = (Math.floor(hours * 100) / 100).toFixed(2);
        }
        formattedHours = hoursStr;
      } else {
        formattedHours = hoursStr;
      }
    }

    return formattedHours + 'h';
  }

  checkIfFutureDate(dateAndDay: { date: string; month: string; year: string; day: string }): boolean {
    return this.isFutureDate(dateAndDay);
  }

  toggleMenubar(event: any, dayAndDate: { date: string; month: string; year: string; day: string }, loggedHours: number, menu: Menu): void {
    this.menuItems = [
      {
        items: [
          {
            label: `
            <div class="flex gap-2 mt-1 mr-2 ml-2">
              <img src="${Constants.AI_ICON}" alt="icon" height="22"/>
              <p class="font-light text-color">Generate work log using AI</p>
            </div>`,
            escape: false,
            command: () => {
              this.onAiWandClick(dayAndDate, loggedHours);
            }
          },
          {
            label: `
            <div class="flex gap-2 mt-1 mr-2 ml-2">
              <img src="${Constants.MANUAL_WORK_LOG_ICON}" height="22" alt="icon"/>
              <p class="font-light text-color">Add work log manually</p>
            </div>`,
            escape: false,
            command: () => {
              this.emitManualWorklog(dayAndDate, loggedHours, false);
            },
          },
          {
            label: `
            <div class="flex gap-2 mt-1 mr-2 ml-2">
              <i class="fa fa-calendar icon-height" aria-hidden="true"></i>
              <p class="font-light text-color">Mark as leave</p>
            </div>`,
            escape: false,
            command: () => {
              this.emitManualWorklog(dayAndDate, loggedHours, true);
            },
          }
        ]
      }
    ];
    menu.toggle(event);
  }

  emitManualWorklog(dayAndDate: { date: string; month: string; year: string }, loggedHours: number, markAsLeave: boolean): void {
    const manualWorkLogState: ManualWorkLogModalState = {
      date: `${dayAndDate.year}-${dayAndDate.month}-${dayAndDate.date}`,
      markAsLeave: markAsLeave,
      showModal: true
    };

    this.store.dispatch(setManualWorkLogModalState({ manualWorkLogState }));
  }

  updateWorkingHoursPerDay() {
    if (this.numberInputFeildValue && this.numberInputFeildValue != this.workLogHoursPerDayConfig) {
      this.defaultWorklogHoursPerDayConfig = this.numberInputFeildValue;
      this.store.dispatch(updateWorkingHourPerDayConfig({ propKey: WORKLOG_DAY_HOUR_CONFIG, propValue: this.numberInputFeildValue }));
      this.cacheService.clearCache();
    } else if (this.defaultWorklogHoursPerDayConfigLoadingState !== LoadingState.Error && this.numberInputFeildValue) {
      this.workLogHoursPerDayConfig = this.defaultWorklogHoursPerDayConfig;
    } else if (!this.numberInputFeildValue) {
      setTimeout(() => (this.numberInputFeildValue = this.defaultWorklogHoursPerDayConfig), 100);
    }
    this.cdr.detectChanges();
    this.store.dispatch(setManualWorklogSubmitted({ manualWorklog: true }));
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
