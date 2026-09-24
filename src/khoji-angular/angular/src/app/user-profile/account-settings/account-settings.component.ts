import { Component, OnDestroy, OnInit } from "@angular/core";
import { Store } from "@ngrx/store";
import { AppState } from "app/states/app-states";
import { selectTranslation } from "app/states/global-translations.selector";
import { Subscription } from "rxjs";
import { DeleteAccountComponent } from "../delete-account/delete-account.component";
import { DividerModule } from "primeng/divider";
import { RootNav, TrackingService } from "app/services/tracking";

@Component({
    selector: 'khoji-account-settings',
    templateUrl: './account-settings.component.html',
    styleUrls: ['./account-settings.component.scss'],
    standalone: true,
    imports: [
        DividerModule,
        DeleteAccountComponent
    ]
})
export class AccountSettingsComponent implements OnInit, OnDestroy {
    subscription = new Subscription();
    translation;
    openDeleteAccountDialog = false;
    constructor(private store: Store<AppState>, private trackingService: TrackingService) { }

    ngOnInit(): void {
        this.subscription.add(this.store.pipe(selectTranslation)
            .subscribe(translation => { this.translation = translation; }));

        this.trackingService.captureNavigationStep(RootNav.AdminDashboard.AccountSettings);
    }

    onDeleteAccountClick(): void {
        this.trackingService.captureNavigationStep(RootNav.AdminDashboard.AccountSettings.DeleteAccount);
        this.openDeleteAccountDialog = true;
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }
}