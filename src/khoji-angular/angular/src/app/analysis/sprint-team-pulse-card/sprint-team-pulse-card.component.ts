/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { ChipModule } from 'primeng/chip';
export interface TeamMember {
  name: string;
  avatar?: string;
  points: number;
  committedPoints?: number;
  percentage: number;
  role?: string;
}

export interface DataQuality {
  hasMissingAssignees: boolean;
  hasMissingStoryPoints: boolean;
  totalIssues: number;
  missingAssigneesCount: number;
  missingStoryPointsCount: number;
}

export interface TeamPulseData {
  title?: string;
  day?: string;
  pulseScore: number;
  pulseChange?: number;
  currentPoints?: number;
  totalPoints?: number;
  keyContributors: TeamMember[];
  members: TeamMember[];
  dataQuality?: DataQuality;
}

export interface EnrichedTeamMember extends TeamMember {
  initials: string;
  percentageColor: string;
}

@Component({
  selector: 'khoji-sprint-team-pulse-card',
  standalone: true,
  templateUrl: './sprint-team-pulse-card.component.html',
  styleUrls: ['./sprint-team-pulse-card.component.scss'],
  imports: [
    CommonModule,
    CardModule,
    TooltipModule,
    ChipModule
  ],
})
export class SprintTeamPulseCardComponent {
  private _teamPulseData: TeamPulseData | null = null;
  
  // Pre-computed values for template
  pulseScoreColor = 'var(--red-600)';
  pulseChangeIcon = '';
  pulseChangeClass = '';
  members: EnrichedTeamMember[] = [];
  keyContributors: EnrichedTeamMember[] = [];
  hasData = false;
  missingDataReason = '';
  
  @Input() 
  set teamPulseData(value: TeamPulseData | null) {
    this._teamPulseData = value;
    const dataCheck = this.hasMeaningfulData(value);
    this.hasData = dataCheck.hasData;
    this.missingDataReason = dataCheck.reason;
    this.updateComputedValues();
  }
  get teamPulseData(): TeamPulseData | null {
    return this._teamPulseData;
  }

  /**
   * Check if the team pulse data contains meaningful information
   * Returns object with hasData boolean and reason string
   */
  private hasMeaningfulData(data: TeamPulseData | null): { hasData: boolean, reason: string } {
    if (!data) {
      return { hasData: false, reason: 'No team work progress data available for this sprint.' };
    }
    
    let reason = '';
    
    // Use backend data quality flags if available
    if (data.dataQuality) {
      const dq = data.dataQuality;
      const hasMissingAssignees = dq.hasMissingAssignees;
      const hasMissingStoryPoints = dq.hasMissingStoryPoints;
      
      if (hasMissingAssignees && hasMissingStoryPoints) {
        reason = `${dq.missingAssigneesCount} issue(s) missing assignees and ${dq.missingStoryPointsCount} issue(s) missing story points. Please assign team members and estimate story points.`;
      } else if (hasMissingAssignees) {
        reason = `${dq.missingAssigneesCount} of ${dq.totalIssues} issue(s) are missing assignees. Please assign team members to see workload progress.`;
      } else if (hasMissingStoryPoints) {
        reason = `${dq.missingStoryPointsCount} of ${dq.totalIssues} issue(s) are missing story points. Please add story point estimates to track progress.`;
      } else
      reason ="Not enough data to display this view"
    }
    
    const hasMembers = data.members && data.members.length > 0;
    const hasPoints = (data.currentPoints && data.currentPoints > 0) || 
                     (data.totalPoints && data.totalPoints > 0);
    const hasPulseScore = data.pulseScore && data.pulseScore > 0;
    
    // Data is meaningful if we have members AND points AND pulse score
    const hasData = hasMembers && hasPoints;
    
    return { hasData, reason };
  }
    
  constructor() { }

  private updateComputedValues(): void {
    if (!this._teamPulseData) {
      this.pulseScoreColor = 'var(--red-600)';
      this.pulseChangeIcon = '';
      this.pulseChangeClass = '';
      this.members = [];
      this.keyContributors = [];
      return;
    }

    // Compute pulse score color
    this.pulseScoreColor = this.getPercentageColor(this._teamPulseData.pulseScore || 0);

    // Compute pulse change icon and class
    const change = this._teamPulseData.pulseChange;
    if (change !== null && change !== undefined) {
      if (change === 0) {
        this.pulseChangeIcon = 'pi-minus';
        this.pulseChangeClass = 'text-color-secondary';
      } else {
        this.pulseChangeIcon = change > 0 ? 'pi-arrow-up' : 'pi-arrow-down';
        this.pulseChangeClass = change > 0 ? 'text-green-700' : 'text-red-600';
      }
    } else {
      this.pulseChangeIcon = '';
      this.pulseChangeClass = '';
    }

    // Pre-compute member values with initials and color
    this.members = (this._teamPulseData.members || []).map(member => ({
      ...member,
      initials: this.getInitials(member.name),
      percentageColor: this.getPercentageColor(member.percentage)
    }));

    // Pre-compute key contributor values
    this.keyContributors = (this._teamPulseData.keyContributors || []).map(contributor => ({
      ...contributor,
      initials: this.getInitials(contributor.name),
      percentageColor: this.getPercentageColor(contributor.percentage)
    }));
  }

  private getPercentageColor(percentage: number): string {
    if (percentage >= 80) return 'var(--green-700)';
    if (percentage >= 50) return 'var(--yellow-700)';
    return 'var(--red-600)';
  }

  private getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.includes('.') ? name.split('.') : name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}
