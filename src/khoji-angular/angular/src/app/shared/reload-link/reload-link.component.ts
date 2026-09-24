/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: '[app-reload-link]',
  template: `
    <div class="flex align-items-center justify-content-center z-5">
        <span class="underline text-primary cursor-pointer text-lg hover:text-primary"
          [attr.data-test]="testName"
          [attr.id]="linkId"
          (click)="emitEventToParent()">
          {{linkText}}
        </span>
    </div>
  `,
})
export class ReloadLinkComponent implements OnInit {

  constructor() { }

  @Input() linkText = '';
  @Input() testName = '';
  @Input() linkId = '';
  @Output() clicked = new EventEmitter();

  ngOnInit(): void {
  }

  emitEventToParent() {
    this.clicked.emit();
  }

}
