import { Injectable } from '@angular/core';
import { Observable, of, merge, fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
	providedIn: 'root'
})
export class HostService {
	isOnline: Observable<boolean>;

	constructor() {
		this.isOnline = merge(
			of(navigator.onLine),
			fromEvent(window, 'online').pipe(map(() => true)),
			fromEvent(window, 'offline').pipe(map(() => false))
		);
	}
}