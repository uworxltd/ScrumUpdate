/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { SPRINT_ANALYTICS_TARGET_SPRINT, WORKLOG_DATA_SYNC_PERMISSION } from 'app/constants.configs';
import { InstanceComponent } from 'app/instance/instance.component';
import { deepClone, getParentActivatedRoute, updateUrlParams } from 'app/shared/helper-functions';
import { SpaceComponent } from 'app/space/space.component';
import { AppState, JobStatus, LoadingState } from 'app/states/app-states';
import * as actions from 'app/states/app.actions';
import { startDataSyncJob, stopAllDataSyncJobStatusPolling } from 'app/states/global-configs.actions';
import { selectDataSyncPermission, selectProactiveSprintsForDropdown, selectServerConfig } from 'app/states/global-configs.selector';
import { selectTranslation } from 'app/states/global-translations.selector';
import { TabulatorTableComponent } from 'app/tabulator-table/tabulator-table.component';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TabViewModule } from 'primeng/tabview';
import { combineLatest, Subscription } from 'rxjs';
import { SprintInsightCarouselComponent } from '../sprint-insight-carousel/sprint-insight-carousel.component';
import { SprintSummaryCardComponent } from '../sprint-summary-card/sprint-summary-card.component';
import {
  fetchProActiveSprintsForTeam,
  fetchSprintAnalytics,
  setSprintAnalytics,
  setSprintAnalyticsLoadingState,
  fetchSprintStaticSummary,
  fetchSprintStatusChanges,
  fetchSprintTeamPulse,
  postTargetProactiveSprintId,
  fetchSprintVelocityBurndown,
  fetchSprintEpicProgress,
  setProActiveSprintsForTeam,
  setWorklogSyncJobStatus
} from 'app/states/sprint-analytics.actions';
import {
  selectSprintAnalytics,
  selectSprintStaticSummaryValue,
  selectSprintStaticSummaryLoadingState,
  selectSprintStatusChangesValue,
  selectSprintStatusChangesLoadingState,
  selectSprintTeamPulseValue,
  selectSprintTeamPulseLoadingState,
  selectSprintVelocityBurndownValue,
  selectSprintVelocityBurndownLoadingState,
  selectSprintEpicProgressValue,
  selectSprintEpicProgressLoadingState
} from 'app/states/sprint-analytics.selector';
import { ProActiveSprint, SprintAnalytics } from '../sprint-analytics-types';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';
import { formatDistanceToNow } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ProgressBarModule } from 'primeng/progressbar';
import { selectUserDefaultTeam } from 'app/admin/state/admin.selector';
import { fetchKhojiTeamsList } from 'app/admin/state/admin.actions';
import { Team } from 'app/admin/admin.entities';
import { DialogModule } from 'primeng/dialog';
import { selectUserProfile, selectWorkspacesLoadingState } from 'app/user-profile/state/user-profile.selectors';
import { selectSprintAnalyticsLoadingState } from 'app/states/global-process.selector';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DropdownsModule } from 'app/dropdowns/dropdowns.module';
import { DeleteAppComponent, DeleteAppConfig } from 'app/user-profile/delete-app/delete-app.component';
import { RootNav, TrackingService, UserActions } from 'app/services/tracking';
import { SprintStaticSummary } from '../sprint-static-summary-card/sprint-static-summary-card.component';
import { TeamPulseData } from '../sprint-team-pulse-card/sprint-team-pulse-card.component';
import { TimeAgoPipe } from 'app/shared/time-ago.pipe';
import { SprintVelocityBurndownData } from '../sprint-velocity-burndown-card/sprint-velocity-burndown-card.component';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CacheService } from 'app/caching/cache.service';
import { JiraIssueTooltipComponent } from 'app/shared/jira-issue-tooltip/jira-issue-tooltip.component';
import { ScrumUpdateLoadingScreenComponent } from '../scrum-update-loading-screen/scrum-update-loading-screen.component';

interface SprintDropdownItem extends ProActiveSprint {
  code: string;
  name: string;
}

@Component({
  selector: 'khoji-standup-board',
  templateUrl: './standup-board.component.html',
  styleUrls: ['./standup-board.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TabViewModule,
    CardModule,
    ButtonModule,
    ProgressBarModule,
    DialogModule,
    SprintSummaryCardComponent,
    TabulatorTableComponent,
    SprintInsightCarouselComponent,
    ProgressSpinnerModule,
    DropdownsModule,
    DeleteAppComponent,
    TimeAgoPipe,
    ConfirmDialogModule,
    ToastModule,
    JiraIssueTooltipComponent,
    ScrumUpdateLoadingScreenComponent
  ],
  providers: [MessageService]
})
export class StandupBoardComponent implements OnInit, OnDestroy {
  @ViewChild('sprintInsightCarousel') sprintInsightCarousel: SprintInsightCarouselComponent;
  @ViewChild('sprintSummaryTable') sprintSummaryTable: TabulatorTableComponent;

  translation: any;
  subscription = new Subscription();
  subscription2 = new Subscription();
  subscriptionOneTime = new Subscription();
  LoadingState = LoadingState;
  sprintAnalyticsLoadingState$ = this.store.select(selectSprintAnalyticsLoadingState); // ADDED
  firstRender = true;
  isLoadingFromDropdown = false;

  constructor(
    private store: Store<AppState>,
    private titleService: Title,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private trackingService: TrackingService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private cacheService: CacheService
  ) { }

  dataSyncPermission: boolean = undefined;
  dataSyncStatusRequested = false;
  sprintListSyncJobStatus: JobStatus;
  activityIssuesSyncJobStatus: JobStatus;
  worklogSyncJobStatus: { [key: number]: JobStatus } = {};
  sprintAnalyticsSynced = false;
  syncAndFetchSprintAnalyticsRequired = false;
  syncingSprintId: number | null = null;
  showSyncCompletedAlert = false;
  syncCompletedSprintId: number | null = null;
  syncCompletedTimeoutId: any;

  response: SprintAnalytics;
  team: Team;
  exportTimeStamp = new Date().toISOString().split('.')[0].split(':').join('-');
  displayJiraDataSync = false;
  isAdminOrTenantAdmin = false;
  workspacesLoadingState = LoadingState.Pending;
  sprintList: SprintDropdownItem[] = [];
  groupedSprintList: { label: string; items: any[] }[] = [];
  currentSprint: SprintDropdownItem;
  sprintWaitingForSync: string | null = null; // Track which sprint is waiting for sync
  syncedSprintIds = new Set<number>(); // Track which sprints have been synced
  isFirstVisitToStandupBoard = true; // Track if user is visiting for first time
  showGifLoadingScreen = false; // Only show GIF for first sync of a never-synced sprint
  staticSummaryData: SprintStaticSummary | null = null;
  staticSummaryLoadingState = LoadingState.Done;
  statusChangesData: any | null = null;
  statusChangesLoadingState = LoadingState.Done;
  teamPulseData: TeamPulseData | null = null;
  teamPulseLoadingState = LoadingState.Done;
  isSprintAnalyticsLoading = false;
  velocityBurndownData: SprintVelocityBurndownData | null = null;
  velocityBurndownLoadingState = LoadingState.Done;
  epicProgressData: any | null = null;
  epicProgressLoadingState = LoadingState.Done;
  lastSyncedTimeAgo: string = '';
  showDataLoadedNotification = false;
  justCompletedSync = false;
  isWaitingForAnalyticsAfterSync = false;
  isValidatingSprintsFromCache = false;
  isSyncingNeverSyncedSprint = false;
  private timeAgoInterval: ReturnType<typeof setInterval> | null = null;
  private dataLoadedTimeoutId: ReturnType<typeof setTimeout> | null = null;
  sprintDropdownDisabled = false;
  triggerLoadingScreenApi = false; // Flag to trigger loading screen API after sync
  isRefreshingAndWaitingForAnalytics = false; // Track when refresh button is clicked and waiting for analytics to complete

  ngOnInit() {
    this.trackingService.captureNavigationStep(RootNav.TeamView.StandupBoard);
    // one time data fetching
    this.store.dispatch(actions.fetchTranslations({ locale: 'en_GB' }));

    this.subscriptionOneTime.add(
      this.store.pipe(selectTranslation).subscribe((translation) => {
        this.translation = translation;
        this.titleService.setTitle(this.translation?.pageTitles?.worklog);
      })
    );

    // reinitialize subscription on route change
    const spaceRoute$ = getParentActivatedRoute(SpaceComponent, this.route)?.paramMap;
    const instanceRoute$ = getParentActivatedRoute(InstanceComponent, this.route)?.paramMap;

    // if spaceRoute$ and instanceRoute$ are available, then subscribe to them
    if (spaceRoute$ && instanceRoute$) {
      const routeSubs = combineLatest([spaceRoute$, instanceRoute$]).subscribe(([spaceRoute, instanceRoute]) => {
        // first unsubscribe old subscriptions
        this.subscription.unsubscribe();
        // then reinitialize subscription
        this.subscription = new Subscription();

        // then reset local state
        this.currentSprint = undefined;
        this.team = null;
        this.sprintList = [];
        this.groupedSprintList = [];
        this.dataSyncStatusRequested = false;
        this.response = undefined;
        this.sprintAnalyticsSynced = false;
        this.displayJiraDataSync = false;
        this.isAdminOrTenantAdmin = false;
        this.sprintListSyncJobStatus = undefined;
        this.activityIssuesSyncJobStatus = undefined;
        this.syncAndFetchSprintAnalyticsRequired = false;
        this.isRefreshingAndWaitingForAnalytics = false; // Clear refresh flag on route change

        // reset store state
        this.store.dispatch(actions.configUpdated({ propKey: WORKLOG_DATA_SYNC_PERMISSION, propValue: null }));
        this.store.dispatch(setSprintAnalytics({ sprintAnalytics: null }));
        this.store.dispatch(setProActiveSprintsForTeam({ proactiveSprints: [] }));
        this.store.dispatch(setSprintAnalyticsLoadingState({ sprintAnalyticsLoadingState: LoadingState.Pending }));

        // issue api calls
        this.store.dispatch(fetchKhojiTeamsList());
        this.store.dispatch(actions.fetchConfigs({ propKeys: [WORKLOG_DATA_SYNC_PERMISSION] }));

        this.reInit();
      });

      this.subscription.add(routeSubs);
    }
  }

  reInit() {
    if (!this.firstRender) {
      //this.store.dispatch(actions.fetchWorkSpaces());
    }

    this.firstRender = false;

    // fetch data
    const sprintAnalytics$ = this.store.pipe(
      selectSprintAnalytics,
      filter((sa) => !!sa)
    );
    const dataSyncPermission$ = this.store.pipe(selectDataSyncPermission);
    const sprintAnalyticsLoadingState$ = this.store.select(selectSprintAnalyticsLoadingState);
    const userProfile$ = this.store.pipe(selectUserProfile);
    const userDefaultTeam$ = this.store.pipe(selectUserDefaultTeam);
    const workspacesLoadingState$ = this.store.pipe(selectWorkspacesLoadingState);
    const proactiveSprint$ = this.store.pipe(selectProactiveSprintsForDropdown);
    const targetSprintId$ = this.store.pipe(
      selectServerConfig,
      map((data) => (data[SPRINT_ANALYTICS_TARGET_SPRINT] ? String(data[SPRINT_ANALYTICS_TARGET_SPRINT]) : null)),
      distinctUntilChanged()
    );

    this.store.dispatch(actions.fetchConfigs({ propKeys: [SPRINT_ANALYTICS_TARGET_SPRINT] }));

    this.subscription.add(
      workspacesLoadingState$.subscribe((state) => {
        this.workspacesLoadingState = state;
      })
    );

    this.subscription.add(
      userDefaultTeam$.subscribe((data) => {
        this.team = data;

        if (this.team?.teamName) {
          updateUrlParams({ teamName: this.team.teamName });
        }
      })
    );

    this.subscription.add(
      sprintAnalytics$.subscribe((data) => {
        // Only update response if data belongs to the currently selected sprint
        if (data?.meta?.sprintName === this.currentSprint?.sprint_name) {
          this.response = deepClone(data);
          this.isSprintAnalyticsLoading = false;
          // Clear refresh flag when analytics completes
          this.isRefreshingAndWaitingForAnalytics = false;

          // Show toast notification with the sprint name that was synced
          // Use sprintWaitingForSync to show the correct sprint name even if user switched sprints
          if (this.isWaitingForAnalyticsAfterSync && this.sprintWaitingForSync) {
            this.messageService.add({
              severity: 'success',
              summary: 'Sync Complete',
              detail: `${this.sprintWaitingForSync} is completely synced`,
              sticky: false,
              life: 10000,
              closable: true
            });
            this.isWaitingForAnalyticsAfterSync = false;
            this.sprintWaitingForSync = null; // Reset after showing toast
          }

          // Show notification only if sync was just completed, not when loading previously synced sprint data
          if (this.justCompletedSync) {
            this.showDataLoadedNotification = true;
            if (this.dataLoadedTimeoutId) {
              clearTimeout(this.dataLoadedTimeoutId);
            }
            this.dataLoadedTimeoutId = setTimeout(() => {
              this.showDataLoadedNotification = false;
              this.justCompletedSync = false;
            }, 3000); // Show notification for 3 seconds
          }
        } else if (!data) {
          // Clear response if data is explicitly set to null
          this.response = undefined;
        }
      })
    );

    // Subscribe to velocity burndown data
    this.subscription.add(
      this.store.pipe(selectSprintVelocityBurndownValue).subscribe((value) => {
        this.velocityBurndownData = value || null;
      })
    );

    this.subscription.add(
      this.store.pipe(selectSprintVelocityBurndownLoadingState).subscribe((state) => {
        this.velocityBurndownLoadingState = state ?? LoadingState.Done;
      })
    );

    this.subscription.add(
      this.store.pipe(selectSprintStaticSummaryValue).subscribe((value) => {
        this.staticSummaryData = value || null;
      })
    );

    this.subscription.add(
      this.store.pipe(selectSprintStaticSummaryLoadingState).subscribe((state) => {
        this.staticSummaryLoadingState = state ?? LoadingState.Done;
        // Hide loading when sprint static summary finishes loading
        if (state === LoadingState.Done) {
          this.isLoadingFromDropdown = false;
          // Show sync completed alert if we just finished syncing
          if (this.syncCompletedSprintId) {
            this.showSyncCompletedAlert = true;
            if (this.syncCompletedTimeoutId) {
              clearTimeout(this.syncCompletedTimeoutId);
            }
            this.syncCompletedTimeoutId = setTimeout(() => {
              this.showSyncCompletedAlert = false;
            }, 3000);
          }
        }
      })
    );

    this.subscription.add(
      this.store.pipe(selectSprintStatusChangesValue).subscribe((value) => {
        this.statusChangesData = value || null;
        // Merge status changes into staticSummaryData if it exists
        if (this.staticSummaryData && value) {
          this.staticSummaryData = { ...this.staticSummaryData, statusChanges: value };
        }
      })
    );

    this.subscription.add(
      this.store.pipe(selectSprintStatusChangesLoadingState).subscribe((state) => {
        this.statusChangesLoadingState = state ?? LoadingState.Done;
      })
    );

    this.subscription.add(
      this.store.pipe(selectSprintTeamPulseValue).subscribe((value) => {
        this.teamPulseData = value || null;
      })
    );

    this.subscription.add(
      this.store.pipe(selectSprintTeamPulseLoadingState).subscribe((state) => {
        this.teamPulseLoadingState = state ?? LoadingState.Done;
      })
    );

    this.subscription.add(
      this.store.pipe(selectSprintEpicProgressValue).subscribe((value) => {
        this.epicProgressData = value || null;
      })
    );

    this.subscription.add(
      this.store.pipe(selectSprintEpicProgressLoadingState).subscribe((state) => {
        this.epicProgressLoadingState = state ?? LoadingState.Done;
      })
    );

    this.subscription.add(
      dataSyncPermission$.subscribe((data) => {
        this.dataSyncPermission = data?.dataSyncPermission;

        if (data?.dataSyncPermission && !this.dataSyncStatusRequested) {
          this.dataSyncStatusRequested = true;
          // Disable buttons during initial load and sprint validation
          this.isSprintAnalyticsLoading = true;
          // fetch proactive sprints from cached data on server
          this.store.dispatch(fetchProActiveSprintsForTeam());
          // Check if we have cached sprint data to load immediately
          const cachedSprints = this.cacheService.getCache('proactive-sprints');
          if (cachedSprints && cachedSprints.length > 0) {
            // Load cached data immediately while validating in background
            this.isValidatingSprintsFromCache = true;
            // Then sync on server and fetch latest list
            this.syncAndFetchSprintList();
          } else {
            // No cache, fetch and sync normally
            this.syncAndFetchSprintList();
          }
        }
      })
    );

    this.subscription.add(
      combineLatest([proactiveSprint$, targetSprintId$])
        .pipe(filter(([sprints]) => sprints.length > 0))
        .subscribe(([allSprints, targetSprintId]) => {
          const urlSprintId = this.route.snapshot.queryParamMap.get('sprintId');
          const sprintList = (
            allSprints?.map((d) => {
              const isActive = d.state !== 'CLOSED';
              const isSynced = !!d.last_synced_at;

              let description: string | null = null;
              let lastSyncedTimeAgo: string | null = null;

              if (isActive && isSynced) {
                // Synced: compute time ago immediately
                lastSyncedTimeAgo = this.formatTimeAgo(d.last_synced_at);
              } else if (isActive && !isSynced) {
                // Not Synced: show "Never synced"
                description = 'Never synced';
              } else {
                // Inactive: show "Inactive in Jira"
                description = 'Inactive in Jira';
              }

              return {
                ...d,
                name: d.sprint_name,
                code: d.sprint_id.toString(),
                description,
                isSynced,
                lastSyncedTimeAgo,
                storyPointsDisplay: isActive ? `${d.resolved_story_points ?? 0}/${d.total_story_points ?? 0} story points` : null
              };
            }) || []
          ).filter((s) => s.state !== 'CLOSED' || (targetSprintId ? s.sprint_id.toString() === targetSprintId : false));

          this.sprintList = sprintList;

          // Create grouped sprint list (Synced, Not Synced, Inactive)
          this.groupSprints(sprintList);

          // Start timer to keep dropdown time-ago values updated (even before sprint selection)
          this.startTimeAgoTimer();

          // Force change detection to re-render the dropdown with updated story points
          this.cdr.detectChanges();

          if (this.currentSprint) {
            // Update currentSprint reference to the new object from rebuilt sprintList
            const updatedCurrentSprint = sprintList.find((s) => s.sprint_id === this.currentSprint.sprint_id);
            if (updatedCurrentSprint) {
              this.currentSprint = updatedCurrentSprint;
            }

            const currentSprintNotInActiveSprints =
              sprintList
                .filter((s) => s.state !== 'CLOSED') // filter out active sprints
                .findIndex((s) => s.sprint_id === this.currentSprint.sprint_id) === -1;

            if (currentSprintNotInActiveSprints) {
              this.confirmActiveSprintSelection();
            } else if (this.syncAndFetchSprintAnalyticsRequired) {
              this.syncAndFetchSprintAnalytics(this.currentSprint);
            }
          } else {
            // No sprint selected yet, enable dropdown so user can select
            this.isSprintAnalyticsLoading = false;
            // Prioritize URL sprint ID over target sprint ID from server config
            const sprintIdToSelect = urlSprintId || targetSprintId;
            if (sprintIdToSelect) {
              this.handleSprintSelection(sprintIdToSelect);
            }
          }
        })
    );

    this.subscription.add(
      userProfile$.subscribe((data) => {
        this.isAdminOrTenantAdmin = data.accessibleAccessLevels.includes('ADMIN') || data.accessibleAccessLevels.includes('TENANT_ADMIN');
      })
    );

    this.subscription.add(
      sprintAnalyticsLoadingState$.subscribe((data) => {
        if (data === LoadingState.Done) {
          this.trackingService.captureUserActionResult(UserActions.StandupBoard.ForceLiveSync, 'Success');
          // Clear refresh flag when analytics loading completes successfully
          this.isRefreshingAndWaitingForAnalytics = false;
        } else if (data === LoadingState.Error) {
          this.trackingService.captureUserActionResult(UserActions.StandupBoard.ForceLiveSync, 'Failure');
          // Clear refresh flag when analytics loading fails
          this.isRefreshingAndWaitingForAnalytics = false;
        }
      })
    );
  }

  syncAndFetchSprintList(syncAndFetchSprintAnalyticsRequired = false) {
    this.syncAndFetchSprintAnalyticsRequired = syncAndFetchSprintAnalyticsRequired;
    this.isWaitingForAnalyticsAfterSync = true;
    // When refresh is clicked, track that we're waiting for analytics
    if (syncAndFetchSprintAnalyticsRequired) {
      this.isRefreshingAndWaitingForAnalytics = true;
      // Set loading state immediately to keep buttons disabled
      this.isSprintAnalyticsLoading = true;
    }

    this.store.dispatch(
      startDataSyncJob({
        req: {
          job_type: 'sprints_list_sync',
          parameters: { sprint_states: ['active', 'closed'] }
        },
        onComplete: ({ jobId }) => {
          this.isValidatingSprintsFromCache = false;
          this.store.dispatch(fetchProActiveSprintsForTeam());
        },
        onStatus: ({ status }) => {
          this.sprintListSyncJobStatus = status;

          if (status === 'failed') {
            this.isValidatingSprintsFromCache = false;
            this.cacheService.clearCache();
          }
        }
      })
    );
  }

  syncAndFetchSprintAnalytics(sprint: ProActiveSprint) {
    this.justCompletedSync = false;
    this.triggerLoadingScreenApi = false; // Reset trigger
    this.isWaitingForAnalyticsAfterSync = true;
    this.sprintWaitingForSync = sprint.sprint_name; // Track which sprint is being synced
    this.isSyncingNeverSyncedSprint = sprint.last_synced_at === null;
    // Show GIF whenever syncing a never-synced sprint
    this.showGifLoadingScreen = this.isSyncingNeverSyncedSprint;
    this.syncedSprintIds.add(sprint.sprint_id); // Track that we synced this sprint
    this.activityIssuesSyncJobStatus = 'running';
    const { sprint_id } = sprint;
    this.syncingSprintId = sprint_id;

    this.store.dispatch(
      startDataSyncJob({
        req: {
          job_type: 'sprint_issues_worklog_workflow',
          parameters: {
            sprint_ids: [sprint_id],
            sprint_states: ['active'],
            include_subtasks: false
          }
        },
        onComplete: ({ jobId }) => {
          setTimeout(() => {
            let syncedSprintName = '';
            this.sprintList.forEach((s) => {
              if (s.sprint_id === this.syncingSprintId) {
                s.last_synced_at = new Date();
                syncedSprintName = s.sprint_name;
              }
            });

            // Regroup sprints to reflect updated sync status
            this.groupSprints(this.sprintList);
            this.cdr.detectChanges();

            this.justCompletedSync = true;
            this.triggerLoadingScreenApi = true; // Trigger loading screen API
            this.isSyncingNeverSyncedSprint = false;
            this.syncCompletedSprintId = this.syncingSprintId;

            // Only refresh UI if the synced sprint is the currently selected sprint
            if (this.currentSprint.sprint_id === this.syncingSprintId) {
              // Show loading state immediately after sync
              this.isSprintAnalyticsLoading = true;
              this.handleSprintSelection(this.currentSprint.sprint_id.toString());
              // Immediately fetch all carousel card data after sync completes
              const sprintId = String(this.syncingSprintId);
              this.store.dispatch(fetchSprintStaticSummary({ sprintId }));
              this.store.dispatch(fetchSprintTeamPulse({ sprintId }));
              this.store.dispatch(fetchSprintVelocityBurndown({ sprintId }));
              this.store.dispatch(fetchSprintEpicProgress({ sprintId }));
            }

            this.syncingSprintId = null;
            this.store.dispatch(fetchProActiveSprintsForTeam());
          }, 0);

          // Enable for production without polling
          this.startWorklogSync(sprint);
        },
        onStatus: ({ status }) => {
          this.activityIssuesSyncJobStatus = status;
        }
      })
    );
  }

  fetchSprintAnalytics(sprint: ProActiveSprint) {
    // Keep old data visible while fetching new data
    this.syncAndFetchSprintAnalyticsRequired = false;

    this.store.dispatch(
      postTargetProactiveSprintId({
        targetProactiveSprintId: sprint.sprint_id.toString(),
        funcToCallOnResponse: async () => {
          let teamId = this.team?.teamName;
          if (teamId) {
            const analyticsType = 'sprint_insight';
            this.store.dispatch(fetchSprintAnalytics({ teamId, analyticsType }));
          } else {
            console.warn('user team not found after 5000s. team is required to fetch sprint stats');
          }
        }
      })
    );
  }

  startWorklogSync(sprint: ProActiveSprint) {
    const startDate = (sprint.start_date as Date).formatISODateOnly();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endDate = tomorrow.formatISODateOnly();
    const sprintId = this.currentSprint.sprint_id;

    this.store.dispatch(
      startDataSyncJob({
        req: {
          job_type: 'jql_issues_worklog_workflow',
          parameters: {
            jql: `updated >= "${startDate}" AND updated <= "${endDate}"`,
            sprint_ids: [sprintId]
          }
        },
        onComplete: ({ jobId }) => {
          this.store.dispatch(fetchSprintStaticSummary({ sprintId: sprintId ? String(sprintId) : null }));
        },
        onStatus: ({ status }) => {
          this.worklogSyncJobStatus[sprintId] = status;
          this.store.dispatch(setWorklogSyncJobStatus({ sprintId, worklogSyncJobStatus: status }));
        }
      })
    );
  }

  handleSprintSelection(sprint_id: string) {
    if (!sprint_id) return;

    // Re-enable dropdown when user proceeds with new selection
    this.sprintDropdownDisabled = false;

    this.currentSprint = this.sprintList.find((s) => s.sprint_id === Number(sprint_id));

    if (!this.currentSprint) return;

    this.updateUrlWithSprintId(sprint_id);

    this.sprintListSyncJobStatus = undefined;
    this.activityIssuesSyncJobStatus = undefined;
    this.justCompletedSync = false;
    this.sprintAnalyticsSynced = this.currentSprint?.last_synced_at !== null;

    // Start the shared timer for lastSyncedTimeAgo
    this.startTimeAgoTimer();

    if (this.sprintAnalyticsSynced) {
      // Fetch analytics from DB (Cache) - No live sync triggered
      this.fetchSprintAnalytics(this.currentSprint);
      // Fetch all carousel card data for already synced sprints
      const sprintId = String(this.currentSprint.sprint_id);
      this.store.dispatch(fetchSprintStaticSummary({ sprintId }));
      this.store.dispatch(fetchSprintStatusChanges({ sprintId }));
      this.store.dispatch(fetchSprintTeamPulse({ sprintId }));
      this.store.dispatch(fetchSprintVelocityBurndown({ sprintId }));
      this.store.dispatch(fetchSprintEpicProgress({ sprintId }));
    }

    this.trackingService.captureUserAction(UserActions.StandupBoard.SprintDropdown, { Sprint: this.currentSprint?.sprint_name });
  }

  onDropdownSprintSelect(sprint_id: string) {
    // Clear old sprint data before loading new sprint
    this.clearOldSprintData();
    this.isLoadingFromDropdown = true;
    this.handleSprintSelection(sprint_id);

    // Only disable dropdown for analytics loading if the sprint is already synced
    // For unsynced sprints, user can freely switch without being locked
    if (this.currentSprint?.last_synced_at !== null) {
      this.isSprintAnalyticsLoading = true;
    }
  }

  onConfigChange({ dataSyncPermission }: DeleteAppConfig) {
    if (dataSyncPermission) {
      this.store.dispatch(actions.fetchConfigs({ propKeys: [WORKLOG_DATA_SYNC_PERMISSION] }));
    }
  }

  handleClear() {
    this.currentSprint = undefined;
    this.isRefreshingAndWaitingForAnalytics = false; // Clear refresh flag when clearing selection
    // Clear old data when user clears the sprint selection
    this.clearOldSprintData();
    this.updateUrlWithSprintId(null);
  }

  /**
   * Clears old sprint data when switching sprints while keeping cards visible with loading states
   * Cards remain on screen showing loading indicators instead of disappearing
   */
  private clearOldSprintData(): void {
    // Clear data while keeping cards visible
    this.response = undefined;
    this.isSprintAnalyticsLoading = false;
    this.isRefreshingAndWaitingForAnalytics = false; // Clear refresh flag when clearing data

    // Hide the GIF loading screen when switching sprints
    this.showGifLoadingScreen = false;

    // Clear card data and show loading indicators
    this.staticSummaryData = null;
    this.staticSummaryLoadingState = LoadingState.Loading;
    this.statusChangesData = null;
    this.statusChangesLoadingState = LoadingState.Loading;
    this.teamPulseData = null;
    this.teamPulseLoadingState = LoadingState.Loading;
    this.velocityBurndownData = null;
    this.velocityBurndownLoadingState = LoadingState.Loading;
    this.epicProgressData = null;
    this.epicProgressLoadingState = LoadingState.Loading;

    // Clear sync-related data
    this.lastSyncedTimeAgo = '';
    this.showDataLoadedNotification = false;
    this.justCompletedSync = false;

    // Clear store state for sprint analytics
    this.store.dispatch(setSprintAnalytics({ sprintAnalytics: null }));
  }

  private groupSprints(sprintList: ProActiveSprint[]): void {
    const syncedSprints = sprintList.filter((s) => s.state !== 'CLOSED' && s.last_synced_at);
    const notSyncedSprints = sprintList.filter((s) => s.state !== 'CLOSED' && !s.last_synced_at);
    const inactiveSprints = sprintList.filter((s) => s.state === 'CLOSED');

    this.groupedSprintList = [];
    if (syncedSprints.length > 0) {
      this.groupedSprintList.push({ label: 'Synced', items: syncedSprints });
    }
    if (notSyncedSprints.length > 0) {
      this.groupedSprintList.push({ label: 'Not synced yet', items: notSyncedSprints });
    }
    if (inactiveSprints.length > 0) {
      this.groupedSprintList.push({ label: 'Closed sprints synced', items: inactiveSprints });
    }
  }

  confirmActiveSprintSelection() {
    this.confirmationService.confirm({
      key: 'sprintSyncConfirmationDlg',
      header: `Switch Sprints?`,
      message: `${this.currentSprint.sprint_name} is inactive. Proceeding will clear the current insights and let you choose the next sprint.\n\nNot ready to switch? Click Cancel to stay on this sprint.`,
      accept: () => {
        this.sprintDropdownDisabled = false;
        this.currentSprint = undefined;
        this.sprintAnalyticsSynced = false;

        // Filter out closed sprints and create a new array reference for immutability
        this.sprintList = this.sprintList.filter((s) => s.state !== 'CLOSED');

        // Re-group the sprint list (groupSprints creates a new array reference internally)
        this.groupSprints(this.sprintList);

        // Trigger change detection to re-render the dropdown
        this.cdr.detectChanges();

        this.store.dispatch(
          postTargetProactiveSprintId({
            targetProactiveSprintId: '0',
            funcToCallOnResponse: async () => { }
          })
        );
      },
      reject: () => {
        // When user clicks Cancel, disable the dropdown
        this.sprintDropdownDisabled = true;
        this.cdr.detectChanges();
      }
    });
  }

  generateStaticSummaryData(): void {
    if (!this.response) {
      this.staticSummaryData = null;
      this.statusChangesData = null;
      return;
    }

    const sprintId = this.currentSprint?.sprint_id;
    const sprintIdStr = sprintId ? String(sprintId) : null;

    this.store.dispatch(fetchSprintStaticSummary({ sprintId: sprintIdStr }));
    this.store.dispatch(fetchSprintStatusChanges({ sprintId: sprintIdStr }));
    this.store.dispatch(fetchSprintTeamPulse({ sprintId: sprintIdStr }));
    this.store.dispatch(fetchSprintVelocityBurndown({ sprintId: sprintIdStr }));
    this.store.dispatch(fetchSprintEpicProgress({ sprintId: sprintIdStr }));
  }

  private formatTimeAgo(lastSyncedAt: string | Date | number[]): string {
    const syncedDate = Array.isArray(lastSyncedAt) ? new Date(lastSyncedAt[0], lastSyncedAt[1] - 1, lastSyncedAt[2], lastSyncedAt[3] || 0, lastSyncedAt[4] || 0, lastSyncedAt[5] || 0) : new Date(lastSyncedAt as string | number | Date);
    const localDate = toZonedTime(syncedDate, Intl.DateTimeFormat().resolvedOptions().timeZone);
    return formatDistanceToNow(localDate, { addSuffix: true });
  }

  private updateLastSyncedTimeAgo(): void {
    // Update lastSyncedTimeAgo for selected sprint (shown in "Last synced:" label)
    if (this.currentSprint?.last_synced_at) {
      this.lastSyncedTimeAgo = this.formatTimeAgo(this.currentSprint.last_synced_at);
    } else {
      this.lastSyncedTimeAgo = '';
    }

    // Update ALL synced items in groupedSprintList with fresh time ago values
    // Create new array reference to trigger change detection in child components
    this.groupedSprintList = this.groupedSprintList.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        if (item.isSynced && item.last_synced_at) {
          return { ...item, lastSyncedTimeAgo: this.formatTimeAgo(item.last_synced_at) };
        }
        return item;
      })
    }));

    this.cdr.detectChanges();
  }

  private startTimeAgoTimer(): void {
    this.stopTimeAgoTimer();
    this.updateLastSyncedTimeAgo();
    this.timeAgoInterval = setInterval(() => {
      this.updateLastSyncedTimeAgo();
    }, 5000);
  }

  private stopTimeAgoTimer(): void {
    if (this.timeAgoInterval) {
      clearInterval(this.timeAgoInterval);
      this.timeAgoInterval = null;
    }
  }

  handleLoadingScreenClose(): void {
    // Hide the GIF loading screen when user clicks the close button
    this.showGifLoadingScreen = false;
  }

  /**
   * Updates the URL with the sprint ID for bookmarking support
   * @param sprintId The sprint ID to add to the URL, or null to remove it
   */
  private updateUrlWithSprintId(sprintId: string | null): void {
    const queryParams = sprintId ? { sprintId } : {};
    updateUrlParams(queryParams);
    // this.router.navigate([], {
    //   relativeTo: this.route,
    //   queryParams,
    //   queryParamsHandling: sprintId ? 'merge' : '',
    //   replaceUrl: true
    // });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.subscription2.unsubscribe();
    this.subscriptionOneTime.unsubscribe();
    this.stopTimeAgoTimer();
    this.store.dispatch(stopAllDataSyncJobStatusPolling());
  }
}
