import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface SprintInsightCarouselAction {
	carouselId: string;
	insightId: string;
}

@Injectable({
	providedIn: 'root'
})
export class SprintInsightCarouselActionService {
	private action$ = new Subject<SprintInsightCarouselAction>();

	triggerAction(carouselId: string, insightId: string) {
		this.action$.next({ carouselId, insightId });
	}

	onAction$(carouselId: string) {
		return this.action$.pipe(
			filter(a => a.carouselId === carouselId),
			map(a => a.insightId)
		);
	}
}