/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Constants } from 'app/constants';
import { AppState} from 'app/states/app-states';
import { selectTranslation } from 'app/states/global-translations.selector';
import { Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import * as actions from 'app/states/app.actions';

@Component({
  selector: 'khoji-modal-wrapper',
  templateUrl: './modal-wrapper.component.html',
  styleUrls: ['./modal-wrapper.component.scss']
})
export class ModalWrapperComponent implements OnInit {

  @Input() issueType: string;
  @Input() title: string;
  @Input() subTitle: string;
  @Input() titleUrl: string;
  @Output() onClose = new EventEmitter();
  constants: typeof Constants;
  translation: any;
  subscription = new Subscription();

  constructor(private store: Store<AppState>){}
  ngOnInit() {
    this.constants = Constants;
    // select translation
    this.subscription.add(this.store.pipe(selectTranslation)
    .subscribe(translation => {
      this.translation = translation;
    }));

  }

  close() {
    this.onClose.emit();
  }
}
