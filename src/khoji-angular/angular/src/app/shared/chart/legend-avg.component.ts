import { Component, Input } from "@angular/core";
import { Legend } from "./legend";

@Component({
  selector: 'khoji-legend-avg',
  template: `<div *ngIf="legend.show" class="total-outer-container" data-toggle="tooltip" [title]="title">
                <div class="text-container" [ngStyle]="{'background-color':bgColor}">
                    <a style="color:azure"><strong>{{legend.avg.toFixed(2)}}</strong></a>
                </div>
              </div>`
})
export class LegendAvg {
  @Input() legend: Legend;
  @Input() title: string;
  @Input() bgColor: string;
}