/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import normalMenu from './../../assets/config/menus/normalMenu.json'
import { ComponentVisibilityService } from 'app/services/component.visibility.service';
import { FeatureFlagService } from 'app/services/feature.flag.service';

interface Breadcrumb {
  label: string;
  url?: string;
}

@Component({
  selector: 'app-breadcrumb',
  templateUrl: './app.breadcrumb.component.html',
  styleUrls: ['../../styles/theme/apollo.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AppBreadcrumbComponent implements OnInit, OnDestroy {
  lastBreadCrumb: any;
  private readonly _breadcrumbs$ = new BehaviorSubject<Breadcrumb[]>([]);
  showRequestPanel: boolean = true;
  showFilterButton: boolean = false;
  subscription = new Subscription();
  readonly breadcrumbs$ = this._breadcrumbs$.asObservable();
  isDashboardInsightsEnabled: boolean = false;

  constructor(private router: Router, private componentVisibilityService: ComponentVisibilityService, private featureFlag: FeatureFlagService) {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(event => {
      const root = this.router.routerState.snapshot.root;
      const breadcrumbs: Breadcrumb[] = [];
      this.addBreadcrumb(root, [], breadcrumbs);

      this._breadcrumbs$.next(breadcrumbs);
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  async ngOnInit() {
    this.subscription.add(this.componentVisibilityService.requestPanelVisible$.subscribe(visible => {
      this.showRequestPanel = visible;
    }));

    this.subscription.add(this.componentVisibilityService.filterButtonVisible$.subscribe(visible => {
      if (this.featureFlag.isEnabled("REQUEST_PANEL_VISIBILITY")) {
        this.showFilterButton = visible;
      }
    }));

    this.isDashboardInsightsEnabled = await this.featureFlag.isDashboardInsightsEnabled();
  }

  setVisibility() {
    this.showRequestPanel = !this.showRequestPanel;
    this.componentVisibilityService.setRequestPanelVisibilityState(this.showRequestPanel);
  }

  private addBreadcrumb(route: ActivatedRouteSnapshot, parentUrl: string[], breadcrumbs: Breadcrumb[]) {
    const reportMenu = normalMenu.find(menu => menu.label === 'Reports').items;

    const routeUrl = parentUrl.concat(route.url.map(url => url.path));
    let breadcrumb = route.data['breadcrumb'];
    const parentBreadcrumb = route.parent && route.parent.data ? route.parent.data['breadcrumb'] : null;

    if (navigator.onLine) {
      if (route.url.map(url => url.path).at(0) === 'report-analysis') {
        switch (route.queryParamMap.get('templateId')) {
          case 'TPR':
            breadcrumb = reportMenu[0].label;
            break;
          case 'RR':
            breadcrumb = reportMenu[1].label;
            break;
          case 'IST':
            breadcrumb = reportMenu[2].label;
            break;
          default:
            breadcrumb = 'Report Analysis'
        }
      }

      if (route.url.map(url => url.path).at(0) === 'admin-panel' && this.isDashboardInsightsEnabled) {
        switch (route.firstChild.url.map(url => url.path).at(0)) {
          case 'tenant-dashboard':
          case 'khoji-teams':
          case 'custom':
          case 'integration':
          case 'user-management':
          case 'khoji-users-details':
          case 'khoji-users':
            breadcrumb = '';
            break;
        }
      }

      if (route.url.map(url => url.path).at(0) === 'user-profile' && this.isDashboardInsightsEnabled) {
        breadcrumb = '';
      }

      if (breadcrumb && breadcrumb !== parentBreadcrumb) {
        breadcrumbs.push({
          label: breadcrumb,
          url: '/' + routeUrl.join('/')
        });
        this.lastBreadCrumb = breadcrumbs[0];
      }

      if (route.firstChild) {
        this.addBreadcrumb(route.firstChild, routeUrl, breadcrumbs);
      }
    }
    else {
      breadcrumbs.push({
        label: this.lastBreadCrumb.label,
        url: '/' + routeUrl.join('/')
      });
    }
  }
  collectRouteParams(router: Router) {
    let params = {};
    let stack: ActivatedRouteSnapshot[] = [router.routerState.snapshot.root];
    while (stack.length > 0) {
      const route = stack.pop()!;
      params = { ...params, ...route.params };
      stack.push(...route.children);
    }
    return params;
  }
}
