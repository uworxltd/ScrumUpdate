/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component, OnDestroy, OnInit, Renderer2, ViewChild, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, UrlSerializer, UrlTree } from '@angular/router';
import { getCurrentInstance, getParentActivatedRoute, getReferrer } from 'app/shared/helper-functions';
import { MenuItem } from 'primeng/api';
import { combineLatest, Subscription } from 'rxjs';
import { MenuService } from './app.menu.service';
import { AppSidebarComponent } from './app.sidebar.component';
import { AppTopbarComponent } from './app.topbar.component';
import { LayoutService } from './service/app.layout.service';
import { environment } from 'environments/environment';
import { Routes, RoutesBreadcrumbs, RoutesTemplateIDs, subRoutes } from 'app/interface/routes.enum';
import { FeatureFlagService } from 'app/services/feature.flag.service';
import { AccessLevels, AppState } from 'app/states/app-states';
import { Store } from '@ngrx/store';
import { selectWorkspaces } from 'app/user-profile/state/user-profile.selectors';
import { Features, Instance } from 'app/user-profile/state/user-profile.states';
import { LogMyWorkComponent } from 'app/log-my-work/log-my-work.component';
import { TeamWorklogAnalysisComponent } from 'app/analysis/team-worklog-analysis/team-worklog-analysis.component';
import { UnleashFeature, UnleashService } from 'app/services/unleash.service';
import { InstanceComponent } from 'app/instance/instance.component';
import { Constants } from 'app/constants';
import { LoadingState } from 'app/states/app-states';
import { selectSprintAnalyticsLoadingState } from 'app/states/global-process.selector'; // ← function-style selector
import { filter } from 'rxjs/operators';
import { LogMyWorkTabService } from 'app/log-my-work/services/log-my-work-tab.service';

type Feature = 'my-work' | 'team-view' | 'none';

@Component({
    selector: 'app-layout',
    templateUrl: './app.layout.component.html',
    styleUrls: ['../../styles/theme/apollo.scss'],
    encapsulation: ViewEncapsulation.None
})
export class AppLayoutComponent implements OnInit, OnDestroy {
    myWorklogFeatureEnabled = false;
    scrumAssistantFeatureEnabled = false;
    standupBoardFeatureEnabled = false;

    // ADDED: control right chatbot panel visibility (300px when expanded, 0 when collapsed)
    isRightbarExpanded: boolean = true;

    sprintAnalyticsLoadingState$ = this.store.select(selectSprintAnalyticsLoadingState);
    LoadingState = LoadingState;

    // Show/Hide Apollo Config panel to change theme configs.
    showAppConfigPanel: boolean = false;

    rssFeedUrl = environment.RSS_FEED_URL;

    items: MenuItem[];

    homePage: MenuItem;

    overlayMenuOpenSubscription: Subscription;

    menuOutsideClickListener: any;

    private subscription = new Subscription();

    @ViewChild(AppSidebarComponent) appSidebar!: AppSidebarComponent;

    @ViewChild(AppTopbarComponent) appTopbar!: AppTopbarComponent;
    showBreadcrumbs: boolean;
    environment = environment;
    featureId = 0;
    featureChecked = false;
    logMyWorkSelectedTab: string;
    enabledFeatures: UnleashFeature[];
    myWorkFeaturesEnabled: string[];
    teamViewFeaturesEnabled: string[];

    constructor(
        private menuService: MenuService,
        public layoutService: LayoutService,
        public renderer: Renderer2,
        public router: Router,
        private activatedRoute: ActivatedRoute,
        private urlSerializer: UrlSerializer,
        private featureFlag: FeatureFlagService,
        private store: Store<AppState>,
        private route: ActivatedRoute,
        private unleashService: UnleashService,
        public logMyWorkTabService: LogMyWorkTabService,
    ) {
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
        if (!this.activatedRoute.firstChild) this.router.navigate(['..'], { relativeTo: this.activatedRoute });
        let isDashboardInsightsEnabled = await this.featureFlag.isDashboardInsightsEnabled();
        if (this.router.url === subRoutes.INSIGHTS || this.router.url.includes(environment.INTEGRATION) || !isDashboardInsightsEnabled) {
            this.showBreadcrumbs = false;
        } else {
            this.showBreadcrumbs = true;
            this.updateBreadcrumb();
        }

        this.subscription.add(this.router.events.subscribe(event => {
            if (event instanceof NavigationEnd) {
                this.featureFlag.isDashboardInsightsEnabled().then(value => isDashboardInsightsEnabled = value);
                if (event.url === subRoutes.INSIGHTS || event.url.includes(environment.INTEGRATION) || !isDashboardInsightsEnabled) {
                    this.showBreadcrumbs = false;
                } else {
                    this.showBreadcrumbs = true;
                    this.updateBreadcrumb();
                }
            }
        }));

        const workspaces$ = this.store.pipe(selectWorkspaces);
        // this subscription will be triggered whenever there is any change in the workspace call
        this.subscription.add(
            workspaces$.subscribe(workspaces => {
                if (workspaces.length) {
                    const matchingInstance = workspaces.map(workspace => workspace.instances).flat().find(inst => inst.id === Number(getCurrentInstance()));
                    if (matchingInstance) {
                        this.featureId = this.assignFeatureId(matchingInstance);
                        this.checkIfFeatureIsUnlocked(matchingInstance);
                    } else {
                        this.featureId = 0;
                    }
                }
            })
        );

        // this subscription will be triggered when there is any navigation end event
        this.subscription.add(
            combineLatest([workspaces$, this.router.events]).subscribe(([workspaces, events]) => {
                if (events instanceof NavigationEnd) {
                    if (workspaces.length) {
                        const matchingInstance = workspaces.map(workspace => workspace.instances).flat().find(inst => inst.id === Number(getCurrentInstance()));
                        if (matchingInstance) {
                            this.featureId = this.assignFeatureId(matchingInstance);
                            this.checkIfFeatureIsUnlocked(matchingInstance);
                        } else {
                            this.featureId = 0;
                        }
                    }
                }
            })
        );

        const instanceRoute$ = getParentActivatedRoute(InstanceComponent, this.route)?.paramMap;
        const enabledFeatures$ = this.unleashService.getEnabledFeatures();

        if (instanceRoute$) {
            this.subscription.add(
                combineLatest([instanceRoute$, enabledFeatures$]).subscribe(([_, enabledFeatures]) => {
                    this.featureChecked = false;
                    this.enabledFeatures = enabledFeatures;
                    const myWorkFeatures = [Constants.UNLEASH_FEATURE_FLAG_MY_WORKLOGS, Constants.UNLEASH_FEATURE_FLAG_SCRUM_UPDATES];
                    const TeamViewFeatures = [Constants.UNLEASH_FEATURE_FLAG_WORKLOG_INSIGHTS, Constants.UNLEASH_FEATURE_FLAG_TEAM_PULSE, Constants.UNLEASH_FEATURE_FLAG_STANDUP_BOARD];
                    this.myWorkFeaturesEnabled = this.enabledFeatures.filter(feature => myWorkFeatures.includes(feature.name)).map(feature => feature.name);
                    this.teamViewFeaturesEnabled = this.enabledFeatures.filter(feature => TeamViewFeatures.includes(feature.name)).map(feature => feature.name);
                    this.myWorklogFeatureEnabled = this.enabledFeatures.some(feature => feature.name === Constants.UNLEASH_FEATURE_FLAG_MY_WORKLOGS);
                    this.scrumAssistantFeatureEnabled = this.enabledFeatures.some(feature => feature.name === Constants.UNLEASH_FEATURE_FLAG_SCRUM_ASSISTANT);
                    this.standupBoardFeatureEnabled = this.enabledFeatures.some(feature => feature.name === Constants.UNLEASH_FEATURE_FLAG_STANDUP_BOARD);

                }));
        }

        this.logMyWorkTabService.getSelectedTab().subscribe(selectedTab => {
            this.logMyWorkSelectedTab = selectedTab;
        });
    }

    getFeature() {
        const match = location.href.match(/.*\/feature\/([a-z-]*)/);
        return (match ? match[1] : 'none') as Feature;
    }

    // these conditions work only with components dont make em modules
    checkIfFeatureIsUnlocked(instance: Instance) {
        const featureIds = instance.instanceFeatures.map(f => f.id);
        if (this.route.firstChild.component == LogMyWorkComponent && !featureIds.includes(Features.MY_WORK)) {
            this.router.navigate(['space']);
        }
        if (this.route.firstChild.component == TeamWorklogAnalysisComponent && !featureIds.includes(Features.TEAM_VIEW)) {
            this.router.navigate(['space']);
        }
    }

    assignFeatureId(matchingInstance: Instance) {
        const userAccessLevel = matchingInstance.instanceUser.accessLevelCode;
        if (userAccessLevel !== AccessLevels.TenantAdmin) return 0;
        const featureIds = matchingInstance.instanceFeatures.map(feature => feature.id);
        if (featureIds.includes(1) && featureIds.includes(2)) {
            return 0;
        } else if (featureIds.includes(1)) {
            return 2;
        } else if (featureIds.includes(2)) {
            return 1;
        } else {
            return 0;
        }
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

    // ADDED: mirror left sidebar behavior to toggle right panel
    toggleRightbar(event?: MouseEvent) {
        this.isRightbarExpanded = !this.isRightbarExpanded;

        const classListRight = document.querySelector('.sidebar-indicator-right')?.classList;
        this.isRightbarExpanded ? classListRight?.remove('p-collapsed-right') : classListRight?.add('p-collapsed-right');

        const mainContentArea = document.querySelector('.main-content-area') as HTMLElement | null;
        if (mainContentArea) {
            mainContentArea.style.marginRight = this.isRightbarExpanded ? '20px' : '0';
        }

        const rightPanel = document.querySelector('.right-panel') as HTMLElement | null;

        if (rightPanel) {
            rightPanel.style.width = this.isRightbarExpanded ? '300px' : '0';
        }

        if (event) event.stopPropagation();
    }

    ngOnDestroy() {
        if (this.overlayMenuOpenSubscription) {
            this.overlayMenuOpenSubscription.unsubscribe();
        }

        if (this.menuOutsideClickListener) {
            this.menuOutsideClickListener();
        }
        this.subscription.unsubscribe();
    }
}
