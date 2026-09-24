import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { filter } from "rxjs/operators";

export interface Step {
    label: string;
}

export interface StepIndex {
    key: string;
    index: number;
}

@Injectable({
    providedIn: 'root'
})
export class StepsService {
    constructor() { }
    #key = '';
    #currentStepIndex = new BehaviorSubject<StepIndex>({ key: '', index: 0 });

    setKey(key: string) {
        this.#key = key;
    }

    get currentStepIndex() {
        return this.#currentStepIndex.asObservable().pipe(
            filter(index => index.key === this.#key)
        );
    }

    setCurrentStepIndex(value: number, key?: string) {
        this.#currentStepIndex.next({ key: key || this.#key, index: value });
    }
}