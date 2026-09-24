import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { resetOnboardingSelectedRoleId } from 'app/admin/state/admin.actions';
import { Constants } from 'app/constants';
import { ConfigService } from 'app/services/config.service';
import { StepsService } from 'app/shared/steps/steps.service';
import { AppState, LoadingState } from 'app/states/app-states';
import { selectTranslation, selectWorklogCategoriesTranslations } from 'app/states/global-translations.selector';
import { environment } from 'environments/environment';
import { Subscription } from 'rxjs';
import { WorklogCategoriesTranslation } from '../worklog-categories/worklog-categories.component';
import { selectupdateOnboardingTeamLoadingState } from 'app/states/global-process.selector';

@Component({
  selector: 'khoji-onboarding-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],

})
export class OnboardingDashboardComponent implements OnInit {
  private subscription = new Subscription();
  defaultTeamName: string;
  translation: WorklogCategoriesTranslation;

  currentStep = 0;
  initTeamOnboarding = false;
  isWorklogCategoryEnabled = false;

  constructor(
    private store: Store<AppState>,
    private router: Router,
    private titleService: Title,
    private stepsService: StepsService,
    private configService: ConfigService
  ) { }

  ngOnInit(): void {
    const translation$ = this.store.pipe(selectWorklogCategoriesTranslations);
    const configSub = this.configService.isComponentEnabled$(Constants.TEAM_WORKLOG_CATEGORIZATION).subscribe((enabled) => {
      this.isWorklogCategoryEnabled = enabled;
    });

    this.subscription.add(configSub);

    this.subscription.add(
      translation$.subscribe(translation => {
        this.translation = translation;
      })
    );

    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe((translation) => {
        this.titleService.setTitle(translation?.pageTitles?.onboarding);
      })
    );


    this.stepsService.setCurrentStepIndex(0, Constants.KHOJI_STEPS_ONBOARDING_KEY);
  }

  nextButtonClicked() {
    const currentStepIndex = this.isWorklogCategoryEnabled ? 1 : 0;

    if (this.currentStep === currentStepIndex) {
      this.router.navigateByUrl(environment.WORKLOG_ANALYSIS_PAGE + "?team=" + this.defaultTeamName + '&request-panel=true');
    }
    else {
      this.currentStep++;
      this.stepsService.setCurrentStepIndex(this.currentStep, Constants.KHOJI_STEPS_ONBOARDING_KEY);
    }
  }

  nextButtonClickForTeamOnboardingOnly() {
    const teamUpdateLoadingStateForOnboadingWizard$ = this.store.pipe(selectupdateOnboardingTeamLoadingState);

    this.subscription.add(teamUpdateLoadingStateForOnboadingWizard$.subscribe(loadingState => {
      if (loadingState == LoadingState.Done) {
        this.router.navigateByUrl(environment.WORKLOG_ANALYSIS_PAGE + "?team=" + this.defaultTeamName + '&request-panel=true');
      }
    }))
  }

  initializeTeamName(teamName: string) {
    this.defaultTeamName = teamName;
  }

  ngOnDestroy() {
    this.store.dispatch(resetOnboardingSelectedRoleId());
    this.subscription.unsubscribe();
  }
}
