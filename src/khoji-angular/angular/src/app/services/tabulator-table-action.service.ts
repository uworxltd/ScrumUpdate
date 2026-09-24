import { Injectable } from '@angular/core';
import { Action } from 'app/analysis/sprint-analytics-types';
import { Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface TabulatorTableAction {
	tableId: string;
	action: Action;
}

@Injectable({
	providedIn: 'root'
})
export class TabulatorTableActionService {
	private action$ = new Subject<TabulatorTableAction>();

	triggerAction(tableId: string, action: Action) {
		this.action$.next({ tableId, action });
	}

	onAction$(tableId: string) {
		return this.action$.pipe(
			filter(a => a.tableId === tableId),
			map(a => a.action)
		);
	}
}