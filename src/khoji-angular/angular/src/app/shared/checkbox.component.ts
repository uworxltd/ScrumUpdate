/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
    selector: 'khoji-checkbox',
    template: ` <input #chk type="checkbox" [checked]="value" (change)="updateValue(chk.checked);$event.stopPropagation()"
                    [ngClass]="className" [disabled]="disabled?true:null" [attr.data-test]="dataTestName+'-checkbox'" />`,
    styles: [
        'input {accent-color: var(--primary-color);}'
    ]
})
export class CheckboxComponent {
    @Input() dataTestName: string;
    @Input() className: string;
    @Input() value: boolean;
    @Input() disabled: boolean;
    @Output() valueChange = new EventEmitter<boolean>();
    @Output() update = new EventEmitter<boolean>();

    updateValue(value: boolean) {
        this.value = value;
        this.valueChange.emit(value);
        this.update.emit(value);
    }
}
