import { Injectable } from "@angular/core";
import { PreloadingStrategy, Route } from "@angular/router";
import { Observable, of } from "rxjs";
import { hasToken } from "app/shared/helper-functions";

@Injectable({
    providedIn: "root"
})
export class FlagBasedPreloadingStrategy implements PreloadingStrategy {
    preload(route: Route, load: () => Observable<any>): Observable<any> {
        if (hasToken()) {
            return route.data?.['preload'] ? load() : of(null);
        } else {
            return of(null);
        }
    }
}
