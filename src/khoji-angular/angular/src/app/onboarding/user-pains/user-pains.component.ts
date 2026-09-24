/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RootNav, TrackingService, UserActions } from 'app/services/tracking';
import { ActivatedRoute, Router } from '@angular/router';
import { getCurrentInstance, getCurrentWorkspace } from 'app/shared/helper-functions';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

interface UserPain {
  id: string;
  icon: string;
  title: string;
  desc: string;
  selected: boolean;
}

@Component({
  selector: 'khoji-user-pains',
  templateUrl: './user-pains.component.html',
  styleUrls: ['./user-pains.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
  ]
})
export class UserPainsComponent implements OnInit {
  pains: UserPain[] = [
    { id: 'timesheets', icon: '⏱️', title: "Time Tracking", desc: 'I waste hours manually logging time.', selected: false },
    { id: 'standups', icon: '😴', title: "Daily Standups", desc: 'Meetings disrupt my flow state constantly.', selected: false },
    { id: 'manager', icon: '👀', title: "Lack of Visibility", desc: "My manager can't see my actual impact.", selected: false },
    { id: 'blockers', icon: '🚧', title: "Frequent Blockers", desc: 'Dependencies derail my sprint goals.', selected: false },
  ];

  selectedPain: UserPain | null = null;
  featureId?: string | null;

  constructor(
    private trackingService: TrackingService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.trackingService.captureNavigationStep(RootNav.Onboarding.UserPains);
    this.route.paramMap.subscribe(pm => {
      this.featureId = pm.get('featureId');
    });
  }

  toggle(pain: UserPain) {
    this.selectedPain = this.pains.find(p => p.id === pain.id);
  }

  onSubmit() {
    this.trackingService.captureUserAction(UserActions.Onboarding.UserPains.UserPainSelected, {
      pains: [this.selectedPain ? this.selectedPain.title : 'none']
    });

    // Navigate depending on featureId
    const workspace = getCurrentWorkspace();
    const instance = getCurrentInstance();

    if (this.featureId === '2') {
      this.router.navigate([`/space/${workspace}/instance/${instance}/build-team`]);
    } else {
      this.router.navigate([`/space/${workspace}/instance/${instance}/feature/my-work`]);
    }
  }
}
