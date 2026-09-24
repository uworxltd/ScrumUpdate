import { Component, Input, OnInit } from "@angular/core";
import { Store } from "@ngrx/store";
import { AppState } from "app/states/app-states";
import { selectTranslation } from "app/states/global-translations.selector";
import { Subscription } from "rxjs";
import { environment } from "environments/environment";

@Component({
    selector: 'khoji-spinner',
    template: `
        <ngx-spinner *ngIf="show" bdColor="rgba(51,51,51,0.8)" size="medium" color="#fff" type="ball-clip-rotate" [fullScreen]="fullScreen"
            style="z-index: 1051010109999990; position: absolute;">
            <div *ngIf="translation">
                <p style="font-size: 20px; color: white">{{translation?.spinner?.spinnertext}}</p>
            </div>
        </ngx-spinner>`
})
export class SpinnerComponent implements OnInit {
    @Input() fullScreen: boolean;
    subscription = new Subscription();
    translation: any;
    show = true;

    constructor(private store: Store<AppState>) { }

    ngOnInit() {
        this.store.pipe(selectTranslation).subscribe(data => {
            this.translation = data;
        });
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }
}