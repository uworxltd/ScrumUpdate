/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Component, Input, OnInit } from '@angular/core';
import { AppState } from 'app/states/app-states';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { selectTeamWorklogStats } from 'app/states/global-statistics.selector';
import { CommonModule } from '@angular/common';
import { TooltipComponent } from "app/shared/tooltip.component";

@Component({
  selector: 'khoji-worklog-popover-tootip',
  templateUrl: './worklog-popover-tootip.component.html',
  styleUrls: ['./worklog-popover-tootip.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    TooltipComponent
]
})
export class WorklogPopoverTootipComponent implements OnInit {

  @Input() tooltipTitle: string;
  @Input() tooltipSubTitle: string;
  @Input() tooltipPosition: string;
  worklogStats: any;
  subscription = new Subscription();

  constructor(private store: Store<AppState>) { }

  ngOnInit(): void {
    const stats$ = this.store.pipe(selectTeamWorklogStats);
    this.subscription.add(stats$.subscribe(data => {
      this.worklogStats = JSON.parse(JSON.stringify(data));
    }));
  }

  indicatorStyleObject(thresholdColor: string) {
    return { background: thresholdColor, border: "1px solid" + thresholdColor }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

}
