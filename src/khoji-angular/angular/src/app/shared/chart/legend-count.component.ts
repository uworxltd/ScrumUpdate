import { Component, Input } from "@angular/core";
import { Legend } from "./legend";

@Component({
  selector: 'khoji-legend-count',
  template: `<div *ngIf="legend.show" class="total-outer-container" data-toggle="tooltip" [title]="title">
                <div class="text-container" [ngStyle]="{'background-color':bgColor}">
                    <a [ngStyle]="{'color':textColor}">
                    <strong>{{showValueInDecimalPlaces ? legend.total.toFixed(2) : legend.total}}
                    </strong></a>
                </div>
              </div>`
})
export class LegendCount {
  @Input() legend: Legend;
  @Input() title: string;
  @Input() bgColor: string;
  @Input() textColor = 'azure';
  @Input() showValueInDecimalPlaces = true;
}
