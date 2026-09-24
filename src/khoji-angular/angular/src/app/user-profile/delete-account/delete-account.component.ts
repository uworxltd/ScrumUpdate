import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Store } from "@ngrx/store";
import { HttpService } from "app/services/common/http.service";
import { AppState, LoadingState } from "app/states/app-states";
import { selectTranslation } from "app/states/global-translations.selector";
import { environment } from "environments/environment";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { RadioButtonModule } from "primeng/radiobutton";
import { Subscription } from "rxjs";
import { selectDeleteAccountLoadingState } from "../state/user-profile.selectors";
import { submitDeleteUserAccount } from "../state/user-profile.actions";
import { Router } from "@angular/router";
import { AdminActions, TrackingService } from "app/services/tracking";
import { resetAdminStateToDefault } from "app/admin/state/admin.actions";
import { SharedModule } from "../../shared/shared.module";
import { clearLocalStorage } from "app/shared/helper-functions";

@Component({
    selector: 'khoji-delete-account',
    templateUrl: './delete-account.component.html',
    styleUrls: ['./delete-account.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        DialogModule,
        ButtonModule,
        RadioButtonModule,
        FormsModule,
        InputTextModule,
        SharedModule
    ]
})
export class DeleteAccountComponent implements OnInit, OnDestroy {
    subscription = new Subscription();
    translation;
    loadingStates = LoadingState;
    loading: LoadingState = LoadingState.Pending;
    reasons: string[] = []
    selectedReason = '';
    otherReason = '';

    @Input() openDialog = false;
    @Input() isModal = true;
    @Output() closeDialog = new EventEmitter<void>();

    constructor(private store: Store<AppState>, private http: HttpService, private router: Router, private trackingService: TrackingService) { }

    ngOnInit(): void {
        const translation$ = this.store.pipe(selectTranslation);
        const deleteAccountLoadingState$ = this.store.pipe(selectDeleteAccountLoadingState);
        this.subscription.add(translation$.subscribe(translation => { this.translation = translation; }));
        this.subscription.add(deleteAccountLoadingState$.subscribe(loading => {
            this.loading = loading;

            if (loading === LoadingState.Done) {
                this.clearBrowser();
                this.router.navigate([environment.LOGIN_PAGE]);
            }
        }));

        this.http.appGetRequest(environment.DELETE_ACCOUNT_REASONS).subscribe(data => {
            this.reasons = JSON.parse(JSON.stringify(data));
        });
    }

    validReason() {
        const reason = this.selectedReason.trim();
        const isLastReason = reason ? this.reasons.findIndex(r => r == reason) === this.reasons.length - 1 : false;
        return isLastReason ? this.otherReason.trim() : reason;
    }

    deleteAccount() {
        const reason = this.validReason();
        if (!reason) return;
        this.store.dispatch(submitDeleteUserAccount());
        this.trackingService.captureUserAction(AdminActions.AccountSettings.DeleteAccount, { reason })
    }

    clearBrowser() {
        clearLocalStorage();
        sessionStorage.clear();
        this.store.dispatch(resetAdminStateToDefault());
    }

    close() {
        this.selectedReason = '';
        this.otherReason = '';
        this.closeDialog.emit();
        this.trackingService.captureUserAction(AdminActions.AccountSettings.CancelButton)
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }
}
