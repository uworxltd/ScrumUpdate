import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class LogMyWorkTabService {
    selectedTab$ = new BehaviorSubject<string>('');

    setSelectedTab(tab: string) {
        this.selectedTab$.next(tab);
    }

    getSelectedTab() {
        return this.selectedTab$.asObservable();
    }
}