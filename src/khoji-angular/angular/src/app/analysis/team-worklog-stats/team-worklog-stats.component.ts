
/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppState } from 'app/states/app-states';
import { cancelWorkspacesRequest } from 'app/states/app.actions';
import { selectTranslation } from 'app/states/global-translations.selector';
import { environment } from 'environments/environment';
import { Subscription } from 'rxjs';

@Component({
  selector: 'khoji-team-worklog-stats',
  templateUrl: './team-worklog-stats.component.html',
  styleUrls: ['./team-worklog-stats.component.scss']
})
export class TeamWorklogStatsComponent implements OnInit, OnDestroy {
  translation: any; // TODO: add types
  subscription = new Subscription();
  @Input() isConfigOnSourceUpdated = false;
  rssFeedUrl = environment.RSS_FEED_URL;
  activeTabIndex: number = 0;

  constructor(
    private store: Store<AppState>,
  ) { }

  ngOnInit() {
    const trans$ = this.store.pipe(selectTranslation);
    this.subscription.add(
      trans$.subscribe(data => this.translation = data)
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.store.dispatch(cancelWorkspacesRequest());
  }
}
