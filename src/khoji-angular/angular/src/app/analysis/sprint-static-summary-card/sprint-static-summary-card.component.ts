/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { TabulatorTableActionService } from 'app/services/tabulator-table-action.service';
import { Action } from '../sprint-analytics-types';
import { Store } from '@ngrx/store';
import { AppState } from 'app/states/app-states';
import { selectWorklogSyncJobStatus } from 'app/states/sprint-analytics.selector';
import { Subscription } from 'rxjs';

export interface StatusChange {
  label?: string;
  from?: number;
  to?: number;
  change?: number;
  ticketIds?: string[];
  ticketChanges?: {
    added: Array<{ id: string; reason: string }>;
    removed: Array<{ id: string; reason: string }>;
  };
}

export interface StatusChangesData {
  progressed?: number;
  regressed?: number;
  net?: number;
  isDayOne?: boolean;
  toDo?: StatusChange;
  inProgress?: StatusChange;
  done?: StatusChange;
}

export interface SprintStaticSummary {
  title?: string;
  description?: string;
  isConcerning?: boolean;
  completedPoints?: number;
  totalPoints?: number;
  completionPercentage?: number;
  scopeChangePercentage?: number;
  staleTickets?: number;
  staleTicketIds?: string[];
  criticalBlockers?: number;
  criticalBlockerKey?: string;
  blockerIssueKeys?: string[];
  ticketHygienePercentage?: number;
  hygieneIssueIds?: {
    noAssigneeIds?: string[];
    missingStoryPointIds?: string[];
    missingDescriptionIds?: string[];
    missingPriorityIds?: string[];
  };
  statusChanges?: StatusChangesData;
  startDate?: string;
  endDate?: string;
  progressPercentage?: number;
  currentDay?: number;
  totalDays?: number;
}

@Component({
  selector: 'khoji-sprint-static-summary-card',
  standalone: true,
  templateUrl: './sprint-static-summary-card.component.html',
  styleUrls: ['./sprint-static-summary-card.component.scss'],
  imports: [CommonModule, CardModule, TooltipModule]
})
export class SprintStaticSummaryCardComponent implements OnInit, OnDestroy {
  subscription = new Subscription();

  @Input() statusChanges: StatusChangesData | null = null;
  @Input() tableId: string = '';
  @Input() sprintId: string | number | null = null;

  // Track which filters are currently active
  activeFilters: Set<string> = new Set();
  isCalculatingScopeChanges = false;

  constructor(private tabulatorTableActionSrv: TabulatorTableActionService, private store: Store<AppState>) {}

  ngOnInit(): void {
    const worklogSyncJobStatus$ = this.store.pipe(selectWorklogSyncJobStatus);

    this.subscription.add(
      worklogSyncJobStatus$.subscribe((jobStatusMap) => {
        // Only show calculating message if this sprint's worklog sync is running
        if (this.sprintId != null && typeof jobStatusMap === 'object' && jobStatusMap !== null) {
          this.isCalculatingScopeChanges = jobStatusMap[this.sprintId] === 'running';
        } else {
          this.isCalculatingScopeChanges = false;
        }
      })
    );
  }

  hasStatusChanges(): boolean {
    return !!this.statusChanges && (this.statusChanges.progressed != null || this.statusChanges.regressed != null || this.statusChanges.net != null);
  }

  hasStatusBadges(): boolean {
    return !!this.statusChanges && (this.statusChanges.progressed != null || this.statusChanges.regressed != null || this.statusChanges.net != null);
  }

  hasStatusColumns(): boolean {
    return !!this.statusChanges && (this.statusChanges.toDo != null || this.statusChanges.inProgress != null || this.statusChanges.done != null);
  }

  getStatusChangesHeader(): string {
    if (this.statusChanges?.isDayOne) {
      return 'Status Changes (Sprint Start → Today)';
    }
    return 'Status Changes (Yesterday → Today)';
  }

  tableAction(action: Action) {
    this.tabulatorTableActionSrv.triggerAction(this.tableId, action);
  }

  filterByStatus(statusCategory: 'toDo' | 'inProgress' | 'done') {
    const filterId = `status_${statusCategory}`;
    if (this.activeFilters.has(filterId)) {
      // Toggle off - clear the active filter state
      this.activeFilters.delete(filterId);
      const action: Action = {
        type: 'filter',
        field: 'issue_id',
        operator: 'in',
        value: []
      };
      this.tableAction(action);
    } else {
      // Toggle on - apply filter using ticket IDs from added list
      const statusData = this.statusChanges?.[statusCategory];
      const changes = statusData?.ticketChanges;
      if (changes?.added && changes.added.length > 0) {
        this.activeFilters.clear();
        this.activeFilters.add(filterId);
        const ticketIds = changes.added.map((item) => item.id);
        const action: Action = {
          type: 'filter',
          field: 'issue_id',
          operator: 'in',
          value: ticketIds
        };
        this.tableAction(action);
      }
    }
  }

  isFilterActive(filterId: string): boolean {
    return this.activeFilters.has(filterId);
  }

  // Build a structured tooltip for ticket changes (Added/Removed with reasons)
  getTicketsTooltip(statusCategory: 'toDo' | 'inProgress' | 'done'): string {
    const statusData = this.statusChanges?.[statusCategory];
    const changes = statusData?.ticketChanges;

    if (!changes) return '';

    const lines: string[] = [];
    const hasAdded = changes.added && changes.added.length > 0;
    const hasRemoved = changes.removed && changes.removed.length > 0;

    // If no changes at all, show "No status changes"
    if (!hasAdded && !hasRemoved) {
      return 'No status changes';
    }

    // Added section
    if (hasAdded) {
      lines.push('Added');
      const maxAdded = 10;
      const addedSlice = changes.added.slice(0, maxAdded);
      addedSlice.forEach((item) => {
        lines.push(`${item.id}: ${item.reason}`);
      });
      if (changes.added.length > maxAdded) {
        lines.push(`... and ${changes.added.length - maxAdded} more`);
      }
      lines.push('');
    }

    // Removed section
    if (hasRemoved) {
      lines.push('Removed');
      const maxRemoved = 10;
      const removedSlice = changes.removed.slice(0, maxRemoved);
      removedSlice.forEach((item) => {
        lines.push(`${item.id}: ${item.reason}`);
      });
      if (changes.removed.length > maxRemoved) {
        lines.push(`... and ${changes.removed.length - maxRemoved} more`);
      }
    }

    return lines.join('\n');
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
