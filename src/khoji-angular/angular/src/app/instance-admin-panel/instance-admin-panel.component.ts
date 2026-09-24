/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BehaviorSubject, combineLatest, Subscription } from 'rxjs';
import { TabViewModule } from 'primeng/tabview';
import { CommonModule } from '@angular/common';
import { KhojiTeamsListComponent } from 'app/admin/khoji-teams/khoji-teams-list/khoji-teams-list.component';
import { KhojiUserListComponent } from 'app/admin/khoji-user/khoji-user-list/khoji-user-list.component';
import { AccessLevels, AppState, LoadingState } from 'app/states/app-states';
import { Store } from '@ngrx/store';
import { selectAccessibleAccessLevels, selectCurrentInstance, selectInstanceCreateLoadingState, selectWorkspaceWithInstance } from 'app/user-profile/state/user-profile.selectors';
import { Features, Instance } from 'app/user-profile/state/user-profile.states';
import { findElementWithText, getParentActivatedRoute, wait } from 'app/shared/helper-functions';
import { SpaceComponent } from 'app/space/space.component';
import { InstanceComponent } from 'app/instance/instance.component';
import { addNewUserCommand, fetchInstanceDetails } from 'app/states/app.actions';
import { Constants } from 'app/constants';
import { selectTranslation } from 'app/states/global-translations.selector';
import { Title } from '@angular/platform-browser';
import { delay } from 'rxjs/operators';
import { BlockUIModule } from 'primeng/blockui';
import { BlockableUI } from 'primeng/api';
import { getAccessLevels } from 'app/admin/state/admin.actions';
import { AppDetailsComponent } from 'app/admin/app-details/app-details.component';
import { fetchInstanceUserMetaData } from 'app/log-my-work/state/log-my-work.action';
import { HttpService } from 'app/services/common/http.service';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { FormsModule } from '@angular/forms';
import { ManageSettingsComponent } from '../manage-settings/manage-settings.component';
import { selectAddNewUserCommand } from 'app/states/commands.selector';

interface TabContents {
  header: string;
  param: string;
  template: TemplateRef<any>;
  enabled: boolean;
}
@Component({
  selector: 'khoji-instance-admin-panel',
  templateUrl: './instance-admin-panel.component.html',
  styleUrls: ['./instance-admin-panel.component.scss'],
  standalone: true,
  imports: [
    TabViewModule,
    CommonModule,
    KhojiTeamsListComponent,
    KhojiUserListComponent,
    RouterModule,
    BlockUIModule,
    AppDetailsComponent,
    AutoCompleteModule,
    FormsModule,
    ManageSettingsComponent
  ]
})
export class InstanceAdminPanelComponent implements OnInit, OnDestroy, BlockableUI {
  subscription: Subscription = new Subscription();
  activeIndex: number;
  instanceMemberCount: number;
  isRemindTeamFeatureEnabled: boolean;
  isMyWorkFeatureEnabled: boolean;
  tabs: TabContents[] = [];
  hasTenantAdminAccess = false;
  hasAdminAccess = false;

  tabsInitialized$ = new BehaviorSubject<boolean>(false);
  activeTabsMap: { [key: string]: boolean } = {};

  blockUI = false;
  blockUI$ = new BehaviorSubject(false);

  translation: any;
  instance: Instance;
  spaceId = 0;
  instanceId = 0;

  @ViewChild('manageUsers', { static: true }) manageUsers: TemplateRef<any>;
  @ViewChild('manageTeams', { static: true }) manageTeams: TemplateRef<any>;
  @ViewChild('manageSettings', { static: true }) manageSettings: TemplateRef<any>;

  constructor(private route: ActivatedRoute, private router: Router, private store: Store<AppState>, private titleService: Title, private httpService: HttpService) { }

  ngOnInit() {
    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe((translation) => {
        this.translation = translation;
      })
    );

    this.isRemindTeamFeatureEnabled = false;
    this.store.dispatch(getAccessLevels());

    const queryParams$ = this.route.queryParams;
    const userAccessLevels$ = this.store.pipe(selectAccessibleAccessLevels);
    const spaceRoute$ = getParentActivatedRoute(SpaceComponent, this.route)?.paramMap;
    const instanceRoute$ = getParentActivatedRoute(InstanceComponent, this.route)?.paramMap;
    const workspaces$ = this.store.pipe(selectWorkspaceWithInstance);
    const instanceCreateLoadingState$ = this.store.pipe(selectInstanceCreateLoadingState);
    const addNewUserCommand$ = this.store.pipe(selectAddNewUserCommand);
    const currentInstance$ = this.store.pipe(selectCurrentInstance);

    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe((translation) => {
        this.titleService.setTitle(translation?.pageTitles?.adminPanel);
      })
    );

    this.subscription.add(
      combineLatest([queryParams$, this.tabsInitialized$]).subscribe(([queryParams, tabsInitialized]) => {
        if (tabsInitialized) {
          this.handleActiveTab(queryParams.tab);
        }
      })
    );

    this.subscription.add(
      instanceRoute$.subscribe(() => {
        this.store.dispatch(fetchInstanceDetails());
        this.store.dispatch(fetchInstanceUserMetaData());
        this.tabsInitialized$.next(false);
      })
    );

    this.subscription.add(
      combineLatest([this.tabsInitialized$, addNewUserCommand$.pipe(delay(300))]).subscribe(([tabsInitialized, addUser]) => {
        if (tabsInitialized && addUser) {
          this.OpenUserModal();
        }
      })
    );

    this.subscription.add(
      combineLatest([workspaces$, instanceRoute$, spaceRoute$, userAccessLevels$, instanceCreateLoadingState$]).subscribe(([workspaces, instanceRoute, spaceRoute, userAccessLevels, instanceCreateLoadingState]) => {
        if (!workspaces.length || !userAccessLevels.length) return;

        this.hasAdminAccess = userAccessLevels.includes(AccessLevels.Admin);
        this.hasTenantAdminAccess = userAccessLevels.includes(AccessLevels.TenantAdmin);

        if (instanceCreateLoadingState === LoadingState.Done) {
          const instance = this.instance = workspaces[0]?.instances?.find((instance) => instance.id.toString() == instanceRoute?.get(Constants.INSTANCE_ID));
          this.isRemindTeamFeatureEnabled = instance?.instanceFeatures?.some((feature) => feature.id == Features.TEAM_VIEW);
          this.isMyWorkFeatureEnabled = instance?.instanceFeatures?.some((feature) => feature.id == Features.MY_WORK);
          this.initalizeTabs();
        }

        this.blockUI$.next(instanceCreateLoadingState === LoadingState.Loading);
      })
    );

    this.subscription.add(this.blockUI$.pipe(delay(100)).subscribe((block) => (this.blockUI = block)));

    this.subscription.add(currentInstance$.subscribe(instance => {
      this.spaceId = instance.spaceId;
      this.instanceId = instance.id;
    }));
  }

  tabIndexChange(index: number) {
    this.activeIndex = index;
    const tab = this.tabs[index]?.param ?? '';
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  handleActiveTab(activeTab: string): void {
    if (!activeTab) return;

    const index = this.tabs.findIndex((tab) => tab.enabled && tab?.param === activeTab);

    if (index > -1) {
      this.activeIndex = index;
      return;
    }

    const param = this.tabs.filter((t) => t.enabled)[0]?.param;

    if (!param) return;

    this.activeIndex = this.tabs.findIndex((tab) => tab?.param === param);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: param ?? '' }
    });
  }

  redirectToRemindTeam() {
    const instanceId = this.instanceId;
    const spaceId = this.spaceId;
    const url = `/space/${spaceId}/instance/${instanceId}/feature/team-view`;
    return this.router.navigateByUrl(url);
  }

  initalizeTabs() {
    this.tabs = [];
    if (this.isRemindTeamFeatureEnabled) {
      this.tabs.push({ header: 'Manage users', param: 'manage-users', template: this.manageUsers, enabled: this.hasTenantAdminAccess });
      this.tabs.push({ header: 'Manage teams', param: 'manage-teams', template: this.manageTeams, enabled: this.hasAdminAccess });
    }

    const enabled = this.hasAdminAccess || this.isMyWorkFeatureEnabled;
    this.tabs.push({ header: 'Manage settings', param: 'manage-settings', template: this.manageSettings, enabled });

    this.activeTabsMap = this.tabs
      .filter((t) => t.enabled)
      .reduce((acc, tab, index) => {
        acc[tab.param] = true;
        return acc;
      }, {});

    if (Object.keys(this.activeTabsMap).length === 0) {
      // only RemindTeam feature is enabled
      return this.redirectToRemindTeam();
    }

    this.tabsInitialized$.next(true);
  }

  trackTab = (index: number, tab: TabContents) => tab.param + this.instance?.id

  getBlockableElement() {
    return document.querySelector('.main-content-area') as HTMLElement;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  async OpenUserModal() {
    const tab = await findElementWithText('.p-tabview-title', 'manage users');
    await wait(100);
    tab?.click();
    const button = await findElementWithText('.p-button-label', 'add jira user');
    await wait(100);
    button?.click();
    this.store.dispatch(addNewUserCommand({ add: false }));
  }
}
