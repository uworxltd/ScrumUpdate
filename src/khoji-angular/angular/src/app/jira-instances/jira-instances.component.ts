import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Constants } from 'app/constants';
import { LogoutService } from 'app/services/logout.service';
import { TrackingService, UserActions, RootNav } from 'app/services/tracking';
import { UnleashFeature, UnleashService } from 'app/services/unleash.service';
import { getCurrentWorkspace } from 'app/shared/helper-functions';
import { CreateInstancePayload, InviteAction } from 'app/shared/picklist/interfaces';
import { AppState, LoadingState } from 'app/states/app-states';
import { fetchAccessibleResources, fetchValidateUser, instanceInviteAction, setInstanceDetailsLoadingState, userSelectedAccessibleResource } from 'app/states/app.actions';
import { selectNavigateBasedOnLoadingState, selectValidateUserLoadingState } from 'app/states/global-process.selector';
import { selectTranslation } from 'app/states/global-translations.selector';
import { selectAccessibleResources, selectAccessibleResourcesLoadingState, selectWorkspaces } from 'app/user-profile/state/user-profile.selectors';
import { AccessibleResource, InvitedInstances, JiraResourcesResponse, Workspace } from 'app/user-profile/state/user-profile.states';
import { environment } from 'environments/environment';
import { Message } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { MessagesModule } from 'primeng/messages';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { TabViewModule } from 'primeng/tabview';
import { combineLatest, Subscription } from 'rxjs';

@Component({
  selector: 'khoji-jira-instances',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    ChipModule,
    ScrollPanelModule,
    ProgressSpinnerModule,
    MessagesModule,
    TabViewModule,
    BadgeModule
  ],
  templateUrl: './jira-instances.component.html',
  styleUrls: ['./jira-instances.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JiraInstancesComponent implements OnInit, OnDestroy {
  private subsription = new Subscription();
  private autoSelectExecuted: boolean = false;
  accessibleResources: AccessibleResource;
  workspaces: Workspace[];
  anyExistingResource: boolean;
  isLoading: boolean;
  userAccessError: Message[] = [
    {
      severity: 'error',
      summary: 'Error!',
      detail: `You have given permission for a different account. Please try again or contact <span class="text-teal-700">${environment.SUPPORT_EMAIL}</span>`
    }
  ];
  validateUserLoadingState = LoadingState.Pending;
  loadingStates = LoadingState;
  acceptedInstanceInviteId: number;
  acceptClicked: boolean = false;
  activeIndex: number = 0;
  invitedInstances: InvitedInstances[];
  teamViewFeaturesEnabled: UnleashFeature[] = [];

  constructor(
    private store: Store<AppState>,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private titleService: Title,
    private trackingService: TrackingService,
    private logoutService: LogoutService,
    private route: ActivatedRoute,
    private elementRef: ElementRef,
    private unleashService: UnleashService,
  ) {}

  ngOnInit(): void {
    this.trackingService.captureNavigationStep(RootNav.Onboarding.JiraInstances);
    sessionStorage.removeItem(Constants.INSTANCE_ID);
    this.store.dispatch(fetchAccessibleResources());
    this.validateAccountAccess();
    const accessibleResources$ = this.store.pipe(selectAccessibleResources);
    const accessibleResourcesLoadingState$ = this.store.pipe(selectAccessibleResourcesLoadingState);
    const workspaces$ = this.store.pipe(selectWorkspaces);
    const validateUserLoadingState = this.store.pipe(selectValidateUserLoadingState);
    const enabledFeatures$ = this.unleashService.getEnabledFeatures();

    this.subsription.add(
      this.store.pipe(selectTranslation).subscribe((translation) => {
        this.titleService.setTitle(translation?.pageTitles?.appSetup);
      })
    );

    this.subsription.add(
      this.store.pipe(selectNavigateBasedOnLoadingState).subscribe(loadingStates => {
        if (loadingStates.workspaceLoadingState === LoadingState.Done && loadingStates.instanceInviteLoadingState === LoadingState.Done) {
          this.router.navigate(['../', 'instance', this.acceptedInstanceInviteId], { relativeTo: this.route })
        }

        if (loadingStates.instanceInviteLoadingState === LoadingState.Error) {
          this.acceptClicked = false;
          this.cdr.detectChanges();
        }
      })
    )

    this.subsription.add(
      combineLatest(
        [
          accessibleResources$,
          workspaces$,
          accessibleResourcesLoadingState$,
          this.route.queryParams
        ]
      ).subscribe(
        ([
          accessibleResources,
          workspaces,
          accessibleResourcesloadingState,
          queryParams
        ]) => {
          this.isLoading = accessibleResourcesloadingState === LoadingState.Loading;
          if (accessibleResourcesloadingState === LoadingState.Done && workspaces.length) {
            // Check if there are any existing instances registered in the workspace
            const hasExistingInstances = workspaces[0].instances.length > 0;
            
            // Check auto-select condition: only auto-select for first-time users with no existing instances
            const shouldAutoSelect = !hasExistingInstances &&
              accessibleResources?.jiraInstances?.length === 1 &&
              !accessibleResources.jiraInstances[0].alreadyRegistered &&
              accessibleResources.invitedInstances.length === 0;

            if (shouldAutoSelect && !this.autoSelectExecuted) {
              // Mark as executed to prevent multiple triggers
              this.autoSelectExecuted = true;
              
              // Show loader during auto-select and navigation
              this.isLoading = true;
              this.cdr.detectChanges();

              setTimeout(() => {
                this.workspaces = workspaces
                this.selectResource(accessibleResources.jiraInstances[0]);
              });
              return;
            }

            // Set data for normal cases
            this.accessibleResources = accessibleResources;
            this.workspaces = workspaces;

            // Add loaded class to show component
            this.elementRef.nativeElement.classList.add('loaded');

            this.anyExistingResource = workspaces[0].instances.length > 0;
            const foundWorksapce = this.workspaces.find((workspace) => workspace.id == +getCurrentWorkspace());
            if (!foundWorksapce) this.router.navigate([`space/${workspaces[0].id}/jira-instances`]);
            if (queryParams) {
              this.activeIndex = queryParams['tab'] === 'invitations' ? 1 : this.activeIndex;
              if (this.accessibleResources) {
                const instanceId = Number(queryParams['instanceId']);
                if (Number.isNaN(instanceId)) {
                  this.invitedInstances = this.accessibleResources.invitedInstances;
                } else {
                  this.invitedInstances = [...this.accessibleResources.invitedInstances].sort((a, b) => {
                    if (a.instanceId === instanceId) return -1;
                    if (b.instanceId === instanceId) return 1;
                    return 0;
                  });
                }
              }
            }
            this.cdr.detectChanges();
          }
        }
      )
    );

    this.subsription.add(
      validateUserLoadingState.subscribe((loadingState) => {
        this.validateUserLoadingState = loadingState;
        this.cdr.detectChanges();
      })
    );

    this.subsription.add(
      enabledFeatures$.subscribe(features => {
        const TeamViewFeatures = [Constants.UNLEASH_FEATURE_FLAG_WORKLOG_INSIGHTS, Constants.UNLEASH_FEATURE_FLAG_TEAM_PULSE, Constants.UNLEASH_FEATURE_FLAG_STANDUP_BOARD];
        this.teamViewFeaturesEnabled = features.filter(feature => TeamViewFeatures.includes(feature.name)).map(feature => feature);
        this.cdr.detectChanges();
      })
    );
  }

  validateAccountAccess() {
    const code = localStorage.getItem('Source_code');
    if (code !== null && code !== 'undefined') {
      this.store.dispatch(fetchValidateUser({ sourceCode: code }));
    }

    localStorage.removeItem('Source_code');
  }

  selectResource(jiraResoucre: JiraResourcesResponse) {
    this.trackingService.captureNavigationStep(RootNav.Onboarding.JiraInstances.Integrate_Click);
    this.store.dispatch(
      userSelectedAccessibleResource({
        userSelectedAccessibleResource: this.getCreateInstancePayload(jiraResoucre, this.workspaces[0].id)
      })
    );
    this.router.navigateByUrl(`/space/${this.workspaces[0].id}/account-setup`);
  }

  acceptInvite(invitedInstance: InvitedInstances) {
    // navigate to error page incase there is an error in invited instance
    if (invitedInstance.errorCode && invitedInstance.errorCode === 'NA000') {
      this.router.navigate(['../', 'invite-error'], { relativeTo: this.route });
      return;
    }

    this.acceptedInstanceInviteId = invitedInstance.instanceId;
    this.acceptClicked = true;
    const inviteAction: InviteAction = {
      instanceId: invitedInstance.instanceId,
      action: true
    }

    this.store.dispatch(instanceInviteAction({ inviteAction }));
  }

  getCreateInstancePayload(accessibleResource: JiraResourcesResponse, workspaceId: number): CreateInstancePayload {
    return {
      tenantId: accessibleResource.id,
      instanceImageUrl: `${accessibleResource.url}/jira-logo-scaled.png`,
      instanceName: accessibleResource.name,
      workspace: {
        id: workspaceId
      },
      featureId: null
    };
  }

  navigateToJira(): void {
    this.trackingService.captureNavigationStep(RootNav.Onboarding.JiraInstances.Choose_another_instance_Click);
    // const state = uuidv4();
    // localStorage.setItem(NAVIGATE_TO_INSTANCE_PAGE, this.router.url);
    // const clientId = environment.clientId;
    // const redirectUri = encodeURIComponent(LOGIN_PAGE_URL);
    // const scopes = `${environment.scopes}%20offline_access`;
    // const authUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&response_type=code&prompt=select_account&state=${state}`;
    // window.location.href = authUrl;
    //KFX-813
    this.logoutService.logout(true);
  }

  navigateToBackPage(): void {
    this.trackingService.captureNavigationStep(RootNav.Onboarding.JiraInstances.Back_Click);
    this.router.navigate([`/space/${this.workspaces[0]?.id}/home`]);
  }

  logout() {
    this.trackingService.captureUserAction(UserActions.Logout.LogoutFromJiraInstances);
    this.logoutService.logout();
  }

  ngOnDestroy() {
    this.autoSelectExecuted = false;
    this.store.dispatch(setInstanceDetailsLoadingState({ loadingState: LoadingState.Pending }));
    this.subsription.unsubscribe();
  }
}
