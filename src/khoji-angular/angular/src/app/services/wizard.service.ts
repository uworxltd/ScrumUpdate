import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
	providedIn: 'root'
})
export class WizardService {
	nextStep$: Subject<{ wizard: string }> = new Subject();
	prevStep$: Subject<{ wizard: string }> = new Subject();
	stepChange$: Subject<{ wizard: string, step: string }> = new Subject();
	stepCompletionChange$: Subject<{ wizard: string, step: string, complete: boolean }> = new Subject();

	gotoStep(wizard: string, step: string) {
		this.stepChange$.next({ wizard, step });
	}

	gotoNextStep(wizard: string) {
		this.nextStep$.next({wizard});
	}

	gotoPrevStep(wizard: string) {
		this.prevStep$.next({wizard});
	}

	completeStep(wizard: string, step: string, complete: boolean) {
		this.stepCompletionChange$.next({ wizard, step, complete });
	}
}