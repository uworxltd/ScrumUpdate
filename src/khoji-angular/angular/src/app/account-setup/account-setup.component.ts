/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { RootNav, TrackingService, UserActions } from 'app/services/tracking';
import { Constants } from 'app/constants';
import { UnleashFeature, UnleashService } from 'app/services/unleash.service';
import { CreateInstancePayload } from 'app/shared/picklist/interfaces';
import { AppState, LoadingState } from 'app/states/app-states';
import { selectTranslation } from 'app/states/global-translations.selector';
import { dispatchCreateInstance, fetchAvailableFeatures } from 'app/user-profile/state/user-profile.actions';
import { selectAvailableFeatures, selectInstanceDataAndLoadingState, selectUserSelectedAccessibleResource, selectWorkspaces, selectWorkspacesLoadingState } from 'app/user-profile/state/user-profile.selectors';
import { FeatureOption } from 'app/user-profile/state/user-profile.states';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { RadioButtonModule } from 'primeng/radiobutton';
import { combineLatest, Subscription } from 'rxjs';

@Component({
  selector: 'khoji-account-setup',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    RadioButtonModule,
    ChipModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    NgOptimizedImage,
    ProgressSpinnerModule,
  ],
  templateUrl: './account-setup.component.html',
  styleUrls: ['./account-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('.6s ease-in', style({ opacity: 1 }))
      ]),
    ])
  ]
})
export class AccountSetupComponent {
  instanceId: number = 0;
  features: FeatureOption[] = [];
  selectedFeatureId: number = 1;
  subscription = new Subscription();
  instancePayload: CreateInstancePayload;
  workspaceLoadingState: LoadingState = LoadingState.Pending;
  instanceLoadingState: LoadingState = LoadingState.Pending;
  enabledFeatures: UnleashFeature[] = [];
  teamViewFeaturesEnabled: string[] = [];
  myWorkFeaturesEnabled: string[] = [];
  logMyWorkFeatureEnabled: boolean = false;

  constructor(
    private store: Store<AppState>,
    private trackingService: TrackingService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private titleService: Title,
    private unleashService: UnleashService) { }

  ngOnInit() {
    this.trackingService.captureNavigationStep(RootNav.Onboarding.FeatureSelection);

    this.store.dispatch(fetchAvailableFeatures());
    const availabeFeatures$ = this.store.pipe(selectAvailableFeatures);
    const userSelectedAccessibleResource$ = this.store.pipe(selectUserSelectedAccessibleResource);
    const instanceDataAndLoadingState$ = this.store.pipe(selectInstanceDataAndLoadingState);
    const workspace$ = this.store.pipe(selectWorkspaces);
    const workspaceLoadingState$ = this.store.pipe(selectWorkspacesLoadingState);
    const enabledFeatures$ = this.unleashService.getEnabledFeatures();

    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe((translation) => {
        this.titleService.setTitle(translation?.pageTitles?.appSetup);
      })
    );

    this.subscription.add(
      instanceDataAndLoadingState$
        .subscribe(instanceDataAndLoadingState => {
          this.instanceLoadingState = instanceDataAndLoadingState.instanceLoadingState;
          this.cdr.detectChanges();

          if (instanceDataAndLoadingState.instanceLoadingState === LoadingState.Done) {
            const { id: instanceId, workspace: { id: workspaceId } } = instanceDataAndLoadingState.instanceDetails;
            this.trackingService.captureUserActionResult(UserActions.Instance.InstanceCreation, 'Success');

            if (this.myWorkFeaturesEnabled.length && this.selectedFeatureId === 1) {
              this.router.navigate([`/space/${workspaceId}/instance/${instanceId}/feature/my-work`]);
            } else if (this.teamViewFeaturesEnabled.length && this.selectedFeatureId === 2) {
              this.router.navigate([`/space/${workspaceId}/instance/${instanceId}/build-team`]);
            }
          }
        }));

    this.subscription.add(availabeFeatures$
      .subscribe((availableFeatures) => {
        this.features = availableFeatures.filter(f => f.id === 1 || f.id === 2);
      })
    );

    this.subscription.add(
      combineLatest([
        userSelectedAccessibleResource$,
        workspace$,
        workspaceLoadingState$
      ])
        .subscribe(([userSelectedAccessibleResource, workspaces, loadingState]) => {
          if (loadingState === LoadingState.Done) {
            if (!userSelectedAccessibleResource) {
              this.router.navigate([`/space/${workspaces[0].id}/jira-instances`]);
            } else {
              this.instancePayload = userSelectedAccessibleResource;
            }
          }
          this.workspaceLoadingState = loadingState;
        })
    );

    this.subscription.add(enabledFeatures$.subscribe(features => {
      this.enabledFeatures = features;
      const myWorkFeatures = [Constants.UNLEASH_FEATURE_FLAG_MY_WORKLOGS, Constants.UNLEASH_FEATURE_FLAG_SCRUM_UPDATES];
      const TeamViewFeatures = [Constants.UNLEASH_FEATURE_FLAG_WORKLOG_INSIGHTS, Constants.UNLEASH_FEATURE_FLAG_TEAM_PULSE, Constants.UNLEASH_FEATURE_FLAG_STANDUP_BOARD];
      this.myWorkFeaturesEnabled = this.enabledFeatures.filter(feature => myWorkFeatures.includes(feature.name)).map(feature => feature.name);
      this.teamViewFeaturesEnabled = this.enabledFeatures.filter(feature => TeamViewFeatures.includes(feature.name)).map(feature => feature.name);
      this.logMyWorkFeatureEnabled = this.enabledFeatures.some(feature => feature.name === Constants.UNLEASH_FEATURE_FLAG_MY_WORKLOGS);

      if (this.myWorkFeaturesEnabled.length === 0 && this.teamViewFeaturesEnabled.length) {
        this.selectedFeatureId = 2;
      }

      this.cdr.detectChanges();
    }));
  }

  selectOption(option: FeatureOption) {
    if (this.instanceLoadingState === LoadingState.Loading) {
      return;
    }

    this.selectedFeatureId = option.id;
    const selectedFeature = option.title;
    this.trackingService.captureUserAction(UserActions.Onboarding.FeatureSelection, { selectedFeature });
    this.cdr.detectChanges();
  }

  getFilteredList(details: string[]): string[] {
    if (!this.logMyWorkFeatureEnabled) {
      // Filter out worklog-related items
      return details.filter(item => item !== 'Auto Worklogs' && item !== 'AI Retrospective');
    }

    return details;
  }

  getDisplayDescription(): string {
    if (!this.logMyWorkFeatureEnabled) {
      return 'We handle stand-ups so you can focus on delivery.';
    }

    return 'We auto-log work, handle stand-ups & retros, and keep stakeholders fully in-the-loop so you can focus on delivery.';
  }

  onSubmit() {
    const updatedInstancePayload = {
      ...this.instancePayload,
      featureId: this.selectedFeatureId
    };

    this.store.dispatch(dispatchCreateInstance(({ instancePayload: updatedInstancePayload })));
    this.trackingService.captureUserAction(UserActions.Onboarding.FeatureSelection, { feature: this.selectedFeatureId });
    this.trackingService.captureUserAction(UserActions.Instance.InstanceCreation);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
