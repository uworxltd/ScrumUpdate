import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { combineLatest, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { AppState, DailyScrumDates, DailyScrumUpdates, LoadingState } from 'app/states/app-states';
import { selectDailyScrumDates, selectDailyScrumUpdates, selectInstanceUser } from '../state/log-my-work.selector';
import { selectFetchDailyScrumLoadingState } from 'app/states/global-process.selector';
import { SkeletonModule } from 'primeng/skeleton';
import { DailyScrumProgressComponent } from './daily-scrum-progress/daily-scrum-progress.component';
import { distinctUntilChanged, filter } from 'rxjs/operators';
import { Constants } from 'app/constants';
import { selectTranslation } from 'app/states/global-translations.selector';
import { cancelDailyScrumUpdates, fetchDailyScrumUpdates, fetchSavedDailyScrumUpdates, setDailyScrumUpdates, upsertDailyScrumUpdates } from '../state/log-my-work.action';
import { CacheService } from 'app/caching/cache.service';
import { connectMSCalendar, convertNewlineToHtmlBreak, filterNbspFromHtml, MS_OAUTH_ENABLED } from 'app/shared/helper-functions';
import { ScrumAssistantActions, TrackingService, UserActions } from 'app/services/tracking';
import { ScrumShareService } from '../services/scrum-share.service';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { EditorModule } from 'primeng/editor';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { selectUserProfile, selectWorkspaces } from 'app/user-profile/state/user-profile.selectors';
import { Workspace } from 'app/user-profile/state/user-profile.states';
import { Router } from '@angular/router';
import { SmartDateFormatPipe } from 'app/shared/smart-date-format.pipe';
import { UnleashService } from 'app/services/unleash.service';
import { MessageService } from 'primeng/api';

interface EditedData {
  last_day: string;
  current_day: string;
  blockers: string;
}

@Component({
  selector: 'khoji-daily-scrum-updates',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonModule, DailyScrumProgressComponent, ButtonModule, DialogModule, EditorModule, TooltipModule, MenuModule, SmartDateFormatPipe],
  providers: [MessageService],
  templateUrl: './daily-scrum-updates.component.html',
  styleUrls: ['./daily-scrum-updates.component.scss']
})
export class DailyScrumUpdatesComponent implements OnInit, OnDestroy {
  isFetchingFromJira = false;
  translation: any;
  LoadingState = LoadingState;
  subscription = new Subscription();
  constants = Constants;
  workspaces: Workspace[];

  dailyScrumUpdates: DailyScrumUpdates;
  dailyScrumDates: DailyScrumDates;

  dailyScrumLoadingState: LoadingState;
  showScrumFeedback = false;

  scrumFeedbackSubmitted = false;
  animatingRetroButton: string | null = null;
  animatingScrumButton: string | null = null;
  selectedScrumFeedback: string | null = null;
  public static NO_ACTIVITY_SVG = 'assets/svg/No activity.svg';
  isIntegrationDone = false;
  msOAuthEnabled = MS_OAUTH_ENABLED;
  instanceId: string | null = null;
  instanceUserId: number | null = null;
  standupBoardFeatureEnabled = false;

  // Share menu items
  shareMenuItems: any[] = [];

  // Edit modal properties
  showEditModal = false;
  addingManual = false;
  editedData: EditedData = {
    last_day: '',
    current_day: '',
    blockers: ''
  };
  today = new Date();

  isLoading = () => this.dailyScrumLoadingState === LoadingState.Loading || this.dailyScrumLoadingState === LoadingState.Pending || this.dailyScrumLoadingState === undefined;
  isError = () => this.dailyScrumLoadingState === LoadingState.Error;
  isNoActivityFound = () => ['no activity found', 'there is no data to be processed by ai', 'no activity generated from ai'].includes(this.dailyScrumUpdates?.message.toLowerCase());

  constructor(
    private store: Store<AppState>,
    private cacheService: CacheService,
    private trackingService: TrackingService,
    private router: Router,
    private unleashService: UnleashService,
    private scrumShareService: ScrumShareService,
  ) { }

  resetState = () => this.store.dispatch(setDailyScrumUpdates({ response: null }));

  ngOnInit(): void {
    // Initialize share menu items
    this.shareMenuItems = [
      { label: 'Clipboard', icon: 'pi pi-copy', command: () => this.copyToClipboard() },
      { separator: true },
      {
        label: 'Teams',
        icon: 'pi pi-share-alt',
        command: () => this.shareToTeams(),
        tooltip: 'Copies the update and opens Teams.'
      },
      // { label: 'Slack', icon: 'pi pi-share-alt', command: () => this.shareToSlack() },
      { label: 'WhatsApp', icon: 'pi pi-share-alt', command: () => this.shareToWhatsApp() },
      { label: 'Email', icon: 'pi pi-envelope', command: () => this.shareToEmail() }
    ];

    const translation$ = this.store.pipe(selectTranslation);
    const dailyScrumLoadingState$ = this.store.pipe(selectFetchDailyScrumLoadingState);
    const dailyScrumDates$ = this.store.pipe(selectDailyScrumDates);
    const dailyScrumUpdates$ = this.store.pipe(
      selectDailyScrumUpdates,
      filter((s) => !!s.dates.todayDate)
    );
    const userProfile$ = this.store.pipe(
      selectUserProfile,
      distinctUntilChanged((a, b) => a.khojiUserProfile.id === b.khojiUserProfile.id)
    );
    const instanceUser$ = this.store.pipe(
      selectInstanceUser,
      filter((s) => !!s && !!s.accountId),
      distinctUntilChanged((a, b) => a.instanceId === b.instanceId && a.calendarIntegration === b.calendarIntegration && a.calendarTokenValid === b.calendarTokenValid)
    );
    const workspaces$ = this.store.pipe(selectWorkspaces);

    this.subscription.add(translation$.subscribe((data) => (this.translation = data)));
    this.subscription.add(dailyScrumLoadingState$.subscribe((data) => (this.dailyScrumLoadingState = data)));

    this.subscription.add(
      dailyScrumUpdates$.subscribe((data) => {
        this.isFetchingFromJira = !data.isSavedDailyScrumUpdate;

        if (data.isSavedDailyScrumUpdate && !data.isSavedDailyScrumUpdateAvailable) {
          return this.fetchDailyScrumUpdates();
        }

        this.dailyScrumUpdates = data;
        this.showScrumFeedback = data.message.toLowerCase() !== 'there is no data to be processed by ai' && data.message.toLowerCase() !== 'no activity found';
      })
    );

    this.subscription.add(
      combineLatest([instanceUser$, userProfile$, dailyScrumDates$]).subscribe(([instanceUser, userProfile, dailyScrumDates]) => {
        this.dailyScrumDates = dailyScrumDates;
        this.instanceId = instanceUser.instanceId;
        this.instanceUserId = userProfile.khojiUserProfile?.id;
        this.isIntegrationDone = instanceUser.calendarIntegration && instanceUser.calendarTokenValid;
        this.fetchSavedDailyScrumUpdates();
      })
    );

    this.subscription.add(
      workspaces$.subscribe((data) => {
        this.workspaces = data;
      })
    );

    // Check standup-board feature flag
    this.unleashService.isFeatureEnabled(Constants.UNLEASH_FEATURE_FLAG_STANDUP_BOARD, this.standupBoardFeatureEnabled)?.subscribe((enabled) => {
      this.standupBoardFeatureEnabled = enabled;
    });
  }

  retry() {
    this.cacheService.clearCache();
    // Reset feedback state for the new generation
    this.scrumFeedbackSubmitted = false;
    this.selectedScrumFeedback = null;
    this.animatingScrumButton = null;
    this.fetchDailyScrumUpdates();
  }

  fetchDailyScrumUpdates() {
    this.isFetchingFromJira = true;
    const todayDate = new Date().getISODateOnly();
    const { yesterdayDate } = this.dailyScrumDates;

    this.store.dispatch(
      fetchDailyScrumUpdates({
        instanceId: this.instanceId,
        instanceUserId: this.instanceUserId?.toString(),
        dates: { todayDate, yesterdayDate }
      })
    );
  }

  fetchSavedDailyScrumUpdates() {
    const todayDate = new Date().getISODateOnly();
    // TODO(munsib): confirm if yesterdayDate is correct here
    //const { yesterdayDate } = this.dailyScrumDates;

    this.store.dispatch(
      fetchSavedDailyScrumUpdates({
        instanceId: this.instanceId,
        instanceUserId: this.instanceUserId?.toString(),
        dates: { todayDate, yesterdayDate: todayDate }
      })
    );
  }

  submitFeedback(sentiment: 'up' | 'down') {
    if (this.scrumFeedbackSubmitted) return;

    const isAlreadySelected = this.selectedScrumFeedback === sentiment;
    this.selectedScrumFeedback = isAlreadySelected ? null : sentiment;

    if (!isAlreadySelected) {
      this.animatingScrumButton = sentiment;
      setTimeout(() => {
        this.animatingScrumButton = null;
      }, 600);

      this.scrumFeedbackSubmitted = true;

      this.trackingService.captureUserAction(ScrumAssistantActions.Feedback.Scrum, {
        feedbackType: 'scrum',
        sentiment: sentiment,
        timestamp: new Date().toISOString()
      });
    }
  }

  connectJira() {
    //this.trackingService.captureUserAction(UserActions.LogMyWork.ConnectJira);
    this.router.navigate([this.getInstancePageLink()]);
  }

  getInstancePageLink(): string {
    if (this.workspaces) {
      const workspaceId = this.workspaces[0].id;
      return `/space/${workspaceId}/jira-instances`;
    }
    return '';
  }

  connectMSCalendar() {
    connectMSCalendar(this.trackingService);
  }

  addManually() {
    this.editedData = {
      last_day: '',
      current_day: '',
      blockers: ''
    };
    this.showEditModal = true;
    this.addingManual = true;
  }

  openEditModal() {
    this.editedData = {
      last_day: convertNewlineToHtmlBreak(this.dailyScrumUpdates?.last_day) || '',
      current_day: convertNewlineToHtmlBreak(this.dailyScrumUpdates?.current_day) || '',
      blockers: convertNewlineToHtmlBreak(this.dailyScrumUpdates?.blockers) || ''
    };
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.addingManual = false;
    this.trackingService.captureUserAction(UserActions.LogMyWork.ScrumUpdate.Cancel);
  }

  saveChanges(data: EditedData) {
    // Update the dailyScrumUpdates with the edited values (already in HTML format from editor)
    const updatedData: DailyScrumUpdates = {
      ...this.dailyScrumUpdates,
      message: '',
      current_day: filterNbspFromHtml(data.current_day) || '',
      last_day: filterNbspFromHtml(data.last_day) || '',
      blockers: filterNbspFromHtml(data.blockers) || '',
      updatedAt: new Date(),
      isSavedDailyScrumUpdate: true,
      isSavedDailyScrumUpdateAvailable: true
    };

    this.dailyScrumUpdates = updatedData;
    this.showScrumFeedback = true; // Show feedback buttons after saving

    // Dispatch the updated data to the store
    this.store.dispatch(upsertDailyScrumUpdates({ data: updatedData }));

    this.showEditModal = false;
    this.addingManual = false;
  }

  /**
   * Copy scrum update to clipboard
   */
  copyToClipboard(): void {
    if (!this.dailyScrumUpdates) {
      console.warn('No scrum updates to copy');
      return;
    }
    this.scrumShareService.copyToClipboard(this.dailyScrumUpdates, this.dailyScrumDates);
  }

  /**
   * Share to Teams
   */
  shareToTeams(): void {
    if (!this.dailyScrumUpdates) {
      console.warn('No scrum updates to share');
      return;
    }
    this.scrumShareService.shareToTeams(this.dailyScrumUpdates, this.dailyScrumDates);
  }

  /**
   * Share to Slack
   */
  shareToSlack(): void {
    if (!this.dailyScrumUpdates) {
      console.warn('No scrum updates to share');
      return;
    }
    this.scrumShareService.shareToSlack(this.dailyScrumUpdates, this.dailyScrumDates);
  }

  /**
   * Share to WhatsApp
   */
  shareToWhatsApp(): void {
    if (!this.dailyScrumUpdates) {
      console.warn('No scrum updates to share');
      return;
    }
    this.scrumShareService.shareToWhatsApp(this.dailyScrumUpdates, this.dailyScrumDates);
  }

  shareToEmail(): void {
    if (!this.dailyScrumUpdates) {
      console.warn('No scrum updates to share');
      return;
    }
    this.scrumShareService.shareToEmail(this.dailyScrumUpdates, this.dailyScrumDates);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.resetState();
    this.store.dispatch(cancelDailyScrumUpdates());
  }
}
