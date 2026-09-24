/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Directive, Input } from '@angular/core';
import { NG_VALIDATORS, Validator, ValidationErrors, FormGroup } from '@angular/forms';

import { MustMatch } from './must-match.validator';

@Directive({
    selector: '[mustMatch]',
    providers: [{ provide: NG_VALIDATORS, useExisting: MustMatchDirective, multi: true }]
})
export class MustMatchDirective implements Validator {
    @Input('mustMatch') mustMatch: string[] = [];

    validate(formGroup: FormGroup): ValidationErrors {
        return MustMatch(this.mustMatch[0], this.mustMatch[1])(formGroup);
    }
}
