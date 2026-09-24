/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
  selector: 'khoji-custom-checkbox',
  styles: [
    '.custom-control-label:hover { cursor: pointer }',
    '.custom-control-label::after { top: 0.26rem; background-size: 1em }',
    '.custom-control-label::before, .custom-control-label::after { width: 1.2rem; height: 1.2rem }',
    '.custom-checkbox .custom-control-input:indeterminate~.custom-control-label::before { color: #fff; border-color: #7952b3; background-color: var(--primary-color) !important; }',
    '.custom-control-input:checked~.custom-control-label::before { color: #fff; border-color: #7952b3; background-color: var(--primary-color) !important; }',
    '.custom-checkbox .custom-control-label::before { border-radius: 50% }',
    '.disabled { pointer-events: none }',
  ],
  template: `
      <div class="custom-control custom-checkbox" [ngClass]="{'disabled':disabled}">
        <input
          #chk
          type="checkbox"
          [checked]="value"
          [disabled]="disabled"
          [indeterminate]="indeterminate"
          class="custom-control-input">
        <label class="custom-control-label" (click)="this.updateValue(!chk.checked)">{{label}}</label>
      </div>`
})
export class CustomCheckboxComponent {
  @Input() label: string;
  @Input() disabled: boolean;
  @Input() indeterminate: boolean;
  @Input() value: boolean;
  @Output() valueChange = new EventEmitter<boolean>();

  updateValue(value: boolean) {
    this.value = value;
    this.valueChange.emit(value);
  }
}
