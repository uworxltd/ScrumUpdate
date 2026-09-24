import { Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { Store } from '@ngrx/store';
import { AppState, LoadingState, ManualWorkLogModalState } from 'app/states/app-states';
import { TrackingService } from 'app/services/tracking';
import { combineLatest, Observable, Subscription } from 'rxjs';
import { selectTranslation } from 'app/states/global-translations.selector';
import { selectInstanceUser, selectWorklogDetailsTransformed, selectWorklogHoursPerDay } from 'app/log-my-work/state/log-my-work.selector';
import { ButtonModule } from 'primeng/button';
import { addEmptyWorklogForTicket, setDeleteWorkLogLoadingState, setManualWorkLogModalState, setManualWorklogSubmitted, setSelectedTicketDetails } from '../state/log-my-work.action';
import { DialogModule } from 'primeng/dialog';
import { TicketDetailsComponent } from 'app/ticket-details/ticket-details.component';
import { OverlayPanel, OverlayPanelModule } from 'primeng/overlaypanel';
import { selectCurrentInstance } from 'app/user-profile/state/user-profile.selectors';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem } from 'primeng/api';
import { Constants } from 'app/constants';
import { Menu, MenuModule } from 'primeng/menu';
import { selectDeleteWorklogLoadingState, selectEditWorklogLoadingState, selectPopupGeneratedWorklogLoadingState, selectSubmitAIGeneratedWorklogLoadingState } from 'app/states/global-process.selector';
import { DividerModule } from 'primeng/divider';
import { JiraIssueSelectorInputComponent } from 'app/shared/jira-issue-selector-input/jira-issue-selector-input.component';
import { map } from 'rxjs/operators';
import { JiraIssueItem } from 'app/services/jira.service';

@Component({
  selector: 'khoji-worklog-details',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    DialogModule,
    TicketDetailsComponent,
    OverlayPanelModule,
    TooltipModule,
    MenuModule,
    DividerModule,
    JiraIssueSelectorInputComponent,
  ],
  templateUrl: './worklog-details.component.html',
  styleUrls: ['./worklog-details.component.scss']
})
export class DetailComponent implements OnInit, OnDestroy {
  expandTable = false;
  @Output() openWorkLogModal: EventEmitter<any> = new EventEmitter();
  constants = Constants;
  translation$: Observable<any>;
  subscription = new Subscription();
  timeZone: string = '';
  accountId: string;
  tableDetails: any;
  selectedTicketId: string;
  instanceName: string;
  worklogHoursPerDay: number;
  menuItems: MenuItem[];
  resetActiveTabIndex: boolean = false;

  submitLoadingState: LoadingState;
  editLoadingState: LoadingState;
  deleteLoadingState: LoadingState;
  disableClickingOnTable: boolean = false;
  ticketSearchVisible = false;
  selectedIssue = { key:'', summary: '' };
  @ViewChild('worklogDetailsTable') worklogDetailsTable: ElementRef<HTMLDivElement>;

  constructor(private store: Store<AppState>, private trackingService: TrackingService) { }

  ngOnInit(): void {
    this.translation$ = this.store.pipe(
      selectTranslation,
      map((t) => t?.logMyWork.worklogDetails)
    );
    const instanceUser$ = this.store.pipe(selectInstanceUser);
    const worklogDetails$ = this.store.pipe(selectWorklogDetailsTransformed);
    const currentInstance$ = this.store.pipe(selectCurrentInstance);
    const worklogHoursPerDay$ = this.store.pipe(selectWorklogHoursPerDay);

    const submitPopupLoadingState$ = this.store.pipe(selectPopupGeneratedWorklogLoadingState);
    const editPopupLoadingState$ = this.store.pipe(selectEditWorklogLoadingState);
    const deletePopupLoadingState$ = this.store.pipe(selectDeleteWorklogLoadingState);
    const submitLoadingState$ = this.store.pipe(selectSubmitAIGeneratedWorklogLoadingState);

    this.subscription.add(
      submitLoadingState$.subscribe(loadingState => {
        if (loadingState === LoadingState.Loading) this.disableClickingOnTable = true;
        else this.disableClickingOnTable = false;
      })
    );

    this.subscription.add(submitPopupLoadingState$.subscribe(loadingState => {
      this.submitLoadingState = loadingState;
    }));

    this.subscription.add(editPopupLoadingState$.subscribe(loadingState => {
      this.editLoadingState = loadingState;
    }));

    this.subscription.add(deletePopupLoadingState$.subscribe(loadingState => {
      this.deleteLoadingState = loadingState;
    }));

    this.subscription.add(instanceUser$.subscribe(user => {
      this.timeZone = user.timeZone;
      this.accountId = user.accountId;
    }));

    this.subscription.add(combineLatest([worklogDetails$, currentInstance$]).subscribe(([worklogDetails, instance]) => {
        this.instanceName = instance.name;
        worklogDetails.tickets = worklogDetails.tickets.map(t => {
          return {...t, ticketUrl: this.prepareTaskUrl(t.ticket)}
        });
        this.tableDetails = worklogDetails;
    }));

    this.subscription.add(worklogHoursPerDay$.subscribe(data => this.worklogHoursPerDay = data));
  }

  get isAnyCallInLoading()
  {
    return this.submitLoadingState === LoadingState.Loading ||this.editLoadingState === LoadingState.Loading||this.deleteLoadingState === LoadingState.Loading;
  }

  isFutureDate(
    dateObj: { date: string; month: string; year: string },
  ): boolean {
    const todayString = new Intl.DateTimeFormat('en-US', {
      timeZone: this.timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    const [month, day, year] = todayString.split('/');
    const today = new Date(`${year}-${month}-${day}`);

    const inputDateString = `${dateObj.year}-${dateObj.month?.padStart(2, '0')}-${dateObj.date?.padStart(2, '0')}`;
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

  getLoggedHours(ticketWorklogs: any){
    return ticketWorklogs ? ticketWorklogs.loggedHour : 0;
  }

  getTicketDetails(ticketId: string, ticketDescription: string, date: string) {
    return new Promise<void>((res, rej)=>{
      this.store.dispatch(setDeleteWorkLogLoadingState({loadingState: LoadingState.Pending}));
      this.store.dispatch(setSelectedTicketDetails({ ticketDetails: { ticketId, ticketDescription, date } }));
    });
  }

  prepareTaskUrl(taskId: string): string {
    return `https://${this.instanceName}.atlassian.net/browse/${taskId}`;
  }

  toggleMenubar(event: any, dayAndDate: { date: string; month: string; year: string, day: string, loggedHour: number }, menu: Menu){

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
              this.onAiWandClick(dayAndDate, dayAndDate.loggedHour);
              this.expandTable = false;
            },
          },
          {
            label: `
            <div class="flex gap-2 mt-1 mr-2 ml-2">
              <img src="${Constants.MANUAL_WORK_LOG_ICON}" alt="icon" height="22"/>
              <p class="font-light text-color">Add work log manually</p>
            </div>`,
            escape: false,
            command: () => { this.addManualWorklog(dayAndDate, false) },
          },
          {
            label: `
            <div class="flex gap-2 mt-1 mr-2 ml-2">
              <i class="fa fa-calendar icon-height" aria-hidden="true"></i>
              <p class="font-light text-color">Mark as leave</p>
            </div>`,
            escape: false,
            command: () => {
              this.addManualWorklog(dayAndDate, true);
            },
          }
        ]
      }
    ];

    menu.toggle(event);
  }

  onAiWandClick(dateDay: any, loggedHours: number): void {
    // this.trackingService.captureUserAction(userAction.LogMyWorkActions.Ai_Wand.From_Table_Click);
    const formattedDate = `${dateDay.year}-${dateDay.month}-${dateDay.date}`;

    this.openWorkLogModal.emit({
      showModal: true,
      date: formattedDate,
      hours: this.worklogHoursPerDay - loggedHours
    });
  }

  addManualWorklog(dayAndDate: { date: string; month: string; year: string, day: string, loggedHour: number }, markAsLeave: boolean): void {
    // open manual worklog modal
    const manualWorkLogState: ManualWorkLogModalState = {
      date: `${dayAndDate.year}-${dayAndDate.month}-${dayAndDate.date}`,
      markAsLeave: markAsLeave,
      showModal: true
    }

    this.store.dispatch(setManualWorkLogModalState({ manualWorkLogState }));
    this.store.dispatch(setManualWorklogSubmitted({ manualWorklog: true }));
  }

  isFutureDateObj(dateObj: { date: string; month: string; year: string, day: string }) {
    return { value : this.isFutureDate(dateObj) };
  }

  handleCloseModal(overlayPanel: OverlayPanel): void {
    overlayPanel?.hide();
  }

  getLoggedHoursForDay(dateObj: { date: string; month: string; year: string, day: string }, worklog: any){
    if(this.isFutureDateObj(dateObj).value || !worklog) return '';
    return worklog?.loggedHour > 0 ? this.formatHours(worklog.loggedHour) : '';
  }

  addEmptyWorklog({ key: ticketId, summary: ticketDescription }: JiraIssueItem) {
    if (this.tableDetails.tickets.map((t) => t.ticket).includes(ticketId)) return;
    const ticketType = '';
    const date = this.tableDetails.dateAndDay[0]['_date'];
    this.store.dispatch(addEmptyWorklogForTicket({ date, ticketId, ticketType, ticketDescription }));
    this.ticketSearchVisible = false
  }

  showTicketSearch() {
    this.ticketSearchVisible = true;
    this.selectedIssue = { key: '', summary: ''};
  }

  hideTicketSearch() {
    this.ticketSearchVisible = false;
    this.selectedIssue = { key: '', summary: ''};
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
