/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component, ElementRef, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { FeatureFlagService } from 'app/services/feature.flag.service';
import { AppState } from 'app/states/app-states';
import { environment } from 'environments/environment';
import { Subscription } from 'rxjs';
import { Constants } from '../constants';
import { LayoutService } from './service/app.layout.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './app.sidebar.component.html',
  styleUrls: ['../../styles/theme/apollo.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AppSidebarComponent implements OnInit {
  environment = environment;
  subscription = new Subscription();
  constants = Constants;

  constructor(private router: Router, public layoutService: LayoutService, public el: ElementRef, private store: Store<AppState>, private feature: FeatureFlagService) { }

  ngOnInit() {}

  async navigateToDashboard() {
    const workspaceId = sessionStorage.getItem(Constants.SPACE_ID);
    this.router.navigate([`/space/${workspaceId}/home`]);
  }

}
