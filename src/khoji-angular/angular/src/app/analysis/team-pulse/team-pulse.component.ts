/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { Store } from '@ngrx/store';
import { AppState, LoadingState } from 'app/states/app-states';
import { selectUserProfile } from 'app/user-profile/state/user-profile.selectors';
import { selectUserDefaultTeam } from 'app/admin/state/admin.selector';
import { fetchKhojiTeamsList } from 'app/admin/state/admin.actions';
import { Subscription, combineLatest } from 'rxjs';
import { SavedDailyScrumUpdate } from 'app/interface/daily-scrum-update.interface';
import { distinctUntilChanged, filter } from 'rxjs/operators';
import { Team } from 'app/admin/admin.entities';
import { selectSavedDailyScrumDates } from 'app/log-my-work/state/log-my-work.selector';
import { fetchTeamScrumUpdates } from 'app/log-my-work/state/log-my-work.action';
import { selectFetchDailyScrumLoadingState } from 'app/states/global-process.selector';
import { convertNewlineToHtmlBreak, filterNbspFromHtml } from 'app/shared/helper-functions';
import { Constants } from 'app/constants';
import { SmartDateFormatPipe } from 'app/shared/smart-date-format.pipe';


interface ParsedUpdates extends SavedDailyScrumUpdate {
  blockers: string;
  current_day: string;
  last_day: string;
  hasBlockers: boolean;
}

interface Stats {
  total: number;
  completed: number;
  missing: number;
  blockers: number;
}

@Component({
  selector: 'khoji-team-pulse',
  templateUrl: './team-pulse.component.html',
  styleUrls: ['./team-pulse.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    DropdownModule,
    InputTextModule,
    TooltipModule,
    SmartDateFormatPipe,
  ]
})
export class TeamPulseComponent implements OnInit, OnDestroy {
  selectedDate: Date;
  parsedUpdates: ParsedUpdates[] = [];
  stats: Stats = { total: 0, completed: 0, missing: 0, blockers: 0 };
  loadingState = LoadingState.Pending;
  LoadingState = LoadingState;
  totalTeamMembers: number = 0;
  private subscription = new Subscription();
  private instanceId: number;
  private userId: number;
  private team: Team;
  private activeMembers: string[] = []; // Store active member emails


  constructor(
    private store: Store<AppState>,
  ) { }

  ngOnInit() {
    this.selectedDate = new Date();

    // Dispatch action to fetch teams
    this.store.dispatch(fetchKhojiTeamsList());

    const loadingState$ = this.store.pipe(selectFetchDailyScrumLoadingState);
    const savedDailyScrumUpdate$ = this.store.pipe(selectSavedDailyScrumDates);

    // Wait for both user profile and team to be available
    this.subscription.add(
      combineLatest([
        this.store.pipe(
          selectUserProfile,
          filter(profile => !!profile?.khojiUserProfile),
          // Include instanceId in the comparator so that switching instances (even for the same user)
          // triggers the subscription and lets us fetch fresh data rather than keeping stale results.
          distinctUntilChanged((a, b) =>
            a?.khojiUserProfile?.id === b?.khojiUserProfile?.id &&
            a?.instanceId === b?.instanceId
          )
        ),
        this.store.pipe(
          selectUserDefaultTeam,
          filter(team => !!team && !!team.id),
          distinctUntilChanged((a, b) => a.id === b.id)
        )
      ]).subscribe(([profile, team]) => {
        const previousInstance = this.instanceId;
        this.userId = profile.khojiUserProfile.id;
        this.instanceId = profile.instanceId;
        this.team = team;

        // If instance changed, clear stale data so user doesn't see previous instance's results
        if (previousInstance && previousInstance !== this.instanceId) {
          this.parsedUpdates = [];
          this.stats = { total: 0, completed: 0, missing: 0, blockers: 0 };
          this.totalTeamMembers = 0;
          this.activeMembers = [];
          this.loadingState = LoadingState.Pending;
        }

        // Filter to get only active members (non-revoked)
        const activeTeamMembers = team.members?.filter(
          member => member.status !== Constants.MEMBER_REVOKED_STATUS
        ) || [];

        // Store active member emails for filtering scrum updates
        this.activeMembers = activeTeamMembers.map(member => member.memberEmail);

        // Set total team members from active members only
        this.totalTeamMembers = activeTeamMembers.length;

        if (this.instanceId) {
          this.fetchScrumUpdates();
        }
      })
    );

    this.subscription.add(
      loadingState$.subscribe((state) => {
        this.loadingState = state;
      })
    );

    // Combine team data with scrum updates to prevent race condition
    this.subscription.add(
      combineLatest([
        this.store.pipe(
          selectUserDefaultTeam,
          filter(team => !!team && !!team.id)
        ),
        savedDailyScrumUpdate$
      ]).subscribe(([team, data]) => {
        // Update activeMembers from team before parsing
        const activeTeamMembers = team.members?.filter(
          member => member.status !== Constants.MEMBER_REVOKED_STATUS
        ) || [];
        this.activeMembers = activeTeamMembers.map(member => member.memberEmail);
        this.totalTeamMembers = activeTeamMembers.length;

        this.parseUpdates(data);
      }));
  }

  fetchScrumUpdates() {
    this.store.dispatch(fetchTeamScrumUpdates({
      instanceId: this.instanceId.toString(),
      dates: {
        todayDate: this.selectedDate,
        yesterdayDate: this.selectedDate,
      }
    }));
  }

  parseUpdates(updates?: SavedDailyScrumUpdate[]) {
    const parsedUpdates = updates
      .filter(u => this.activeMembers.includes(u.userEmail))
      .map(u => {
        const body = JSON.parse(u.body || '{}') as { blockers: string; current_day: string; last_day: string; };
        const blockers = filterNbspFromHtml(body.blockers?.trim() || '');

        // Strip HTML tags to get plain text for blocker detection
        const blockerText = blockers.replace(/<[^>]*>/g, '').trim().toLowerCase();
        const noBlockerPhrases = ['no blocker', 'none', 'n/a', 'na', 'nil', '-', ''];
        const hasBlockers = blockerText.length > 0 &&
          !noBlockerPhrases.some(phrase => blockerText === phrase || blockerText.includes('no blocker'));

        // Convert newlines to <br> for proper HTML display


        return {
          ...u,
          blockers: convertNewlineToHtmlBreak(blockers),
          current_day: convertNewlineToHtmlBreak(filterNbspFromHtml(body.current_day)) || 'No information provided',
          last_day: convertNewlineToHtmlBreak(filterNbspFromHtml(body.last_day)) || 'No information provided',
          hasBlockers,
        } as ParsedUpdates;
      });

    const completed = parsedUpdates.length;
    const blockers = parsedUpdates.filter(u => u.hasBlockers).length;
    const total = this.totalTeamMembers || completed;
    const missing = Math.max(0, total - completed);

    this.stats = {
      total,
      completed,
      missing,
      blockers
    };

    this.parsedUpdates = parsedUpdates;
  }

  getCompletionRate(): number {
    return Math.round((this.stats.completed / (this.stats.total || 1)) * 100);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
