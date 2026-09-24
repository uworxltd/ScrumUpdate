import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Constants } from 'app/constants';
import { Routes } from 'app/interface/routes.enum';
import { TrackingService } from 'app/services/tracking';
import { UnleashService } from 'app/services/unleash.service';
import { JiraService } from 'app/services/jira.service';
import { getCurrentWorkspace } from 'app/shared/helper-functions';
import { AppState, LoadingState } from 'app/states/app-states';
import { fetchKhojiUserProfile } from 'app/states/app.actions';
import { selectKhojiUserProfile, selectWorkspacesWithLoadingStates } from 'app/user-profile/state/user-profile.selectors';
import { Features } from 'app/user-profile/state/user-profile.states';
import { environment } from 'environments/environment';
import { combineLatest, Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

export function redirect_to_teams_link(router: Router) {
  const redirect_url = localStorage.getItem(environment.REDIRECT_URL + "msft-teams");

  if (redirect_url === "/" + Routes.LINK_TO_MS_TEAMS_STATUS) {
    localStorage.removeItem(environment.REDIRECT_URL + "msft-teams");
    router.navigate([redirect_url]);
    return true;
  }

  return false;
}

@Component({
  selector: 'khoji-instance',
  templateUrl: './instance.component.html',
  styleUrls: ['./instance.component.scss'],
})
export class InstanceComponent implements OnInit, OnDestroy {
  private subscription = new Subscription();
  loadingStateDone = false;
  private lastEnabledFeatureNames: string[] = []; // keep last-known enabled feature names to detect changes

  constructor(
    private store: Store<AppState>,
    private route: ActivatedRoute,
    private router: Router,
    private trackingService: TrackingService,
    private unleaseService: UnleashService,
    private jiraService: JiraService
  ) { }

  ngOnInit() {
    this.store.dispatch(fetchKhojiUserProfile());
    const workspacesWithLoadingState$ = this.store.pipe(selectWorkspacesWithLoadingStates);
    const profile$ = this.store.pipe(selectKhojiUserProfile, distinctUntilChanged((a, b) => a.id === b.id));
    const enabledFeatures$ = this.unleaseService.getEnabledFeatures();

    this.subscription.add(
      combineLatest(
        [
          workspacesWithLoadingState$,
          this.route.paramMap,
          profile$,
          enabledFeatures$,
        ]
      ).subscribe(
        ([
          workspacesWithLoadingState,
          params,
          profile,
          enabledFeatures,
        ]) => {
          const instanceId = params.get(Constants.INSTANCE_ID);
          sessionStorage.storeItem(Constants.INSTANCE_ID, instanceId);

          if (Number.isNaN(Number(instanceId))) {
            sessionStorage.removeItem(Constants.INSTANCE_ID);
            this.router.navigate(['space']);
          }

          if (workspacesWithLoadingState.loadingState === LoadingState.Done && workspacesWithLoadingState.workspaces.length) {
            const foundWorkspace = workspacesWithLoadingState.workspaces.find(ws => ws.id === +getCurrentWorkspace());
            if (foundWorkspace) {
              const foundInstance = foundWorkspace.instances.find(ins => ins.id == +instanceId);
              if (foundInstance) {

                const props = {
                  "Access_Level": foundInstance.instanceUser.accessLevelCode,
                  "Tenant_Name": foundInstance.name,
                };

                this.trackingService.captureUserIdentity(profile.id.toString());
                this.trackingService.registerEventProperties(props);

                this.unleaseService.setInstanceName(foundInstance.name);

                if (!this.route.firstChild) {
                  const firstFeature = foundInstance.instanceFeatures[0].id;
                  this.router.navigate(['feature', firstFeature === Features.TEAM_VIEW ? 'team-view' : 'my-work'], { relativeTo: this.route })
                }

                // Detect changes in enabled Unleash features and, if changed, ask backend for required Jira scopes
                const currentFeatureNames = (enabledFeatures || []).map((f: any) => f.name).filter(Boolean);
                const featuresChanged = this.lastEnabledFeatureNames.length > 0 && (currentFeatureNames.length !== this.lastEnabledFeatureNames.length || JSON.stringify(currentFeatureNames) !== JSON.stringify(this.lastEnabledFeatureNames));

                if (featuresChanged) {
                  if (profile && profile.id && foundInstance && foundInstance.name && currentFeatureNames.length) {
                    this.subscription.add(
                      this.jiraService.getTokenScopes(foundInstance.name, profile.id, currentFeatureNames).subscribe((resp) => {
                        const scopes = resp?.requiredScopes ?? [];
                        if (Array.isArray(scopes) && scopes.length > 0) {
                          this.jiraService.redirectToAtlassianAuth(scopes);
                        }
                      })
                    );
                  }
                }

                this.lastEnabledFeatureNames = currentFeatureNames.slice();

              } else {
                sessionStorage.removeItem(Constants.INSTANCE_ID);
                this.router.navigate(['space']);
              }
            } else {
              // TODO: func and check
              sessionStorage.removeItem(Constants.SPACE_ID);
              sessionStorage.removeItem(Constants.INSTANCE_ID);
              this.router.navigate(['/space']);
            }

            this.loadingStateDone = true;
          }
        }
      )
    )
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
