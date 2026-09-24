/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { CommonModule } from '@angular/common';
import { Component, ElementRef, AfterViewInit, ViewChild, Input, ChangeDetectorRef } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'khoji-tooltip',
  template: `
      <span [pTooltip]="tooltipString" [escape]="false" [tooltipPosition]="position" [tooltipStyleClass]="styleclass">
        <ng-content></ng-content>
      </span>
      <div style="display:none" #tooltipRef>
        <ng-content select="[tooltip]"></ng-content>
      </div>
      `,
  standalone: true,
  imports: [
    CommonModule,
    TooltipModule,
  ]
})
export class TooltipComponent implements AfterViewInit {
  tooltipString = '';
  @Input() position = 'left';
  @Input() styleclass = null;
  @ViewChild('tooltipRef') tooltipRef: ElementRef<HTMLDivElement>;

  constructor(private cdr: ChangeDetectorRef) { }

  ngAfterViewInit() {
    this.tooltipString = this.tooltipRef.nativeElement.innerHTML;
    this.cdr.detectChanges();
  }
}
