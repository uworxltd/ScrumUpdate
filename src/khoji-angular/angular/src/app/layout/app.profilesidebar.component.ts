/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Store } from '@ngrx/store';
import { Constants } from 'app/constants';
import { KhojiComponent } from 'app/interface/khoji-component.interface';
import { LogoutService } from 'app/services/logout.service';
import { RootNav, TrackingService, UserActions } from 'app/services/tracking/';
import { isComponentEnabled } from 'app/shared/helper-functions';
import { getComponentConfigs } from 'app/states/global-configs.selector';
import { selectKhojiUserProfile } from 'app/user-profile/state/user-profile.selectors';
import { UserProfileState } from 'app/user-profile/state/user-profile.states';
import { environment } from 'environments/environment';
import { Subscription } from 'rxjs';
import { AppState } from './../states/app-states';
import { LayoutService } from './service/app.layout.service';

@Component({
  selector: 'app-profilemenu',
  templateUrl: './app.profilesidebar.component.html',
  styleUrls: ['../../styles/theme/apollo.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AppProfileSidebarComponent implements OnInit, OnDestroy {
  subscription = new Subscription();
  userProfile: UserProfileState;
  fullName: string;
  translation: any;
  environment = environment;
  isTenantAdmin: boolean = false;
  accessLevel: string;
  companyImage: string;
  componentConfigs: KhojiComponent[];
  initials: string;
  firstName: string;
  lastName: string;
  base64ImageUrl: string;
  companyName: string;
  constants = Constants;

  constructor(public layoutService: LayoutService, private store: Store<AppState>, private trackingService: TrackingService, private logoutService: LogoutService) { }

  ngOnInit(): void {

    const userSettings$ = this.store.select('userProfile');
    const translation$ = this.store.select('globalTranslations');

    const componentConfigs$ = this.store.pipe(getComponentConfigs);
    this.subscription.add(
      componentConfigs$.subscribe((cfgs) => {
        this.componentConfigs = cfgs;
      })
    )

    const userProfile$ = this.store.pipe(selectKhojiUserProfile);

    this.subscription.add(userProfile$.subscribe(profile => {
      this.base64ImageUrl = profile.imageUrl;
      this.fullName = profile.fullName;
    }))

    this.subscription.add(translation$.subscribe(translation => {
      this.translation = translation.translation;
    }))
  }

  isComponentEnabled(compId: string) {
    return isComponentEnabled(this.componentConfigs, compId);
  }

  hideSideBar(): void {
    this.layoutService.hideProfileSidebar();
  }

  get visible(): boolean {
    return this.layoutService.state.profileSidebarVisible;
  }

  set visible(_val: boolean) {
    this.layoutService.state.profileSidebarVisible = _val;
  }

  trackEmailPrefrenceSettings() {
    this.trackingService.captureNavigationStep(RootNav.UserProfile.Settings);
  }

  logout(switchAccount?: boolean): void {
    this.trackingService.captureUserAction(UserActions.Logout.LogoutFromSidebar);
    this.hideSideBar();
    this.logoutService.logout(switchAccount);
  }

  getInitials(): string {
    const initials = this.firstName.toUpperCase().charAt(0) + this.lastName.toUpperCase().charAt(0);
    return initials;
  }

  getCompanyURL() {
    return this.companyImage.replace("/jira/jira-logo-scaled.png", "")
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
