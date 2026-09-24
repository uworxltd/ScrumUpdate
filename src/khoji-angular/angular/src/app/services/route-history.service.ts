import { Injectable } from '@angular/core';

@Injectable({
	providedIn: 'root'
})
export class RouteHistoryService {
  private _enableAccessDeniedRoute = false;

  enableAccessDenidedTemplate() {
    this._enableAccessDeniedRoute = true;
  }

  disbleAccessDenidedTemplate() {
    this._enableAccessDeniedRoute = false;
  }

  isAccessDenidedTemplateEnabled() {
    return this._enableAccessDeniedRoute;
  }
}
