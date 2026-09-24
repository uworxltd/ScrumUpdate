import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AppState, LoadingState } from 'app/states/app-states';
import { fetchWorkSpaces } from 'app/states/app.actions';
import { selectWorkspaces, selectWorkspacesLoadingState } from 'app/user-profile/state/user-profile.selectors';
import { combineLatest, Subscription } from 'rxjs';

@Component({
  selector: '',
  template: '',
})
export class SpaceRedirectorComponent implements OnInit {

  subscription = new Subscription();

  constructor(
    private store: Store<AppState>,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.store.dispatch(fetchWorkSpaces());

    this.subscription.add(
      combineLatest(
        [
          this.store.pipe(selectWorkspaces),
          this.store.pipe(selectWorkspacesLoadingState),
          this.route.queryParams
        ]
      )
      .subscribe(
        (
          [
            workspaces,
            loadingState,
            queryParams
          ]
        ) => {
          if (loadingState === LoadingState.Done && workspaces.length) {
            if (Object.entries(queryParams).length) {
              if (queryParams.tab) {
                this.router.navigate(['space', workspaces[0].id, 'jira-instances'], { queryParams })
              } else if (queryParams.instance && queryParams.feature) {
                const { instance, feature, ...rest } = queryParams;
                this.router.navigate(['space', workspaces[0].id, 'instance', instance, 'feature', feature ], { queryParams: rest });
              }
            } else if (workspaces[0].instances.length === 0) {
              this.router.navigate(['space', workspaces[0].id, 'jira-instances']);
            } else {
              this.router.navigate(['space', workspaces[0].id, 'home']);
            }
          }
        }
      )
    )
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
