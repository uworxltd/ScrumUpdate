import { CommonModule, NgOptimizedImage } from "@angular/common";
import { CardModule } from 'primeng/card';
import { Component, Input } from "@angular/core";
import { SkeletonModule } from 'primeng/skeleton';
import { animate, style, transition, trigger } from "@angular/animations";
import { AppState, LoadingState } from "app/states/app-states";
import { Store } from "@ngrx/store";
import { selectAvailableFeatures, selectWorkspaces, selectWorkspacesLoadingState } from "app/user-profile/state/user-profile.selectors";
import { combineLatest, Subscription } from "rxjs";
import { ActivatedRoute, Router } from "@angular/router";
import { selectunlockedFeatureLoadingState } from "app/states/global-process.selector";
import { dispatchFeaturesUnlock, fetchAvailableFeatures } from "app/user-profile/state/user-profile.actions";
import { FeatureOption } from "app/user-profile/state/user-profile.states";
import { getCurrentInstance, getParentActivatedRoute } from "../helper-functions";
import { InstanceComponent } from "app/instance/instance.component";
import { fetchWorkSpaces } from "app/states/app.actions";
import { TrackingService, UserActions } from '../../services/tracking';
import { Constants } from "app/constants";
import { DialogModule } from "primeng/dialog";

@Component({
  selector: 'khoji-feature-unlock',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    SkeletonModule,
    NgOptimizedImage,
    DialogModule
  ],
  templateUrl: './feature-unlock.component.html',
  styleUrls: ['./feature-unlock.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('0.5s ease-in', style({ opacity: 1 }))
      ]),
    ])
  ]
})
export class FeatureUnlockComponent {
  subscription = new Subscription();
  workspaces: any;
  instanceId = 0;
  feature: FeatureOption;

  @Input() featureId = 0;
  @Input() showDetails = false;
  @Input() showDialog = false;
  visible = false;
  featureUnlocked = 0;
  progressRunning = false;

  constructor(
    private store: Store<AppState>,
    private router: Router,
    private route: ActivatedRoute,
    private trackingService: TrackingService
  ) { }

  ngOnInit() {
    this.visible = this.showDialog;
    const availabeFeatures$ = this.store.pipe(selectAvailableFeatures);
    const workspaces$ = this.store.pipe(selectWorkspaces);
    const workspacesLoadingState$ = this.store.pipe(selectWorkspacesLoadingState);
    const unlockFeatureLoadingState$ = this.store.pipe(selectunlockedFeatureLoadingState);
    const instanceRoute$ = getParentActivatedRoute(InstanceComponent, this.route)?.paramMap || this.route.paramMap;

    this.subscription.add(combineLatest([
      workspaces$,
      workspacesLoadingState$,
      instanceRoute$,
      availabeFeatures$
    ])
      .subscribe(async ([workspaces, loadingState, _instanceRoute, availabeFeatures]) => {
        this.workspaces = workspaces;
        const instance = workspaces.map(workspace => workspace.instances).flat().find(inst => inst.id === Number(getCurrentInstance()));

        if (instance && loadingState === LoadingState.Done && availabeFeatures.length > 0) {
          this.instanceId = instance.id;
          this.featureId = this.getFeatureId(instance);
          this.feature = availabeFeatures.find(feature => feature.id === this.featureId);
        }

        // fetch workspaces call will send control here again.
        if (loadingState === LoadingState.Done && this.featureUnlocked === this.featureId) {
          await this.redirectAfterUnlock();
          this.featureUnlocked = 0;
        }
      }));

    this.subscription.add(unlockFeatureLoadingState$.subscribe(data => {
      if (data.featureId === this.featureId && data.loadingState === LoadingState.Done) {

        if (!this.featureId) {
          console.error("no feature to unlock found");
          return;
        }

        this.featureUnlocked = this.featureId;

        // this will call redirectAfterUnlock in the above subscription
        this.store.dispatch(fetchWorkSpaces());
      }
    }));

    this.store.dispatch(fetchAvailableFeatures());
  }

  async redirectAfterUnlock() {
    const workspaceId = sessionStorage.getItem(Constants.SPACE_ID);
    const instanceId = sessionStorage.getItem(Constants.INSTANCE_ID);

    if (!workspaceId || !instanceId) {
      console.error("Workspace ID or Instance ID not found in session storage.");
      return;
    }

    let urlSeg = [];
    let queryParams = {};

    switch (this.featureId) {
      case 1:
        urlSeg = [`/space/${workspaceId}/instance/${instanceId}/feature/my-work`];
        break;
      case 2:
        urlSeg = [`/space/${workspaceId}/instance/${instanceId}/build-team`];
        break;
      case 4:
        urlSeg = [`/space/${workspaceId}/instance/${instanceId}/feature/my-work`];
        queryParams = { tab: 'my-worklogs' };
        break;
      case 5:
        urlSeg = [`/space/${workspaceId}/instance/${instanceId}/feature/team-view`];
        queryParams = { tab: 'team-pulse' };
        break;
      case 6:
        urlSeg = [`/space/${workspaceId}/instance/${instanceId}/feature/team-view`];
        queryParams = { tab: 'standup-board' };
        break;
      default:
        console.error("Unknown feature ID: ", this.featureId);
        return;
    }

    try {
      const success = await this.router.navigate(urlSeg, { queryParams });
      if (success) {
        this.visible = false;
      } else {
        console.warn('Navigation was canceled (e.g., by a guard).');
      }
    } catch (error) {
      console.error('Navigation failed due to an error:', error);
    }
  }

  getFeatureId(instance: any) {
    if (this.featureId) return this.featureId;

    const featureIds = instance.instanceFeatures.map(feature => feature.id);

    if (featureIds.includes(1) && featureIds.includes(2)) {
      return null;
    } else if (featureIds.includes(1)) {
      return 2;
    } else if (featureIds.includes(2)) {
      return 1;
    }
    return null;
  }

  unlockFeature() {
    if (this.progressRunning) return;

    this.progressRunning = true;

    setTimeout(() => {
      this.store.dispatch(dispatchFeaturesUnlock({ instanceId: this.instanceId, featureId: this.featureId }));

      this.trackingService.captureUserAction(
        UserActions.Instance.InstanceFeatureUnlock,
        { instanceId: this.instanceId, featureId: this.featureId }
      );
    }, 3000);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
