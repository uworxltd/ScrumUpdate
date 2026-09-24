import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { AppState, LoadingState, WeeklyWorklogSummary } from 'app/states/app-states';
import { selectWeeklyWorklogSummary, selectWeeklyWorklogSummaryDateRange } from '../state/log-my-work.selector';
import { selectWeeklyWorklogSummaryLoadingState } from 'app/states/global-process.selector';
import { SkeletonModule } from 'primeng/skeleton';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { Constants } from 'app/constants';
import { selectTranslation } from 'app/states/global-translations.selector';
import { fetchWeeklyWorklogSummary, setWeeklyWorklogSummary } from '../state/log-my-work.action';
import { CacheService } from 'app/caching/cache.service';
import { markdown } from 'app/shared/helper-functions';
import { isSameWeek } from 'app/shared/week-input/week-input.component';
import { ScrumAssistantActions, TrackingService } from 'app/services/tracking';
import { ButtonModule } from 'primeng/button';
import { CardModule } from "primeng/card";
//No Activity Found for Today
//We couldn't find any recent activity in your connected tools. Connect Jira and Calendar to automatically generate your scrum updates, or add work logs manually.
@Component({
  selector: 'khoji-weekly-worklog-summary',
  standalone: true,
  imports: [CommonModule, SkeletonModule, ButtonModule, CardModule],
  templateUrl: './weekly-worklog-summary.component.html',
  styleUrls: ['./weekly-worklog-summary.component.scss']
})
export class WeeklyWorklogSummaryComponent implements OnInit, OnDestroy {
  LoadingState = LoadingState;
  translation;
  subscription = new Subscription();
  constants = Constants;
  showRetroFeedback = false;

  weeklyWorklogSummary: WeeklyWorklogSummary;

  formatedDateRange: string;
  formatedDateRangeError = () => this.formatDateRange(this.weeklyWorklogSummaryDateRange);
  weeklyWorklogSummaryLoadingState: LoadingState;
  weeklyWorklogSummaryDateRange: [Date, Date];

  retroFeedbackSubmitted = false;
  animatingRetroButton: string | null = null;
  animatingScrumButton: string | null = null;
  selectedRetroFeedback: string | null = null;

  isLoading = () => this.weeklyWorklogSummaryLoadingState === LoadingState.Loading;
  isError = () => this.weeklyWorklogSummaryLoadingState === LoadingState.Error;

  constructor(private store: Store<AppState>, private cacheService: CacheService, private trackingService: TrackingService) { }

  resetState = () => this.store.dispatch(setWeeklyWorklogSummary({ response: null }));

  ngOnInit(): void {
    this.resetState();
    const translation$ = this.store.pipe(selectTranslation);
    const weeklyWorklogSummaryLoadingState$ = this.store.pipe(selectWeeklyWorklogSummaryLoadingState);

    const weeklyWorklogSummary$ = this.store.pipe(
      selectWeeklyWorklogSummary,
      filter((s) => s.dateRange[0] !== null)
    );

    const weeklyWorklogSummaryDateRange$ = this.store.pipe(
      selectWeeklyWorklogSummaryDateRange,
      filter((d) => d[0] !== null),
      debounceTime(500),
      distinctUntilChanged((a, b) => isSameWeek(a, b))
    );

    this.subscription.add(translation$.subscribe((data) => (this.translation = data)));
    this.subscription.add(weeklyWorklogSummaryLoadingState$.subscribe((data) => (this.weeklyWorklogSummaryLoadingState = data)));

    this.subscription.add(
      weeklyWorklogSummaryDateRange$.subscribe((dateRange) => {
        this.weeklyWorklogSummaryDateRange = dateRange;
        this.store.dispatch(fetchWeeklyWorklogSummary({ dateRange }));
      })
    );

    this.subscription.add(
      weeklyWorklogSummary$.subscribe((data) => {
        this.weeklyWorklogSummary = { ...data, summary: markdown(data.summary) };
        this.formatedDateRange = this.formatDateRange(data.dateRange);
        // Emit whether feedback should be shown
        this.showRetroFeedback = data.message !== 'No worklogs provided';
      })
    );
  }

  formatDateRange([startOfWeek, endOfWeek]: [Date, Date]) {
    return `${startOfWeek.getMonthNameShort()} ${startOfWeek.getDate()} - ${endOfWeek.getMonthNameShort()} ${endOfWeek.getDate()}`;
  }

  retry() {
    this.cacheService.clearCache();
    const dateRange = this.weeklyWorklogSummaryDateRange;
    this.store.dispatch(fetchWeeklyWorklogSummary({ dateRange }));
  }

  submitFeedback(sentiment: 'up' | 'down') {
    if (this.retroFeedbackSubmitted) return;

    const isAlreadySelected = this.selectedRetroFeedback === sentiment;
    this.selectedRetroFeedback = isAlreadySelected ? null : sentiment;

    if (!isAlreadySelected) {
      this.animatingRetroButton = sentiment;
      setTimeout(() => {
        this.animatingRetroButton = null;
      }, 600);

      this.retroFeedbackSubmitted = true;

      this.trackingService.captureUserAction(ScrumAssistantActions.Feedback.Retro, {
        feedbackType: 'retro',
        sentiment: sentiment,
        timestamp: new Date().toISOString()
      });
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.resetState();
  }
}
