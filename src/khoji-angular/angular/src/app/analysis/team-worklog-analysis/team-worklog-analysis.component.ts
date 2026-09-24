/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppState, LoadingState } from 'app/states/app-states';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TabViewModule } from 'primeng/tabview';
import { Subscription, combineLatest } from 'rxjs';
import { selectInstanceFeaturesStatus, selectUserProfile } from 'app/user-profile/state/user-profile.selectors';
import { checkIfUserIsTenantAdmin, getParentActivatedRoute, updateUrlParams, waitForValue } from 'app/shared/helper-functions';
import { TeamWorklogReminderComponent } from '../team-worklog-reminder/team-worklog-reminder.component';
import { ProgressBarModule } from 'primeng/progressbar';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { StandupBoardComponent } from '../standup-board/standup-board.component';
import { TeamPulseComponent } from '../team-pulse/team-pulse.component';
import { UnleashService } from 'app/services/unleash.service';
import { Constants } from 'app/constants';
import { RootNav, TrackingService } from 'app/services/tracking';
import { InstanceComponent, redirect_to_teams_link } from 'app/instance/instance.component';
import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged } from 'rxjs/operators';
import { FeatureUnlockComponent } from "app/shared/feature-unlock/feature-unlock.component";
import { SpaceComponent } from 'app/space/space.component';
import { fetchInstanceDetails } from 'app/states/app.actions';
import { fetchInstanceUserMetaData, setInstanceUserMetaDataLoadingState } from 'app/log-my-work/state/log-my-work.action';

interface Tab {
  path: string;
  name: TabName;
  enabled: boolean | undefined;
  unlocked: boolean | undefined;
}

type TabName = 'WorklogInsights/Tab' | 'TeamPulse/Tab' | 'StandupBoard/Tab';

@Component({
  selector: 'khoji-team-worklog-analysis',
  templateUrl: './team-worklog-analysis.component.html',
  styleUrls: ['./team-worklog-analysis.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TabViewModule,
    CardModule,
    ButtonModule,
    ProgressBarModule,
    DialogModule,
    StandupBoardComponent,
    TeamWorklogReminderComponent,
    TeamPulseComponent,
    ProgressSpinnerModule,
    FeatureUnlockComponent
  ]
})
export class TeamWorklogAnalysisComponent implements OnInit, OnDestroy {
  translation: any;
  subscription = new Subscription();
  isTenantAdmin = false;

  tabIndex = 0;
  selectedTab: TabName;
  workSpaceId: number;

  tabs: Tab[] = [{
    path: 'worklog-insights',
    name: 'WorklogInsights/Tab',
    enabled: undefined,
    unlocked: true, // Worklog Insights tab is unlocked for all users with team view
  },
  {
    path: 'team-pulse',
    name: 'TeamPulse/Tab',
    enabled: undefined,
    unlocked: undefined,
  },
  {
    path: 'standup-board',
    name: 'StandupBoard/Tab',
    enabled: undefined,
    unlocked: undefined,
  }];

  constructor(
    private store: Store<AppState>,
    private unleashService: UnleashService,
    private trackingService: TrackingService,
    private router: Router,
    private route: ActivatedRoute,
  ) { }

  ngOnInit() {
    if (redirect_to_teams_link(this.router)) {
      return;
    }

    const spaceRoute$ = getParentActivatedRoute(SpaceComponent, this.route)?.paramMap;
    const instanceRoute$ = getParentActivatedRoute(InstanceComponent, this.route)?.paramMap;
    const urlParams$ = this.route.queryParams;
    const instanceFeaturesStatus$ = this.store.pipe(selectInstanceFeaturesStatus);

    if (spaceRoute$ && instanceRoute$) {
      this.subscription.add(combineLatest([spaceRoute$, instanceRoute$, urlParams$]).subscribe(async ([spaceRoute, instanceRoute, tabParam]) => {
        this.workSpaceId = Number(spaceRoute.get('spaceId'));
        await this.setTab(tabParam['tab']);
        this.store.dispatch(fetchInstanceDetails());
        this.store.dispatch(setInstanceUserMetaDataLoadingState({ loadingState: LoadingState.Pending }));
        this.store.dispatch(fetchInstanceUserMetaData());
      }))
    }

    const userProfile$ = this.store.pipe(
      selectUserProfile,
      distinctUntilChanged((a, b) => a.instanceId === b.instanceId)
    );

    this.subscription.add(instanceFeaturesStatus$.subscribe(featuresStatus => {
      this.tabs.find(t => t.name === 'TeamPulse/Tab').unlocked = featuresStatus.isTeamPulseEnabled;
      this.tabs.find(t => t.name === 'StandupBoard/Tab').unlocked = featuresStatus.isStandupBoardEnabled;
    }));

    const enabledFeatures$ = this.unleashService.getEnabledFeatures();

    this.subscription
      .add(combineLatest([
        userProfile$,
        enabledFeatures$
      ])
        .subscribe(([
          userProfile,
          enabledFeatures
        ]) => {
          const featureEnabled = (featureName: string) => enabledFeatures.findIndex(f => f.name === featureName) > -1;
          this.isTenantAdmin = checkIfUserIsTenantAdmin(userProfile?.accessibleAccessLevels || []);
          this.tabs.find(t => t.name === 'WorklogInsights/Tab').enabled = featureEnabled(Constants.UNLEASH_FEATURE_FLAG_WORKLOG_INSIGHTS);
          this.tabs.find(t => t.name === 'TeamPulse/Tab').enabled = this.isTenantAdmin && featureEnabled(Constants.UNLEASH_FEATURE_FLAG_TEAM_PULSE);
          this.tabs.find(t => t.name === 'StandupBoard/Tab').enabled = featureEnabled(Constants.UNLEASH_FEATURE_FLAG_STANDUP_BOARD);

          if (this.selectedTab) {
            const tabParam = this.tabs.find(t => t.name === this.selectedTab)?.path;
            this.setTab(tabParam);
          }
        })
      );
  }

  async setTab(path?: string) {
    const enabledTabs = await this.getEnabledTabs();
    const tabIndex = enabledTabs.findIndex(t => t.path === path);

    if (tabIndex > -1) {
      this.tabIndex = tabIndex;
    }
    else if (enabledTabs.length) {
      // if tab name is invalid in url, redirect to first enabled tab
      this.tabIndex = enabledTabs.findIndex(t => t.enabled) || 0;
    }
    else {
      // if no features are enabled, redirect to home page
      this.router.navigateByUrl(`/space/${this.workSpaceId}/home`);
      return;
    }

    this.tabChanged(this.tabIndex);
  }

  async tabChanged(tabIndex: number) {
    this.tabIndex = tabIndex;
    const enabledTabs = await this.getEnabledTabs();
    this.selectedTab = enabledTabs[tabIndex]?.name;
    // update tab name param in url
    const tabParam = enabledTabs[tabIndex]?.path || enabledTabs[0]?.path;
    updateUrlParams({ tab: tabParam });

    // this.logMyWorkTabService.setSelectedTab(this.selectedTab);
    this.trackingService.captureNavigationStep(RootNav.TeamView + '/' + this.selectedTab);
  }

  get featuresChecked() {
    return this.tabs.every(t => t.enabled !== undefined && t.unlocked !== undefined);
  }

  getEnabledTabs() {
    return waitForValue(() => this.featuresChecked, () => this.tabs.filter(t => t.enabled));
  }

  getTab(name: TabName) {
    return this.tabs.find(t => t.name === name);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}


