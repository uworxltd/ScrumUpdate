/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Injectable } from '@angular/core';
import { CanLoad, Route, UrlSegment } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Constants } from 'app/constants'
/***
 * This module guard will only load modules of components, if internet connection is available
 */
@Injectable({ providedIn: 'root' })
export class LoadModulesGuard implements CanLoad {

  constructor(private messageService: MessageService) { }
  canLoad(route: Route, segments: UrlSegment[]): boolean {
    if (navigator.onLine) {
      return true;
    }
    this.messageService.clear();
    this.messageService.add(
      {
        key: 'network',
        severity: "error",
        summary: Constants.TITLE_ERROR,
        detail: Constants.FAILED_TO_LOAD_RESPONSE
      }
    );
    return false;
  }
}
