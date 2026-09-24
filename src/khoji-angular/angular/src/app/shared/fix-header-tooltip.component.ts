import { Component, Input } from "@angular/core";

@Component({
    selector: 'khoji-fix-header-tooltip',
    template: ` <span class="small">
                    <div class="rag-status-tooltip fa fa-question-circle ml-1">
                        <div>
                            <span class="tooltiptext">
                                {{fixVersionText}}
                                <div class="left-align">
                                    <khoji-inherited-sign></khoji-inherited-sign>
                                    {{inheritedFromParentText}}
                                </div>
                            </span>
                        </div>
                    </div>
                </span>`
})
export class FixHeaderTooltip {
    @Input() fixVersionText: string;
    @Input() inheritedFromParentText: string;
}