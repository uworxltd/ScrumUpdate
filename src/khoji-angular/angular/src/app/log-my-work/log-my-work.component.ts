/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TabViewModule } from 'primeng/tabview';
import { combineLatest, Subscription } from 'rxjs';
import { ProgressBarModule } from 'primeng/progressbar';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { RootNav, TrackingService, UserActions } from 'app/services/tracking';
import { MyWorklogComponent } from "./my-worklog/my-worklog.component";
import { ScrumUpdateComponent } from "./scrum-update/scrum-update.component";
import { LogMyWorkTabService } from './services/log-my-work-tab.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { CacheService } from 'app/caching/cache.service';
import { HttpService } from 'app/services/common/http.service';
import { AppState, LoadingState } from 'app/states/app-states';
import { Store } from '@ngrx/store';
import { fetchInstanceUserMetaData, setInstanceUserMetaDataLoadingState } from './state/log-my-work.action';
import { getParentActivatedRoute, updateUrlParams, waitForValue } from 'app/shared/helper-functions';
import { SpaceComponent } from 'app/space/space.component';
import { InstanceComponent } from 'app/instance/instance.component';
import { UnleashService } from 'app/services/unleash.service';
import { Constants } from 'app/constants';
import { FeatureUnlockComponent } from "app/shared/feature-unlock/feature-unlock.component";
import { selectInstanceFeaturesStatus } from 'app/user-profile/state/user-profile.selectors';
import { fetchInstanceDetails } from 'app/states/app.actions';

interface Tab {
  path: string;
  name: TabName;
  enabled: boolean | undefined;
  unlocked: boolean | undefined;
}

type TabName = 'ScrumUpdates/Tab' | 'MyWorklogs/Tab';

@Component({
  selector: 'khoji-log-my-work',
  templateUrl: './log-my-work.component.html',
  styleUrls: ['./log-my-work.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TabViewModule,
    CardModule,
    ButtonModule,
    ProgressBarModule,
    DialogModule,
    ProgressSpinnerModule,
    MyWorklogComponent,
    ScrumUpdateComponent,
    FeatureUnlockComponent,
  ],
})
export class LogMyWorkComponent implements OnInit, OnDestroy {
  myWorklogsFeatureEnabled: boolean;
  scrumUpdateFeatureEnabled: boolean;
  myWorklogsFeatureUnlocked: boolean;

  showUnlockDialog = true;
  translation: any;
  subscription = new Subscription();

  tabNavs = ['ScrumUpdates/Tab', 'MyWorklogs/Tab'];
  tabRoutes = ['scrum-updates', 'my-worklogs'];

  tabIndex = 0;
  selectedTab: TabName;
  workSpaceId: number;

  tabs: Tab[] = [
    {
      path: 'scrum-updates',
      name: 'ScrumUpdates/Tab',
      enabled: undefined,
      unlocked: true, // scrum updates tab is unlocked for all users but feature is gated, so setting unlocked to true
    },
    {
      path: 'my-worklogs',
      name: 'MyWorklogs/Tab',
      enabled: undefined,
      unlocked: undefined,
    }
  ];

  constructor(
    private store: Store<AppState>,
    private trackingService: TrackingService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private cacheService: CacheService,
    private httpService: HttpService,
    private unleashService: UnleashService,
  ) { }

  ngOnInit() {
    const spaceRoute$ = getParentActivatedRoute(SpaceComponent, this.route)?.paramMap;
    const instanceRoute$ = getParentActivatedRoute(InstanceComponent, this.route)?.paramMap;
    const urlParams$ = this.route.queryParams;
    const instanceFeaturesStatus$ = this.store.pipe(selectInstanceFeaturesStatus);

    // Subscribe to worklog-insights feature flag from Unleash
    this.subscription.add(this.unleashService.isFeatureEnabled(Constants.UNLEASH_FEATURE_FLAG_MY_WORKLOGS, this.myWorklogsFeatureEnabled)
      ?.subscribe(enabled => {
        this.myWorklogsFeatureEnabled = enabled;
      }));

    this.subscription.add(this.unleashService.isFeatureEnabled(Constants.UNLEASH_FEATURE_FLAG_SCRUM_UPDATES, this.scrumUpdateFeatureEnabled)
      ?.subscribe(enabled => {
        this.scrumUpdateFeatureEnabled = enabled;
      }));

    if (spaceRoute$ && instanceRoute$) {
      this.subscription.add(combineLatest([spaceRoute$, instanceRoute$, urlParams$]).subscribe(async ([spaceRoute, instanceRoute, tabParam]) => {
        this.workSpaceId = Number(spaceRoute.get('spaceId'));
        await this.setTab(tabParam['tab']);
        this.store.dispatch(fetchInstanceDetails());
        this.store.dispatch(setInstanceUserMetaDataLoadingState({ loadingState: LoadingState.Pending }));
        this.store.dispatch(fetchInstanceUserMetaData());
      }))
    }

    this.subscription.add(instanceFeaturesStatus$.subscribe(featuresStatus => {
      this.tabs.find(t => t.name === 'MyWorklogs/Tab').unlocked = featuresStatus.isMyWorklogsEnabled;
    }));

    const enabledFeatures$ = this.unleashService.getEnabledFeatures();

    this.subscription
      .add(enabledFeatures$.subscribe(enabledFeatures => {
        const featureEnabled = (featureName: string) => enabledFeatures.findIndex(f => f.name === featureName) > -1;
        this.tabs.find(t => t.name === 'ScrumUpdates/Tab').enabled = featureEnabled(Constants.UNLEASH_FEATURE_FLAG_SCRUM_UPDATES);
        this.tabs.find(t => t.name === 'MyWorklogs/Tab').enabled = featureEnabled(Constants.UNLEASH_FEATURE_FLAG_MY_WORKLOGS);

        if (this.selectedTab) {
          const tabParam = this.tabs.find(t => t.name === this.selectedTab)?.path;
          this.setTab(tabParam);
        }
      })
      );

    this.subscription.add(urlParams$.subscribe(params => {
      if (params) {
        const authCode = params['code'];
        const error = params['error'];

        if (error) {
          this.trackingService.captureUserActionResult(UserActions.LogMyWork.ConnectMSCalendar, 'Failure')
          this.messageService.add({
            key: 'message',
            severity: 'error',
            summary: 'Error',
            detail: 'Consent not provided',
          });
        }

        if (authCode) {
          this.cacheService.clearCache();
          const url = '/integrations/ms-calendar/auth?accessCode=' + authCode;
          this.httpService.apiGetRequest(url).subscribe(response => {
            this.cacheService.clearCache();
            this.store.dispatch(fetchInstanceUserMetaData());
            this.trackingService.captureUserActionResult(UserActions.LogMyWork.ConnectMSCalendar, 'Success')

            this.messageService.add({
              key: 'message',
              severity: 'success',
              summary: 'Success',
              detail: 'Consent successfully provided.',
            });

          });
        }

        // this piece of code removes the query params and doesnt keep history in browser
        // why is this needed? because if the code is consumed and it is still inside the browser
        // it gets reconsumed on page refresh, and then error is displayed which is not wanted
        // this.router.navigate([], {
        //   queryParams: {},
        //   replaceUrl: true
        // });
        updateUrlParams({}, ['code', 'error']);
      }
    }));
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
    console.log('tabs', this.tabs);
    // this.logMyWorkTabService.setSelectedTab(this.selectedTab);
    this.trackingService.captureNavigationStep(RootNav.LogMyWork + '/' + this.selectedTab);
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
