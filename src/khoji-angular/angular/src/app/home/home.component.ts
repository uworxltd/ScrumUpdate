import { CommonModule, NgFor } from "@angular/common";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import { Store } from "@ngrx/store";
import { Constants } from "app/constants";
import { redirect_to_teams_link } from "app/instance/instance.component";
import { RootNav, TrackingService } from "app/services/tracking";
import { UnleashFeature, UnleashService } from "app/services/unleash.service";
import { getCurrentWorkspace, getGreetingsAccordingToTheTime, waitForValue } from "app/shared/helper-functions";
import { AppState } from "app/states/app-states";
import { selectTranslation } from "app/states/global-translations.selector";
import { selectCurrentInstance, selectKhojiUserProfile, selectWorkspaceWithInstance } from "app/user-profile/state/user-profile.selectors";
import { Features, Instance } from "app/user-profile/state/user-profile.states";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { DividerModule } from "primeng/divider";
import { combineLatest, Subscription } from "rxjs";

@Component({
  selector: 'khoji-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [
    ButtonModule,
    DividerModule,
    CardModule,
    CommonModule,
    NgFor
  ]
})
export class HomeComponent implements OnInit, OnDestroy {
  translations: any;
  greetingMessage: string = '';
  subscription = new Subscription();
  instances: Instance[] = [];
  sharedInstances: Instance[] = [];
  enabledFeatures: UnleashFeature[] = [];

  remindTeamsUrl: string = '';
  spaceId = 0;

  constructor(
    private store: Store<AppState>,
    private router: Router,
    private titleService: Title,
    private route: ActivatedRoute,
    private trackingService: TrackingService,
    private unleashService: UnleashService,
  ) { }


  ngOnInit(): void {
    sessionStorage.removeItem(Constants.INSTANCE_ID);
    this.trackingService.captureNavigationStep(RootNav.Home);
    const translation$ = this.store.pipe(selectTranslation);
    const khojiUserProfile$ = this.store.pipe(selectKhojiUserProfile);
    const workspaces$ = this.store.pipe(selectWorkspaceWithInstance);
    const currentInstance$ = this.store.pipe(selectCurrentInstance);
    const enabledFeatures$ = this.unleashService.getEnabledFeatures();

    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe((translation) => {
        this.titleService.setTitle(translation?.pageTitles?.home);
      })
    );

    this.subscription.add(workspaces$.subscribe(workspaces => {
      const foundWorkspace = workspaces.find(ws => ws.id === +getCurrentWorkspace());
      if (foundWorkspace) {
        this.instances = foundWorkspace.instances.filter(i => !i.sharedInstance);
        this.sharedInstances = foundWorkspace.instances.filter(i => i.sharedInstance);

        if (this.instances.length > 0) {
          redirect_to_teams_link(this.router);
        }
      }
      else this.router.navigate(['/space']);
    }))


    this.subscription.add(combineLatest([translation$, khojiUserProfile$]).subscribe(([translation, userProfile]) => {
      this.translations = translation;
      this.greetingMessage = `${getGreetingsAccordingToTheTime(translation)}, ${userProfile.fullName}`
    }));

    this.subscription.add(currentInstance$.subscribe(instance => {
      this.spaceId = instance.spaceId;
    }));

    this.subscription.add(enabledFeatures$.subscribe(features => {
      this.enabledFeatures = features;
    }));
  }

  navigateToJiraInstancesPage() {
    this.trackingService.captureNavigationStep(RootNav.Home.Set_up_a_new_app_Click);
    this.router.navigate([`/space/${this.spaceId}/jira-instances`]);
  }

  navigateToJiraInstancesPageAndInvitationsTab() {
    const queryParams = {
      tab: 'invitations'
    }
    this.router.navigate([`/space/${this.spaceId}/jira-instances`], { queryParams });
  }

  async navigateToInstance(instance: Instance) {
    this.trackingService.captureNavigationStep(RootNav.Home.JiraInstances);
    const featureUrl = await this.getFeatureUrl(instance);
    this.router.navigate(['../', 'instance', `${instance.id}`, 'feature', `${featureUrl}`], { relativeTo: this.route });
  }

  async getFeatureUrl(instance: Instance): Promise<string> {
    const enabledFeatures = await waitForValue(() => this.enabledFeatures && this.enabledFeatures.length > 0, () => this.enabledFeatures);

    const myWorkFeatures = [Constants.UNLEASH_FEATURE_FLAG_MY_WORKLOGS, Constants.UNLEASH_FEATURE_FLAG_SCRUM_UPDATES];
    const TeamViewFeatures = [Constants.UNLEASH_FEATURE_FLAG_WORKLOG_INSIGHTS, Constants.UNLEASH_FEATURE_FLAG_TEAM_PULSE, Constants.UNLEASH_FEATURE_FLAG_STANDUP_BOARD];
    const myWorkFeaturesEnabled = enabledFeatures.filter(feature => myWorkFeatures.includes(feature.name)).map(feature => feature.name);
    const teamViewFeaturesEnabled = enabledFeatures.filter(feature => TeamViewFeatures.includes(feature.name)).map(feature => feature.name);

    const isMyWorkFeature = instance.instanceFeatures.find(feature => feature.id == Features.MY_WORK);
    const isTeamViewFeature = instance.instanceFeatures.find(feature => feature.id == Features.TEAM_VIEW);

    if (isMyWorkFeature && myWorkFeaturesEnabled.length > 0) {
      return 'my-work';
    }
    else if (isTeamViewFeature && teamViewFeaturesEnabled.length > 0) {
      return 'team-view';
    }

    return 'team-view';
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
