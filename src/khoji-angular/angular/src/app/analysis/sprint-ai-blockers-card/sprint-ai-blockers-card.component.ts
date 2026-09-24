/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { AnalyticsService, SprintSignal } from '../../services/analytics.service';
import { finalize, takeUntil } from 'rxjs/operators';
import { Subscription, Subject } from 'rxjs';
import { Store } from '@ngrx/store';
import { AppState } from 'app/states/app-states';
import { selectCurrentInstance } from 'app/user-profile/state/user-profile.selectors';
import { JiraIssueTooltipComponent } from "app/shared/jira-issue-tooltip/jira-issue-tooltip.component";

@Component({
  selector: 'khoji-sprint-ai-blockers-card',
  templateUrl: './sprint-ai-blockers-card.component.html',
  styleUrls: ['./sprint-ai-blockers-card.component.scss'],
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, TagModule, DialogModule, TooltipModule, JiraIssueTooltipComponent]
})
export class SprintAiBlockersCardComponent implements OnInit, OnDestroy, OnChanges {
  @Input() carouselId: string;
  @Input() sprintId: string;

  subscription = new Subscription();
  signals: SprintSignal[] = [];
  isLoading = false;
  hasError = false;
  activeTab: 'human-sensed' | 'jira-insights' = 'jira-insights';
  private isLoadingInProgress = false;
  private lastLoadedSprintId: string = null;
  private lastLoadedTab: 'human-sensed' | 'jira-insights' = null;
  private destroy$ = new Subject<void>();
  private instanceName: string = '';

  // Modal state
  displayExplanation = false;
  selectedSignal: SprintSignal | null = null;

  constructor(private analyticsService: AnalyticsService, private cdr: ChangeDetectorRef, private store: Store<AppState>) {}

  ngOnInit() {
    // Subscribe to get the current instance name
    this.subscription.add(
      this.store.pipe(selectCurrentInstance).subscribe((instance) => {
        if (instance) {
          this.instanceName = instance.name;
        }
      })
    );
  }

  ngOnChanges(changes: SimpleChanges) {
    // Load data when sprintId input changes (including initial set)
    if (changes['sprintId'] && changes['sprintId'].currentValue) {
      this.loadSprintSignals();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscription.unsubscribe();
  }

  loadSprintSignals() {
    if (!this.sprintId) {
      return;
    }

    // Prevent duplicate loads of the same sprint with the same tab
    if (this.sprintId === this.lastLoadedSprintId && this.activeTab === this.lastLoadedTab) {
      return;
    }

    // Prevent multiple concurrent requests
    if (this.isLoadingInProgress) {
      return;
    }

    // Load real data for both tabs (jira-insights and human-sensed)
    this.isLoadingInProgress = true;
    this.isLoading = true;
    this.hasError = false;
    this.lastLoadedSprintId = this.sprintId;
    this.lastLoadedTab = this.activeTab;

    // Use optimized endpoint based on tab
    const request$ = this.activeTab === 'jira-insights' ? this.analyticsService.getSprintSignalsJira(this.sprintId) : this.analyticsService.getSprintSignalsHuman(this.sprintId);

    const sub = request$
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.isLoadingInProgress = false;
        })
      )
      .subscribe({
        next: (response) => {
          this.signals = response.signals || [];
          this.hasError = false;
        },
        error: (err) => {
          this.signals = [];
          this.hasError = true;
        }
      });
    this.subscription.add(sub);
  }

  switchTab(tab: 'human-sensed' | 'jira-insights') {
    if (this.activeTab !== tab && !this.isLoadingInProgress) {
      this.activeTab = tab;
      this.lastLoadedTab = null; // Reset to force reload with new tab
      this.loadSprintSignals();
    }
  }

  showDetails(signal: SprintSignal) {
    signal.isExpanded = !signal.isExpanded;
    this.cdr.detectChanges();
  }

  explainSignal(signal: SprintSignal) {
    this.selectedSignal = signal;
    this.displayExplanation = true;
  }

  openTicket(ticket: string): void {
    const jiraUrl = `https://${this.instanceName}.atlassian.net/browse/${ticket}`;
    window.open(jiraUrl, '_blank');
  }

  getJiraUrl(ticket: string): string {
    return `https://${this.instanceName}.atlassian.net/browse/${ticket}`;
  }

  formatDependencies(signal: SprintSignal): string[] {
    // For blockers, show the dependency chains (blocker → blocked)
    if (signal.dependencies && signal.dependencies.length > 0) {
      return signal.dependencies as string[];
    }
    // Fallback to tickets if they contain chains
    if (signal.tickets && signal.tickets.length > 0) {
      return signal.tickets;
    }
    return [];
  }

  getTicketsFromDependency(item: string): [string, string] {
    // Extract ticket number from dependency chain
    // For blocker chains formatted as "KFX-250 → KFX-353" (blocked → blocker)
    // We want to link to the BLOCKED ticket (the first one), not the blocker
    if (item.includes(' → ')) {
      const [ticket, blockedByTicket] = item.split(' → ');
      return [ticket.trim(), blockedByTicket.trim()];
    }

    return [item.trim(), ''];
  }

  // Calculate velocity metrics for display
  calculateVelocityMetrics(signal: SprintSignal): {
    avgPointsPerDay: number;
    requiredPointsPerDay: number;
    daysRemaining: number;
    pointsRemaining: number;
  } {
    const metrics = signal.velocityMetrics;
    if (!metrics) {
      return { avgPointsPerDay: 0, requiredPointsPerDay: 0, daysRemaining: 0, pointsRemaining: 0 };
    }

    return {
      avgPointsPerDay: Math.round(metrics.avgPointsPerDay * 10) / 10,
      requiredPointsPerDay: Math.round(metrics.requiredPointsPerDay * 10) / 10,
      daysRemaining: metrics.daysRemaining,
      pointsRemaining: Math.round(metrics.pointsRemaining)
    };
  }

  // Declare severityMap as a static property of the class
  static severityMap = {
    danger: 'signal-danger',
    warning: 'signal-warning',
    info: 'signal-info'
  };

  getSeverityClass(type: string): string {
    return SprintAiBlockersCardComponent.severityMap[type] || 'signal-info';
  }

  cleanBackendData(signal: SprintSignal): SprintSignal {
    // Dependencies are already strings (dependency chains) from the backend
    // Just trim them for consistency
    if (signal.dependencies) {
      signal.dependencies = signal.dependencies.map((dep) => dep.trim());
    }

    if (signal.tickets) {
      signal.tickets = signal.tickets.map((ticket) => ticket.trim());
    }

    return signal;
  }

  // Convert ticket mentions in explanation text to clickable links
  makeTicketsClickable(explanation: string): string {
    if (!explanation) return '';

    // Replace ticket patterns (e.g., KFX-123, KFX-123 → KFX-456) with clickable links
    const ticketPattern = /([A-Z]+-\d+)/g;
    return explanation.replace(ticketPattern, (match) => {
      const jiraUrl = `https://${this.instanceName}.atlassian.net/browse/${match}`;
      return `<a href="${jiraUrl}" target="_blank" class="ticket-link-inline" style="color: #1976d2; text-decoration: underline; font-weight: 500;">${match}</a>`;
    });
  }

  // Get initials from user name (e.g., "John Doe" -> "JD")
  getInitials(name: string): string {
    if (!name) return '??';

    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  // Get tooltip text for team member avatar
  getAvatarTooltip(assignee: { name: string; count: number; tickets?: string[] }): string {
    if (!assignee) return '';

    const taskWord = assignee.count === 1 ? 'task' : 'tasks';
    let tooltip = `${assignee.name}<br/>${assignee.count} active ${taskWord}`;

    // Add ticket list if available
    if (assignee.tickets && assignee.tickets.length > 0) {
      tooltip += '<br/><br/>' + assignee.tickets.join(', ');
    }

    return tooltip;
  }

  // Format timestamp for display (e.g., "2025-11-07 14:20:00" -> "Nov 7, 2:20 PM")
  formatTimestamp(timestamp: string): string {
    if (!timestamp) return '';

    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return timestamp; // Return original if parsing fails
    }
  }
}
