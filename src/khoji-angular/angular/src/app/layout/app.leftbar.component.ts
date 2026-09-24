/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component, ElementRef, HostListener, Input, OnDestroy, OnInit, Renderer2, ViewChild, ViewEncapsulation } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { findElementWithText, getElementWidth, wait } from 'app/shared/helper-functions';
import { AccessLevels, AppState, LoadingState } from 'app/states/app-states';
import { Constants } from 'app/constants';
import { addNewUserCommand, discardSentCallsAfterNavigate } from 'app/states/app.actions';
import { selectTranslation } from 'app/states/global-translations.selector';
import { selectAccessibleResources, selectWorkspaces } from 'app/user-profile/state/user-profile.selectors';
import { AccessibleResource, Features, Instance, Workspace } from 'app/user-profile/state/user-profile.states';
import { FilterService, MenuItem, TreeNode } from 'primeng/api';
import { Menu } from 'primeng/menu';
import { combineLatest, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { cancelDailyScrumUpdates, setAIGeneratedWorklogSubmissionLoadingState, setGenerateAIWorklogLoadingState } from 'app/log-my-work/state/log-my-work.action';
import { UnleashFeature, UnleashService } from 'app/services/unleash.service';

@Component({
  selector: 'app-leftbar',
  templateUrl: './app.leftbar.component.html',
  styleUrls: ['../../styles/theme/apollo.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AppLeftbarComponent implements OnInit, OnDestroy {
  @ViewChild('sidebar', { static: false }) sidebar: ElementRef;

  instanceMenuItems: MenuItem[];
  addNewAppMenuItems: MenuItem[];

  isSidebarExpanded: boolean = true;
  translation: any;
  subscription: Subscription = new Subscription();
  workspaces: Workspace[];
  filterString: string;
  filteredInstances: Instance[];
  accessibleResources: AccessibleResource;
  enabledFeatures: UnleashFeature[];
  treeNodes: TreeNode[];
  sharedTreeNodes: TreeNode[];
  selectedNodeUrl: string;
  @Input() featureId = 0;

  constructor(private renderer: Renderer2,
    private store: Store<AppState>,
    private filterService: FilterService,
    private router: Router,
    private unleashService: UnleashService,
  ) { }

  // decide sidebar expanded or collapsed based on window width
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    const classListLeftbar = document.querySelector('.app-leftbar')?.classList;
    this.isSidebarExpanded = getElementWidth('.layout-content') > 1315;
    this.isSidebarExpanded ? classListLeftbar?.remove('p-collapsed') : classListLeftbar?.add('p-collapsed');
    this.adjustContentMargin();
  }

  // Close sidebar when clicked outside
  @HostListener('document:click', ['$event'])
  documentClick(event: PointerEvent) {
    const nativeEle = this.sidebar['el']['nativeElement'];
    if (nativeEle.classList.contains('p-collapsed') && !nativeEle.contains(event.target)) {
      this.onResize(null);
    }
  }

  ngOnInit() {
    this.selectedNodeUrl = this.router.url

    //this.store.dispatch(fetchKhojiUserProfile()); also issued in instance component. removed as duplicate call. 
    const workspaces$ = this.store.pipe(selectWorkspaces);
    const accessibleResources$ = this.store.pipe(selectAccessibleResources);
    const enabledFeatures$ = this.unleashService.getEnabledFeatures();

    this.router.events.pipe(
      // Only listen for NavigationEnd events
      filter(event => event instanceof NavigationEnd),
    )
      .subscribe((route: NavigationEnd) => {
        this.selectedNodeUrl = route.urlAfterRedirects;

        if (this.treeNodes) {
          this.treeNodes = this.expandChildNode(this.treeNodes, route.urlAfterRedirects);
        }

        if (this.sharedTreeNodes) {
          this.sharedTreeNodes = this.expandChildNode(this.sharedTreeNodes, route.urlAfterRedirects);
        }
      });

    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe((translation) => {
        this.translation = translation;
      }));

    this.subscription.add(
      combineLatest([workspaces$, accessibleResources$, enabledFeatures$]).subscribe(([workspaces, accessibleResource, enabledFeatures]) => {
        this.enabledFeatures = enabledFeatures;
        this.workspaces = workspaces;
        this.filteredInstances = workspaces?.flatMap(workspace => workspace.instances);
        this.accessibleResources = accessibleResource;
        this.treeNodes = this.convertInstancesToTree(this.filteredInstances).filter(t => !t.data.sharedInstance);
        this.sharedTreeNodes = this.convertInstancesToTree(this.filteredInstances).filter(t => t.data.sharedInstance);
      })
    );

    this.instanceMenuItems = [
      {
        items: [
          {
            label: this.translation?.userWorkspace?.manageApp
          },
          {
            label: 'User Preferences'
          }
        ]
      }
    ];

    this.addNewAppMenuItems = [
      {
        items: [
          {
            label: this.translation?.userWorkspace?.addNewApp,
            command: () => {
              this.router.navigate([this.getInstancePageLink()]);
            }
          }
        ]
      }
    ];
  }

  ngAfterViewInit() {
    setTimeout(() => this.onResize(null), 10);
  }

  toggleSidebar() {
    this.isSidebarExpanded = !this.isSidebarExpanded;
    this.adjustContentMargin();
  }


  adjustContentMargin() {
    const classListSidebar = document.querySelector('.sidebar-indicator')?.classList;
    this.isSidebarExpanded ? classListSidebar?.remove('p-collapsed') : classListSidebar?.add('p-collapsed');
    const classListAppLeftbar = document.querySelector('.app-leftbar')?.classList;

    if (classListAppLeftbar?.contains('p-collapsed')) {
      const mainContentArea = document.querySelector('.main-content-area') as HTMLElement;
      this.isSidebarExpanded ? mainContentArea.style.marginLeft = '20px' : mainContentArea.style.marginLeft = '0';
    }
  }

  filterItems(event: InputEvent): void {
    if (!this.filterString) {
      this.filteredInstances = this.workspaces.flatMap(workspace => workspace.instances);
      this.treeNodes = this.convertInstancesToTree(this.filteredInstances).filter(t => !t.data.sharedInstance);
      this.sharedTreeNodes = this.convertInstancesToTree(this.filteredInstances).filter(t => t.data.sharedInstance);
      return;
    }

    this.filteredInstances = this.filterService.filter(this.workspaces.flatMap(wk => wk.instances), ['name'], this.filterString, 'contains');

    this.treeNodes = this.convertInstancesToTree(this.filteredInstances).filter(t => !t.data.sharedInstance);
    this.sharedTreeNodes = this.convertInstancesToTree(this.filteredInstances).filter(t => t.data.sharedInstance);
  }

  isNodeActive(node: TreeNode, selectedNodeUrl: string): boolean {
    return node.data === this.getCleanUrl(selectedNodeUrl);
  }

  getInstancePageLink(): string {
    if (this.workspaces) {
      const workspaceId = this.workspaces[0].id;
      return `/space/${workspaceId}/jira-instances`;
    }
    return '';
  }

  navigateToHomePage() {
    this.store.dispatch(discardSentCallsAfterNavigate());
    this.store.dispatch(cancelDailyScrumUpdates());

    if (this.workspaces) {
      const workspaceId = this.workspaces[0].id;
      this.router.navigate([`/space/${workspaceId}/home`]);
    }
  }

  convertInstancesToTree(instances: Instance[]): TreeNode[] {
    let treeNodes: TreeNode[] = [];
    instances.forEach((instance) => {
      const treeNode: TreeNode = {
        key: instance.id.toString(),
        label: instance.name,
        expanded: false,
        data: {
          userAccessCode: instance.instanceUser.accessLevelCode,
          sharedInstance: instance.sharedInstance,
          joined: instance.joined,
          ownerInformation: instance.ownerInformation
        },
        children: this.getInstanceFeatures(instance)
      };
      treeNodes.push(treeNode);
    });

    treeNodes = this.expandChildNode(treeNodes, this.getCleanUrl(this.router.url));
    return treeNodes;
  }

  expandChildNode(treeNodes: TreeNode[], url: string): TreeNode[] {
    return treeNodes.map((treeNode: TreeNode) => {

      if (treeNode.children && treeNode.children.length > 0) {
        const isChildUrl = treeNode.children.some(childNode => childNode?.data === url);

        treeNode.children = this.expandChildNode(treeNode.children, url);
        treeNode = {
          ...treeNode,
          expanded: isChildUrl
        };
      }
      return treeNode;
    });
  }

  async toggleMenuBar(event: any, node: TreeNode, menu: Menu) {
    const instanceDetail = this.filteredInstances.find(instance => instance.id.toString() == node.key);
    const userSizeLimitation = instanceDetail?.limitationAndComponents?.khojiLimitations?.find(limitation => limitation.id === Constants.USERS_ALLOWED).value;
    const isRemindTeamFeatureEnabled = instanceDetail?.instanceFeatures?.some(feature => feature.id == Features.TEAM_VIEW) || false;
    const isMyWorkFeatureEnabled = instanceDetail?.instanceFeatures?.some(feature => feature.id == Features.MY_WORK) || false;
    const hasAccess = isMyWorkFeatureEnabled || this.hasAccessLevel(node, AccessLevels.Admin) || this.hasAccessLevel(node, AccessLevels.TenantAdmin);
    const tooltipLabel = hasAccess ? '' : this.translation?.error.adminAccessRequired;

    this.instanceMenuItems = [
      {
        items: [
          {
            disabled: !(hasAccess),
            tooltipOptions: {
              tooltipLabel
            },
            label: this.translation?.userWorkspace?.manageApp,
            routerLink: `/space/${this.workspaces[0]?.id}/instance/${node.key}/manage-app`,
            queryParams: { tab: isRemindTeamFeatureEnabled ? 'manage-users' : 'manage-settings' }
          }
        ]
      }
    ];

    let addUserPermission = false;
    //show invite users only if user is tenant admin and instance has remind teams feature
    if (this.hasAccessLevel(node, AccessLevels.TenantAdmin) && isRemindTeamFeatureEnabled) {
      addUserPermission = true;
      const _disabled = instanceDetail.nonRevokedUsers >= Number(userSizeLimitation);
      const tooltipLabel = _disabled ? this.translation?.viewUser.button.addJiraUserDisabledTooltip : '';

      this.instanceMenuItems[0].items.unshift(
        {
          label: this.translation?.userWorkspace?.inviteUser,
          _disabled,
          tooltipOptions: {
            tooltipLabel
          },
          routerLink: `/space/${this.workspaces[0]?.id}/instance/${node.key}/manage-app`,
          queryParams: { tab: 'manage-users' },
          skipLocationChange: false,
          command: () => {
            // NOTE: command will not execute in v17 if parent component is redirected
            // this.store.dispatch(addNewUserCommand({ add: true }));
          }
        }
      );
    }

    menu.toggle(event);

    await wait(100);
    // NOTE: instead of command menu option, add custom event listener
    const addUserMenuElement = await findElementWithText('.p-menuitem-link', this.translation?.userWorkspace?.inviteUser) as HTMLLinkElement;
    if (addUserMenuElement && addUserMenuElement.href.match(`/instance/${instanceDetail.id}/`)) {
      addUserMenuElement.addEventListener('click', () => {
        this.store.dispatch(addNewUserCommand({ add: true }));
      });
    }
  }

  hasAccessLevel(treeNode: TreeNode, accessLevel: AccessLevels): boolean {
    const userRole = treeNode.data?.userAccessCode;
    return userRole == accessLevel;
  }

  isUserAdmin(treeNode: TreeNode) {
    return this.hasAccessLevel(treeNode, AccessLevels.Admin) || this.hasAccessLevel(treeNode, AccessLevels.TenantAdmin);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  getInstanceFeatures(instance: Instance): TreeNode[] {
    let childNodes: TreeNode[] = [];

    const myWorkFeatures = [Constants.UNLEASH_FEATURE_FLAG_MY_WORKLOGS, Constants.UNLEASH_FEATURE_FLAG_SCRUM_UPDATES];
    const TeamViewFeatures = [Constants.UNLEASH_FEATURE_FLAG_WORKLOG_INSIGHTS, Constants.UNLEASH_FEATURE_FLAG_TEAM_PULSE, Constants.UNLEASH_FEATURE_FLAG_STANDUP_BOARD];
    const myWorkFeaturesEnabled = this.enabledFeatures.filter(feature => myWorkFeatures.includes(feature.name)).map(feature => feature.name);
    const teamViewFeaturesEnabled = this.enabledFeatures.filter(feature => TeamViewFeatures.includes(feature.name)).map(feature => feature.name);

    if (instance.instanceFeatures.find(feature => feature.id == Features.MY_WORK) && myWorkFeaturesEnabled.length > 0) {
      childNodes.push({
        label: "My Work",
        data: `/space/${this.workspaces[0].id}/instance/${instance.id}/feature/my-work`,
        type: 'url'
      });
    }

    if (instance.instanceFeatures.find(feature => feature.id == Features.TEAM_VIEW) && teamViewFeaturesEnabled.length > 0) {
      childNodes.push({
        label: "Team View",
        data: `/space/${this.workspaces[0].id}/instance/${instance.id}/feature/team-view`,
        type: 'url'
      });
    }

    return childNodes;
  }

  async stopSentCalls(node) {
    if (node.data === location.pathname) return;

    this.store.dispatch(setAIGeneratedWorklogSubmissionLoadingState({ loadingState: LoadingState.Pending }));
    this.store.dispatch(setGenerateAIWorklogLoadingState({ loadingState: LoadingState.Pending }));
    this.store.dispatch(discardSentCallsAfterNavigate());
    this.store.dispatch(cancelDailyScrumUpdates());
  }

  // Removing query parameters from URL
  getCleanUrl(url: string): string {
    const urlObj = new URL(url, window.location.origin);
    return urlObj.pathname;
  }

  getOwnerTooltip(node: TreeNode): string {
    if (!node.data.ownerInformation) return '';
    const owner = node.data.ownerInformation;
    return `${owner.fullName}\n${owner.email}`;
  }
}
