import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { filterQueryParams } from 'app/shared/helper-functions';
import { AppState, LoadingState } from 'app/states/app-states';
import { linkUserToMSTeams } from 'app/states/app.actions';
import { selectLinkToMSTeamsLoadingState } from 'app/states/global-process.selector';
import { CardModule } from 'primeng/card';
import { MessagesModule } from 'primeng/messages';
import { Subscription } from 'rxjs';

@Component({
  selector: 'khoji-link-to-msteams',
  standalone: true,
  templateUrl: './link-to-msteams.component.html',
  styleUrl: './link-to-msteams.component.scss',
  imports: [
    CommonModule,
    CardModule,
    MessagesModule,
  ],
})
export class LinkToMSTeamsComponent implements OnInit, OnDestroy {
  subscription = new Subscription();
  loadingState = LoadingState;
  linkToMSTeamsLoadingStatus: LoadingState = LoadingState.Pending;
  teamsReturnUrl: string = 'https://teams.microsoft.com';
  validRequest = true;

  constructor(private store: Store<AppState>) { }

  ngOnInit() {
    const linkToMSTeamsLoadingStatus$ = this.store.pipe(selectLinkToMSTeamsLoadingState);
    this.subscription.add(
      linkToMSTeamsLoadingStatus$.subscribe(data => {
        this.linkToMSTeamsLoadingStatus = data;

        if (data === LoadingState.Done) {
          localStorage.removeItem('msft-teams');
        }
      })
    );

    let msft_teams_params = new URLSearchParams(localStorage.getItem('msft-teams') || '');

    if (msft_teams_params.get('redirect') === 'msft-teams') {
      msft_teams_params = filterQueryParams(msft_teams_params, ['disableCaptcha']);
      this.store.dispatch(linkUserToMSTeams({ queryString: msft_teams_params.toString() }));
    }
    else {
      this.validRequest = false;
    }

  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
