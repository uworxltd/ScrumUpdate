import { Component } from "@angular/core";

@Component({
    selector: 'khoji-inherited-sign',
    template: ` <div class="tooltip_cont" title="Inherited from parent">
                    (<div class="inherited_sign">i</div>)
                </div>`
})
export class InheritedSign { }