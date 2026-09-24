/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component, Input, OnInit } from '@angular/core';
import { AppState } from 'app/states/app-states';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

export interface CommonComponentDashboardModel {
  title: string;
  key: string;
  subtitle?: string;
  imagePath?: string;
  icon?: string;
  leadingIcon?: string;
  disabled?: boolean;
  disabledIcon?: string;
  toolTip?: string;
  children?: CommonComponentDashboardModel [];
}

@Component({
  selector: 'khoji-component-dashboard',
  templateUrl: './khoji-component-dashboard.component.html',
  styleUrls: ['./khoji-component-dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  @Input() model: CommonComponentDashboardModel;
  subscription = new Subscription();
  dashboardComponentTranslations: any;

  constructor(private store: Store<AppState>) { }

  ngOnInit(): void {
    const tanslations$ = this.store.select('globalTranslations');

    this.subscription.add(tanslations$.subscribe(translations => {
      this.dashboardComponentTranslations = translations.translation.dashboardComponent;
    }));
  }
}
