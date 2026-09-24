/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeRemaining'
})
export class TimeRemainingPipe implements PipeTransform {

  transform(startTime: Date | string, interval: number): any {
    const current = new Date().getTime();
    const started = new Date(startTime + 'Z').getTime();
    const remaining = interval - Math.floor((current - started) / 60000);
    return remaining > 0 ? remaining : 0;
  }
}
