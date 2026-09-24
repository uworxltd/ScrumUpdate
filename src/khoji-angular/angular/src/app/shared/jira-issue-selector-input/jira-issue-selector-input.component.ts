/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { findElement, wait } from '../helper-functions';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { JiraService, JiraIssueItem } from 'app/services/jira.service';

export interface AutoCompleteEvent {
  originalEvent: Event;
  query: string;
}

@Component({
  selector: 'khoji-jira-issue-selector-input',
  standalone: true,
  imports: [CommonModule, AutoCompleteModule, FormsModule],
  templateUrl: './jira-issue-selector-input.component.html',
  styleUrls: ['./jira-issue-selector-input.component.scss']
})
export class JiraIssueSelectorInputComponent implements OnInit {
  suggestions: JiraIssueItem[] | undefined;

  @Input() placeholder = 'Jira ticket id or description';
  @Input() selectedIssue: JiraIssueItem;
  @Output() selectedIssueChange = new EventEmitter<JiraIssueItem>();

  @ViewChild('autoComplete') autoComplete: ElementRef<HTMLDivElement>; 

  constructor(private jiraService: JiraService) {}

  ngOnInit(): void {
    this.jiraService
      .getSearchResults(100) // Using 100ms debounce time
      .subscribe((data) => (this.suggestions = data));
  }

  searchIssues = (event: AutoCompleteEvent) => {
    if (event.query) {
      this.jiraService.searchIssues(event.query);
    }
  };

  async focus() {
    const input = await findElement(`input`, 1000, this.autoComplete.nativeElement);
  
    if (input) {
      await wait(500);
      (input as HTMLInputElement).focus();
    }
  }
}
