import { isComponentEnabled } from 'app/shared/helper-functions';
/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Component, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Constants } from 'app/constants';
import { KhojiComponent } from 'app/interface/khoji-component.interface';
import { FeatureFlagService } from 'app/services/feature.flag.service';
import { UnleashService } from 'app/services/unleash.service';
import { checkIfUserIsTenantAdmin } from 'app/shared/helper-functions';
import { AppState } from 'app/states/app-states';
import { getComponentConfigs } from 'app/states/global-configs.selector';
import { selectTranslation } from 'app/states/global-translations.selector';
import { environment } from 'environments/environment';
import { MessageService } from 'primeng/api';
import { combineLatest, Subscription } from 'rxjs';
import { fetchKhojiUserProfile, fetchWorkSpaces } from 'app/states/app.actions';
import { selectWorkspaces } from '../state/user-profile.selectors';
import { Features, Workspace } from '../state/user-profile.states';
import { ComponentNavigation, RootNav, TrackingService } from 'app/services/tracking';

@Component({
  selector: 'khoji-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  tabs: string[];
  subscription = new Subscription();
  translation: any;
  activeTab = '';
  tabIndex: number = -1;
  isTenantAdmin: boolean = false;
  componentConfigs: KhojiComponent[];
  constants = Constants;
  openDeleteAccountDialog: boolean;
  isUserEmailSettingsEnabled: boolean = false;
  firstRender: boolean = false;
  workspaces: Workspace[];
  showBillingTab: boolean = false;
  planDetailsFeatureEnabled = false;

  constructor(private store: Store<AppState>, private route: ActivatedRoute, private router: Router,
    private activatedRoute: ActivatedRoute, private titleService: Title, private messageService: MessageService, private trackingService: TrackingService,
    private unleashService: UnleashService) { }

  ngOnInit(): void {
    const userProfile$ = this.store.select('userProfile');
    this.store.dispatch(fetchKhojiUserProfile());
    this.store.dispatch(fetchWorkSpaces());
    const queryParams$ = this.route.queryParams;
    const componentConfigs$ = this.store.pipe(getComponentConfigs);
    const workspaces$ = this.store.pipe(selectWorkspaces);

    this.subscription.add(workspaces$.subscribe(workspaces => {
      this.workspaces = workspaces;
      if (workspaces.length) {
        this.showBillingTab = workspaces[0].instances.length !== workspaces[0].instances.filter(i => i.sharedInstance).length;
        if (this.hasUnlockedWorkLogCategorization(workspaces)) {
          this.isUserEmailSettingsEnabled = true;
        } else {
          this.isUserEmailSettingsEnabled = false;
        }
      }
    }));

    this.subscription.add(
      componentConfigs$.subscribe((cfgs) => {
        this.componentConfigs = cfgs;
      })
    )

    this.subscription.add(combineLatest([queryParams$, userProfile$])
      .subscribe(data => {
        this.tabs = [
          // 'profileSettings',
          // 'password',
          'setting'
        ];
        const [params, userProfile] = data;
        this.isTenantAdmin = checkIfUserIsTenantAdmin(userProfile?.accessibleAccessLevels);
        if (this.isTenantAdmin && !this.tabs.includes('manageSubscription')) {
          // // we remove the first element from the tabs array
          // this.tabs.shift();
          // //then we add 2 elements at the start of the tabs array
          // this.tabs.unshift("manageSubscription");
          // this.tabs.unshift("profileSettings");
        }
        else if (!this.isTenantAdmin && this.activeTab === 'manageSubscription') {
          this.tabs = this.tabs.filter(item => item != 'manageSubscription');
          this.messageService.clear();
          this.messageService.add(
            {
              key: 'message',
              severity: 'info',
              summary: 'Info Message!',
              detail: this.translation?.accessDenied.accessDeniedDescription
            }
          );
          this.router.navigate([environment.KHOJI_DASHBOARD_PAGE]);
        }

        //  validate if url doesn't have param 'tab' or tab name is invalid
        this.validateUrlAndParam(params);

        setTimeout(() => {
          this.activeTab = params.tab;
        }, 100);
      })
    );

    // select translation
    this.subscription.add(this.store.pipe(selectTranslation)
      .subscribe(translation => {
        this.translation = translation;
        this.titleService.setTitle(this.translation?.pageTitles?.profileSettings);
      })
    );

    if (this.tabs.includes('setting') && !this.firstRender) {
      this.trackingService.captureNavigationStep(ComponentNavigation.ProfileMenuAvatar.Accountsettings);
    }
    this.firstRender = true;

    // Check plan-details feature flag
    this.subscription.add(
      this.unleashService.isFeatureEnabled(Constants.UNLEASH_FEATURE_FLAG_PLAN_DETAILS, this.planDetailsFeatureEnabled)?.subscribe((enabled) => {
        this.planDetailsFeatureEnabled = enabled;
      })
    );
  }

  // Function to check if the "Send work log reminder" feature is unlocked
  hasUnlockedWorkLogCategorization(workspaces: Workspace[]): boolean {
    return workspaces.some(workspace =>
      workspace.instances.some(instance =>
        instance.instanceFeatures.some(feature => feature.id === Features.WORK_LOG_CATEGORIZATION))
    );
  }

  isComponentEnabled(compId: string) {
    return isComponentEnabled(this.componentConfigs, compId);
  }

  findTabIndex(tab: string) {
    return this.tabs.findIndex(existingTab => existingTab === tab);
  }

  changeQueryParam(event: { index: number; }): void {
    if (event.index < this.tabs.length) {
      this.navigateToTab(this.tabs.at(event.index));
    }
  }

  validateUrlAndParam(params: any) {
    if (params?.tab !== undefined) {
      this.tabIndex = this.findTabIndex(params.tab);
    }

    if (this.tabIndex === -1) {
      this.navigateToTab(this.tabs[0]);
    }
  }

  navigateToTab(tabHeading: string) {
    this.router.navigate(
      [],
      {
        relativeTo: this.activatedRoute,
        queryParams: { tab: tabHeading },
      });
  }

  navigateToHomePage() {
    if (this.workspaces) {
      const workspaceId = this.workspaces[0].id;
      this.router.navigate([`/space/${workspaceId}/home`]);
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  showDeleteAccountDialog(): void{
    this.openDeleteAccountDialog = true;
    this.trackingService.captureNavigationStep(ComponentNavigation.ProfileMenuAvatar.Accountsettings.DeleteAccount);
  }

  hideDeleteAccountDialog(): void{
    this.openDeleteAccountDialog = false;
  }
}
