/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Pipe, PipeTransform } from '@angular/core';
import { Constants } from 'app/constants';

@Pipe({
  name: 'escape'
})
export class EscapePipe implements PipeTransform {

  transform(value: any): any {
    if (!value) return '';

    for (let i = 0; i < Constants.specialCharsEncoding.length; i++) {
      const encoding = Constants.specialCharsEncoding[i];

      if (value.indexOf(encoding.specialCharacter) > -1) {
        return value.replace(/encoding.specialCharacter/g, encoding.replaceValue)
      }
    }
    return value;
  }
}
