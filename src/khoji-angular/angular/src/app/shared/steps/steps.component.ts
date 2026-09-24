import { Component, Input, OnInit } from "@angular/core";
import { StepsService } from "./steps.service";
import { StepsModule } from "primeng/steps";

@Component({
    selector: 'khoji-steps',
    template: `<p-steps [model]="items" [activeIndex]="currentStepIndex"></p-steps>`,
    styleUrls: ['./steps.component.scss'],
    standalone: true,
    imports: [
        StepsModule,
    ]
})
export class StepsComponent implements OnInit {
    #currentStepIndex = 0;

    @Input() steps: string[];
    @Input()
    get currentStepIndex() {
        return this.#currentStepIndex;
    }
    set currentStepIndex(value: number) {
        this.#currentStepIndex = value;
    }

    @Input() key: string;
    constructor(private stepsService: StepsService) { }

    ngOnInit() {
        this.stepsService.setKey(this.key);
        
        this.stepsService.currentStepIndex.subscribe(stepIndex => {
            this.currentStepIndex = stepIndex.index;
        });
    }

    get items() {
        return this.steps.map(step => ({ label: step }));
    }
}