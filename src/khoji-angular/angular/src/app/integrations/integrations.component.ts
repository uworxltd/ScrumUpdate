/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { AppState } from 'app/states/app-states';
import { selectTranslation } from 'app/states/global-translations.selector';

@Component({
  selector: 'khoji-integrations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './integrations.component.html',
  styleUrls: ['./integrations.component.scss']
})
export class IntegrationsComponent implements OnInit {
  //subscription = new Subscription();
  translation$ = this.store.pipe(selectTranslation);

  constructor(private store: Store<AppState>) { }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    //this.subscription.unsubscribe();
  }
}
