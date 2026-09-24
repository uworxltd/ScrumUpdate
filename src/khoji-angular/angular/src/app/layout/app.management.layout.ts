/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component, OnDestroy, OnInit, Renderer2, TemplateRef, ViewChild, ViewContainerRef, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, UrlSerializer, UrlTree } from '@angular/router';
import { getReferrer } from 'app/shared/helper-functions';
import { MenuItem } from 'primeng/api';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { MenuService } from './app.menu.service';
import { AppSidebarComponent } from './app.sidebar.component';
import { AppTopbarComponent } from './app.topbar.component';
import { LayoutService } from './service/app.layout.service';
import { environment } from 'environments/environment';
import { Routes, RoutesBreadcrumbs, RoutesTemplateIDs, subRoutes } from 'app/interface/routes.enum';
import { FeatureFlagService } from 'app/services/feature.flag.service';

@Component({
    selector: 'manage-app',
    templateUrl: './app.management.layout.html',
    styleUrls: ['../../styles/theme/apollo.scss'],
    encapsulation: ViewEncapsulation.None
})
export class AppManagementLayout implements OnInit, OnDestroy {



    // Show/Hide Apollo Config panel to change theme configs.
    showAppConfigPanel: boolean = false;

    rssFeedUrl = environment.RSS_FEED_URL;

    items: MenuItem[];

    homePage: MenuItem;

    overlayMenuOpenSubscription: Subscription;

    menuOutsideClickListener: any;

    @ViewChild(AppSidebarComponent) appSidebar!: AppSidebarComponent;

    @ViewChild(AppTopbarComponent) appTopbar!: AppTopbarComponent;
    showBreadcrumbs: boolean;
    environment = environment;

    constructor(private menuService: MenuService, public layoutService: LayoutService, public renderer: Renderer2, public router: Router, private activatedRoute: ActivatedRoute, private urlSerializer: UrlSerializer, private featureFlag: FeatureFlagService) {
        this.overlayMenuOpenSubscription = this.layoutService.overlayOpen$.subscribe(() => {
            if (!this.menuOutsideClickListener) {
                this.menuOutsideClickListener = this.renderer.listen('document', 'click', event => {
                    const isOutsideClicked = !(this.appSidebar.el.nativeElement.isSameNode(event.target) || this.appSidebar.el.nativeElement.contains(event.target)
                        || this.appTopbar.menuButton.nativeElement.isSameNode(event.target) || this.appTopbar.menuButton.nativeElement.contains(event.target));
                    if (isOutsideClicked) {
                        this.hideMenu();
                    }
                });
            }

            if (this.layoutService.state.staticMenuMobileActive) {
                this.blockBodyScroll();
            }
        });

        this.router.events.pipe(filter(event => event instanceof NavigationEnd))
            .subscribe(() => {
                this.hideMenu();
            });
        this.items = [];
        this.homePage = { icon: 'pi pi-home', routerLink: Routes.HOME };
    }

    async ngOnInit() {
        let isDashboardInsightsEnabled = await this.featureFlag.isDashboardInsightsEnabled();
        if (this.router.url === subRoutes.INSIGHTS || this.router.url.includes(environment.INTEGRATION) || !isDashboardInsightsEnabled) {
            this.showBreadcrumbs = false;
        } else {
            this.showBreadcrumbs = true;
            this.updateBreadcrumb();
        }

        this.router.events.subscribe(event => {
            if (event instanceof NavigationEnd) {
                this.featureFlag.isDashboardInsightsEnabled().then(value => isDashboardInsightsEnabled = value);
                if (event.url === subRoutes.INSIGHTS || event.url.includes(environment.INTEGRATION) || !isDashboardInsightsEnabled) {
                    this.showBreadcrumbs = false;
                } else {
                    this.showBreadcrumbs = true;
                    this.updateBreadcrumb();
                }
            }
        });
    }


    updateBreadcrumb(): void {
        const currentUrl = this.router.url;
        this.items = [];

        const queryParams = this.parseQueryParamsFromUrl(currentUrl);
        const referrer = getReferrer();

        switch (true) {
            case currentUrl.includes(Routes.ANALYSIS_BY_TEAMBOARD):
                this.handleAnalysisByTeamboard(queryParams, referrer);
                break;
            case currentUrl.includes(subRoutes.TEAM_INSIGHTS):
                this.handleTeamInsights(queryParams);
                break;
            case currentUrl.includes(Routes.DELIVERY_ANALYSIS_DASHBOARD):
                this.items.push({ label: RoutesBreadcrumbs.ANALYSIS_BY_RELEASE });
                break;
            case currentUrl.includes(Routes.TEAM_WORKLOG_ANALYSIS):
                this.handleTeamWorklogAnalysis(queryParams, referrer);
                break;
            case currentUrl.includes(Routes.REPORT_ANALYSIS):
                this.handleReportAnalysis();
                break;
            case currentUrl.includes(Routes.ADMIN_PANEL):
                this.handleAdminPanel(queryParams, referrer, currentUrl);
                break;
            case currentUrl.includes(Routes.ANALYSIS_BY_WORKLOG):
                this.handleAnalysisByWorklog(queryParams, referrer);
                break;
            case currentUrl.includes(Routes.USER_PROFILE):
                this.handleUserProfile();
                break;
            default:
                break;
        }
    }

    private handleUserProfile() {
        this.items.push({ label: RoutesBreadcrumbs.SETTINGS });
    }

    private handleAnalysisByTeamboard(queryParams: any, referrer: string): void {
        if (queryParams.team && referrer.includes(Routes.TEAM_INSIGHTS)) {
            this.items.push({ label: decodeURIComponent(queryParams.team), routerLink: referrer });
        }
        this.items.push({ label: RoutesBreadcrumbs.ANALYSIS_BY_TEAMBOARD });
    }

    private handleTeamInsights(queryParams: any): void {
        const teamName = decodeURIComponent(queryParams.teamName);
        this.items.push({ label: decodeURIComponent(teamName) });
    }

    private handleTeamWorklogAnalysis(queryParams: any, referrer: string): void {
        if (queryParams.team) {
            this.items.push({ label: decodeURIComponent(queryParams.team), routerLink: referrer });
        }
        this.items.push({ label: RoutesBreadcrumbs.TEAM_WORKLOG_ANALYSIS });
    }

    private handleReportAnalysis(): void {
        const { templateId } = this.activatedRoute.snapshot.queryParams;
        switch (templateId) {
            case RoutesTemplateIDs.TEAM_PROGRESS_REPORT:
                this.items.push({ label: RoutesBreadcrumbs.TEAM_PROGRESS_REPORT });
                break;
            case RoutesTemplateIDs.RELEASE_REPORT:
                this.items.push({ label: RoutesBreadcrumbs.RELEASE_REPORT });
                break;
            case RoutesTemplateIDs.INDICATORS_SUMMARY_BY_TEAM:
                this.items.push({ label: RoutesBreadcrumbs.INDICATORS_SUMMARY_BY_TEAM_BOARD });
                break;
            default:
                this.items.push({ label: RoutesBreadcrumbs.REPORT_DASHBOARD });
        }
    }

    private handleAdminPanel(queryParams: any, referrer: string, currentUrl: string): void {
        const { team } = queryParams;
        if (referrer.includes(subRoutes.TEAM_INSIGHTS)) {
            this.items.push({ label: decodeURIComponent(team), routerLink: referrer });
            this.items.push({ label: RoutesBreadcrumbs.MANAGE_TEAMS });
        } else if (referrer.includes(Routes.TEAM_WORKLOG_ANALYSIS)) {
            this.items.push({ label: RoutesBreadcrumbs.TEAM_WORKLOG_ANALYSIS, routerLink: subRoutes.ANALYSIS_BY_WORKLOG });
            this.items.push({ label: RoutesBreadcrumbs.MANAGE_TEAMS });

        } else if (currentUrl.includes(subRoutes.USERS_DETAILS)) {
            this.items.push({ label: RoutesBreadcrumbs.ADMIN_DASHBOARD, routerLink: subRoutes.ADMIN_PANEL });
            this.items.push({ label: RoutesBreadcrumbs.MANAGE_USERS, routerLink: subRoutes.KHOJI_USERS });
            this.items.push({ label: RoutesBreadcrumbs.USER_DETAIL });
        }
        else if (currentUrl.includes(subRoutes.USERS)) {
            this.items.push({ label: RoutesBreadcrumbs.ADMIN_DASHBOARD, routerLink: subRoutes.ADMIN_PANEL });
            this.items.push({ label: RoutesBreadcrumbs.MANAGE_USERS });
        } else if (currentUrl.includes(subRoutes.USER_MANAGEMENT)) {
            this.items.push({ label: RoutesBreadcrumbs.ADMIN_DASHBOARD, routerLink: subRoutes.ADMIN_PANEL });
            this.items.push({ label: RoutesBreadcrumbs.MANAGE_USERS, routerLink: subRoutes.KHOJI_USERS });
            this.items.push({ label: RoutesBreadcrumbs.INVITE_USER });
        } else if (currentUrl.includes(subRoutes.TEAMS)) {
            if (referrer !== subRoutes.INSIGHTS) {
                this.items.push({ label: RoutesBreadcrumbs.ADMIN_DASHBOARD, routerLink: subRoutes.ADMIN_PANEL });
            }
            this.items.push({ label: RoutesBreadcrumbs.MANAGE_TEAMS });
        }
        else {
            this.items.push({ label: RoutesBreadcrumbs.ADMIN_DASHBOARD });
        }
    }

    private handleAnalysisByWorklog(queryParams: any, referrer: string): void {
        if (queryParams.team) {
            this.items.push({ label: decodeURIComponent(queryParams.team), routerLink: referrer });
        }
        this.items.push({ label: RoutesBreadcrumbs.ANALYSIS_BY_WORKLOG });
    }

    private parseQueryParamsFromUrl(url: string): any {
        const urlTree: UrlTree = this.urlSerializer.parse(url);
        return urlTree.queryParams;
    }

    blockBodyScroll(): void {
        if (document.body.classList) {
            document.body.classList.add('blocked-scroll');
        }
        else {
            document.body.className += ' blocked-scroll';
        }
    }

    unblockBodyScroll(): void {
        if (document.body.classList) {
            document.body.classList.remove('blocked-scroll');
        }
        else {
            document.body.className = document.body.className.replace(new RegExp('(^|\\b)' +
                'blocked-scroll'.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
        }
    }

    hideMenu() {
        this.layoutService.state.overlayMenuActive = false;
        this.layoutService.state.staticMenuMobileActive = false;
        this.layoutService.state.menuHoverActive = false;
        this.menuService.reset();
        if (this.menuOutsideClickListener) {
            this.menuOutsideClickListener();
            this.menuOutsideClickListener = null;
        }
        this.unblockBodyScroll();
    }

    get containerClass() {
        return {
            'layout-light': this.layoutService.config.colorScheme === 'light',
            'layout-dim': this.layoutService.config.colorScheme === 'dim',
            'layout-dark': this.layoutService.config.colorScheme === 'dark',
            'layout-colorscheme-menu': this.layoutService.config.menuTheme === 'colorScheme',
            'layout-primarycolor-menu': this.layoutService.config.menuTheme === 'primaryColor',
            'layout-transparent-menu': this.layoutService.config.menuTheme === 'transparent',
            'layout-overlay': this.layoutService.config.menuMode === 'overlay',
            'layout-static': this.layoutService.config.menuMode === 'static',
            'layout-slim': this.layoutService.config.menuMode === 'slim',
            'layout-horizontal': this.layoutService.config.menuMode === 'horizontal',
            'layout-static-inactive': this.layoutService.state.staticMenuDesktopInactive && this.layoutService.config.menuMode === 'static',
            'layout-overlay-active': this.layoutService.state.overlayMenuActive,
            'layout-mobile-active': this.layoutService.state.staticMenuMobileActive,
            'p-input-filled': this.layoutService.config.inputStyle === 'filled',
            'p-ripple-disabled': !this.layoutService.config.ripple
        }
    }

    ngOnDestroy() {
        if (this.overlayMenuOpenSubscription) {
            this.overlayMenuOpenSubscription.unsubscribe();
        }

        if (this.menuOutsideClickListener) {
            this.menuOutsideClickListener();
        }
    }

}
