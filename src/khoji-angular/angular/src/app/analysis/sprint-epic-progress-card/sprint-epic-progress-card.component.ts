/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { AppState } from 'app/states/app-states';
import { selectCurrentInstance } from 'app/user-profile/state/user-profile.selectors';
import { selectSprintEpicProgressValue } from 'app/states/sprint-analytics.selector';
import { AnalyticsService } from 'app/services/analytics.service';
import { PdfExportService } from 'app/services/pdf-export.service';
import { PngExportService } from 'app/services/png-export.service';

export interface Ticket {
  key: string;
  summary: string;
  status: string;
  storyPoints: number;
}

export interface EpicProgress {
  epicKey: string;
  epicName: string;
  storyPoints: {
    completed: number;
    total: number;
    percentage: number;
  };
  tickets: Ticket[];
  epicInsights: {
    scopeChange: string;
    stuckStories: string;
    riskFlag: string;
    forecast: string;
  } | null;
  isExpanded?: boolean;
  isLoadingInsights?: boolean;
  aiInsights?: {
    insights: string[];
  };
  ticketHygienePercentage?: number;
  deliveryHealthPercentage?: number;
  deliveryConfidencePercentage?: number;
  sprintTimeline?: any[];
}

export interface TicketInsights {
  issueKey: string;
  summary: string;
  currentStatus: string;
  currentStatusDays: number;
  priority: string;
  aiInsights: {
    whatWentWrong: string[];
    rootCause: string;
    recommendedActions: string[];
    timelineHighlights: Array<{
      daysAgo: number;
      description: string;
      icon: string;
    }>;
  };
}

@Component({
  selector: 'khoji-sprint-epic-progress-card',
  templateUrl: './sprint-epic-progress-card.component.html',
  styleUrls: ['./sprint-epic-progress-card.component.scss'],
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, TagModule, DialogModule, TooltipModule, ProgressSpinnerModule]
})
export class SprintEpicProgressCardComponent implements OnInit, OnDestroy {
  @Input() carouselId: string;
  @Input() sprintId: string;

  subscription = new Subscription();
  epics: EpicProgress[] = [];
  isLoading = false;
  hasError = false;
  private instanceName: string = '';

  // Modal state
  displayTicketDetails = false;
  selectedTicket: Ticket | null = null;
  ticketInsights: TicketInsights | null = null;
  isLoadingTicketInsights = false;

  // Epic modal state
  displayEpicDetails = false;
  selectedEpic: EpicProgress | null = null;
  epicDetailsInsights: any = null;
  isLoadingEpicDetailsInsights = false;
  epicTimelineEvents: Array<{ daysAgo: number; description: string; type: string }> = [];
  displayEpicConfirmation?: boolean;
  constructor(private cdr: ChangeDetectorRef, private store: Store<AppState>, private analyticsService: AnalyticsService, private pdfExportService: PdfExportService, private pngExportService: PngExportService) {}

  getTicketTooltip(ticket: Ticket): string {
    const points = ticket.storyPoints ? `${ticket.storyPoints} pts` : 'N/A';
    return `<div class="ticket-tooltip-content"><div class="tooltip-line"><strong>${ticket.status}</strong> • ${points}</div><div class="tooltip-summary">${ticket.summary}</div></div>`;
  }

  ngOnInit() {
    // Subscribe to get the current instance name
    this.subscription.add(
      this.store.pipe(selectCurrentInstance).subscribe((instance) => {
        if (instance) {
          this.instanceName = instance.name;
        }
      })
    );

    // Subscribe to epic progress data from the store
    this.subscription.add(
      this.store.pipe(selectSprintEpicProgressValue).subscribe((data) => {
        
        if (data && data.epics) {
          this.epics = Array.isArray(data.epics)
            ? data.epics
                .map((epic) => {
                  return {
                    ...epic,
                    epicInsights: null, // Don't show static insights
                    isExpanded: false,
                    isLoadingInsights: false,
                    aiInsights: undefined
                  };
                })
                .sort((a, b) => b.storyPoints.percentage - a.storyPoints.percentage)
            : [];
          this.isLoading = false;
          this.hasError = false;
        } else if (data === null || data === undefined) {
          // No data available yet - keep loading
          this.isLoading = true;
        } else {
          // Data received but no epics found
          this.epics = [];
          this.isLoading = false;
          this.hasError = false;
        }
        this.cdr.detectChanges();
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  showDetails(epic: EpicProgress) {
    this.openEpicDetails(epic);
  }

  openEpicInJira(epic: EpicProgress): void {
    const jiraUrl = `https://${this.instanceName}.atlassian.net/browse/${epic.epicKey}`;
    window.open(jiraUrl, '_blank');
  }

  openTicketInJira(ticket: Ticket): void {
    const jiraUrl = `https://${this.instanceName}.atlassian.net/browse/${ticket.key}`;
    window.open(jiraUrl, '_blank');
  }

  openTicketDetails(ticket: Ticket, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.selectedTicket = ticket;
    this.displayTicketDetails = true;
    this.ticketInsights = null;
    this.isLoadingTicketInsights = true;

    // Make AI call when ticket is clicked
    this.subscription.add(
      this.analyticsService.getTicketInsights(ticket.key).subscribe({
        next: (insights) => {
          this.ticketInsights = insights;
          this.isLoadingTicketInsights = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error fetching ticket insights:', error);
          this.isLoadingTicketInsights = false;
          // Show error state in modal
          this.ticketInsights = {
            issueKey: ticket.key,
            summary: ticket.summary,
            currentStatus: ticket.status,
            currentStatusDays: 0,
            priority: '',
            aiInsights: {
              whatWentWrong: ['Unable to fetch AI insights. Please try again.'],
              rootCause: 'Error',
              recommendedActions: ['Retry loading insights'],
              timelineHighlights: []
            }
          };
          this.cdr.detectChanges();
        }
      })
    );
  }

  openTicket(ticket: Ticket | string): void {
    const ticketKey = typeof ticket === 'string' ? ticket : ticket.key;
    const jiraUrl = `https://${this.instanceName}.atlassian.net/browse/${ticketKey}`;
    window.open(jiraUrl, '_blank');
  }

  getJiraUrl(ticket: Ticket | string): string {
    const ticketKey = typeof ticket === 'string' ? ticket : ticket.key;
    return `https://${this.instanceName}.atlassian.net/browse/${ticketKey}`;
  }

  openJiraComments(ticketKey: string): void {
    if (!ticketKey) {
      return;
    }
    const jiraUrl = `https://${this.instanceName}.atlassian.net/browse/${ticketKey}`;
    window.open(jiraUrl, '_blank');
  }

  // Epic modal methods
  openEpicDetails(epic: EpicProgress, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.selectedEpic = epic;
    this.displayEpicDetails = true;
    this.isLoadingEpicDetailsInsights = true;
    this.epicDetailsInsights = null;
    this.epicTimelineEvents = [];

    // Fetch epic insights
    this.subscription.add(
      this.analyticsService.getEpicInsights(epic.epicKey, this.sprintId).subscribe({
        next: (response) => {
          this.epicDetailsInsights = response;

          // Extract timeline events from insights
          if (response?.timelineHighlights) {
            this.epicTimelineEvents = response.timelineHighlights;
          }

          // Merge metrics into selectedEpic
          if (this.selectedEpic) {
            this.selectedEpic.ticketHygienePercentage = response?.ticketHygienePercentage || 0;
            this.selectedEpic.deliveryHealthPercentage = response?.deliveryHealthPercentage || 0;
            this.selectedEpic.deliveryConfidencePercentage = response?.deliveryConfidencePercentage || 0;
            this.selectedEpic.sprintTimeline = response?.sprintTimeline || [];
          }

          this.isLoadingEpicDetailsInsights = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error fetching epic insights:', error);
          this.isLoadingEpicDetailsInsights = false;
          this.epicDetailsInsights = {
            insights: ['Unable to fetch AI insights. Please try again.'],
            ticketHygieneInsights: []
          };
          this.cdr.detectChanges();
        }
      })
    );
  }

  getEpicJiraUrl(epicKey: string): string {
    return `https://${this.instanceName}.atlassian.net/browse/${epicKey}`;
  }

  getHygieneClass(): string {
    const percentage = this.selectedEpic?.ticketHygienePercentage || 0;
    if (percentage >= 80) return 'hygiene-excellent';
    if (percentage >= 60) return 'hygiene-good';
    if (percentage >= 40) return 'hygiene-fair';
    return 'hygiene-poor';
  }

  getDeliveryHealthClass(): string {
    const percentage = this.selectedEpic?.deliveryHealthPercentage || 0;
    if (percentage >= 80) return 'hygiene-excellent';
    if (percentage >= 60) return 'hygiene-good';
    if (percentage >= 40) return 'hygiene-fair';
    return 'hygiene-poor';
  }

  getDeliveryConfidenceClass(): string {
    const percentage = this.selectedEpic?.deliveryConfidencePercentage || 0;
    if (percentage >= 80) return 'hygiene-excellent';
    if (percentage >= 60) return 'hygiene-good';
    if (percentage >= 40) return 'hygiene-fair';
    return 'hygiene-poor';
  }

  getTimelineEventIcon(event: any): string {
    return 'pi-info-circle';
  }

  getInProgressTickets(): Ticket[] {
    return this.selectedEpic?.tickets?.filter((t) => t.status === 'In Progress') || [];
  }

  getTodoTickets(): Ticket[] {
    return this.selectedEpic?.tickets?.filter((t) => t.status === 'To Do') || [];
  }

  getDoneTickets(): Ticket[] {
    return this.selectedEpic?.tickets?.filter((t) => t.status === 'Done') || [];
  }

  getInProgressTicketKeys(): string {
    return this.getInProgressTickets()
      .map((t) => t.key)
      .join(', ');
  }

  getTodoTicketKeys(): string {
    return this.getTodoTickets()
      .map((t) => t.key)
      .join(', ');
  }

  // PDF Export Methods - delegated to PdfExportService
  downloadTicketPDF(): void {
    if (!this.selectedTicket || !this.ticketInsights) {
      console.error('No ticket data available for export');
      return;
    }

    const ticketData = {
      key: this.selectedTicket.key,
      summary: this.selectedTicket.summary,
      status: this.ticketInsights.currentStatus,
      statusDays: this.ticketInsights.currentStatusDays,
      priority: this.ticketInsights.priority,
      insights: this.ticketInsights.aiInsights
    };

    try {
      const doc = this.pdfExportService.generateTicketPDF(ticketData);
      doc.save(`${this.selectedTicket.key}_details.pdf`);
    } catch (error) {
      console.error('Error generating ticket PDF:', error);
    }
  }

  downloadEpicPDF(): void {
    if (!this.selectedEpic) {
      console.error('No epic data available for export');
      return;
    }

    try {
      const epicData = {
        key: this.selectedEpic.epicKey,
        name: this.selectedEpic.epicName,
        summary: this.epicDetailsInsights?.summary || '',
        storyPoints: this.selectedEpic.storyPoints,
        ticketMetrics: {
          done: this.getDoneTickets().length,
          inProgress: this.getInProgressTickets().length,
          todo: this.getTodoTickets().length
        },
        hygienePercentage: this.selectedEpic.ticketHygienePercentage || 0,
        healthPercentage: this.selectedEpic.deliveryHealthPercentage || 0,
        confidencePercentage: this.selectedEpic.deliveryConfidencePercentage || 0,
        risks: this.selectedEpic.epicInsights ? [this.selectedEpic.epicInsights.riskFlag] : [],
        recommendations: this.epicDetailsInsights?.insights || [],
        tickets: (this.selectedEpic.tickets || []).map((t) => ({
          key: t.key,
          summary: t.summary,
          status: t.status,
          points: t.storyPoints || 0
        }))
      };

      const doc = this.pdfExportService.generateEpicPDF(epicData);
      const filename = `${this.selectedEpic.epicKey}_epic_details.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error('Error generating epic PDF:', error);
    }
  }

  /**
   * Capture ticket popup as high-fidelity PNG image
   * Delegates to PNG export service for consistent handling
   */
  async downloadTicketScreenshot(): Promise<void> {
    if (!this.selectedTicket || !this.ticketInsights) {
      console.error('No ticket data available for export');
      return;
    }

    try {
      const dialogs = document.querySelectorAll('.p-dialog');
      if (dialogs.length === 0) {
        console.error('No dialog found in DOM');
        return;
      }

      const dialogContent = dialogs[dialogs.length - 1] as HTMLElement;
      if (!dialogContent.offsetParent) {
        console.error('Dialog is not visible');
        return;
      }

      const filename = `ticket-${this.selectedTicket.key}.png`;
      await this.pngExportService.captureFullDialogAsImage(dialogContent, filename);
    } catch (error) {
      console.error('Error capturing ticket screenshot:', error);
    }
  }

  /**
   * Capture epic popup as high-fidelity PNG image
   * Delegates to PNG export service for consistent handling
   */
  async downloadEpicScreenshot(): Promise<void> {
    if (!this.selectedEpic) {
      console.error('No epic data available for export');
      return;
    }

    try {
      const dialogs = document.querySelectorAll('.p-dialog');
      if (dialogs.length === 0) {
        console.error('No dialog found in DOM');
        return;
      }

      const dialogElement = dialogs[dialogs.length - 1] as HTMLElement;
      if (!dialogElement.offsetParent) {
        console.error('Dialog is not visible');
        return;
      }

      // Clone the dialog to avoid modifying the actual DOM visible on screen
      const clonedDialog = dialogElement.cloneNode(true) as HTMLElement;

      // Position it off-screen but still renderable
      clonedDialog.style.position = 'fixed';
      clonedDialog.style.top = '0';
      clonedDialog.style.left = '-10000px';
      clonedDialog.style.zIndex = '-9999';
      clonedDialog.style.opacity = '1';
      clonedDialog.style.visibility = 'visible';
      document.body.appendChild(clonedDialog);

      // Expand scrollable content in the clone
      const scrollableContent = clonedDialog.querySelector('.epic-insights-content') as HTMLElement;
      if (scrollableContent) {
        scrollableContent.style.maxHeight = 'none';
        scrollableContent.style.overflow = 'visible';
        scrollableContent.style.height = 'auto';
      }

      // Expand dialog body in the clone
      const dialogBody = clonedDialog.querySelector('.p-dialog-content') as HTMLElement;
      if (dialogBody) {
        dialogBody.style.maxHeight = 'none';
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      const filename = `epic-${this.selectedEpic.epicKey}.png`;
      await this.pngExportService.captureFullDialogAsImage(clonedDialog, filename);

      // Remove the cloned element
      document.body.removeChild(clonedDialog);
    } catch (error) {
      console.error('Error capturing epic screenshot:', error);
    }
  }

  confirmViewDetails(): void {}

  confirmOpenInJira(): void {}
}
