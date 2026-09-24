import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from "@angular/router";
import { ConfirmationService } from "primeng/api";
import { Observable } from "rxjs";

export interface hasChanges {
    hasChanges: () => boolean;
}

@Injectable({
    providedIn: 'root'
})
export class HasChangesGuard<T extends hasChanges>  {
    constructor(
        private confirmationService: ConfirmationService,
    ) { }
    canDeactivate(
        component: T,
        currentRoute: ActivatedRouteSnapshot,
        currentState: RouterStateSnapshot,
        nextState?: RouterStateSnapshot
    ): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        const hasChanges = component.hasChanges();

        if(hasChanges){
            return true;
            //return confirm('You have unsaved changes. Are you sure you want to leave this page?');
        }
        return true;

        // return new Observable<boolean>((observer) => {
        //     if (hasChanges) {
        //         this.confirmationService.confirm({
        //             key: 'has-changes',
        //             message: 'You have unsaved changes. Are you sure you want to leave this page?',
        //             accept: () => {
        //                 observer.next(true);
        //                 observer.complete();
        //             },
        //             reject: () => {
        //                 observer.next(false);
        //                 observer.complete();
        //             }
        //         });
        //     }
        //     else {
        //         observer.next(true);
        //         observer.complete();
        //     }
        // });
    }
}