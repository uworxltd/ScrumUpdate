import { Injectable } from '@angular/core';
import { Router, NavigationEnd, NavigationStart, NavigationCancel, NavigationError } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class RouteLoggingService {
  private navigationStack: string[] = [];

  constructor(private router: Router) {
    this.router.events
      .pipe(filter(event =>
        event instanceof NavigationEnd ||
        event instanceof NavigationStart ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError))
      .subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.navigationStack.push(event.urlAfterRedirects);
        } else if (event instanceof NavigationStart) {
          this.navigationStack.push(event.url);
        } else if (event instanceof NavigationCancel || event instanceof NavigationError) {
          this.navigationStack.pop();
        }
      });
  }

  getNavigationStack(): string[] {
    return this.navigationStack;
  }
}
