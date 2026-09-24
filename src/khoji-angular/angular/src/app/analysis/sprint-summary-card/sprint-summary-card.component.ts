/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { SprintInsightCarouselActionService } from 'app/services/sprint-insight-carousel-action.service';
import { TabulatorTableActionService } from 'app/services/tabulator-table-action.service';
import { SafeHtmlPipe } from 'app/shared/safe-html.pipe';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { Action, Insight, KPI, Meta } from '../sprint-analytics-types';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { Store } from '@ngrx/store';
import { AppState } from 'app/states/app-states';
import { selectUserDefaultTeam } from 'app/admin/state/admin.selector';
import { selectCurrentInstance } from 'app/user-profile/state/user-profile.selectors';
import { Subscription } from 'rxjs';


@Component({
  selector: 'khoji-sprint-summary-card',
  standalone: true,
  templateUrl: './sprint-summary-card.component.html',
  styleUrl: './sprint-summary-card.component.scss',
  imports: [
    CommonModule,
    CardModule,
    ProgressBarModule,
    SafeHtmlPipe,
    TooltipModule,
    SkeletonModule,
  ],
})
export class SprintSummaryCardComponent implements OnInit, OnDestroy {
  @Input() meta: Meta;
  @Input() insights: Insight[] = [];
  @Input() kpi: KPI;
  @Input() tableId: string;
  @Input() carouselId: string;
  @Input() isLoading = false;
  @Input() staticSummaryData: any;

  private subscription = new Subscription();
  private teamName: string = '';
  private instanceName: string = '';
  activeFilters: Set<string> = new Set();

  constructor(
    private sprintInsightCarouselActionSrv: SprintInsightCarouselActionService,
    private tabulatorTableActionSrv: TabulatorTableActionService,
    private store: Store<AppState>) { }

  ngOnInit(): void {
    // Subscribe to team name
    this.subscription.add(
      this.store.pipe(selectUserDefaultTeam).subscribe((team) => {
        if (team?.teamName) {
          this.teamName = team.teamName;
        }
      })
    );

    // Subscribe to instance name
    this.subscription.add(
      this.store.pipe(selectCurrentInstance).subscribe((instance) => {
        if (instance) {
          this.instanceName = instance.name;
        }
      })
    );

    // Subscribe to table actions to detect when filters/groups are cleared from the table
    this.subscription.add(
      this.tabulatorTableActionSrv.onAction$(this.tableId).subscribe((action) => {
        if (action.type === 'filter' && Array.isArray(action.value) && action.value.length === 0) {
          // Filter was cleared from the table, clear our active filters
          this.activeFilters.clear();
        } else if (action.type === 'group' && (!action.field || action.field === '')) {
          // Group was cleared from the table, clear our active filters
          this.activeFilters.clear();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  get cardHeaderText(): string {
    const sprintName = this.staticSummaryData?.description || '';
    
    // Description already contains "instanceName - sprintName" format
    // Just prepend the team name
    if (this.teamName && sprintName) {
      return `${this.teamName} - ${sprintName}`;
    }
    return '';
  }

  get sprintDayInfo(): string {
    if (this.staticSummaryData?.currentDay && this.staticSummaryData?.totalDays) {
      return `Day ${this.staticSummaryData.currentDay}/${this.staticSummaryData.totalDays}`;
    }
    return '';
  }

  carouselAction(insightId: string) {
    this.sprintInsightCarouselActionSrv.triggerAction(this.carouselId, insightId);
  }

  getInsight(insightId: string) {
    return this.insights?.find(i=>i.id === insightId);
  }

  tableAction(action: Action) {
    this.tabulatorTableActionSrv.triggerAction(this.tableId, action)
  }

  tableActionListener(target: HTMLElement) {
    const actionJson = target.getAttribute('data-action');

    if (actionJson) {
      const action = JSON.parse(actionJson);
      this.tableAction(action);
    }
  }

  // Filter story points - toggle grouping
  filterStoryPoints() {
    const filterId = 'story_points';
    if (this.activeFilters.has(filterId)) {
      // Toggle off - clear grouping
      this.activeFilters.delete(filterId);
      this.tableAction({
        type: 'group',
        field: '',
        value: undefined
      });
    } else {
      // Toggle on - apply the group action
      if (this.kpi?.storyPoints?.action) {
        this.activeFilters.clear();
        this.activeFilters.add(filterId);
        this.tableAction(this.kpi.storyPoints.action);        // Ensure table is visible when grouping by story points
        this.tableAction({ type: 'expand' });      }
    }
  }

  // Filter scope change - toggle filtering
  filterScopeChange() {
    const filterId = 'scope_change';
    if (this.activeFilters.has(filterId)) {
      // Toggle off - clear the filter
      this.activeFilters.delete(filterId);
      const action: Action = {
        type: 'filter',
        field: 'issue_id',
        operator: 'in',
        value: []
      };
      this.tableAction(action);
    } else {
      // Toggle on - filter by scope addition ticket IDs
      const scopeAdditionIds = this.staticSummaryData?.scopeAdditionIds;
      
      if (scopeAdditionIds && scopeAdditionIds.length > 0) {
        this.activeFilters.clear();
        this.activeFilters.add(filterId);
        const action: Action = {
          type: 'filter',
          field: 'issue_id',
          operator: 'in',
          value: scopeAdditionIds
        };

        this.tableAction(action);
        // Ensure table is visible when filtering for scope changes
        this.tableAction({ type: 'expand' });
      }
    }
  }

  // Filter all hygiene issues at once
  filterAllHygieneIssues() {
    const filterId = 'hygiene_all';
    if (this.activeFilters.has(filterId)) {
      // Toggle off - clear the filter
      this.activeFilters.delete(filterId);
      const action: Action = {
        type: 'filter',
        field: 'issue_id',
        operator: 'in',
        value: []
      };
      this.tableAction(action);
    } else {
      // Toggle on - combine all hygiene issue IDs
      const hygieneIds = this.staticSummaryData?.hygieneIssueIds;
      if (hygieneIds) {
        const allIssueIds = new Set<string>();
        
        // Combine all hygiene issue types
        (hygieneIds.noAssigneeIds || []).forEach(id => allIssueIds.add(id));
        (hygieneIds.missingStoryPointIds || []).forEach(id => allIssueIds.add(id));
        (hygieneIds.missingDescriptionIds || []).forEach(id => allIssueIds.add(id));
        (hygieneIds.missingPriorityIds || []).forEach(id => allIssueIds.add(id));
        
        if (allIssueIds.size > 0) {
          this.activeFilters.clear();
          this.activeFilters.add(filterId);
          const action: Action = {
            type: 'filter',
            field: 'issue_id',
            operator: 'in',
            value: Array.from(allIssueIds)
          };

          this.tableAction(action);          // Ensure table is visible when filtering hygiene issues
          this.tableAction({ type: 'expand' });        }

      }
    }
  }

  isFilterActive(filterId: string): boolean {
    return this.activeFilters.has(filterId);
  }
}
