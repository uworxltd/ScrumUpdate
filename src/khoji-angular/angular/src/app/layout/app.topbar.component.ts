/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { UserProfileState } from 'app/user-profile/state/user-profile.states';
import { environment } from 'environments/environment';
import { Subscription, combineLatest } from 'rxjs';
import { HTTPClientService } from './../services/common/http-client.service';
import { ComponentVisibilityService } from '../services/component.visibility.service';
import { AppState } from './../states/app-states';
import { LayoutService } from './service/app.layout.service';
import { FeatureFlagService } from 'app/services/feature.flag.service';
import { ComponentNavigation, TrackingService } from 'app/services/tracking';

@Component({
  selector: 'app-topbar',
  templateUrl: './app.topbar.component.html',
  styleUrls: ['../../styles/theme/apollo.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AppTopbarComponent implements OnInit, OnDestroy {

  @ViewChild('menubutton') menuButton!: ElementRef;

  subscription = new Subscription();
  userProfile: UserProfileState;
  base64ImageUrl: string;
  firstName: string;
  lastName: string;
  initials: string;
  http: HttpClient;
  environment = environment;
  helpPageUrl: string;
  translation: any;
  isAdminPage: boolean
  showRequestPanel: boolean = true;
  showFilterButton: boolean = false;

  constructor(public layoutService: LayoutService, private store: Store<AppState>, private httpclientService: HTTPClientService, private router: Router, private componentVisibilityService: ComponentVisibilityService, private featureFlag: FeatureFlagService, private trackingService: TrackingService) {
    this.http = this.httpclientService.getHttpClient();
  }

  ngOnInit(): void {
    const userSettings$ = this.store.select('userProfile');
    const translation$ = this.store.select('globalTranslations');
    this.isAdminPage = this.router.url.match(/\/admin-panel\/tenant-dashboard.*/) !== null;

    this.router.events.subscribe(events => {
      if (events instanceof NavigationEnd) {
        this.isAdminPage = events.url.match(/\/admin-panel\/tenant-dashboard.*/) !== null;
      }
    });


    this.subscription.add(translation$.subscribe(translation => {
      this.translation = translation.translation;
    }))

    this.subscription.add(userSettings$.subscribe(data => {
      this.userProfile = data;
      this.firstName = this.userProfile?.userSettings?.user?.member?.fullName.split(' ')[0];
      this.lastName = ''; //this.userProfile?.userSettings?.user?.member?.name.split(' ')[1];
      this.base64ImageUrl = this.userProfile?.userProfileBase64String;
      if (this.firstName && this.lastName) {
        this.initials = this.getInitials();
      }
    }));

    this.subscription.add(combineLatest([this.componentVisibilityService.requestPanelVisible$, this.componentVisibilityService.requestPanelVisibilityForUrlParam$])
      .subscribe(([visible, visibilityForUrlParam]) => {
        this.showRequestPanel = visible || visibilityForUrlParam;
      })
    );

    this.subscription.add(this.componentVisibilityService.filterButtonVisible$.subscribe(visible => {
      if (this.featureFlag.isEnabled("REQUEST_PANEL_VISIBILITY")) {
        this.showFilterButton = visible;
      }
    }));
  }

  getInitials(): string {
    const initials = this.firstName.toUpperCase().charAt(0) + this.lastName.toUpperCase().charAt(0);
    return initials;
  }

  onMenuButtonClick() {
    this.layoutService.onMenuToggle();
  }

  onProfileButtonClick() {
    this.trackingService.captureNavigationStep(ComponentNavigation.ProfileMenuAvatar);
    this.layoutService.showProfileSidebar();
  }

  setVisibility() {
    const toggleVisible = !this.showRequestPanel;
    this.componentVisibilityService.setRequestPanelVisibilityForUrlParam(false);
    this.componentVisibilityService.setRequestPanelVisibilityState(toggleVisible);
    this.showRequestPanel = toggleVisible;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
