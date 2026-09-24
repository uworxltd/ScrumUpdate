import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { KhojiComponent } from 'app/interface/khoji-component.interface';
import { AppState } from 'app/states/app-states';
import { selectKhojiComponentsAgainstInstance } from 'app/states/global-configs.selector';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

@Injectable({
	providedIn: 'root'
})
export class ConfigService {
	config$: Observable<KhojiComponent[]>;

	constructor(private store: Store<AppState>) {
		this.config$ = this.store.pipe(selectKhojiComponentsAgainstInstance)
	}

	getComponentConfig$() {
		return this.config$.pipe(map(config => config));
	}

	isComponentEnabled$(componentId: string) {
		return this.getComponentConfig$().pipe(
			filter(components => !!components),
			map(components => {
				const comp = components.find(c => c.id === componentId);

				if (!comp && !environment.docker) {
					console.error(`Component ${componentId} not found in component config. It is considered as enabled by default`);
				}

				return comp ? comp.enabled : true;
			})
		);
	}
}