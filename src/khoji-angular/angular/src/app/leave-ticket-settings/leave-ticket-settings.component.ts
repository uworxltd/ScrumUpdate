/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { AppState, SearchIssuesSuggestions } from 'app/states/app-states';
import { selectTranslation } from 'app/states/global-translations.selector';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { Subscription } from 'rxjs';
import { saveUserLeavesPreference } from 'app/admin/state/admin.actions';
import { wait } from 'app/shared/helper-functions';
import { JiraService } from 'app/services/jira.service';
import { FormsModule } from '@angular/forms';
import { selectInstanceUser } from 'app/log-my-work/state/log-my-work.selector';
import { fetchInstanceUserMetaData } from 'app/log-my-work/state/log-my-work.action';
import { InputTextModule } from 'primeng/inputtext';
import { Constants } from 'app/constants';

@Component({
  selector: 'khoji-leave-ticket-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, AutoCompleteModule, InputTextModule],
  templateUrl: './leave-ticket-settings.component.html',
  styleUrls: ['./leave-ticket-settings.component.scss']
})
export class LeaveTicketSettingsComponent implements OnInit, OnDestroy {
  subscription = new Subscription();
  translation$ = this.store.pipe(selectTranslation);
  isLoading = { loading: true };
  searchSuggestions: SearchIssuesSuggestions[] = [];
  leavesTicket: SearchIssuesSuggestions = {
    key: '',
    summary: ''
  };
  originalLeavesTicket: SearchIssuesSuggestions = {
    key: '',
    summary: ''
  };
  selectedLeavesTicket: SearchIssuesSuggestions = {
    key: '',
    summary: ''
  };

  constructor(private store: Store<AppState>, private jiraService: JiraService) {}

  async ngOnInit() {
    if (await sessionStorage.trackItem(Constants.INSTANCE_ID)) {
      this.store.dispatch(fetchInstanceUserMetaData());
    }

    this.subscription.add(
      this.store.pipe(selectInstanceUser).subscribe((instanceUser) => {
        setTimeout(()=>{
          this.isLoading = { loading: instanceUser?.instanceId !== sessionStorage.getItem(Constants.INSTANCE_ID) }
        }, 0);
        if (instanceUser?.userPreferences && !this.hasChanges()) {
          this.originalLeavesTicket = { ...this.leavesTicket, key: instanceUser.userPreferences.LEAVES ?? '' };
          this.leavesTicket = this.selectedLeavesTicket = { ...this.originalLeavesTicket };
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
  }

  searchIssues(event: any): void {
    if (event.query) {
      this.jiraService.searchIssues(event.query);
    }
  }

  onTicketSelected(event: SearchIssuesSuggestions): void {
    this.selectedLeavesTicket = { key: event.key, summary: event.summary };
  }

  private isLeaveTicketCleared(value: SearchIssuesSuggestions | string | null | undefined): boolean {
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value === 'string') {
      return value.trim() === '';
    }
    return !value.key?.trim();
  }

  onLeavesTicketModelChange(value: SearchIssuesSuggestions | string | null): void {
    if (this.isLeaveTicketCleared(value)) {
      this.selectedLeavesTicket = { key: '', summary: '' };
    }
  }

  async handleFocusOut() {
    await wait(500);
    if (this.isLeaveTicketCleared(this.leavesTicket as SearchIssuesSuggestions | string | null)) {
      this.selectedLeavesTicket = { key: '', summary: '' };
      this.leavesTicket = { ...this.selectedLeavesTicket };
    } else {
      // Typed text without selecting a suggestion — snap back to last valid selection
      this.leavesTicket = this.selectedLeavesTicket;
    }
  }

  hasChanges() {
    return this.selectedLeavesTicket.key !== this.originalLeavesTicket.key;
  }

  saveChanges(showToast: boolean) {
    this.store.dispatch(saveUserLeavesPreference({ ticketID: this.selectedLeavesTicket.key, showToast }));
    this.originalLeavesTicket = { ...this.selectedLeavesTicket };
  }

  reset() {
    this.leavesTicket = this.selectedLeavesTicket = this.originalLeavesTicket;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
