
/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Store } from '@ngrx/store';
import { Constants } from 'app/constants';
import { FeatureFlagService } from 'app/services/feature.flag.service';
import { ComponentNavigation, TrackingService } from 'app/services/tracking';
import { isComponentEnabled, showJiraFeedbackTicketDialog, removeProvideFeedbackButton } from 'app/shared/helper-functions';
import { AppState } from 'app/states/app-states';
import { selectKhojiUserProfile } from 'app/user-profile/state/user-profile.selectors';
import { UserProfileState } from 'app/user-profile/state/user-profile.states';
import { environment } from 'environments/environment';
import { MenuItem } from 'primeng/api';
import { Subscription } from 'rxjs';
import adminMenu from './../../assets/config/menus/adminMenu.json';
import normalMenu from './../../assets/config/menus/normalMenu.json';
import { KhojiComponent } from './../interface/khoji-component.interface';
import { LayoutService } from './service/app.layout.service';
import { KhojiSpinnerService } from 'app/services/spinner.service';

@Component({
  selector: 'app-menu',
  templateUrl: './app.menu.component.html',
  styleUrls: ['../../styles/theme/apollo.scss'],
  styles: [`
    .force-show, .force-show > ul {
      display: block !important;
    }
    .no-focus {
      &:focus {
        box-shadow: none !important;
      }
    }
  `],
  encapsulation: ViewEncapsulation.None
})
export class AppMenuComponent implements OnInit, OnDestroy {

  constructor(
    private store: Store<AppState>,
    public layoutService: LayoutService,
    private feature: FeatureFlagService,
    private trackingService: TrackingService,
    private spinnerService: KhojiSpinnerService) { }

  model: MenuItem[] = [];
  subscription = new Subscription();
  userProfile: UserProfileState;
  base64ImageUrl: string;
  firstName: string;
  lastName: string;
  initials: string;
  environment = environment;
  helpPageUrl: string;
  translation: any;
  teamCount: number;
  isAdmin: boolean;
  isTenantAdmin: boolean = false;
  tabConfigs: KhojiComponent[];
  constants = Constants;
  helpMenuItems: MenuItem[];

  ngOnInit() {
    this.tabConfigs = [];
    // disable provide feedback for now
    //loadProvideFeedbackScript();
    const translation$ = this.store.select('globalTranslations');
    const userProfile$ = this.store.pipe(selectKhojiUserProfile);

    this.subscription.add(userProfile$.subscribe(profile => {
      this.base64ImageUrl = profile.imageUrl
    }))


    this.subscription.add(translation$.subscribe(translation => {
      if (translation) {
        this.translation = translation.translation;
      }
    }));

    this.helpMenuItems = [
      {
        label: 'Help',
        items: [
          /*{
            label: 'Docs',
            icon: 'pi pi-book',
            url: 'http://scrumupdate.com/docs',
            target: '_blank',
          },
          {
            label: 'Upgrade',
            icon: 'pi pi-crown',
            url: 'http://scrumupdate.com/pricing',
            target: '_blank',
          },*/
          {
            label: 'Feedback',
            icon: 'pi pi-comment',
            command: async () => {
              this.spinnerService.show();
              await showJiraFeedbackTicketDialog();
              this.spinnerService.hide();
            }
          }
        ]
      }
    ];
  }

  getInitials(): string {
    const initials = this.firstName.toUpperCase().charAt(0) + this.lastName.toUpperCase().charAt(0);
    return initials;
  }

  onProfileButtonClick() {
    this.trackingService.captureNavigationStep(ComponentNavigation.ProfileMenuAvatar);
    this.layoutService.showProfileSidebar();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    removeProvideFeedbackButton();
  }

  createMenu() {
    this.model = <MenuItem[]>[];
    if (this.teamCount >= this.constants.MINIMUM_TEAM_LIMIT) {
      this.model = JSON.parse(JSON.stringify(normalMenu));
    }
    if (this.isAdmin && !this.model.includes(adminMenu)) {
      let menuItem: MenuItem = adminMenu;
      if (this.isTenantAdmin) menuItem = { ...menuItem, routerLink: '/admin-panel/tenant-dashboard/manage-users' };
      this.model.push(menuItem);
    }
  }
  /***
   * Method to check nav bar items and their childs enabled/disabled
   */
  checkMenuItems(item: any) {
    const enableMenuItem = isComponentEnabled(this.tabConfigs, item.id);
    if (enableMenuItem && item.hasOwnProperty("items")) {
      return enableMenuItem && this.checkChildNodes(item.items);
    }
    return enableMenuItem;
  }

  /***
   * Method to check navbar items and their corresponding childs are enabled/disabled
   */
  checkChildNodes(childNodes: any[]) {
    let enableParentNode = false;
    for (let childData of childNodes) {
      if (childData.id == Constants.INDICATOR_SUMMARY_BY_TEAM)
        enableParentNode = enableParentNode || (isComponentEnabled(this.tabConfigs, childData.id) && isComponentEnabled(this.tabConfigs, Constants.TEAM_INDICATOR_ANALYSIS));
      else
        enableParentNode = enableParentNode || isComponentEnabled(this.tabConfigs, childData.id);
    }
    return enableParentNode;
  }
}
