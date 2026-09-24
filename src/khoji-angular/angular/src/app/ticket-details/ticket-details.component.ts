import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { deleteWorklogs, editWorklogs, setManualWorklogSubmitted, submitPopupWorklogs } from 'app/log-my-work/state/log-my-work.action';
import { selectInstanceUser, selectSelectedTicketDetails, selectTicketWorklogs, selectUniqueIdentifier } from 'app/log-my-work/state/log-my-work.selector';
import { AIGeneratedWorklogPayload, AIWorklog, AppState, LoadingState, TicketWorklogData, WorklogItem } from 'app/states/app-states';
import { selectDeleteWorklogLoadingState, selectEditWorklogLoadingState, selectPopupGeneratedWorklogLoadingState } from 'app/states/global-process.selector';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TabViewModule } from 'primeng/tabview';
import { combineLatest, Subscription } from 'rxjs';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { CacheService } from 'app/caching/cache.service';
import * as _ from 'lodash';
import { Constants } from 'app/constants';

export interface SelectedTicketDetails {
  ticketId: string;
  date: string;
}

@Component({
  selector: 'khoji-ticket-details',
  templateUrl: './ticket-details.component.html',
  styleUrls: ['./ticket-details.component.scss'],
  standalone: true,
  imports: [CommonModule, TabViewModule, InputTextModule, FormsModule, InputNumberModule, ButtonModule, InputTextareaModule]
})
export class TicketDetailsComponent implements OnInit, OnDestroy {
  @Output() closeModal = new EventEmitter();

  subscription: Subscription = new Subscription();
  ticketWorklogData: TicketWorklogData = {
    workLogItems: [],
    ticketId: '',
    ticketDescription: '',
  };
  accountId: string;
  uniqueIdentifier: string;
  selectedDate: string;
  tabActiveIndex: number = 0;

  deleteWorklogLoadingState: LoadingState;
  editWorklogLoadingState: LoadingState;
  newWorkLogLoadingState: LoadingState;
  isInputFieldTouched: boolean;
  clonedWorklogItems: TicketWorklogData;

  constructor(private store: Store<AppState>, private cacheService: CacheService) {}

  ngOnInit(): void {
    const ticketWorklogs$ = this.store.pipe(selectTicketWorklogs);
    const selectedTicket$ = this.store.pipe(selectSelectedTicketDetails);
    const instanceUser$ = this.store.pipe(selectInstanceUser);
    const uniqueIdentifier$ = this.store.pipe(selectUniqueIdentifier);
    const deleteWorklogLoadingState$ = this.store.pipe(selectDeleteWorklogLoadingState);
    const editWorklogLoadingState$ = this.store.pipe(selectEditWorklogLoadingState);
    const submitPopupLoadingState$ = this.store.pipe(selectPopupGeneratedWorklogLoadingState);

    this.subscription.add(
      submitPopupLoadingState$.subscribe((loadingState) => {
        this.newWorkLogLoadingState = loadingState;
      })
    );

    this.subscription.add(
      combineLatest([ticketWorklogs$, deleteWorklogLoadingState$]).subscribe(([ticketWorklogs, deleteLoadingState]) => {
        this.isInputFieldTouched = false;
        if (ticketWorklogs.workLogItems.length === 0 && deleteLoadingState === LoadingState.Pending) {
          ticketWorklogs.workLogItems.push({
            description: '',
            timeSpentInSeconds: null,
            timeSpentInHours: null,
            workLogId: ''
          });
        }

        this.ticketWorklogData = ticketWorklogs;
        this.clonedWorklogItems = _.cloneDeep(ticketWorklogs);

        if (!this.ticketWorklogData.workLogItems.find((w) => w.newWorklog)) {
          const newWorklogItem = {
            workLogId: '',
            timeSpentInHours: null,
            timeSpentInSeconds: null,
            description: '',
            newWorklog: true
          };

          this.ticketWorklogData.workLogItems.push(newWorklogItem);
        }

        this.deleteWorklogLoadingState = deleteLoadingState;

        if (deleteLoadingState === LoadingState.Done) {
          if (ticketWorklogs.workLogItems.filter((worklogItem) => !worklogItem.newWorklog).length === 0) {
            this.closeModal.emit();
          } else {
            this.tabActiveIndex = 0;
          }
        }
      })
    );

    this.subscription.add(
      instanceUser$.subscribe((userData) => {
        this.accountId = userData.accountId;
      })
    );

    this.subscription.add(selectedTicket$.subscribe((d) => (this.selectedDate = d.date)));

    this.subscription.add(
      editWorklogLoadingState$.subscribe((loadingState) => {
        this.editWorklogLoadingState = loadingState;
      })
    );

    this.subscription.add(uniqueIdentifier$.subscribe((u) => (this.uniqueIdentifier = u)));
  }

  deleteWorklog(workLogId: string, issueId: string) {
    this.cacheService.clearCache();
    this.store.dispatch(deleteWorklogs({ workLogs: { details: [{ issueId, workLogId }] } }));
    this.store.dispatch(setManualWorklogSubmitted({ manualWorklog: true }));
  }

  updateWorklog(worklogDetails: WorklogItem, issueId: string, ticketDescription: string, newWorklog = false) {
    const minTime = Constants.MINIMUM_WORKLOG_HOURS_ALLOWED_ON_JIRA;
    const logTime = worklogDetails.timeSpentInHours;
    const ticketWorklog: AIWorklog = {
      ticketId: issueId,
      ticketDescription,
      timelogInSeconds: (logTime > 0 && logTime < minTime ? minTime : logTime) * 3600,
      comment: worklogDetails.description,
      startedAt: this._formatDate(new Date(this.selectedDate)),
      workLogId: worklogDetails.workLogId
    };

    const updatedWorklog: AIGeneratedWorklogPayload = {
      accountId: this.accountId,
      uniqueIdentifier: this.uniqueIdentifier,
      worklogs: [ticketWorklog]
    };

    this.cacheService.clearCache();
    if (newWorklog) {
      this.store.dispatch(submitPopupWorklogs({ worklogs: updatedWorklog, loggedTimeDate: ticketWorklog.startedAt, manual: true }));
    } else {
      this.store.dispatch(editWorklogs({ workLogs: updatedWorklog }));
    }
    this.store.dispatch(setManualWorklogSubmitted({ manualWorklog: true }));
  }

  _formatDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
    return `${year}-${month}-${day}T09:${minutes}:${seconds}.${milliseconds}`;
  }

  isAnyCallLoading(): boolean {
    return this.deleteWorklogLoadingState === LoadingState.Loading || this.editWorklogLoadingState === LoadingState.Loading;
  }

  addNewEntry() {
    let newArr = [...this.ticketWorklogData.workLogItems];
    const index = newArr.findIndex((w) => w.newWorklog);

    const newWorklogItem = {
      workLogId: '',
      timeSpentInHours: null,
      timeSpentInSeconds: null,
      description: '',
      newWorklog: false
    };

    this.ticketWorklogData.workLogItems.splice(index, 0, newWorklogItem);
    this.clonedWorklogItems = _.cloneDeep(this.ticketWorklogData);

    setTimeout(() => {
      this.tabActiveIndex = index;
    }, 100);
  }

  isInDirtyState(index: number): boolean {
    const originalData = this.clonedWorklogItems.workLogItems[index];
    const updatedData = this.ticketWorklogData.workLogItems[index];
    return JSON.stringify(originalData) === JSON.stringify(updatedData);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
