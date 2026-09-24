import { CommonModule } from '@angular/common';
import { OnInit, OnDestroy, Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Constants } from 'app/constants';
import { InstanceComponent } from 'app/instance/instance.component';
import { getParentActivatedRoute } from 'app/shared/helper-functions';
import { ImageDirective } from 'app/shared/image.directive';
import { AppState } from 'app/states/app-states';
import { selectInstanceDetail, selectWorkspaceWithInstance } from 'app/user-profile/state/user-profile.selectors';
import { InstanceDetails } from 'app/user-profile/state/user-profile.states';
import { combineLatest, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-details',
  templateUrl: './app-details.component.html',
  styleUrls: ['./app-details.component.scss'],
  standalone: true,
  imports: [CommonModule, ImageDirective]
})
export class AppDetailsComponent implements OnInit, OnDestroy {
  subscription: Subscription = new Subscription();
  instanceDetails: InstanceDetails;
  instanceMemberCount: number;

  constructor(private route: ActivatedRoute, private router: Router, private store: Store<AppState>, private titleService: Title) {}

  ngOnInit() {
    // this.store.dispatch(fetchInstanceDetails()); already issued in instanse admin panel comp
    const instanceDetails$ = this.store.pipe(selectInstanceDetail, filter(instanceDetails => instanceDetails != undefined));
    const workspaces$ = this.store.pipe(selectWorkspaceWithInstance);
    const instanceRoute$ = getParentActivatedRoute(InstanceComponent, this.route)?.paramMap;

    this.subscription.add(
      combineLatest([instanceDetails$, workspaces$, instanceRoute$]).subscribe(([instanceDetails, workspaces, instanceRoute]) => {
        this.instanceDetails = instanceDetails;
        const instance = workspaces[0]?.instances?.find((instance) => instance.id.toString() == instanceRoute?.get(Constants.INSTANCE_ID));
        this.instanceMemberCount = instance?.memberCount;
      })
    );
  }

  getCurrentInstanceUrl(): string {
    const instanceId = this.instanceDetails.id;
    const spaceId = this.instanceDetails.workSpaceId;
    return `${window.location.origin}/space/${spaceId}/instance/${instanceId}`;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
