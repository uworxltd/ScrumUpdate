import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Store } from "@ngrx/store";
import { setNewJiraUserId } from "app/admin/state/admin.actions";
import { AppState } from "app/states/app-states";
import { Subscription } from "rxjs";

@Component({
    template: '',
})
export class NewUserComponent implements OnInit {
    subscription = new Subscription();
    constructor(private store: Store<AppState>, private route: ActivatedRoute, private router: Router) { }

    ngOnInit(): void {
        this.subscription.add(this.route.queryParams.subscribe(params => {
            const selectedUserId = params['selected-user-id'] || '';
            this.store.dispatch(setNewJiraUserId({ id: selectedUserId }));
        }));
    }
}