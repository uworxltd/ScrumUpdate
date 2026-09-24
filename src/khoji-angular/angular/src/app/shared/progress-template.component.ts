import { Component, Input } from "@angular/core";

@Component({
  selector: '[progressTemplate]',
  template:`
    <div
      class="flex w-full h-0-7rem"
      *ngIf="progressTemplate.length > 1"
    >
      <div
        *ngFor="let item of progressTemplate; let i = index;"
        [style.width.%]="(item.count/total) * 100"
        [ngClass]="{'border-round-left-lg': i === 0, 'border-round-right-lg': i === progressTemplate.length - 1, 'min-width': (i === 0 || i === progressTemplate.length - 1) && item.count !== 0 }"
        [style.background-color]="item.color"
      ></div>
    </div>
    <div
      class="flex w-full h-0-7rem"
      *ngIf="progressTemplate.length < 2"
    >
      <div
        [style.width.%]="100"
        class="border-round-lg"
        [style.background-color]="progressTemplate[0]?.color || '#b7b7b7'"
      ></div>
    </div>
  `,
  styles: [
    '.min-width { min-width: 2.38889% !important }',
    '.h-0-7rem { height: 0.7rem !important }',
  ]
})
export class ProgressTemplate {
  @Input() progressTemplate: ProgressTemplateModel[] = [];
  total: number = 0;

  ngOnInit() {
    this.total = this.progressTemplate.map(progress => progress.count).reduce((acc, curr) => acc + curr, 0);
    this.progressTemplate = this.progressTemplate.filter(progress => progress.count !== 0);
  }
}


export interface ProgressTemplateModel {
  count: number;
  color: string;
}
